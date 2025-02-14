// packages/server/worker/src/processors/summary.ts
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
    update: { 
      status: ProcessingStatus
      progress: number
      content?: string
    }
  ): Promise<void> {
    await this.db.updateSummary(summaryId, {
      ...update,
      updated_at: new Date()
    })
  }

  private async handleError(summaryId: string, error: Error): Promise<void> {
    await this.db.updateSummary(summaryId, {
      status: ProcessingStatus.FAILED,
      error_message: error.message,
      updated_at: new Date()
    })
  }
}