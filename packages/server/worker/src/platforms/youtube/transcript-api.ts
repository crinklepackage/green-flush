// packages/server/worker/src/platforms/youtube/transcript-api.ts
import { YoutubeTranscript } from 'youtube-transcript'
import { TranscriptSource, TranscriptResult } from '@wavenotes-new/shared'

export class YoutubeTranscriptApi {
 async getTranscript(videoId: string): Promise<TranscriptResult | null> {
   try {
     const segments = await YoutubeTranscript.fetchTranscript(videoId)
     
     if (!segments?.length) {
       console.warn('youtube-transcript returned empty segments', { videoId })
       return null
     }

     const text = segments.map(segment => segment.text).join(' ')
     if (!text.trim()) {
       console.warn('youtube-transcript returned empty text', { videoId })
       return null
     }

     return {
       text,
       available: text.trim().length > 0,
       source: TranscriptSource.YOUTUBE_TRANSCRIPT
     }
   } catch (error) {
     console.error('youtube-transcript fetch failed:', {
       videoId,
       error: error instanceof Error ? error.message : String(error)
     })
     return null
   }
 }
}

export const youtubeTranscriptApi = new YoutubeTranscriptApi()