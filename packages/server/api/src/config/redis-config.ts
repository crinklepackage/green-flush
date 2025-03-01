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
  
  // For Railway production environments, prioritize direct connection parameters
  if (process.env.RAILWAY_ENVIRONMENT === 'production') {
    console.log('Railway production environment detected, using direct connection parameters');
    
    // Check for all possible environment variable formats that Railway might inject
    // Railway sometimes prefixes service variables with $SERVICE_NAME__ (double underscore)
    // Check environment for any variables that might contain Redis connection info
    const allEnvVars = Object.keys(process.env);
    const railwayRedisVars = allEnvVars.filter(key => 
      key.includes('REDIS') || 
      key.includes('__HOST') || 
      key.includes('__PORT') || 
      key.includes('__PASSWORD') ||
      key.includes('__USERNAME')
    );
    
    console.log('Found potential Railway Redis variables:', railwayRedisVars);
    
    // Determine the host - Railway might inject different variable names
    const host = process.env.REDIS_HOST || 
                process.env.REDISHOST || 
                process.env.RAILWAY_REDIS_HOST ||
                process.env.RAILWAY_REDIS_ENDPOINT ||
                // Look for variables with the pattern SERVICE__HOST
                allEnvVars.find(key => key.endsWith('__HOST')) ? 
                  process.env[allEnvVars.find(key => key.endsWith('__HOST')) as string] : 
                  undefined;
    
    if (host) {
      // This format is specifically recommended for Railway deployments
      const config: RedisConnectionConfig = {
        host,
        port: parseInt(process.env.REDIS_PORT || process.env.REDISPORT || '6379', 10),
        username: process.env.REDIS_USERNAME || process.env.REDISUSER || undefined,
        password: process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || undefined,
        family: 0, // Force IPv4 for hostname resolution (critical for Railway)
        tls: true, // Railway Redis typically requires TLS in production
        maxRetriesPerRequest: 3,
        enableAutoPipelining: true,
        enableReadyCheck: true,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 100, 3000);
          console.log(`Redis reconnect attempt ${times} with delay ${delay}ms`);
          return delay;
        }
      };
      
      console.log('Using Railway Redis connection config:', {
        host: config.host,
        port: config.port,
        family: config.family,
        hasUsername: !!config.username,
        hasPassword: !!config.password,
        tls: config.tls
      });
      
      return config;
    } else {
      console.warn('No Redis host found in Railway environment variables');
    }
  }
  
  // Regular check for direct connection parameters
  if (process.env.REDIS_HOST || process.env.REDISHOST) {
    console.log('Using Redis direct connection parameters from environment variables');
    
    return {
      host: process.env.REDIS_HOST || process.env.REDISHOST,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 
            process.env.REDISPORT ? parseInt(process.env.REDISPORT, 10) : 6379,
      username: process.env.REDIS_USERNAME || process.env.REDISUSER || undefined,
      password: process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || undefined,
      family: 0, // Force IPv4 for hostname resolution
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
    console.log('Using Redis URL from environment variables');
    
    // Check if URL contains railway.internal - this is a sign of misconfiguration
    if (process.env.REDIS_URL.includes('railway.internal')) {
      console.warn('⚠️ WARNING: REDIS_URL contains "railway.internal" which may not resolve correctly');
      console.warn('⚠️ Consider using direct connection parameters instead');
    }
    
    return { 
      url: process.env.REDIS_URL,
      family: 0, // Force IPv4 for hostname resolution
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
    family: 0, // Force IPv4 for hostname resolution
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