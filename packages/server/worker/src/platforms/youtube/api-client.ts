// packages/server/worker/src/platforms/youtube/api-client.ts
import { google } from 'googleapis'
import { TranscriptSource, TranscriptResult } from '@wavenotes/shared'

export class YouTubeApiClient {
  private static oauth2Client: any = null
  private static readonly OAUTH_REDIRECT_URI = 'https://wavenotes-api-production.up.railway.app/auth/youtube/callback'
  private static readonly REQUIRED_SCOPES = ['https://www.googleapis.com/auth/youtube.force-ssl']

  static async initialize(): Promise<void> {
    const {
      YOUTUBE_OAUTH_CLIENT_ID,
      YOUTUBE_OAUTH_CLIENT_SECRET,
      YOUTUBE_OAUTH_REFRESH_TOKEN
    } = process.env

    if (!YOUTUBE_OAUTH_CLIENT_ID || !YOUTUBE_OAUTH_CLIENT_SECRET || !YOUTUBE_OAUTH_REFRESH_TOKEN) {
      console.warn('Missing OAuth credentials. YouTube API OAuth features will be disabled.')
      return
    }

    this.oauth2Client = new google.auth.OAuth2(
      YOUTUBE_OAUTH_CLIENT_ID,
      YOUTUBE_OAUTH_CLIENT_SECRET,
      this.OAUTH_REDIRECT_URI
    )

    this.oauth2Client.setCredentials({
      refresh_token: YOUTUBE_OAUTH_REFRESH_TOKEN
    })

    await this.refreshAccessToken()
  }

  private static async refreshAccessToken(): Promise<void> {
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
        auth: YouTubeApiClient.oauth2Client 
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

export const youtubeApiClient = new YouTubeApiClient()