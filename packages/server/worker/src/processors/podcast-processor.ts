import { DatabaseService } from '../lib/database'
import { validateJobData, PodcastJob } from '../types/jobs'
import { ProcessingStatus } from '@wavenotes-new/shared'
import { ValidationError } from '@wavenotes-new/shared'
import { TranscriptProcessor } from './transcript'
import { SummaryProcessor } from './summary'

export class PodcastProcessor {
    constructor(
      private db: DatabaseService,
      private summaryProcessor: SummaryProcessor
    ) {}
  
    async process(rawJob: unknown) {
      const validated = await this.validateJob(rawJob)
      const { data: { podcastId, summaryId, url } } = validated
  
      try {
        // 1. Get transcript
        await this.db.updateStatus(summaryId, ProcessingStatus.FETCHING_TRANSCRIPT)
        const transcript = await TranscriptProcessor.getTranscript(url)
        
        // 2. Generate summary
        await this.db.updateStatus(summaryId, ProcessingStatus.GENERATING_SUMMARY)
        let fullSummary = ''
        
        for await (const chunk of this.summaryProcessor.generateSummary(transcript.text)) {
          fullSummary += chunk
          await this.db.appendSummary(summaryId, {
            text: fullSummary,
            status: ProcessingStatus.GENERATING_SUMMARY
          })
        }

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
      
      const transcript = await TranscriptProcessor.getTranscript(url)
      
      await this.db.updatePodcast(podcastId, {
        transcript: transcript.text,
        has_transcript: true
      })
  
      return transcript
    }
  
    private async generateSummary(summaryId: string, text: string) {
      await this.db.updateStatus(summaryId, ProcessingStatus.GENERATING_SUMMARY)
      
      for await (const chunk of this.summaryProcessor.generateSummary(text)) {
        await this.db.appendSummary(summaryId, { text: chunk, status: ProcessingStatus.GENERATING_SUMMARY })
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