import { Queue, QueueEvents, QueueOptions, QueueEventsOptions } from 'bullmq';
import { QueueServiceInterface, JobOptions, Job } from './queue-service.interface';
import { RedisConnectionConfig, createRedisConfig, getRedisConnectionString } from '../../config/redis-config';
// Import IORedis directly to have more control over client creation
import Redis, { RedisOptions } from 'ioredis';

/**
 * BullMQ implementation of the QueueServiceInterface
 * 
 * This class provides a concrete implementation of the queue service using BullMQ,
 * with support for Railway's Redis service and proper connection management.
 */
export class BullMQQueueService implements QueueServiceInterface {
  private queue: Queue | null = null;
  private queueEvents: QueueEvents | null = null;
  private connected = false;
  private connecting = false;
  private connectionConfig: RedisConnectionConfig;
  private redisClients: Redis[] = []; // Track Redis clients for proper cleanup
  
  constructor(
    private readonly queueName: string,
    config?: RedisConnectionConfig
  ) {
    // Use provided config or create from environment
    this.connectionConfig = config || createRedisConfig();
    this.initializeQueue();
  }
  
  private initializeQueue(): void {
    if (this.connecting || this.queue) return;
    
    try {
      this.connecting = true;
      
      console.log(`Initializing queue "${this.queueName}" with connection:`, 
                 getRedisConnectionString(this.connectionConfig));
      
      // Add detailed config logging in Railway environment
      if (process.env.RAILWAY_ENVIRONMENT === 'production') {
        console.log('BullMQ connection config details:', {
          host: this.connectionConfig.host,
          port: this.connectionConfig.port,
          url: this.connectionConfig.url,
          family: this.connectionConfig.family,
          connectTimeout: this.connectionConfig.connectTimeout,
          hasUsername: !!this.connectionConfig.username,
          hasPassword: !!this.connectionConfig.password,
          tls: this.connectionConfig.tls,
          maxRetriesPerRequest: this.connectionConfig.maxRetriesPerRequest,
          enableAutoPipelining: this.connectionConfig.enableAutoPipelining,
          enableReadyCheck: this.connectionConfig.enableReadyCheck
        });
      }
      
      // Initialize the queue with a custom createClient function to have more
      // direct control over the IORedis client creation and configuration
      this.queue = new Queue(this.queueName, {
        connection: this.connectionConfig,
        // Override client creation to ensure all options are properly passed
        // Using any here to bypass BullMQ's incomplete type definitions
        // @ts-ignore - BullMQ types don't properly expose createClient, but it works
        createClient: (type: string) => {
          // Create Redis client with our full configuration
          console.log(`Creating Redis client for ${type} with family: 0 and connectTimeout: ${this.connectionConfig.connectTimeout}ms`);
          
          let client: Redis;
          
          const redisOptions: RedisOptions = {
            family: 0, // Explicitly set family: 0 for all client types
            connectTimeout: this.connectionConfig.connectTimeout,
            maxRetriesPerRequest: this.connectionConfig.maxRetriesPerRequest,
            enableAutoPipelining: this.connectionConfig.enableAutoPipelining,
            enableReadyCheck: this.connectionConfig.enableReadyCheck,
            retryStrategy: this.connectionConfig.retryStrategy,
            tls: this.connectionConfig.tls === true ? {} : undefined,
          };
          
          if (this.connectionConfig.url) {
            client = new Redis(this.connectionConfig.url, redisOptions);
          } else {
            client = new Redis({
              host: this.connectionConfig.host || 'localhost',
              port: this.connectionConfig.port || 6379,
              username: this.connectionConfig.username,
              password: this.connectionConfig.password,
              db: this.connectionConfig.db,
              ...redisOptions
            });
          }
          
          // Set up client event handlers
          this.setupRedisClientListeners(client, type);
          
          // Track this client for proper cleanup later
          this.redisClients.push(client);
          
          return client;
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      } as QueueOptions);
      
      // Initialize queue events for monitoring using the same client creation approach
      this.queueEvents = new QueueEvents(this.queueName, {
        connection: this.connectionConfig,
        // @ts-ignore - BullMQ types don't properly expose createClient, but it works
        createClient: (type: string) => {
          console.log(`Creating Redis client for events ${type}`);
          
          const redisOptions: RedisOptions = {
            family: 0,
            connectTimeout: this.connectionConfig.connectTimeout,
            maxRetriesPerRequest: this.connectionConfig.maxRetriesPerRequest,
            enableAutoPipelining: this.connectionConfig.enableAutoPipelining,
            enableReadyCheck: this.connectionConfig.enableReadyCheck,
            retryStrategy: this.connectionConfig.retryStrategy,
            tls: this.connectionConfig.tls === true ? {} : undefined,
          };
          
          let client: Redis;
          
          if (this.connectionConfig.url) {
            client = new Redis(this.connectionConfig.url, redisOptions);
          } else {
            client = new Redis({
              host: this.connectionConfig.host || 'localhost',
              port: this.connectionConfig.port || 6379,
              username: this.connectionConfig.username,
              password: this.connectionConfig.password,
              db: this.connectionConfig.db,
              ...redisOptions
            });
          }
          
          // Set up event handlers
          this.setupRedisClientListeners(client, `events:${type}`);
          
          // Track this client for proper cleanup
          this.redisClients.push(client);
          
          return client;
        }
      } as QueueEventsOptions);
      
      // Set up queue event listeners
      this.setupQueueEventListeners();
      
      this.connecting = false;
      this.connected = true;
    } catch (error) {
      this.connecting = false;
      this.connected = false;
      console.error(`Failed to initialize queue "${this.queueName}":`, error);
      throw error;
    }
  }
  
  // Setup listeners for a Redis client
  private setupRedisClientListeners(client: Redis, clientType: string): void {
    client.on('error', (error: Error) => {
      console.error(`Redis client for ${clientType} error:`, error);
      this.connected = false;
    });
    
    client.on('connect', () => {
      console.log(`Redis client for ${clientType} connected`);
      this.connected = true;
    });
    
    client.on('ready', () => {
      console.log(`Redis client for ${clientType} ready`);
      this.connected = true;
    });
    
    client.on('reconnecting', (params: any) => {
      console.log(`Redis client for ${clientType} reconnecting:`, params);
      this.connected = false;
    });
    
    client.on('end', () => {
      console.log(`Redis client for ${clientType} connection closed`);
      this.connected = false;
    });
  }
  
  // Setup queue event listeners
  private setupQueueEventListeners(): void {
    if (!this.queue || !this.queueEvents) return;
    
    // Queue error events
    this.queue.on('error', (error: Error) => {
      console.error(`Queue "${this.queueName}" error:`, error);
      this.connected = false;
    });
    
    // Queue events monitoring
    this.queueEvents.on('completed', ({ jobId }) => {
      console.log(`Job ${jobId} completed in queue "${this.queueName}"`);
    });
    
    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`Job ${jobId} failed in queue "${this.queueName}":`, failedReason);
    });
  }
  
  async addJob<T>(name: string, data: T, options: JobOptions = {}): Promise<Job<T>> {
    if (!this.queue) {
      throw new Error(`Queue "${this.queueName}" not initialized`);
    }
    
    try {
      const job = await this.queue.add(name, data, options);
      
      // Ensure we have a valid ID string
      const jobId = job.id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      return {
        id: jobId,
        data: job.data,
        status: 'added'
      };
    } catch (error) {
      console.error(`Failed to add job to queue "${this.queueName}":`, error);
      throw error;
    }
  }
  
  async getJob(id: string): Promise<Job | null> {
    if (!this.queue) {
      throw new Error(`Queue "${this.queueName}" not initialized`);
    }
    
    try {
      const bullJob = await this.queue.getJob(id);
      if (!bullJob) {
        return null;
      }
      
      // Ensure we have a valid ID string
      const jobId = bullJob.id || id;
      
      // Create a safer return type
      const job: Job = {
        id: jobId,
        data: bullJob.data
      };
      
      // Only add status if we can get it
      try {
        const state = await bullJob.getState();
        if (state) {
          job.status = state;
        } else {
          job.status = 'unknown';
        }
      } catch (stateError) {
        console.warn(`Unable to get state for job ${id}:`, stateError);
        job.status = 'unknown';
      }
      
      return job;
    } catch (error) {
      console.error(`Failed to get job ${id} from queue "${this.queueName}":`, error);
      throw error;
    }
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  async healthCheck(): Promise<{ status: string; details?: any }> {
    if (!this.queue) {
      return { status: 'not_initialized' };
    }
    
    try {
      // Basic check - try to get job counts
      const counts = await this.queue.getJobCounts();
      
      return {
        status: 'healthy',
        details: {
          counts,
          connection: getRedisConnectionString(this.connectionConfig)
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        details: {
          message: error.message,
          code: error.code,
          errno: error.errno
        }
      };
    }
  }
  
  // Cleanup resources
  async close(): Promise<void> {
    if (this.queueEvents) {
      await this.queueEvents.close();
    }
    
    if (this.queue) {
      await this.queue.close();
    }
    
    // Close all tracked Redis clients
    for (const client of this.redisClients) {
      try {
        await client.quit();
      } catch (error) {
        console.error('Error closing Redis client:', error);
      }
    }
    
    this.redisClients = [];
    this.connected = false;
  }
} 