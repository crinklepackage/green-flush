// packages/server/worker/src/services/content-processor.service.ts

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/environment';
// Use paths defined in tsconfig.json
import { DatabaseService } from '@wavenotes-new/api/lib/database';
import { ProcessingStatus } from '@wavenotes-new/shared';
import { TranscriptProcessor } from '../processors/transcript';
import { SummaryGeneratorService } from './summary-generator';
import { PlatformMatcher } from '@wavenotes-new/api/platforms/matcher/service';
import { SpotifyService } from '@wavenotes-new/api/platforms/spotify/service';

// Initialize Supabase client for worker using environment variables
const supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
// Create an instance of DatabaseService
const dbService = new DatabaseService(supabaseClient);
// Use our dbService instance for database operations instead of the imported db
const db = dbService;

// Create a SpotifyService instance using config credentials
const spotifyService = new SpotifyService({
  clientId: config.SPOTIFY_CLIENT_ID,
  clientSecret: config.SPOTIFY_CLIENT_SECRET
});

// Simple timeout helper function
const withTimeout = async <T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  errorMessage: string
): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });
  
  try {
    // Race the original promise against the timeout
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    // Clean up timeout to prevent memory leaks
    clearTimeout(timeoutId!);
  }
};

export class ContentProcessorService {
  async processPodcast(jobData: any): Promise<void> {
    // jobData should include podcastId, summaryId, url, and type.
    let { podcastId, summaryId, url, type } = jobData;
    console.log(`Processing podcast. PodcastID: ${podcastId}, SummaryID: ${summaryId}, URL: ${url}`);
    
    try {
      // If the job is for a Spotify link, check if a YouTube match is needed
      if (type === 'spotify') {
        // Retrieve the podcast record by URL
        const podcastRecord = await db.findPodcastByUrl(url);
        // Use a type cast to access youtube_url property
        const existingYoutubeUrl = podcastRecord ? (podcastRecord as any).youtube_url : null;
        if (podcastRecord && !existingYoutubeUrl) {
          console.info('No YouTube URL found. Triggering matching logic for Spotify link.');
          // Use PlatformMatcher to attempt to find a matching YouTube video with timeout
          const matchUrlPromise = PlatformMatcher.findYouTubeMatch(url, spotifyService);
          const matchUrl = await withTimeout(
            matchUrlPromise,
            3 * 60 * 1000, // 3 minutes timeout for matching
            'YouTube matching timed out after 3 minutes'
          );
          
          if (matchUrl) {
            // Update the podcast record with the found YouTube URL
            await db.updatePodcastInfo(podcastId, matchUrl);
            console.info(`Matching YouTube URL found: ${matchUrl}`);
            // Use the matched URL for transcript processing
            url = matchUrl;
          } else {
            // In case no match is found, log the failed search
            console.error('No matching YouTube video found for the Spotify link.');
            // Extract Spotify metadata to build search query
            const spotifyMetadata = await spotifyService.getEpisodeInfo(url);
            const searchQuery = `${spotifyMetadata.title} ${spotifyMetadata.showName}`;
            await db.logFailedYouTubeSearch({
              search_query: searchQuery,
              spotify_show_name: spotifyMetadata.showName,
              spotify_title: spotifyMetadata.title,
              spotify_url: url,
              resolved_youtube_url: null,
              resolved: false,
              created_at: new Date().toISOString()
            });
            throw new Error("Spotify links are experimental; we were unable to find a video transcript to summarize.");
          }
        } else if (podcastRecord && existingYoutubeUrl) {
          // If already set, use the existing YouTube URL
          url = existingYoutubeUrl;
          console.info(`Using existing YouTube URL: ${url}`);
        }
      }
      
      // 1. Update status to FETCHING_TRANSCRIPT
      await db.updateSummaryStatus(summaryId, ProcessingStatus.FETCHING_TRANSCRIPT);
      
      // 2. Fetch transcript using TranscriptProcessor with timeout (5 minutes)
      const transcriptPromise = TranscriptProcessor.getTranscript(url);
      const transcript = await withTimeout(
        transcriptPromise,
        5 * 60 * 1000, // 5 minutes
        'Transcript fetch timed out after 5 minutes'
      );
      
      if (!transcript) {
        await db.updateSummaryStatus(summaryId, ProcessingStatus.FAILED, 'Transcript not available');
        return;
      }
      
      // 3. Update status to GENERATING_SUMMARY
      await db.updateSummaryStatus(summaryId, ProcessingStatus.GENERATING_SUMMARY);
      
      // 4. Generate summary with timeout tracking
      let accumulatedSummary = '';
      const startTime = Date.now();
      const MAX_GENERATION_TIME = 10 * 60 * 1000; // 10 minutes
      
      const generateWithTimeout = async () => {
        return await SummaryGeneratorService.generateSummary(transcript.text, async (chunk: string) => {
          // Check if we've gone over time
          if (Date.now() - startTime > MAX_GENERATION_TIME) {
            throw new Error('Summary generation timed out after 10 minutes');
          }
          
          accumulatedSummary += chunk;
          // Append the summary chunk to the summary record
          await db.appendSummary(summaryId, {
            text: accumulatedSummary,
            status: ProcessingStatus.GENERATING_SUMMARY
          });
        });
      };
      
      const { inputTokens, outputTokens } = await generateWithTimeout();
      
      // Update the token counts in the database
      await db.updateSummaryTokens(summaryId, inputTokens, outputTokens);
      
      // 5. Update status to COMPLETED
      await db.updateSummaryStatus(summaryId, ProcessingStatus.COMPLETED);
      
      console.log('Podcast processed successfully.');
    } catch (error) {
      await db.updateSummaryStatus(
        summaryId,
        ProcessingStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.error('Error processing podcast:', error);
      throw error;
    }
  }
}