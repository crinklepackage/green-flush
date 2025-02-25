import { google, youtube_v3 } from 'googleapis'
import { errors, extractYouTubeVideoId, buildYouTubeUrl, VideoMetadata } from '@wavenotes-new/shared';
const { PlatformError } = errors;

export class YouTubeService {
    private youtube: youtube_v3.Youtube
    
    constructor(private apiKey: string) {
      this.youtube = google.youtube({ version: 'v3', auth: this.apiKey })
    }
  
    private extractVideoId(url: string): string | null {
      return extractYouTubeVideoId(url)
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
          part: ['snippet', 'contentDetails', 'statistics'],
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
          platform: 'youtube',
          viewCount: video.statistics && video.statistics.viewCount ? parseInt(video.statistics.viewCount) : undefined
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
    static async search(query: string): Promise<VideoMetadata[]> {
      console.info(`YouTubeService.search called with query: ${query}`);
      // Import config from environment
      const { config } = require('../../config/environment');
      // Create a YouTube client using the API key
      const youtube = require('googleapis').google.youtube({ version: 'v3', auth: config.YOUTUBE_API_KEY });

      try {
        const response = await youtube.search.list({
          part: ['snippet'],
          q: query,
          type: ['video'],
          maxResults: 5,
          videoType: 'any',
          safeSearch: 'none',
          order: 'relevance'
        });
        if (!response.data.items) return [];

        // Map the results to VideoMetadata with minimal info; later enriched by getVideoInfo
        const results: VideoMetadata[] = response.data.items.map((item: any) => ({
          id: item.id?.videoId || '',
          title: item.snippet?.title || '',
          channel: item.snippet?.channelTitle || '',
          showName: item.snippet?.channelTitle || '',
          thumbnailUrl: item.snippet?.thumbnails?.default?.url || null,
          duration: null,
          platform: 'youtube'
        }));
        return results;
      } catch (error) {
        console.error('Error during YouTube search:', { query, error });
        return [];
      }
    }

    // Static method to build a YouTube video URL from a video ID.
    static buildUrl(videoId: string): string {
      return buildYouTubeUrl(videoId)
    }
}