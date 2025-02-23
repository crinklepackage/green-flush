// packages/server/api/src/services/podcast.ts
//import { ProcessingStatus } from '@wavenotes/shared'
import { ProcessingStatus, PodcastJob } from '@wavenotes-new/shared';
import { DatabaseService } from '../lib/database';
import { YouTubeService } from '../platforms/youtube/service';
import { SpotifyService } from '../platforms/spotify/service';
import { QueueService } from '../services/queue';

export class PodcastService {
  private db: DatabaseService;
  private ytService: YouTubeService;
  private spotifyService: SpotifyService;
  private queue: QueueService;

  constructor(db: DatabaseService, ytService: YouTubeService, spotifyService: SpotifyService, queue: QueueService) {
    this.db = db;
    this.ytService = ytService;
    this.spotifyService = spotifyService;
    this.queue = queue;
  }

  async createPodcastRequest(url: string, userId: string) {
    // Determine platform type
    const platform: 'youtube' | 'spotify' = url.includes('youtube') ? 'youtube' : 'spotify';
    let metadata;

    if (platform === 'youtube') {
      metadata = await this.ytService.getVideoInfo(url);
    } else {
      metadata = await this.spotifyService.getEpisodeInfo(url);
    }

    // Create podcast record in the database
    const podcast = await this.db.createPodcast({
      url,
      platform,
      youtube_url: platform === 'youtube' ? url : null,
      title: metadata.title,
      show_name: metadata.showName,
      thumbnail_url: metadata.thumbnailUrl,
      duration: metadata.duration,
      created_by: userId,
      has_transcript: false,
      transcript: null,
      platform_specific_id: metadata.id
    });

    // Create summary record in the database
    const summary = await this.db.createSummary({
      podcastId: podcast.id,
      status: ProcessingStatus.IN_QUEUE
    });

    // Enqueue processing job
    await this.queue.add('PROCESS_PODCAST', {
      podcastId: podcast.id,
      summaryId: summary.id,
      url,
      type: platform,
      userId
    } as PodcastJob);

    return { podcast, summary };
  }
}