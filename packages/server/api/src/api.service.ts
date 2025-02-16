import { Queue } from 'bullmq'
import { createClient } from '@supabase/supabase-js'
import { ProcessingStatus, PodcastJob } from '@wavenotes/shared'
import { YouTubeApiClient } from './platforms/youtube/api-client'
import { SpotifyApiClient } from './platforms/spotify/api-client'
import { env } from './config/environment'

export class ApiService {
  private readonly supabase
  private readonly youtube: YouTubeApiClient
  private readonly spotify: SpotifyApiClient
  private readonly podcastQueue: Queue

  constructor() {
    // Initialize clients
    this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
    this.youtube = new YouTubeApiClient(env.YOUTUBE_API_KEY)
    this.spotify = new SpotifyApiClient(env.SPOTIFY_ACCESS_TOKEN)
    
    // Initialize queue
    this.podcastQueue = new Queue('podcast', {
      connection: { url: env.REDIS_URL }
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
          show_name: metadata.show || metadata.channel,
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
}