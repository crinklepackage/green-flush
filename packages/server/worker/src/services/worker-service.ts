// packages/server/worker/src/worker.service.ts
import { Queue, Worker, Job } from 'bullmq'
import { env } from '../config/environment'
import { TranscriptProcessor } from '../processors/transcript'
import { SummaryProcessor } from '../processors/summary'
import { createClient } from '@supabase/supabase-js'
import { Anthropic } from '@anthropic-ai/sdk'
import { ProcessingStatus, PodcastJob } from '@wavenotes/shared'
import { YouTubeApiClient } from '../platforms/youtube/api-client'
import { DatabaseService } from './database'
import { ClaudeClient } from './claude'
import { QueueService } from './queue'


// worker/services/worker.service.ts
export class WorkerService {
  private readonly podcastQueue: Queue
  private readonly podcastWorker: Worker
  private readonly podcastProcessor: PodcastProcessor

  constructor() {
    // Initialize services
    const db = new DatabaseService(supabase)
    const youtube = new YouTubeApiClient(env.YOUTUBE_CONFIG)
    const claude = new ClaudeClient(env.CLAUDE_API_KEY)
    
    // Initialize processors
    const transcriptProcessor = new TranscriptProcessor(youtube)
    const summaryProcessor = new SummaryProcessor(claude)
    
    // Create main processor
    this.podcastProcessor = new PodcastProcessor(
      db,
      transcriptProcessor,
      summaryProcessor
    )

    // Setup queue/worker
    this.podcastQueue = new Queue('podcast', {
      connection: { url: env.REDIS_URL }
    })

    this.podcastWorker = new Worker(
      'podcast',
      async (job) => {
        await this.podcastProcessor.process(job.data)
      },
      { connection: { url: env.REDIS_URL } }
    )

    // Handle events
    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.podcastWorker.on('completed', (job: Job<PodcastJob>) => {
      console.info('Job completed:', job.id)
    })

    this.podcastWorker.on('failed', (job, error) => {
      console.error('Job failed:', { jobId: job?.id, error })
    })
  }

  async close() {
    await this.podcastQueue.close()
    await this.podcastWorker.close()
  }
}