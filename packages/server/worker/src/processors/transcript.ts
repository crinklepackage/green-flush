// packages/server/worker/src/processors/transcript.ts
import { z } from 'zod'
import { TranscriptSource, TranscriptResult, TranscriptError } from '@wavenotes-new/shared'
import { youtubeApiClient } from '../platforms/youtube/api-client'
import { youtubeTranscriptApi } from '../platforms/youtube/transcript-api'
import { supadataApi } from '../platforms/youtube/supadata'
import { spotifyApiClient } from '../platforms/spotify/api-client'
import { extractYouTubeVideoId } from '@wavenotes-new/shared/src/utils/url-utils'

// Add the following declaration at the top of the file (after the imports):
declare var AggregateError: {
  new(errors: Iterable<any>, message?: string): Error;
  };

// Validation schemas
const TranscriptResultSchema = z.object({
  text: z.string(),
  available: z.boolean(),
  source: z.enum([
    TranscriptSource.SUPADATA,
    TranscriptSource.YOUTUBE_TRANSCRIPT,
    TranscriptSource.YOUTUBE_API
  ]),
  language: z.string().optional(),
  duration: z.number().optional()
})

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
   const urlObj = new URL(youtubeUrl);
   if (urlObj.hostname.includes('spotify.com')) {
     const episodeId = this.extractSpotifyEpisodeId(youtubeUrl);
     if (!episodeId) {
       throw new TranscriptError('Invalid Spotify URL', 'INVALID_URL', youtubeUrl);
     }
     try {
       console.info(`Attempting to fetch transcript for Spotify episode with ID: ${episodeId}`);
       const rawResult = await spotifyApiClient.getTranscript(episodeId);
       if (rawResult?.text) {
         const result = TranscriptResultSchema.parse({
           ...rawResult,
           available: rawResult.text.trim().length > 0,
           source: 'SPOTIFY'
         });
         console.info(`Successfully fetched transcript via Spotify`, { episodeId, textLength: result.text.length });
         return result;
       } else {
         throw new TranscriptError('No transcript data from Spotify', 'NO_TRANSCRIPT', youtubeUrl);
       }
     } catch (error) {
       console.error(`Failed to fetch transcript from Spotify`, {
         episodeId,
         error: error instanceof Error ? error.message : String(error)
       });
       throw error;
     }
   }

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
       const rawResult = await this.fetchFromSource(source, videoId)
       
       if (rawResult?.text) {
         // Validate the result
         const result = TranscriptResultSchema.parse({
           ...rawResult,
           available: rawResult.text.trim().length > 0,
           source
         })
         
         console.info(`Successfully fetched transcript via ${source}`, { 
           videoId,
           textLength: result.text.length 
         })
         return result
       }
       return null
     } catch (error) {
       if (error instanceof z.ZodError) {
         console.error(`Invalid transcript data from ${source}:`, error.errors)
         errors[source] = new Error(`Invalid transcript format: ${error.message}`)
       } else {
         errors[source] = error as Error
         console.error(`Failed to fetch transcript from ${source}`, {
           videoId,
           error: error instanceof Error ? error.message : String(error)
         })
       }
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
   return extractYouTubeVideoId(url)
 }

 private static extractSpotifyEpisodeId(url: string): string | null {
   try {
     const urlObj = new URL(url);
     const parts = urlObj.pathname.split('/');
     // Expecting a URL path like '/episode/{episodeId}'
     const episodeIndex = parts.indexOf('episode');
     if (episodeIndex !== -1 && parts.length > episodeIndex + 1) {
       return parts[episodeIndex + 1];
     }
     return null;
   } catch {
     return null;
   }
 }
}