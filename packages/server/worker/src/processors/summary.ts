// packages/server/worker/src/processors/summary.ts
import { z } from 'zod'
import { DatabaseService } from '../services/database'
import { ClaudeClient } from '../services/claude'
import { QueueService } from '../services/queue'
import { ProcessingStatus } from '@wavenotes-new/shared/node'
import Bull from 'bull'
import { PodcastJob } from '../types/jobs'

// Validation schemas
const ProgressUpdateSchema = z.object({
  status: z.enum([
    ProcessingStatus.FETCHING_TRANSCRIPT,
    ProcessingStatus.GENERATING_SUMMARY,
    ProcessingStatus.COMPLETED,
    ProcessingStatus.FAILED
  ]),
  progress: z.number().min(0).max(100),
  content: z.string().optional(),
  error_message: z.string().optional()
})

type ProgressUpdate = z.infer<typeof ProgressUpdateSchema>

export class SummaryProcessor {
  constructor(
    private db: DatabaseService,
    private claude: ClaudeClient,
    private queue: QueueService
  ) {}

  async process(job: Bull.Job<PodcastJob>): Promise<void> {
    const { summaryId, podcastId } = job.data

    try {
      // Update progress
      await this.updateProgress(summaryId, {
        status: ProcessingStatus.FETCHING_TRANSCRIPT,
        progress: 0
      })

      // Get transcript
      const transcript = await this.getTranscript(podcastId)
      await this.updateProgress(summaryId, {
        status: ProcessingStatus.FETCHING_TRANSCRIPT,
        progress: 50
      })

      // Generate summary
      const summary = await this.generateSummary(transcript)
      
      // Update final status
      await this.updateProgress(summaryId, {
        status: ProcessingStatus.COMPLETED,
        progress: 100,
        content: summary
      })

    } catch (error) {
      await this.handleError(summaryId, error)
      throw error
    }
  }

  private async updateProgress(
    summaryId: string, 
    update: ProgressUpdate
  ): Promise<void> {
    try {
      // Validate update data
      const validatedUpdate = ProgressUpdateSchema.parse({
        ...update,
        updated_at: new Date()
      })

      await this.db.updateSummary(summaryId, validatedUpdate)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Invalid progress update:', error.errors)
        throw new Error(`Invalid progress update format: ${error.message}`)
      }
      throw error
    }
  }

  private async handleError(summaryId: string, error: Error): Promise<void> {
    await this.updateProgress(summaryId, {
      status: ProcessingStatus.FAILED,
      progress: 0,
      error_message: error.message
    })
  }
}