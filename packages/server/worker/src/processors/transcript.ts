// packages/server/worker/src/processors/transcript.ts
import { TranscriptSource, TranscriptResult, TranscriptError } from '@wavenotes/shared'
import { youtubeApiClient } from '../platforms/youtube/api-client'
import { youtubeTranscriptApi } from '../platforms/youtube/transcript-api'
import { supadataApi } from '../platforms/youtube/supadata'

export class TranscriptProcessor {
 private static getSourceOrder(): TranscriptSource[] {
   if (process.env.NODE_ENV === 'production') {
     return [
       TranscriptSource.SUPADATA,
       TranscriptSource.YOUTUBE_TRANSCRIPT,
       TranscriptSource.YOUTUBE_API
     ]
   }
   return [
     TranscriptSource.YOUTUBE_TRANSCRIPT,
     TranscriptSource.YOUTUBE_API,
     TranscriptSource.SUPADATA
   ]
 }

 static async getTranscript(youtubeUrl: string): Promise<TranscriptResult> {
   const videoId = this.extractVideoId(youtubeUrl)
   if (!videoId) {
     throw new TranscriptError(
       'Invalid YouTube URL',
       'INVALID_URL',
       youtubeUrl
     )
   }

   const sources = this.getSourceOrder()
   const errors: Record<TranscriptSource, Error | null> = {} as any

   // Try each source in parallel
   const attempts = sources.map(async (source) => {
     try {
       console.info(`Attempting to fetch transcript using ${source}`, { videoId })
       const result = await this.fetchFromSource(source, videoId)
       
       if (result?.text) {
         console.info(`Successfully fetched transcript via ${source}`, { 
           videoId,
           textLength: result.text.length 
         })
         return result
       }
       return null
     } catch (error) {
       errors[source] = error as Error
       console.error(`Failed to fetch transcript from ${source}`, {
         videoId,
         error: error instanceof Error ? error.message : String(error)
       })
       return null
     }
   })

   // Wait for first successful result or all failures
   const results = await Promise.all(attempts)
   const firstSuccess = results.find(result => result !== null)

   if (firstSuccess) {
     return firstSuccess
   }

   // If all sources failed, throw error with details
   throw new TranscriptError(
     'Failed to fetch transcript from all available sources',
     'ALL_SOURCES_FAILED',
     youtubeUrl,
     new AggregateError(Object.values(errors).filter(Boolean))
   )
 }

 private static async fetchFromSource(
   source: TranscriptSource, 
   videoId: string
 ): Promise<TranscriptResult | null> {
   switch (source) {
     case TranscriptSource.YOUTUBE_TRANSCRIPT:
       return youtubeTranscriptApi.getTranscript(videoId)
     case TranscriptSource.YOUTUBE_API:
       return youtubeApiClient.getTranscript(videoId)
     case TranscriptSource.SUPADATA:
       return supadataApi.getTranscript(videoId)
     default:
       return null
   }
 }

 private static extractVideoId(url: string): string | null {
   try {
     const urlObj = new URL(url)
     
     // Handle youtu.be format
     if (urlObj.hostname === 'youtu.be') {
       return urlObj.pathname.slice(1)
     }

     // Handle youtube.com formats
     if (urlObj.hostname.includes('youtube.com')) {
       // Handle /shorts/
       if (urlObj.pathname.startsWith('/shorts/')) {
         return urlObj.pathname.split('/')[2]
       }

       // Handle watch?v=
       const videoId = urlObj.searchParams.get('v')
       if (videoId) return videoId

       // Handle /embed/ or /v/
       if (urlObj.pathname.startsWith('/embed/') || urlObj.pathname.startsWith('/v/')) {
         return urlObj.pathname.split('/')[2]
       }
     }

     return null
   } catch {
     return null
   }
 }
}