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
  maxRetriesPerRequest?: number | null;
  enableAutoPipelining?: boolean;
  enableReadyCheck?: boolean;
  connectTimeout?: number;
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
    family: 0, // CRITICAL: Enable dual-stack IPv4/IPv6 lookup for all environments
    connectTimeout: 10000, // Match the working implementation's value for connection timeout
    maxRetriesPerRequest: null, // BullMQ requires this to be null, not a number
    enableAutoPipelining: true,
    enableReadyCheck: true,
    retryStrategy: (times: number) => {
      // Add a maximum retry limit
      const MAX_RETRY_ATTEMPTS = 15;
      
      // Stop retrying after reaching the maximum attempts
      if (times > MAX_RETRY_ATTEMPTS) {
        console.log(`Redis reached maximum retry attempts (${MAX_RETRY_ATTEMPTS}), giving up.`);
        return null; // Return null to stop retrying
      }
      
      // More closely match the working implementation's retry strategy
      const delay = Math.min(times * 50, 2000);
      console.log(`Redis reconnect attempt ${times}/${MAX_RETRY_ATTEMPTS} with delay ${delay}ms`);
      return delay;
    }
  };
  
  // First priority: Use REDIS_URL for Railway 
  if (process.env.REDIS_URL) {
    let redisUrl = process.env.REDIS_URL;
    
    // DIRECT FIX: Replace Railway internal hostname with public hostname if needed
    // This is the most direct way to handle the DNS resolution failure
    if (redisUrl.includes('redis.railway.internal')) {
      try {
        // Parse the URL
        const parsedUrl = new URL(redisUrl);
        
        // Replace the hostname with Railway's public endpoint
        // We keep everything else the same (auth, port, etc.)
        const publicHost = 'roundhouse.proxy.rlwy.net';
        const publicPort = process.env.REDIS_PUBLIC_PORT ? parseInt(process.env.REDIS_PUBLIC_PORT, 10) : 30105;
        
        console.log(`Replacing internal hostname with public endpoint: ${publicHost}:${publicPort}`);
        
        // Create a new URL with the public endpoint
        parsedUrl.hostname = publicHost;
        parsedUrl.port = publicPort.toString();
        
        // Use the modified URL
        redisUrl = parsedUrl.toString();
        console.log(`Modified Redis URL to use public endpoint (credentials hidden)`);
      } catch (e) {
        console.error('Failed to replace internal hostname, using original URL:', e);
      }
    }
    
    console.log(`Using Redis URL with family: 0 for dual-stack resolution`);
    
    // CRITICAL FIX: Create a config object with family:0 explicitly set
    const config = {
      url: redisUrl,
      tls: process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production',
      ...commonOptions // Contains family: 0
    };
    
    // Log family setting to confirm it's set to 0
    console.log(`CRITICAL: Final family setting for Redis URL config: ${config.family} (should be 0)`);
    
    return config;
  }
  
  // Second priority: Use individual connection parameters
  if (process.env.REDIS_HOST || process.env.REDISHOST) {
    let host = process.env.REDIS_HOST || process.env.REDISHOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || process.env.REDISPORT || '6379', 10);
    
    // Even for direct host connection, replace railway.internal if needed
    if (host === 'redis.railway.internal') {
      host = 'roundhouse.proxy.rlwy.net';
      console.log(`Replacing internal hostname with public endpoint: ${host}`);
    }
    
    console.log(`Using direct Redis connection to ${host}:${port} with family: 0 for dual-stack resolution`);
    
    // CRITICAL FIX: Create a config object with family:0 explicitly set
    const config = {
      host,
      port,
      username: process.env.REDIS_USERNAME || process.env.REDISUSER || undefined,
      password: process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || undefined,
      tls: process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production',
      db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
      ...commonOptions // Contains family: 0
    };
    
    // Log family setting to confirm it's set to 0
    console.log(`CRITICAL: Final family setting for direct host config: ${config.family} (should be 0)`);
    
    return config;
  }
  
  // Fallback for local development
  console.warn('No Redis configuration found in environment, using localhost:6379');
  
  // CRITICAL FIX: Create a config object with family:0 explicitly set
  const config = {
    host: 'localhost',
    port: 6379,
    ...commonOptions // Contains family: 0
  };
  
  // Log family setting to confirm it's set to 0
  console.log(`CRITICAL: Final family setting for fallback config: ${config.family} (should be 0)`);
  
  return config;
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