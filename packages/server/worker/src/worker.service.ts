// packages/server/worker/src/worker.service.ts
import { Queue, Worker, Job } from 'bullmq'
import { env } from './config/environment'
import { TranscriptProcessor } from './processors/transcript'
import { SummaryProcessor } from './processors/summary'
import { createClient } from '@supabase/supabase-js'
import { Anthropic } from '@anthropic-ai/sdk'
import { ProcessingStatus, PodcastJob } from '@wavenotes/shared'
import { YouTubeApiClient } from './platforms/youtube/api-client'

export class WorkerService {
  private readonly supabase
  private readonly claude
  private readonly podcastQueue: Queue
  private readonly podcastWorker: Worker
  private readonly transcriptProcessor: TranscriptProcessor
  private readonly summaryProcessor: SummaryProcessor
  private readonly youtube: YouTubeApiClient

  constructor() {
    // Initialize clients
    this.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
    this.claude = new Anthropic({ apiKey: env.CLAUDE_API_KEY })
    this.youtube = new YouTubeApiClient(
      env.YOUTUBE_OAUTH_CLIENT_ID,
      env.YOUTUBE_OAUTH_CLIENT_SECRET,
      env.YOUTUBE_OAUTH_REFRESH_TOKEN
    )
    
    // Initialize processors
    this.transcriptProcessor = new TranscriptProcessor(this.youtube)
    this.summaryProcessor = new SummaryProcessor(this.claude)

    // Initialize queue
    this.podcastQueue = new Queue('podcast', {
      connection: { url: env.REDIS_URL }
    })

    // Initialize worker
    this.podcastWorker = new Worker(
      'podcast',
      this.processJob.bind(this),
      { 
        connection: { url: env.REDIS_URL },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      }
    )

    // Handle events
    this.podcastWorker.on('completed', (job) => {
      console.info('Podcast job completed:', { jobId: job.id })
    })

    this.podcastWorker.on('failed', (job, error) => {
      console.error('Podcast job failed:', { 
        jobId: job?.id, 
        error: error.message 
      })
    })
  }

  private async processJob(job: Job<PodcastJob>) {
    const { url, summaryId } = job.data

    try {
      // Initialize YouTube client if not already done
      await this.youtube.initialize()

      // Get transcript
      await this.updateStatus(summaryId, ProcessingStatus.FETCHING_TRANSCRIPT)
      const transcript = await this.transcriptProcessor.getTranscript(url)

      // Generate summary
      await this.updateStatus(summaryId, ProcessingStatus.GENERATING_SUMMARY)
      for await (const chunk of this.summaryProcessor.generateSummary(transcript.text)) {
        await this.updateProgress(summaryId, chunk)
      }

      await this.updateStatus(summaryId, ProcessingStatus.COMPLETED)
    } catch (error) {
      await this.handleError(summaryId, error)
      throw error
    }
  }

  private async updateStatus(summaryId: string, status: ProcessingStatus): Promise<void> {
    await this.supabase
      .from('summaries')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', summaryId)
  }

  private async updateProgress(summaryId: string, content: string): Promise<void> {
    await this.supabase
      .from('summaries')
      .update({ 
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', summaryId)
  }

  private async handleError(summaryId: string, error: Error): Promise<void> {
    await this.supabase
      .from('summaries')
      .update({ 
        status: ProcessingStatus.FAILED,
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', summaryId)
  }

  async close(): Promise<void> {
    await this.podcastQueue.close()
    await this.podcastWorker.close()
  }
}