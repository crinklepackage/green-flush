/**
 * Redis configuration module
 * 
 * Re-exports the shared Redis configuration utilities
 * for backward compatibility with existing code.
 */

import { 
  createRedisConfig as createSharedRedisConfig,
  getRedisConnectionString as getSharedRedisConnectionString,
  RedisConnectionConfig
} from '@wavenotes-new/shared';

/**
 * Creates a Redis connection configuration object from environment variables
 * Using the shared implementation for consistency
 */
export function createRedisConfig(): RedisConnectionConfig {
  // Forward to shared implementation
  const config = createSharedRedisConfig();
  console.log('[API] Using shared Redis configuration with family:', config.family);
  return config;
}

/**
 * Return a sanitized string representation of the Redis connection
 * (for logging, without exposing credentials)
 */
export function getRedisConnectionString(config: RedisConnectionConfig): string {
  // Forward to shared implementation
  return getSharedRedisConnectionString(config);
}

// Re-export the RedisConnectionConfig interface
export type { RedisConnectionConfig }; 