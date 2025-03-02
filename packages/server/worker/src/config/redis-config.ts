/**
 * Redis configuration for worker
 * 
 * Temporary local implementation until shared package issues are resolved
 */

/**
 * Redis connection configuration options
 */
export interface RedisConnectionConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: boolean;
  family?: number;
  url?: string;
  maxRetriesPerRequest?: number | null;
  enableAutoPipelining?: boolean;
  enableReadyCheck?: boolean;
  connectTimeout?: number;
  retryStrategy?: (times: number) => number | null;
}

/**
 * Creates a Redis connection configuration object for BullMQ
 * with proper settings for Railway deployment
 */
export function createRedisConfig(redisUrl: string): RedisConnectionConfig {
  // Common configuration options for all environments
  const commonOptions = {
    // CRITICAL: Force IPv4 for all environments to prevent "ENOTFOUND" errors
    family: 0,
    // Connection timeout
    connectTimeout: 10000,
    // BullMQ requires this to be null, not a number
    maxRetriesPerRequest: null,
    // Performance and reliability options
    enableAutoPipelining: true,
    enableReadyCheck: true,
    // Retry strategy with exponential backoff
    retryStrategy: (times: number) => {
      const MAX_RETRY_ATTEMPTS = 15;
      
      if (times > MAX_RETRY_ATTEMPTS) {
        console.log(`Redis reached maximum retry attempts (${MAX_RETRY_ATTEMPTS}), giving up.`);
        return null; // Return null to stop retrying
      }
      
      const delay = Math.min(times * 50, 2000);
      console.log(`Redis reconnect attempt ${times}/${MAX_RETRY_ATTEMPTS} with delay ${delay}ms`);
      return delay;
    }
  };
  
  // Create a config object with family:0 explicitly set
  const config = {
    url: redisUrl,
    tls: process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production',
    ...commonOptions // Contains family: 0
  };
  
  // Log family setting to confirm it's set correctly
  console.log(`[Worker] CRITICAL: Final family setting for Redis config: ${config.family} (should be 0)`);
  
  return config;
}

// Re-export the RedisConnectionConfig interface
export type { RedisConnectionConfig }; 