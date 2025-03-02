/**
 * Redis configuration for worker
 * 
 * Handles Redis connection configuration with proper family setting
 * to prevent "ENOTFOUND redis.railway.internal" errors
 */

/**
 * Creates a Redis connection configuration object for BullMQ
 * with proper settings for Railway deployment
 */
export function createRedisConfig(redisUrl: string) {
  // Common configuration options
  const connectionConfig = {
    url: redisUrl,
    family: 0, // CRITICAL: Enable dual-stack IPv4/IPv6 lookup for all environments
    tls: process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production',
    maxRetriesPerRequest: null // BullMQ requires this to be null, not a number
  };
  
  console.log('Creating Redis connection with family: 0 for dual-stack resolution');
  
  return connectionConfig;
} 