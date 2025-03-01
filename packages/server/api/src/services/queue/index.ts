// Re-export all queue service components
export * from './queue-service.interface';
export * from './bullmq-queue.service';
export * from './mock-queue.service';
export * from './queue-service.factory';

// Export a default factory function for easy queue creation
import { QueueServiceFactory } from './queue-service.factory';
import { QueueServiceInterface } from './queue-service.interface';
import { RedisConnectionConfig } from '../../config/redis-config';

/**
 * Creates a queue service with the provided name and configuration
 * 
 * This is a convenience function that uses the QueueServiceFactory internally.
 * 
 * @param queueName The name of the queue
 * @param config Optional Redis connection configuration
 * @param options Configuration options
 * @returns A QueueServiceInterface implementation
 */
export function createQueueService(
  queueName: string,
  config?: RedisConnectionConfig,
  options?: { useMock?: boolean; forceReal?: boolean }
): QueueServiceInterface {
  return QueueServiceFactory.createQueueService(queueName, config, options);
}

// Default export for simplified imports
export default createQueueService; 