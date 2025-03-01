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
    console.log('Creating QueueService with centralized Redis configuration');
    
    // Use either the provided URL or our centralized configuration
    let config;
    if (redisUrl) {
      console.log('Using provided Redis URL with family: 0 for dual-stack resolution');
      config = { 
        url: redisUrl, 
        family: 0, // Critical: Enable dual-stack IPv4/IPv6 lookup
        tls: process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production'
      };
    } else {
      console.log('Using centralized Redis configuration from environment');
      config = createRedisConfig();
    }
    
    this.queueService = createQueueService('podcast', config);
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