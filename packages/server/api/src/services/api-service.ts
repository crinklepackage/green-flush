import { Queue } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import { ProcessingStatus } from '@wavenotes-new/shared'
import { PodcastJob } from '@wavenotes-new/shared';
import { YouTubeService } from '../platforms/youtube/service'
import { SpotifyService } from '../platforms/spotify/service'
import { config } from '../config/environment'
import { DatabaseService } from '../lib/database'
import { QueueService } from '../services/queue'
import express from 'express'
import cors from 'cors'

interface PlatformMetadata {
  title: string
  show?: string  // Optional for YouTube
  channel?: string  // Optional for Spotify
  thumbnailUrl: string | null
  duration: number | null
}

interface SpotifyMetadata extends PlatformMetadata {
  show: string  // Required for Spotify
}

interface VideoMetadata extends PlatformMetadata {
  // Additional properties for YouTube
}

export class ApiService {
  private readonly supabase
  private readonly youtube: YouTubeService
  private readonly spotify: SpotifyService
  private readonly podcastQueue: Queue
  private server: any

  constructor(
    private db: DatabaseService,
    private queue: QueueService
  ) {
    // Initialize clients
    this.supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)
    this.youtube = new YouTubeService(config.YOUTUBE_API_KEY)
    this.spotify = new SpotifyService({
      clientId: config.SPOTIFY_CLIENT_ID,
      clientSecret: config.SPOTIFY_CLIENT_SECRET
    })
    
    // Initialize queue
    this.podcastQueue = new Queue('podcast', {
      connection: { url: config.REDIS_URL }
    })
  }

  async createPodcastRequest(url: string, type: 'youtube' | 'spotify', userId: string) {
    try {
      // Get metadata based on platform
      let metadata
      if (type === 'spotify') {
        const episodeId = this.spotify.getEpisodeId(url)
        metadata = await this.spotify.getPodcastInfo(episodeId)
        if (!metadata) {
          throw new Error('Failed to fetch podcast info')
        }
      } else {
        metadata = await this.youtube.getVideoInfo(url)
        if (!metadata) {
          throw new Error('Failed to fetch video info')
        }
      }

      // Create podcast record
      const podcast = await this.supabase
        .from('podcasts')
        .insert({
          url,
          platform: type,
          youtube_url: type === 'youtube' ? url : null,
          title: metadata.title,
          show_name: this.getShowName(metadata),
          created_by: userId,
          has_transcript: false,
          transcript: null,
          thumbnail_url: metadata.thumbnailUrl,
          duration: metadata.duration
        })
        .select()
        .single()

      if (!podcast.data) {
        throw new Error('Failed to create podcast record')
      }

      // Create summary record
      const summary = await this.supabase
        .from('summaries')
        .insert({
          podcast_id: podcast.data.id,
          status: ProcessingStatus.IN_QUEUE,
          created_by: userId
        })
        .select()
        .single()

      if (!summary.data) {
        throw new Error('Failed to create summary record')
      }

      // Enqueue processing job
      await this.podcastQueue.add('podcast', {
        summaryId: summary.data.id,
        podcastId: podcast.data.id,
        url,
        type,
        userId
      } as PodcastJob)

      return {
        podcast: podcast.data,
        summary: summary.data
      }
    } catch (error) {
      console.error('Failed to create podcast request:', error)
      throw error
    }
  }

  async close() {
    await this.podcastQueue.close()
  }

  async start(port: number, router: express.Router) {
    const app = express()
    app.use(cors())
    app.use(express.json())
    app.use(router)
    this.server = app.listen(port, () => {
      console.log(`API listening on port ${port}`)
    })
  }

  async shutdown() {
    if (this.server) {
      await new Promise((resolve, reject) => {
        this.server.close((err: any) => (err ? reject(err) : resolve(true)))
      })
    }
  }

  private getShowName(metadata: PlatformMetadata): string {
    if ('show' in metadata && metadata.show) {
      return metadata.show
    }
    if (metadata.channel) {
      return metadata.channel
    }
    return 'Unknown Show'  // Fallback value
  }
}