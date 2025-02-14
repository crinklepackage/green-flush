// packages/server/api/src/services/podcast.ts
import { ProcessingStatus } from '@wavenotes/shared'
import { QueueService } from './queue'

export class PodcastService {
  static async validateUrl(url: string) {
    // Your existing validation logic
  }

  static async createPodcastRequest(url: string, platform: string, summaryId: string) {
    // 1. Fetch metadata based on platform
    const metadata = platform === 'youtube' 
      ? await this.getYouTubeMetadata(url)
      : await this.getSpotifyMetadata(url)

    // 2. Create podcast record
    const podcast = await this.createPodcastRecord(url, platform, metadata)

    // 3. Queue processing job
    await QueueService.addJob('process_podcast', {
      podcastId: podcast.id,
      summaryId,
      url,
      platform
    })

    return podcast.id
  }
}