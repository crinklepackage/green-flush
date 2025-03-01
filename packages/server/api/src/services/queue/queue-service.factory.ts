import { QueueServiceInterface } from './queue-service.interface';
import { BullMQQueueService } from './bullmq-queue.service';
import { MockQueueService } from './mock-queue.service';
import { RedisConnectionConfig } from '../../config/redis-config';

/**
 * Factory for creating the appropriate queue service implementation
 * based on the current environment and configuration
 */
export class QueueServiceFactory {
  /**
   * Creates a queue service instance based on environment and configuration
   * 
   * @param queueName The name of the queue
   * @param config Optional Redis connection configuration
   * @param options Configuration options for the factory
   * @returns A QueueServiceInterface implementation
   */
  static createQueueService(
    queueName: string,
    config?: RedisConnectionConfig,
    options: {
      useMock?: boolean;
      forceReal?: boolean;
    } = {}
  ): QueueServiceInterface {
    // Determine if we should use the mock implementation
    const useMock = determineIfShouldUseMock(options);
    
    if (useMock) {
      console.log(`Creating mock queue service for "${queueName}"`);
      return new MockQueueService(queueName);
    }
    
    console.log(`Creating BullMQ queue service for "${queueName}"`);
    return new BullMQQueueService(queueName, config);
  }
}

/**
 * Determines if the mock implementation should be used based on
 * environment variables and provided options
 */
function determineIfShouldUseMock(options: { useMock?: boolean; forceReal?: boolean } = {}): boolean {
  // Explicit override to use mock
  if (options.useMock === true) {
    return true;
  }
  
  // Explicit override to use real implementation
  if (options.forceReal === true) {
    return false;
  }
  
  // Check environment variables
  const useRealQueue = process.env.USE_REAL_QUEUE === 'true';
  const useMockQueue = process.env.USE_MOCK_QUEUE === 'true';
  
  // Explicit environment variable takes precedence
  if (useRealQueue) return false;
  if (useMockQueue) return true;
  
  // Default behavior based on environment
  const isDev = process.env.NODE_ENV !== 'production';
  const isTest = process.env.NODE_ENV === 'test';
  
  // Use mock in test environments by default
  if (isTest) return true;
  
  // In development, check if REDIS_URL or REDIS_HOST are available
  // If not available, default to mock implementation
  if (isDev) {
    const hasRedisUrl = !!process.env.REDIS_URL;
    const hasRedisHost = !!(process.env.REDIS_HOST || process.env.REDISHOST);
    return !(hasRedisUrl || hasRedisHost);
  }
  
  // In production, always use real implementation
  return false;
} 