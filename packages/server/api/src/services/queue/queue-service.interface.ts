/**
 * Queue Service Interface
 * 
 * This interface defines the contract for queue services,
 * allowing for different implementations (BullMQ, mock, etc.)
 * while maintaining consistent usage throughout the application.
 */

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  timeout?: number;
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

export interface Job<T = any> {
  id: string;
  data: T;
  status?: string | null;
}

export interface QueueServiceInterface {
  /**
   * Add a job to the queue
   * @param name Job type/name
   * @param data Job payload
   * @param options Job options
   */
  addJob<T>(name: string, data: T, options?: JobOptions): Promise<Job<T>>;
  
  /**
   * Retrieve a job by ID
   * @param id Job ID
   */
  getJob(id: string): Promise<Job | null>;
  
  /**
   * Check if the queue service is connected to Redis
   */
  isConnected(): boolean;
  
  /**
   * Perform a health check on the queue service
   */
  healthCheck(): Promise<{ status: string; details?: any }>;
  
  /**
   * Close the queue and clean up resources
   */
  close(): Promise<void>;
} 