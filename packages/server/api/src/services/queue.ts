import { Queue } from 'bullmq'
import { PodcastJobSchema, PodcastJob } from '../../../../shared/src'

export class QueueService {
  private queue: Queue

  constructor(private redisUrl: string) {
    if (!redisUrl) {
      console.error('Redis URL is empty or not configured correctly');
      throw new Error('Redis URL is required for QueueService');
    }
    
    try {
      this.queue = new Queue('podcast', {
        connection: { url: redisUrl }
      });
      console.log('Queue initialized with Redis URL');
    } catch (error: any) {
      console.error('Failed to initialize queue with Redis:', error);
      throw new Error(`Failed to connect to Redis: ${error.message || String(error)}`);
    }
  }

  async add(type: 'PROCESS_PODCAST', data: PodcastJob): Promise<void> {
    try {
      const validated = PodcastJobSchema.parse(data);
      await this.queue.add(type, validated);
    } catch (error: any) {
      console.error('Error adding job to queue:', error);
      throw new Error(`Failed to add job to queue: ${error.message || String(error)}`);
    }
  }

  async close() {
    await this.queue.close()
  }
} 