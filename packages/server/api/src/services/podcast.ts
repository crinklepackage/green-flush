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
    let podcast, summary, metadata;

    // Check if podcast record already exists
    const existingPodcast = await this.db.findPodcastByUrl(url);

    if (existingPodcast) {
      console.info('Found existing podcast:', existingPodcast.id);
      podcast = existingPodcast;

      // Check if a summary record already exists for this podcast
      const existingSummary = await this.db.getSummaryForPodcast(podcast.id);
      if (existingSummary) {
        // Associate the user with this existing summary
        await this.db.createUserSummary({ user_id: userId, summary_id: existingSummary.id });
        // Return the existing summary id without enqueuing a new processing job
        return existingSummary.id;
      } else {
        // No summary exists, so create a new summary for this podcast
        summary = await this.db.createSummary({
          podcastId: podcast.id,
          status: ProcessingStatus.IN_QUEUE
        });
        // Associate the summary with the user
        await this.db.createUserSummary({ user_id: userId, summary_id: summary.id });
        // Enqueue processing job
        await this.queue.add('PROCESS_PODCAST', {
          summaryId: summary.id,
          podcastId: podcast.id,
          url,
          type: platform,
          userId
        } as PodcastJob);
        return summary.id;
      }
    } else {
      // Create a new podcast record: first fetch metadata
      if (platform === 'youtube') {
        metadata = await this.ytService.getVideoInfo(url);
      } else {
        metadata = await this.spotifyService.getEpisodeInfo(url);
      }

      podcast = await this.db.createPodcast({
        url,
        platform,
        youtube_url: platform === 'youtube' ? url : null,
        title: metadata.title,
        show_name: metadata.showName,
        created_by: userId,
        has_transcript: false,
        transcript: null,
        platform_specific_id: metadata.id,
        thumbnail_url: metadata.thumbnailUrl,
        duration: metadata.duration
      });

      // Create a new summary for the newly created podcast
      summary = await this.db.createSummary({
        podcastId: podcast.id,
        status: ProcessingStatus.IN_QUEUE
      });

      // Create the user association for the summary
      await this.db.createUserSummary({
        user_id: userId,
        summary_id: summary.id
      });

      // Enqueue processing job
      await this.queue.add('PROCESS_PODCAST', {
        summaryId: summary.id,
        podcastId: podcast.id,
        url,
        type: platform,
        userId
      } as PodcastJob);

      return summary.id;
    }
  }
}