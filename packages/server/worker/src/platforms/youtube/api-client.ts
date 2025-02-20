// packages/server/worker/src/platforms/youtube/api-client.ts
import { google } from 'googleapis'
import { TranscriptSource, TranscriptResult } from '@wavenotes-new/shared'

export class YouTubeApiClient {
  private oauth2Client: any = null
  private readonly OAUTH_REDIRECT_URI = 'https://wavenotes-api-production.up.railway.app/auth/youtube/callback'
  private readonly REQUIRED_SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl']

  constructor(
    private clientId: string,
    private clientSecret: string,
    private refreshToken: string
  ) {}

  async initialize(): Promise<void> {
    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      console.warn('Missing OAuth credentials. YouTube API OAuth features will be disabled.')
      return
    }

    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.OAUTH_REDIRECT_URI
    )

    this.oauth2Client.setCredentials({
      refresh_token: this.refreshToken
    })

    await this.refreshAccessToken()
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      if (!this.oauth2Client) {
        throw new Error('OAuth2 client not initialized')
      }

      const { tokens } = await this.oauth2Client.refreshAccessToken()
      this.oauth2Client.setCredentials(tokens)
    } catch (error) {
      console.error('Failed to refresh YouTube OAuth access token:', error)
      throw error
    }
  }

  async getTranscript(videoId: string): Promise<TranscriptResult | null> {
    try {
      const youtube = google.youtube({ 
        version: 'v3', 
        auth: this.oauth2Client 
      })

      // List available captions
      const captionsResponse = await youtube.captions.list({
        part: ['snippet'],
        videoId
      })

      // Find English captions (prefer ASR)
      const caption = captionsResponse.data.items?.find(
        c => c.snippet?.language === 'en' && c.snippet?.trackKind === 'ASR'
      ) || captionsResponse.data.items?.find(
        c => c.snippet?.language === 'en'
      )

      if (!caption?.id) return null

      // Download caption track
      const { data: vttContent } = await youtube.captions.download({
        id: caption.id,
        tfmt: 'vtt'
      })

      const text = this.parseVttContent(vttContent as string)

      return {
        text,
        available: text.trim().length > 0,
        source: TranscriptSource.YOUTUBE_API
      }
    } catch (error) {
      console.error('YouTube API transcript fetch failed:', error)
      return null
    }
  }

  private parseVttContent(vttContent: string): string {
    const lines = vttContent.split('\n')
    const textLines: string[] = []
    
    for (const line of lines) {
      if (!line.includes('-->') && 
          !line.match(/^\d+$/) && 
          !line.startsWith('WEBVTT') && 
          line.trim()) {
        textLines.push(line.replace(/<[^>]*>/g, ''))
      }
    }

    return textLines.join(' ').trim()
  }
}

export const youtubeApiClient = new YouTubeApiClient(
  process.env.YOUTUBE_OAUTH_CLIENT_ID!,
  process.env.YOUTUBE_OAUTH_CLIENT_SECRET!,
  process.env.YOUTUBE_OAUTH_REFRESH_TOKEN!
);