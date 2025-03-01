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
      
      // Parse URL if available, exactly as recommended by Railway
      let parsedConnection: Record<string, any> = {};
      
      if (this.connectionConfig.url) {
        console.log('Parsing Redis URL into individual components as recommended by Railway');
        try {
          const redisURL = new URL(this.connectionConfig.url);
          parsedConnection = {
            host: redisURL.hostname,
            port: parseInt(redisURL.port, 10),
            username: redisURL.username || undefined,
            password: redisURL.password || undefined,
            // Critical: Always set family to 0 for Railway
            family: 0,
            tls: this.connectionConfig.tls
          };
          console.log('Parsed connection settings (credentials hidden):', {
            ...parsedConnection,
            password: parsedConnection.password ? '***' : undefined
          });
        } catch (parseError) {
          console.error('Failed to parse Redis URL:', parseError);
          // Fall back to using direct connection parameters
          parsedConnection = {
            ...this.connectionConfig,
            family: 0 // Ensure family is set regardless
          };
        }
      } else if (this.connectionConfig.host) {
        // Use direct parameters if provided
        parsedConnection = {
          host: this.connectionConfig.host,
          port: this.connectionConfig.port,
          username: this.connectionConfig.username,
          password: this.connectionConfig.password,
          family: 0, // Ensure family is set regardless
          tls: this.connectionConfig.tls
        };
      } else {
        console.warn('No Redis connection details available, using defaults');
        parsedConnection = {
          host: 'localhost',
          port: 6379,
          family: 0
        };
      }
      
      // Add detailed config logging in Railway environment
      if (process.env.RAILWAY_ENVIRONMENT === 'production') {
        console.log('BullMQ connection config details:', {
          host: parsedConnection.host,
          port: parsedConnection.port,
          family: parsedConnection.family,
          connectTimeout: this.connectionConfig.connectTimeout,
          hasUsername: !!parsedConnection.username,
          hasPassword: !!parsedConnection.password,
          tls: parsedConnection.tls,
          maxRetriesPerRequest: null, // BullMQ requires this to be null
          enableAutoPipelining: this.connectionConfig.enableAutoPipelining,
          enableReadyCheck: this.connectionConfig.enableReadyCheck
        });
      }
      
      // Initialize the queue with the parsed connection parameters
      // This follows Railway's specific recommendations for BullMQ
      this.queue = new Queue(this.queueName, {
        connection: {
          ...parsedConnection,
          connectTimeout: this.connectionConfig.connectTimeout,
          enableAutoPipelining: this.connectionConfig.enableAutoPipelining,
          enableReadyCheck: this.connectionConfig.enableReadyCheck,
          retryStrategy: this.connectionConfig.retryStrategy,
          // BullMQ prefers null for this option
          maxRetriesPerRequest: null,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      });
      
      // Initialize queue events with the same connection configuration
      this.queueEvents = new QueueEvents(this.queueName, {
        connection: {
          ...parsedConnection,
          connectTimeout: this.connectionConfig.connectTimeout,
          enableAutoPipelining: this.connectionConfig.enableAutoPipelining,
          enableReadyCheck: this.connectionConfig.enableReadyCheck,
          retryStrategy: this.connectionConfig.retryStrategy,
          // BullMQ prefers null for this option
          maxRetriesPerRequest: null,
        }
      });
      
      // Access the RedisClient for event handling
      const queueClient = (this.queue as any).client;
      const eventsClient = (this.queueEvents as any).client;
      
      if (queueClient) {
        this.setupRedisClientListeners(queueClient, 'queue');
        this.redisClients.push(queueClient);
      }
      
      if (eventsClient) {
        this.setupRedisClientListeners(eventsClient, 'events');
        this.redisClients.push(eventsClient);
      }
      
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
  private setupRedisClientListeners(client: any, clientType: string): void {
    if (!client || typeof client.on !== 'function') {
      console.warn(`Cannot attach listeners to ${clientType} Redis client`);
      return;
    }
    
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
    
    // Note: BullMQ will close its own Redis clients
    this.redisClients = [];
    this.connected = false;
  }
} 