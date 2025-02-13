// packages/server/api/src/platforms/youtube/transcript.ts
import { TranscriptSource, TranscriptResult } from '@wavenotes/shared'
import { YoutubeTranscript } from 'youtube-transcript'
import { logger } from '../../lib/logger'

export class TranscriptService {
  // Configure source ordering via env vars
  private static getSourceOrder(): TranscriptSource[] {
    if (process.env.NODE_ENV === 'production') {
      return [
        TranscriptSource.SUPADATA,
        TranscriptSource.YOUTUBE_TRANSCRIPT,
        TranscriptSource.YT_DLP,
        TranscriptSource.KYOUTUBE
      ]
    }
    return [
      TranscriptSource.YOUTUBE_TRANSCRIPT,
      TranscriptSource.YT_DLP,
      TranscriptSource.KYOUTUBE,
      TranscriptSource.SUPADATA
    ]
  }

  // Map of source to fetch function
  private static transcriptFetchers = {
    [TranscriptSource.YOUTUBE_TRANSCRIPT]: async (url: string): Promise<TranscriptResult | null> => {
      try {
        const segments = await YoutubeTranscript.fetchTranscript(url)
        if (segments?.length) {
          return {
            text: segments.map(s => s.text).join(' '),
            source: TranscriptSource.YOUTUBE_TRANSCRIPT,
            metadata: { segments }
          }
        }
      } catch (error) {
        logger.error('youtube-transcript failed', { error, url })
      }
      return null
    },

    [TranscriptSource.YT_DLP]: async (url: string): Promise<TranscriptResult | null> => {
      try {
        const text = await this.fetchTranscriptUsingYTDLP(url)
        if (text) {
          return { text, source: TranscriptSource.YT_DLP }
        }
      } catch (error) {
        logger.error('yt-dlp failed', { error, url })
      }
      return null
    },

    // Add other fetchers...
  }

  static async getTranscript(youtubeUrl: string): Promise<TranscriptResult> {
    const sourceOrder = this.getSourceOrder()
    
    for (const source of sourceOrder) {
      const fetcher = this.transcriptFetchers[source]
      if (!fetcher) {
        logger.warn(`No fetcher implemented for source: ${source}`)
        continue
      }

      try {
        logger.info(`Attempting to fetch transcript using ${source}`)
        const result = await fetcher(youtubeUrl)
        if (result?.text) {
          logger.info(`Successfully fetched transcript via ${source}`)
          return result
        }
      } catch (error) {
        logger.error(`${source} fetcher failed`, { error, url: youtubeUrl })
      }
    }

    throw new Error('Unable to fetch transcript from any source')
  }

  // Existing helper methods...
  private static async fetchTranscriptUsingYTDLP(url: string): Promise<string> {
    // Your existing YTDLP implementation...
  }
}