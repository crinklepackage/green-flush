import { google } from 'googleapis'

export class YouTubeApiClient {
  constructor(
    private readonly apiKey: string
  ) {}

  async getVideoInfo(url: string) {
    try {
      const videoId = this.extractVideoId(url)
      const youtube = google.youtube({ version: 'v3', auth: this.apiKey })
      
      const response = await youtube.videos.list({
        part: ['snippet', 'contentDetails'],
        id: [videoId]
      })

      const video = response.data.items?.[0]
      if (!video) return null

      return {
        title: video.snippet?.title || 'Unknown Title',
        channel: video.snippet?.channelTitle || 'Unknown Channel',
        thumbnailUrl: video.snippet?.thumbnails?.default?.url || null,
        duration: video.contentDetails?.duration || null
      }
    } catch (error) {
      console.error('Failed to fetch video info:', error)
      return null
    }
  }

  private extractVideoId(url: string): string {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    const match = url.match(regex)
    if (!match) throw new Error('Invalid YouTube URL')
    return match[1]
  }
}