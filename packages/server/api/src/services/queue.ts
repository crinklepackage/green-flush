import { Queue } from 'bullmq'
import { PodcastJobSchema, PodcastJob } from '@wavenotes-new/shared'

export class QueueService {
  private queue: Queue

  constructor(private redisUrl: string) {
    this.queue = new Queue('podcast', {
      connection: { url: redisUrl }
    })
  }

  async add(type: 'PROCESS_PODCAST', data: PodcastJob): Promise<void> {
    const validated = PodcastJobSchema.parse(data)
    await this.queue.add(type, validated)
  }

  async close() {
    await this.queue.close()
  }
} 