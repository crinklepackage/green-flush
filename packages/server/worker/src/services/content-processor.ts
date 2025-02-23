// packages/server/worker/src/services/content-processor.service.ts

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/environment';
import { DatabaseService } from '@wavenotes-new/api';
import { ProcessingStatus } from '@wavenotes-new/shared';
import { TranscriptProcessor } from '../processors/transcript';
import { SummaryGeneratorService } from './summary-generator';

// Initialize Supabase client for worker using environment variables
const supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
// Create an instance of DatabaseService
const db = new DatabaseService(supabaseClient);

export class ContentProcessorService {
  async processPodcast(jobData: any): Promise<void> {
    // jobData should include podcastId, summaryId, and url.
    const { podcastId, summaryId, url } = jobData;
    console.log(`Processing podcast. PodcastID: ${podcastId}, SummaryID: ${summaryId}, URL: ${url}`);
    
    try {
      // 1. Update status to FETCHING_TRANSCRIPT using real DB update
      await db.updateStatus(summaryId, ProcessingStatus.FETCHING_TRANSCRIPT);

      // 2. Fetch transcript using TranscriptProcessor
      const transcript = await TranscriptProcessor.getTranscript(url);
      if (!transcript) {
        await db.updateStatus(summaryId, ProcessingStatus.FAILED, 'Transcript not available');
        return;
      }
      
      // 3. Update status to GENERATING_SUMMARY
      await db.updateStatus(summaryId, ProcessingStatus.GENERATING_SUMMARY);

      // 4. Generate summary in streaming mode using SummaryGeneratorService
      let accumulatedSummary = '';
      await SummaryGeneratorService.generateSummary(transcript.text, async (chunk: string) => {
        accumulatedSummary += chunk;
        // Append the summary chunk to the summary record
        await db.appendSummary(summaryId, {
          text: accumulatedSummary,
          status: ProcessingStatus.GENERATING_SUMMARY
        });
      });
      
      // 5. Update status to COMPLETED
      await db.updateStatus(summaryId, ProcessingStatus.COMPLETED);
      
      console.log('Podcast processed successfully.');
    } catch (error) {
      await db.updateStatus(
        summaryId,
        ProcessingStatus.FAILED,
        error instanceof Error ? error.message : 'Unknown error'
      );
      console.error('Error processing podcast:', error);
      throw error;
    }
  }
}