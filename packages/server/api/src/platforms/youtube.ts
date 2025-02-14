export class YouTubeService {
    private readonly apiKey: string
  
    constructor(apiKey: string) {
      this.apiKey = apiKey
    }
  
    async getVideoInfo(url: string): Promise<VideoMetadata> {
      const videoId = this.extractVideoId(url)
      if (!videoId) {
        throw new PlatformError({
          platform: 'youtube',
          code: 'INVALID_URL',
          url
        })
      }
      // Rest of your implementation...
    }
  }