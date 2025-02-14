export class YouTubeService {
    constructor(private apiKey: string) {}
  
    isValidUrl(url: string): boolean {
      return extractVideoId(url) !== null
    }
  
    async getVideoInfo(url: string): Promise<VideoMetadata> {
      const videoId = extractVideoId(url)
      if (!videoId) {
        throw new PlatformError({
          platform: 'youtube',
          code: 'INVALID_URL',
          message: 'Could not extract video ID from URL',
          context: { url }
        })
      }
  
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${this.apiKey}&part=snippet,contentDetails`
        )
        const data = await response.json()
  
        if (!data.items?.length) {
          throw new PlatformError({
            platform: 'youtube',
            code: 'VIDEO_NOT_FOUND',
            message: 'Video not found',
            context: { videoId }
          })
        }
  
        const item = data.items[0]
        return {
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnailUrl: item.snippet.thumbnails?.high?.url || '',
          duration: this.parseDuration(item.contentDetails.duration)
        }
      } catch (error) {
        if (error instanceof PlatformError) throw error
        
        throw new PlatformError({
          platform: 'youtube',
          code: 'API_ERROR',
          message: 'Failed to fetch video info',
          context: { videoId, error: error.message }
        })
      }
    }
  
    private parseDuration(duration: string): number {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (!match) return 0
      
      const hours = parseInt(match[1] || '0', 10)
      const minutes = parseInt(match[2] || '0', 10)
      const seconds = parseInt(match[3] || '0', 10)
      
      return (hours * 3600) + (minutes * 60) + seconds
    }
  }