/**
 * Redis configuration module
 * 
 * Handles all Redis connection configuration in a centralized location
 * with proper environment detection and fallbacks
 */

import { ConnectionOptions } from 'bullmq';

/**
 * Redis connection configuration for BullMQ
 * 
 * This handles the different ways Redis can be configured,
 * particularly for Railway deployments where service linking variables
 * are used instead of direct URLs.
 */
export interface RedisConnectionConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: boolean;
  url?: string;
  maxRetriesPerRequest?: number;
  enableAutoPipelining?: boolean;
  enableReadyCheck?: boolean;
  retryStrategy?: (times: number) => number | null;
}

/**
 * Creates a Redis connection configuration object from environment variables
 * Supports both REDIS_URL format and Railway's individual environment variables
 */
export function createRedisConfig(): RedisConnectionConfig {
  // Check if using Railway's environment variables for Redis
  if (process.env.REDIS_HOST || process.env.REDISHOST) {
    return {
      host: process.env.REDIS_HOST || process.env.REDISHOST,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 
            process.env.REDISPORT ? parseInt(process.env.REDISPORT, 10) : 6379,
      username: process.env.REDIS_USERNAME || process.env.REDISUSER || undefined,
      password: process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || undefined,
      db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
      // Enable TLS if using Railway's Redis service (default to secure)
      tls: process.env.REDIS_TLS === 'true' || 
           process.env.REDIS_TLS === undefined && (
             process.env.RAILWAY_ENVIRONMENT === 'production' || 
             process.env.NODE_ENV === 'production'
           ),
      // Set maxRetriesPerRequest to 3 for limited retries
      maxRetriesPerRequest: 3,
      // Enable auto-reconnect
      enableAutoPipelining: true,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        // Retry with exponential backoff
        const delay = Math.min(times * 100, 3000);
        console.log(`Redis reconnect attempt ${times} with delay ${delay}ms`);
        return delay;
      }
    };
  }
  
  // If REDIS_URL is available, use it (this will handle URL parsing)
  if (process.env.REDIS_URL) {
    return { 
      url: process.env.REDIS_URL,
      // Set maxRetriesPerRequest to 3 for limited retries
      maxRetriesPerRequest: 3,
      // Enable auto-reconnect
      enableAutoPipelining: true,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        // Retry with exponential backoff
        const delay = Math.min(times * 100, 3000);
        console.log(`Redis reconnect attempt ${times} with delay ${delay}ms`);
        return delay;
      }
    };
  }
  
  // Fallback to localhost for development
  console.warn('No Redis configuration found in environment, using localhost:6379');
  
  return {
    host: 'localhost',
    port: 6379,
    // Set maxRetriesPerRequest to 3 for development
    maxRetriesPerRequest: 3
  };
}

/**
 * Return a sanitized string representation of the Redis connection
 * (for logging, without exposing credentials)
 */
export function getRedisConnectionString(config: RedisConnectionConfig): string {
  if (config.url) {
    // Hide password in URL if present
    return config.url.replace(/redis:\/\/(.*):(.*)@/, 'redis://$1:***@');
  }
  
  const host = config.host || 'localhost';
  const port = config.port || 6379;
  const user = config.username ? `${config.username}:***@` : '';
  const db = config.db !== undefined ? `/${config.db}` : '';
  const protocol = config.tls ? 'rediss' : 'redis';
  
  return `${protocol}://${user}${host}:${port}${db}`;
} 