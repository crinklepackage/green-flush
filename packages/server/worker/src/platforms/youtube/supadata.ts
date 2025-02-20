// packages/server/worker/src/platforms/youtube/supadata.ts
import { Supadata } from '@supadata/js'
import { TranscriptSource, TranscriptResult } from '@wavenotes-new/shared'

export class SupadataApi {
  private client: Supadata

  constructor() {
    if (!process.env.SUPADATA_API_KEY) {
      throw new Error('Missing SUPADATA_API_KEY environment variable')
    }
    this.client = new Supadata({ apiKey: process.env.SUPADATA_API_KEY })
  }

  async getTranscript(videoId: string): Promise<TranscriptResult | null> {
    try {
      const result = await this.client.youtube.transcript({ 
        videoId, 
        text: true 
      })

      if (!result?.content) {
        console.warn('Supadata returned no content', { videoId })
        return null
      }

      const transcriptText = typeof result.content === 'string'
        ? result.content
        : result.content.map((chunk: any) => chunk.text).join(' ');
      return {
        text: transcriptText,
        available: transcriptText.trim().length > 0,
        source: TranscriptSource.SUPADATA
      }
    } catch (error) {
      console.error('Supadata fetch failed:', {
        videoId,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }
}

export const supadataApi = new SupadataApi()