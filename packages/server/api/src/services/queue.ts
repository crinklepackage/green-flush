import { PodcastJobSchema, PodcastJob } from '@wavenotes-new/shared'
import { createQueueService } from './queue/index'
import { QueueServiceInterface } from './queue/queue-service.interface'
import { createRedisConfig } from '../config/redis-config'

/**
 * Main queue service for the API
 * 
 * This service wraps our queue implementation and provides domain-specific
 * methods for adding jobs to the queue with proper validation.
 */
export class QueueService {
  private queueService: QueueServiceInterface

  constructor(redisUrl?: string) {
    // In Railway environments, always use individual parameters to avoid
    // the problematic redis.railway.internal hostname
    if (process.env.RAILWAY_ENVIRONMENT === 'production') {
      console.log('QueueService: Railway environment detected, using direct connection parameters only');
      this.queueService = createQueueService('podcast', createRedisConfig(), { forceReal: true });
    } else {
      const config = redisUrl ? { url: redisUrl } : createRedisConfig();
      this.queueService = createQueueService('podcast', config);
    }
  }

  /**
   * Add a podcast processing job to the queue
   * 
   * @param type The job type
   * @param data The job data (will be validated)
   * @returns Promise that resolves when the job has been added
   */
  async add(type: 'PROCESS_PODCAST', data: PodcastJob): Promise<{ id: string }> {
    // Validate the job data
    const validated = PodcastJobSchema.parse(data)
    
    // Add the job to the queue
    const job = await this.queueService.addJob(type, validated)
    
    return { id: job.id }
  }

  /**
   * Check if the queue is connected to Redis
   */
  isConnected(): boolean {
    return this.queueService.isConnected()
  }

  /**
   * Perform a health check on the queue
   */
  async healthCheck(): Promise<{ status: string; details?: any }> {
    return this.queueService.healthCheck()
  }

  /**
   * Close the queue connection
   */
  async close(): Promise<void> {
    await this.queueService.close()
  }
} 