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
    
    // CRITICAL: Ensure config has family:0 set for Railway DNS resolution
    if (!config) {
      console.log('CRITICAL: No Redis config provided to factory, creating with family:0');
      config = {
        family: 0 // Explicitly set for empty config
      };
    } else {
      // Guarantee family is set to 0 for DNS resolution
      if (config.family !== 0) {
        console.log('CRITICAL: Forcing family:0 setting for Redis configuration in factory');
        config.family = 0;
      } else {
        console.log('CRITICAL: Verified family:0 is already set correctly in factory');
      }
    }
    
    // Final check to ensure it's set
    if (config.family !== 0) {
      console.error('ERROR: family is still not 0 after attempts to set it. Forcing again.');
      config.family = 0;
    }
    
    // Log the final configuration for debugging
    console.log(`FACTORY FINAL CONFIG: Creating BullMQ queue service for "${queueName}" with family=${config.family}`);
    
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