import { DatabaseService } from '../services/database'
import { validateJobData, PodcastJob } from '../types/jobs'
import { ProcessingStatus } from '@wavenotes-new/shared/node'
import { ValidationError } from '@wavenotes-new/shared/node'
import { TranscriptProcessor } from './transcript'
import { SummaryProcessor } from './summary'

export class PodcastProcessor {
  constructor(
    private db: DatabaseService,
    private transcriptProcessor: TranscriptProcessor,
    private summaryProcessor: SummaryProcessor
  ) {}

  async process(rawJob: unknown) {
    try {
      // 1. Validate job data
      const job = validateJobData(rawJob)
      const { podcastId, summaryId, url } = job.data

      // 2. Get transcript
      await this.db.updatePodcastStatus(podcastId, {
        status: ProcessingStatus.FETCHING_TRANSCRIPT
      })
      
      const transcript = await this.transcriptProcessor.getTranscript(url)
      
      // 3. Update podcast with transcript
      await this.db.updatePodcast(podcastId, {
        transcript: transcript.text,
        has_transcript: true
      })

      // 4. Generate summary
      await this.db.updateSummaryStatus(summaryId, ProcessingStatus.GENERATING_SUMMARY)
      
      for await (const chunk of this.summaryProcessor.generateSummary(transcript.text)) {
        await this.db.appendSummaryContent(summaryId, chunk)
      }

      // 5. Mark as completed
      await this.db.updateSummaryStatus(summaryId, ProcessingStatus.COMPLETED)

    } catch (error) {
      if (error instanceof ValidationError) {
        console.error('Job validation failed:', error.errors)
      }
      await this.db.updateSummaryStatus(
        summaryId, 
        ProcessingStatus.FAILED, 
        error instanceof Error ? error.message : 'Unknown error'
      )
      throw error
    }
  }
} 