// packages/server/worker/src/services/content-processor.service.ts

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/environment';
import { DatabaseService } from '@wavenotes-new/api';
import { ProcessingStatus } from '@wavenotes-new/shared';
import { TranscriptProcessor } from '../processors/transcript';
import { SummaryGeneratorService } from './summary-generator';
import { PlatformMatcher } from '@wavenotes-new/api/src/platforms/matcher/service';
import { SpotifyService } from '@wavenotes-new/api/src/platforms/spotify/service';

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
        // Use a type cast to access youtube_url since it may not be defined on PodcastRecord
        const existingYoutubeUrl = podcastRecord ? (podcastRecord as any).youtube_url : null;
        if (podcastRecord && !existingYoutubeUrl) {
          console.info('No YouTube URL found. Triggering matching logic for Spotify link.');
          // Use PlatformMatcher to attempt to find a matching YouTube video
          const matchUrl = await PlatformMatcher.findYouTubeMatch(url, spotifyService);
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
      
      // 2. Fetch transcript using TranscriptProcessor (expects a valid YouTube URL)
      const transcript = await TranscriptProcessor.getTranscript(url);
      if (!transcript) {
        await db.updateSummaryStatus(summaryId, ProcessingStatus.FAILED, 'Transcript not available');
        return;
      }
      
      // 3. Update status to GENERATING_SUMMARY
      await db.updateSummaryStatus(summaryId, ProcessingStatus.GENERATING_SUMMARY);
      
      // 4. Generate summary in streaming mode and capture token counts
      let accumulatedSummary = '';
      const { inputTokens, outputTokens } = await SummaryGeneratorService.generateSummary(transcript.text, async (chunk: string) => {
        accumulatedSummary += chunk;
        // Append the summary chunk to the summary record
        await db.appendSummary(summaryId, {
          text: accumulatedSummary,
          status: ProcessingStatus.GENERATING_SUMMARY
        });
      });
      
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