import { google, youtube_v3 } from 'googleapis'
import { errors } from '@wavenotes-new/shared';
const { PlatformError } = errors;
import type { VideoMetadata } from './types'

export class YouTubeService {
    private youtube: youtube_v3.Youtube
    
    constructor(private apiKey: string) {
      this.youtube = google.youtube({ version: 'v3', auth: this.apiKey })
    }
  
    private extractVideoId(url: string): string | null {
      const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
      const match = url.match(regex)
      return match ? match[1] : null
    }
  
    isValidUrl(url: string): boolean {
      return this.extractVideoId(url) !== null
    }
  
    async getVideoInfo(url: string): Promise<VideoMetadata> {
      const videoId = this.extractVideoId(url)
      if (!videoId) {
        throw new PlatformError({
          platform: 'youtube',
          code: 'INVALID_URL',
          message: 'Could not extract video ID from URL',
          context: { url }
        })
      }
  
      try {
        const response = await this.youtube.videos.list({
          part: ['snippet', 'contentDetails'],
          id: [videoId]
        })
  
        const video = response.data.items?.[0]
        if (!video) {
          throw new PlatformError({
            platform: 'youtube',
            code: 'VIDEO_NOT_FOUND',
            message: 'Video not found',
            context: { videoId }
          })
        }

        return {
          id: videoId,
          title: video.snippet?.title || 'Unknown Title',
          channel: video.snippet?.channelTitle || 'Unknown Channel',
          showName: video.snippet?.channelTitle || 'Unknown Channel',
          thumbnailUrl: video.snippet?.thumbnails?.high?.url || null,
          duration: this.parseDuration(video.contentDetails?.duration || ''),
          platform: 'youtube'
        }
      } catch (error) {
        if (error instanceof PlatformError) throw error
        
        // Type guard for Error objects
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Unknown error'
        
        throw new PlatformError({
          platform: 'youtube',
          code: 'API_ERROR',
          message: 'Failed to fetch video info',
          context: { videoId, error: errorMessage }
        })
      }
    }
  
    private parseDuration(duration: string): number {
      const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
      if (!match) return 0

      const [, hours, minutes, seconds] = match
      const h = hours ? parseInt(hours) : 0
      const m = minutes ? parseInt(minutes) : 0
      const s = seconds ? parseInt(seconds) : 0

      return (h * 3600) + (m * 60) + s
    }

    // Static method to search for videos based on a query.
    // This is a stub and should be implemented properly in the future.
    static async search(query: string): Promise<(VideoMetadata & { id: string })[]> {
      console.info(`YouTubeService.search called with query: ${query}`);
      // Stub: return empty array or simulate a search result if needed.
      return [];
    }

    // Static method to build a YouTube video URL from a video ID.
    static buildUrl(videoId: string): string {
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
}