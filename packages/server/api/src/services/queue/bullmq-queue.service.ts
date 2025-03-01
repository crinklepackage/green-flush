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
  private sharedRedisClient: Redis | null = null; // Single client for all connections
  
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
      
      // Add a hard timeout to prevent indefinite connection attempts
      const connectionTimeout = setTimeout(() => {
        if (!this.connected) {
          console.error(`Redis connection timeout after 30 seconds for queue "${this.queueName}". Marking queue as failed but allowing application to continue.`);
          this.connecting = false;
          // We deliberately don't throw an error here to allow the application to start
          // even if Redis is down - this allows the API to at least partially function
        }
      }, 30000); // 30 seconds
      
      // *** CRITICAL CHANGE: Create a single Redis client for use across all BullMQ components ***
      this.sharedRedisClient = this.createRedisClient('shared');
      
      // Set up a special handler for this main connection
      this.sharedRedisClient.on('error', (error: Error) => {
        console.error(`Main Redis client error:`, error);
        if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
          // Handle connection errors - very important: log connection details
          console.error(`Connection failed with: ${getRedisConnectionString(this.connectionConfig)}`);
          
          // If connection failed because of hostname resolution issues, try to reconnect with public endpoint
          if (error.message.includes('ENOTFOUND redis.railway.internal')) {
            console.log('Hostname resolution failed for redis.railway.internal - ensure Railway services are properly linked');
          }
        }
      });
      
      // Explicitly override BullMQ's connection handling by passing a pre-configured client for all components
      
      // Initialize the queue using our shared client
      this.queue = new Queue(this.queueName, {
        connection: this.sharedRedisClient as any, // Force BullMQ to use our client 
        // Important: Don't allow BullMQ to create its own clients
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      });
      
      // Initialize queue events using the same shared client
      this.queueEvents = new QueueEvents(this.queueName, {
        connection: this.sharedRedisClient as any, // Force BullMQ to use our client
      });
      
      // Set up queue event listeners
      this.setupQueueEventListeners();
      
      this.connecting = false;
      this.connected = true;
      
      // Clear the timeout since we successfully connected
      clearTimeout(connectionTimeout);
    } catch (error) {
      this.connecting = false;
      this.connected = false;
      console.error(`Failed to initialize queue "${this.queueName}":`, error);
      throw error;
    }
  }
  
  /**
   * Create a Redis client with our standardized configuration 
   * Centralized creation point for all Redis clients to ensure consistency
   */
  private createRedisClient(clientType: string): Redis {
    // Get base URL or connection info
    let redisUrl: string;
    if (this.connectionConfig.url) {
      redisUrl = this.connectionConfig.url;
      // Connection URL-based handling is already done in redis-config.ts
      console.log(`Using Redis URL for ${clientType} client (credentials hidden)`);
    } else {
      // For component parameters, construct URL from parts
      redisUrl = `redis://${this.connectionConfig.username || ''}:${this.connectionConfig.password || ''}@${this.connectionConfig.host || 'localhost'}:${this.connectionConfig.port || 6379}`;
      console.log(`Using constructed Redis URL for ${clientType} client (credentials hidden)`);
    }
    
    // Standardized options for all Redis clients
    const redisOptions: RedisOptions = {
      // Critical to properly handle dual-stack IPv4/IPv6 lookup
      family: 0,
      connectTimeout: 10000,
      // BullMQ requires this to be null, not a number
      maxRetriesPerRequest: null,
      // Reliability options
      enableAutoPipelining: true,
      enableReadyCheck: true,
      // Retry strategy with limits
      retryStrategy: (times: number) => {
        const MAX_RETRY_ATTEMPTS = 15;
        
        if (times > MAX_RETRY_ATTEMPTS) {
          console.log(`Redis ${clientType} reached maximum retry attempts (${MAX_RETRY_ATTEMPTS}), giving up.`);
          return null; // Return null to stop retrying
        }
        
        const delay = Math.min(times * 50, 2000);
        console.log(`Redis ${clientType} reconnect attempt ${times}/${MAX_RETRY_ATTEMPTS} with delay ${delay}ms`);
        return delay;
      }
    };
    
    // For Railway production environment, enable TLS
    if (process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production') {
      redisOptions.tls = {};
    }
    
    // Log connection details for debugging
    console.log(`Creating Redis client for "${clientType}" with options:`, {
      family: redisOptions.family,
      connectTimeout: redisOptions.connectTimeout,
      tls: !!redisOptions.tls,
      maxRetriesPerRequest: redisOptions.maxRetriesPerRequest,
      enableAutoPipelining: redisOptions.enableAutoPipelining,
      enableReadyCheck: redisOptions.enableReadyCheck
    });
    
    // Create the client (the URL replacement is already handled in redis-config.ts)
    const client = new Redis(redisUrl, redisOptions);
    
    // Setup listeners
    this.setupRedisClientListeners(client, clientType);
    
    // Track for proper cleanup
    this.redisClients.push(client);
    
    return client;
  }
  
  // Setup listeners for a Redis client
  private setupRedisClientListeners(client: Redis, clientType: string): void {
    if (!client) {
      console.warn(`Cannot attach listeners to ${clientType} Redis client - client is null`);
      return;
    }
    
    console.log(`Setting up listeners for ${clientType} Redis client`);
    
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
    
    client.on('reconnecting', (ms: number) => {
      console.log(`Redis client for ${clientType} reconnecting in ${ms}ms`);
      this.connected = false;
    });
    
    client.on('end', () => {
      console.log(`Redis client for ${clientType} connection closed`);
      this.connected = false;
    });
  }
  
  // Setup queue event listeners
  private setupQueueEventListeners(): void {
    if (!this.queue || !this.queueEvents) {
      console.warn(`Cannot set up queue event listeners for "${this.queueName}" - queue or queueEvents is null`);
      return;
    }
    
    console.log(`Setting up queue event listeners for "${this.queueName}"`);
    
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
    
    // These events can be useful for debugging
    this.queueEvents.on('error', (error: Error) => {
      console.error(`QueueEvents for "${this.queueName}" error:`, error);
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
    console.log(`Closing queue "${this.queueName}" and cleaning up resources`);
    
    try {
      if (this.queueEvents) {
        await this.queueEvents.close();
      }
      
      if (this.queue) {
        await this.queue.close();
      }
      
      // Explicitly close any tracked Redis clients
      // This ensures all connections are properly terminated
      for (const client of this.redisClients) {
        try {
          await client.quit();
        } catch (error) {
          console.warn(`Error closing Redis client:`, error);
        }
      }
      
      this.redisClients = [];
      this.connected = false;
    } catch (error) {
      console.error(`Error during queue "${this.queueName}" cleanup:`, error);
      throw error;
    }
  }
} 