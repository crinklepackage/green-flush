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
      
      // Increase timeout to 60 seconds to allow for slower network conditions
      const connectionTimeout = setTimeout(() => {
        if (!this.connected) {
          console.error(`Redis connection timeout after 60 seconds for queue "${this.queueName}". Marking queue as failed but allowing application to continue.`);
          this.connecting = false;
        }
      }, 60000); // 60 seconds instead of 30
      
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
    
    // FIRST: Try to use REDIS_PUBLIC_URL if available (to bypass internal networking issues)
    if (process.env.REDIS_PUBLIC_URL) {
      redisUrl = process.env.REDIS_PUBLIC_URL;
      console.log(`Using REDIS_PUBLIC_URL for ${clientType} client`);
    } else if (this.connectionConfig.url) {
      redisUrl = this.connectionConfig.url;
      console.log(`Using Redis URL for ${clientType} client (credentials hidden)`);
    } else {
      // For component parameters, construct URL from parts
      redisUrl = `redis://${this.connectionConfig.username || ''}:${this.connectionConfig.password || ''}@${this.connectionConfig.host || 'localhost'}:${this.connectionConfig.port || 6379}`;
      console.log(`Using constructed Redis URL for ${clientType} client (credentials hidden)`);
    }
    
    // Log host/port for debugging (sanitized)
    try {
      const parsedUrl = new URL(redisUrl);
      console.log(`Redis connection details: host=${parsedUrl.hostname}, port=${parsedUrl.port}, protocol=${parsedUrl.protocol}`);
    } catch (e) {
      console.warn(`Could not parse Redis URL for logging: ${e}`);
    }
    
    // Standardized options for all Redis clients
    const redisOptions: RedisOptions = {
      // Critical to properly handle dual-stack IPv4/IPv6 lookup
      family: 0,
      // Increase timeout significantly - Railway may have network latency
      connectTimeout: 30000, // 30 seconds (up from 10)
      // BullMQ requires this to be null, not a number
      maxRetriesPerRequest: null,
      // Reliability options
      enableAutoPipelining: true,
      enableReadyCheck: true,
      // Add connection/command retry
      reconnectOnError: (err) => {
        const targetError = err.message;
        if (targetError.includes('ETIMEDOUT') || targetError.includes('ECONNRESET')) {
          // Return 1 or 2 to reconnect for these errors
          return 1;
        }
        return false;
      },
      // Retry strategy with limits but longer delays
      retryStrategy: (times: number) => {
        const MAX_RETRY_ATTEMPTS = 20; // Increase from 15
        
        if (times > MAX_RETRY_ATTEMPTS) {
          console.log(`Redis ${clientType} reached maximum retry attempts (${MAX_RETRY_ATTEMPTS}), giving up.`);
          return null; // Return null to stop retrying
        }
        
        // Increase delay to account for potential network latency
        const delay = Math.min(times * 200, 5000); // Longer delay (up to 5 seconds)
        console.log(`Redis ${clientType} reconnect attempt ${times}/${MAX_RETRY_ATTEMPTS} with delay ${delay}ms`);
        return delay;
      }
    };
    
    // Handling TLS configuration - this is critical for ETIMEDOUT issues
    if (process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production') {
      console.log(`Configuring TLS for Redis in production environment`);
      
      // CRITICAL: Relaxed TLS settings to handle Railway's certificates
      redisOptions.tls = {
        // Don't reject unauthorized certificates - this can help with self-signed certs
        rejectUnauthorized: false,
        // Explicitly set servername to match certificate
        servername: new URL(redisUrl).hostname
      };
      
      // Force TLS to be used if URL starts with rediss://
      if (redisUrl.startsWith('rediss://')) {
        console.log('Using secure Redis connection (rediss://)');
      } 
      // If it's not already secure and we're in production, try to make it secure
      else if (redisUrl.startsWith('redis://') && (process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production')) {
        console.log('Converting regular redis:// URL to secure rediss:// for production');
        redisUrl = redisUrl.replace('redis://', 'rediss://');
      }
    }
    
    // Log connection details for debugging
    console.log(`Creating Redis client for "${clientType}" with options:`, {
      family: redisOptions.family,
      connectTimeout: redisOptions.connectTimeout,
      tls: redisOptions.tls ? {
        rejectUnauthorized: redisOptions.tls.rejectUnauthorized,
        servername: redisOptions.tls.servername
      } : null,
      maxRetriesPerRequest: redisOptions.maxRetriesPerRequest,
      enableAutoPipelining: redisOptions.enableAutoPipelining,
      enableReadyCheck: redisOptions.enableReadyCheck
    });
    
    // Create the client
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

    // After setting up other events, add additional debug info
    if (this.sharedRedisClient) {
      setTimeout(() => {
        if (!this.connected) {
          console.log('Additional connection debugging info:');
          this.isTLSConnected(this.sharedRedisClient!);
          
          // Try to provide helpful Railway-specific guidance
          console.log('For Railway deployments, please check:');
          console.log('1. Redis service is in the same project as your service');
          console.log('2. Services are properly linked in the Railway dashboard');
          console.log('3. REDIS_URL environment variable is correctly set and accessible');
        }
      }, 10000); // After 10 seconds
    }
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
  
  // Add a method to check if a TLS socket is in use
  private isTLSConnected(client: Redis): boolean {
    try {
      const status = (client as any).status || 'unknown';
      const stream = (client as any).stream;
      const isTLS = stream && (stream.constructor.name === 'TLSSocket');
      
      console.log(`Redis connection status: ${status}, using TLS: ${isTLS}`);
      return isTLS;
    } catch (e) {
      console.error('Error checking TLS status:', e);
      return false;
    }
  }
  
  // Override healthCheck to include more diagnostic information
  async healthCheck(): Promise<{ status: string; details?: any }> {
    if (!this.queue) {
      return { 
        status: 'not_initialized',
        details: {
          connectorType: 'BullMQ',
          redisUrl: getRedisConnectionString(this.connectionConfig),
          environment: process.env.NODE_ENV || 'unknown',
          railway: process.env.RAILWAY_ENVIRONMENT || 'not_railway'
        }
      };
    }
    
    try {
      // Basic check - try to get job counts
      const counts = await this.queue.getJobCounts();
      
      return {
        status: 'healthy',
        details: {
          counts,
          connection: getRedisConnectionString(this.connectionConfig),
          usingTLS: this.sharedRedisClient ? this.isTLSConnected(this.sharedRedisClient) : false,
          environment: process.env.NODE_ENV || 'unknown',
          railway: process.env.RAILWAY_ENVIRONMENT || 'not_railway'
        }
      };
    } catch (error: any) {
      return {
        status: 'error',
        details: {
          message: error.message,
          code: error.code,
          errno: error.errno,
          connected: this.connected,
          connecting: this.connecting,
          usingTLS: this.sharedRedisClient ? this.isTLSConnected(this.sharedRedisClient) : false,
          environment: process.env.NODE_ENV || 'unknown',
          railway: process.env.RAILWAY_ENVIRONMENT || 'not_railway'
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