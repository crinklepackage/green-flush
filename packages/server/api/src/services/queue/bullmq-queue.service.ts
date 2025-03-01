import { Queue, QueueEvents, QueueOptions, QueueEventsOptions } from 'bullmq';
import { QueueServiceInterface, JobOptions, Job } from './queue-service.interface';
import { RedisConnectionConfig, createRedisConfig, getRedisConnectionString } from '../../config/redis-config';
// Import IORedis directly to have more control over client creation
import Redis, { RedisOptions } from 'ioredis';

// BullMQ expects Redis.Redis type for createClient, so extend QueueOptions
interface EnhancedQueueOptions extends QueueOptions {
  createClient?: (type: string) => Redis;
}

// Same for QueueEventsOptions
interface EnhancedQueueEventsOptions extends QueueEventsOptions {
  createClient?: (type: string) => Redis;
}

// Extend RedisOptions to include url property that IORedis supports but isn't in the type
interface EnhancedRedisOptions extends RedisOptions {
  url?: string;
}

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
      
      // Simplified approach based on the working implementation
      // Let IORedis handle the URL parsing internally
      const options: EnhancedRedisOptions = {
        // Critical: Enable dual-stack IPv4/IPv6 lookup for all environments 
        family: 0,
        
        // Match the working implementation's value for connection timeout
        connectTimeout: 10000,
        
        // BullMQ requires this to be null, not a number
        maxRetriesPerRequest: null,
        
        // Reliability options
        enableAutoPipelining: true,
        enableReadyCheck: true,
        
        // Use the retry strategy from the working implementation
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          console.log(`Redis reconnect attempt ${times} with delay ${delay}ms`);
          return delay;
        }
      };
      
      // For Railway production environment, enable TLS
      if (process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production') {
        options.tls = {};
      }
      
      // Log connection details for debugging
      console.log('Redis connection options:', {
        ...options,
        family: options.family,
        connectTimeout: options.connectTimeout,
        tls: !!options.tls,
        maxRetriesPerRequest: options.maxRetriesPerRequest,
        enableAutoPipelining: options.enableAutoPipelining,
        enableReadyCheck: options.enableReadyCheck
      });
      
      // Setup fallback to public endpoint for Railway
      let publicEndpoint = null;
      
      // If we're in Railway production and using redis.railway.internal, prepare a public fallback
      if ((process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production') &&
          this.connectionConfig.url && 
          this.connectionConfig.url.includes('redis.railway.internal')) {
          
        // Try to extract the standard Railway public fallback
        try {
          const baseUrl = new URL(this.connectionConfig.url);
          // Standard Railway public endpoint pattern
          publicEndpoint = {
            host: 'roundhouse.proxy.rlwy.net',
            port: process.env.REDIS_PUBLIC_PORT ? parseInt(process.env.REDIS_PUBLIC_PORT, 10) : 30105, // Default Railway port or override
            username: baseUrl.username,
            password: baseUrl.password
          };
          console.log(`Found fallback public endpoint: roundhouse.proxy.rlwy.net:${publicEndpoint.port} (will use if internal fails)`);
        } catch (e) {
          console.error('Could not set up public fallback:', e);
        }
      }
      
      // Use createClient option to have full control over client creation
      const createClient = (type: string): Redis => {
        console.log(`Creating Redis client for "${type}" in queue "${this.queueName}"`);
        
        let client: Redis;
        
        // CRITICAL FIX: For Railway's internal Redis, connect using direct host/port/auth to avoid localhost fallback
        if (this.connectionConfig.url && this.connectionConfig.url.includes('redis.railway.internal')) {
          try {
            // Parse URL to get auth details
            const redisURL = new URL(this.connectionConfig.url);
            const connectionParams = {
              ...options,
              host: 'redis.railway.internal',
              port: parseInt(redisURL.port, 10) || 6379,
              username: redisURL.username || undefined,
              password: redisURL.password || undefined,
              family: 0 // Explicitly set family parameter for direct connection
            };
            
            console.log(`Using explicit host/port connection (directly to redis.railway.internal:${connectionParams.port})`);
            client = new Redis(connectionParams);
            
            // If the direct connection fails after 5 seconds, try the public endpoint
            setTimeout(() => {
              if (!this.connected && publicEndpoint) {
                console.log(`Internal connection failed, trying public endpoint: roundhouse.proxy.rlwy.net:${publicEndpoint.port}`);
                try {
                  const publicClient = new Redis({
                    ...options,
                    host: publicEndpoint.host,
                    port: publicEndpoint.port,
                    username: publicEndpoint.username,
                    password: publicEndpoint.password,
                    family: 0 // Explicitly set family parameter for public endpoint
                  });
                  
                  this.setupRedisClientListeners(publicClient, `${type}-public`);
                  this.redisClients.push(publicClient);
                  
                  // If the main client is still connected, we'll have two clients, but that's better than no connection
                } catch (e) {
                  console.error('Failed to connect to public endpoint:', e);
                }
              }
            }, 5000);
          } catch (e) {
            console.error('Failed to parse Redis URL for direct connection:', e);
            // Fall back to direct URL approach
            client = new Redis(this.connectionConfig.url, options);
          }
        } else if (this.connectionConfig.url) {
          // For non-Railway Redis or explicitly provided URLs, use direct URL approach
          console.log(`Using direct URL connection approach with family: 0 (credentials hidden)`);
          client = new Redis(this.connectionConfig.url, options);
        } else {
          // For component parameters, construct from parts
          const redisUrl = `redis://${this.connectionConfig.username || ''}:${this.connectionConfig.password || ''}@${this.connectionConfig.host || 'localhost'}:${this.connectionConfig.port || 6379}`;
          console.log(`Using constructed URL connection with family: 0 (credentials hidden)`);
          client = new Redis(redisUrl, options);
        }
        
        this.setupRedisClientListeners(client, `${type}`);
        this.redisClients.push(client);
        return client;
      };
      
      // Initialize the queue with the createClient option
      const queueOptions: EnhancedQueueOptions = {
        // Using both connection and createClient since BullMQ falls back to connection if needed
        connection: options,
        createClient,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        }
      };
      
      this.queue = new Queue(this.queueName, queueOptions);
      
      // Initialize queue events with the same createClient option
      const queueEventsOptions: EnhancedQueueEventsOptions = {
        connection: options,
        createClient,
      };
      
      this.queueEvents = new QueueEvents(this.queueName, queueEventsOptions);
      
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