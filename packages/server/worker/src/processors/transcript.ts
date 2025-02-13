// packages/server/worker/src/processors/transcript.ts
import { TranscriptSource, TranscriptResult } from '@wavenotes/shared'
import { TranscriptError } from '@wavenotes/shared'
import { logger } from '../lib/logger'

export class TranscriptProcessor {
  // ... previous code ...

  static async getTranscript(youtubeUrl: string): Promise<TranscriptResult> {
    const sources = this.getSourceOrder()
    const errors: Record<TranscriptSource, Error | null> = {} as any
    
    for (const source of sources) {
      try {
        logger.info(`Attempting to fetch transcript using ${source}`, { url: youtubeUrl })
        const result = await this.fetchFromSource(source, youtubeUrl)
        if (result) {
          logger.info(`Successfully fetched transcript via ${source}`, { 
            url: youtubeUrl,
            textLength: result.text.length 
          })
          return result
        }
      } catch (error) {
        errors[source] = error as Error
        logger.error(`Failed to fetch transcript from ${source}`, {
          url: youtubeUrl,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        })
        continue // Try next source
      }
    }
    
    // If we get here, all sources failed
    throw new TranscriptError(
      'Failed to fetch transcript from all available sources',
      'ALL',
      youtubeUrl,
      new AggregateError(Object.values(errors).filter(Boolean))
    )
  }

  private static async fetchUsingYoutubeTranscript(url: string): Promise<TranscriptResult | null> {
    try {
      logger.debug('Fetching transcript using youtube-transcript package', { url })
      const segments = await YoutubeTranscript.fetchTranscript(url)
      
      if (!segments?.length) {
        logger.warn('youtube-transcript returned empty segments', { url })
        return null
      }

      const text = segments.map(segment => segment.text).join(' ')
      if (!text.trim()) {
        logger.warn('youtube-transcript returned empty text', { url })
        return null
      }

      return {
        text,
        source: TranscriptSource.YOUTUBE_TRANSCRIPT,
        metadata: { segments }
      }
    } catch (error) {
      throw new TranscriptError(
        'Failed to fetch transcript using youtube-transcript',
        TranscriptSource.YOUTUBE_TRANSCRIPT,
        url,
        error as Error
      )
    }
  }

  private static async fetchUsingYTDLP(url: string): Promise<TranscriptResult | null> {
    try {
      logger.debug('Fetching transcript using yt-dlp', { url })
      const command = `yt-dlp --skip-download --write-auto-sub --sub-lang en --convert-subs srt --get-subs ${url}`
      
      const { stdout, stderr } = await execAsync(command)
      if (stderr) {
        logger.warn('yt-dlp command produced stderr output', { url, stderr })
      }

      const text = stdout.trim()
      if (!text) {
        logger.warn('yt-dlp returned empty transcript', { url })
        return null
      }

      return {
        text,
        source: TranscriptSource.YT_DLP
      }
    } catch (error) {
      throw new TranscriptError(
        'Failed to fetch transcript using yt-dlp',
        TranscriptSource.YT_DLP,
        url,
        error as Error
      )
    }
  }
}