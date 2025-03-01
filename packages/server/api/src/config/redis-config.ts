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
  family?: number;
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
  // Debug: Log all Redis-related environment variables
  console.log('==== REDIS ENVIRONMENT VARIABLES ====');
  console.log(JSON.stringify({
    REDIS_URL: process.env.REDIS_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDISHOST: process.env.REDISHOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDISPORT: process.env.REDISPORT,
    HAS_REDIS_PASSWORD: !!process.env.REDIS_PASSWORD,
    HAS_REDISPASSWORD: !!process.env.REDISPASSWORD,
    HAS_REDIS_USERNAME: !!process.env.REDIS_USERNAME,
    HAS_REDISUSER: !!process.env.REDISUSER,
    NODE_ENV: process.env.NODE_ENV,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
    RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN
  }, null, 2));
  
  // Common configuration options for all environments
  const commonOptions = {
    family: 0, // Critical: Enable dual-stack IPv4/IPv6 lookup for all environments
    maxRetriesPerRequest: 3,
    enableAutoPipelining: true,
    enableReadyCheck: true,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 100, 3000);
      console.log(`Redis reconnect attempt ${times} with delay ${delay}ms`);
      return delay;
    }
  };
  
  // First priority: Use REDIS_URL if available
  if (process.env.REDIS_URL) {
    console.log(`Using REDIS_URL with family: 0 for dual-stack resolution: ${process.env.REDIS_URL.replace(/redis:\/\/(.*):(.*)@/, 'redis://$1:***@')}`);
    return {
      url: process.env.REDIS_URL,
      tls: process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production',
      ...commonOptions
    };
  }
  
  // Second priority: Use individual connection parameters
  if (process.env.REDIS_HOST || process.env.REDISHOST) {
    const host = process.env.REDIS_HOST || process.env.REDISHOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || process.env.REDISPORT || '6379', 10);
    
    console.log(`Using direct Redis connection to ${host}:${port} with family: 0 for dual-stack resolution`);
    
    return {
      host,
      port,
      username: process.env.REDIS_USERNAME || process.env.REDISUSER || undefined,
      password: process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || undefined,
      tls: process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production',
      db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
      ...commonOptions
    };
  }
  
  // Fallback for local development
  console.warn('No Redis configuration found in environment, using localhost:6379');
  return {
    host: 'localhost',
    port: 6379,
    ...commonOptions
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