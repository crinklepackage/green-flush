import { DatabaseService } from '../lib/database'
import { validateJobData, PodcastJob } from '../types/jobs'
import { ProcessingStatus } from '@wavenotes-new/shared'
import { ValidationError } from '@wavenotes-new/shared'
import { TranscriptProcessor } from './transcript'
import { SummaryProcessor } from './summary'

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

export class PodcastProcessor {
    constructor(
      private db: DatabaseService,
      private summaryProcessor: SummaryProcessor
    ) {}
  
    async process(rawJob: unknown) {
      const validated = await this.validateJob(rawJob)
      const { data: { podcastId, summaryId, url } } = validated
  
      try {
        // 1. Get transcript with timeout (5 minutes)
        await this.db.updateStatus(summaryId, ProcessingStatus.FETCHING_TRANSCRIPT)
        const transcriptPromise = TranscriptProcessor.getTranscript(url)
        const transcript = await withTimeout(
          transcriptPromise,
          5 * 60 * 1000, // 5 minutes
          'Transcript fetching timed out after 5 minutes'
        )
        
        // 2. Generate summary with timeout (10 minutes total)
        await this.db.updateStatus(summaryId, ProcessingStatus.GENERATING_SUMMARY)
        let fullSummary = ''
        
        // Use a timeout for the entire summary generation process
        const generateWithTimeout = async () => {
          const startTime = Date.now()
          const MAX_GENERATION_TIME = 10 * 60 * 1000 // 10 minutes
          
          for await (const chunk of this.summaryProcessor.generateSummary(transcript.text)) {
            // Check if we've exceeded our time limit
            if (Date.now() - startTime > MAX_GENERATION_TIME) {
              throw new Error('Summary generation timed out after 10 minutes')
            }
            
            fullSummary += chunk
            await this.db.appendSummary(summaryId, {
              text: fullSummary,
              status: ProcessingStatus.GENERATING_SUMMARY
            })
          }
          
          return fullSummary
        }
        
        await generateWithTimeout()

        // 3. Mark complete
        await this.db.updateStatus(summaryId, ProcessingStatus.COMPLETED)
      } catch (error) {
        await this.db.updateStatus(
          summaryId, 
          ProcessingStatus.FAILED,
          error instanceof Error ? error.message : 'Unknown error'
        )
        throw error
      }
    }
  
    private async validateJob(rawJob: unknown) {
      try {
        return validateJobData(rawJob)
      } catch (error: any) {
        throw new ValidationError('Invalid job data', error?.errors || [])
      }
    }
  
    private async processTranscript(podcastId: string, url: string) {
      await this.db.updatePodcast(podcastId, {
        status: ProcessingStatus.FETCHING_TRANSCRIPT
      })
      
      // Add timeout to transcript fetch
      const transcriptPromise = TranscriptProcessor.getTranscript(url)
      const transcript = await withTimeout(
        transcriptPromise,
        5 * 60 * 1000, // 5 minutes 
        'Transcript fetching timed out after 5 minutes'
      )
      
      await this.db.updatePodcast(podcastId, {
        transcript: transcript.text,
        has_transcript: true
      })
  
      return transcript
    }
  
    private async generateSummary(summaryId: string, text: string) {
      await this.db.updateStatus(summaryId, ProcessingStatus.GENERATING_SUMMARY)
      
      // Track time for the entire summary generation
      const startTime = Date.now()
      const MAX_GENERATION_TIME = 10 * 60 * 1000 // 10 minutes
      
      let accumulatedText = ''
      for await (const chunk of this.summaryProcessor.generateSummary(text)) {
        // Check if we've gone over time
        if (Date.now() - startTime > MAX_GENERATION_TIME) {
          throw new Error('Summary generation timed out after 10 minutes')
        }
        
        accumulatedText += chunk
        await this.db.appendSummary(summaryId, { 
          text: accumulatedText, 
          status: ProcessingStatus.GENERATING_SUMMARY 
        })
      }
    }
  
    private async handleError(summaryId: string, error: unknown) {
      await this.db.updateStatus(
        summaryId, 
        ProcessingStatus.FAILED, 
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }