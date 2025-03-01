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
  private serviceAvailable: boolean = true

  constructor(redisUrl?: string) {
    console.log('Creating QueueService with centralized Redis configuration');
    
    // Use either the provided URL or our centralized configuration
    let config;
    try {
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
      
      // Set a timeout to check if Redis connected successfully
      setTimeout(() => {
        if (!this.isConnected()) {
          console.warn('Queue service failed to connect after 30 seconds, marking as unavailable');
          this.serviceAvailable = false;
        }
      }, 30000);
    } catch (error) {
      console.error('Failed to initialize queue service:', error);
      this.serviceAvailable = false;
      // Create a dummy queue service that logs errors for all operations
      this.queueService = this.createFallbackService();
    }
  }

  /**
   * Create a fallback queue service when Redis connection fails
   * This prevents the application from crashing, but logs errors
   */
  private createFallbackService(): QueueServiceInterface {
    return {
      addJob: async (name: string, data: any) => {
        console.error(`Cannot add job ${name} - Redis connection failed`);
        return { id: `dummy-${Date.now()}`, data, status: 'failed' };
      },
      getJob: async () => null,
      isConnected: () => false,
      healthCheck: async () => ({ status: 'error', details: 'Redis connection failed' }),
      close: async () => { /* no-op */ }
    };
  }

  /**
   * Add a podcast processing job to the queue
   * 
   * @param type The job type
   * @param data The job data (will be validated)
   * @returns Promise that resolves when the job has been added
   */
  async add(type: 'PROCESS_PODCAST', data: PodcastJob): Promise<{ id: string }> {
    try {
      // Validate the job data
      const validated = PodcastJobSchema.parse(data)
      
      // Add the job to the queue
      const job = await this.queueService.addJob(type, validated)
      
      return { id: job.id }
    } catch (error) {
      // Log the error but don't crash the application
      console.error(`Failed to add ${type} job to queue:`, error);
      
      // Return a placeholder ID to allow the application to continue
      return { id: `error-${Date.now()}` };
    }
  }

  /**
   * Check if the queue is connected to Redis
   */
  isConnected(): boolean {
    try {
      return this.serviceAvailable && this.queueService.isConnected();
    } catch (error) {
      return false;
    }
  }

  /**
   * Perform a health check on the queue
   */
  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      if (!this.serviceAvailable) {
        return { status: 'unavailable', details: 'Redis connection failed during initialization' };
      }
      return this.queueService.healthCheck();
    } catch (error) {
      return { 
        status: 'error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Close the queue connection
   */
  async close(): Promise<void> {
    try {
      if (this.serviceAvailable) {
        await this.queueService.close();
      }
    } catch (error) {
      console.error('Error closing queue service:', error);
    }
  }
} 