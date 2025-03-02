/**
 * Redis configuration module for Wavenotes
 * 
 * Provides a standardized way to create and manage Redis connections
 * with proper settings to work reliably in all environments, particularly
 * handling the "ENOTFOUND redis.railway.internal" error in Railway deployments.
 * 
 * ⚠️ RAILWAY NETWORKING STRATEGY ⚠️
 * 1. Within Railway network: Use internal hostnames (redis.railway.internal)
 * 2. Outside Railway network: Use proxy hostnames (roundhouse.proxy.rlwy.net)
 * 3. Always use family: 0 to force IPv4 resolution (required for reliable connection)
 */

import Redis, { RedisOptions } from 'ioredis';

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

// Global Redis client for singleton pattern
let globalRedisClient: Redis | null = null;

/**
 * Determines whether we're running inside Railway's network
 * 
 * @returns true if running in Railway environment, false otherwise
 */
function isInsideRailwayNetwork(): boolean {
  // If RAILWAY_ENVIRONMENT or RAILWAY_PUBLIC_DOMAIN is set, we're in Railway
  return !!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PUBLIC_DOMAIN);
}

/**
 * Checks if the hostname is a Railway internal hostname
 * 
 * @param hostname The hostname to check
 * @returns true if it's an internal Railway hostname
 */
function isRailwayInternalHostname(hostname: string): boolean {
  return hostname === 'redis.railway.internal' || hostname.includes('.railway.internal');
}

/**
 * Extracts and returns the proxy hostname from a Railway Redis URL
 * This is used when we need to access Redis from outside Railway
 * 
 * @param url The Redis URL from Railway
 * @returns The proxy hostname if found, or null
 */
function extractRailwayProxyHostname(url: string): string | null {
  // Look for the proxy hostname pattern in the URL (e.g., roundhouse.proxy.rlwy.net)
  const proxyHostMatches = url.match(/\/\/([^:]+:[^@]+@)?([^:]+\.(proxy\.rlwy\.net))/);
  if (proxyHostMatches && proxyHostMatches[2]) {
    return proxyHostMatches[2];
  }
  return null;
}

/**
 * Flags to track connection errors
 * This helps us detect when internal hostnames are failing and we need to switch to proxy
 */
const connectionState = {
  // Has there been a connection error with internal hostname
  hadInternalHostnameError: false,
  // Track which hosts we've tried that failed
  failedHosts: new Set<string>(),
  // Should we try to use proxy hostnames instead
  useProxyHostnames: false
};

/**
 * Creates a Redis connection configuration object from environment variables.
 * This function ensures that the family: 0 setting is always applied to prevent
 * DNS resolution issues with Redis connections.
 * 
 * @returns A configuration object for Redis connections
 */
export function createRedisConfig(): RedisConnectionConfig {
  // Debug: Log all Redis-related environment variables if in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('==== REDIS ENVIRONMENT VARIABLES ====');
    console.log(JSON.stringify({
      REDIS_URL: process.env.REDIS_URL ? 
                 process.env.REDIS_URL.replace(/redis:\/\/(.*):(.*)@/, 'redis://$1:***@') : 
                 'not set',
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
  }
  
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
  
  // REDIS_URL is provided by Railway and already contains all credentials
  if (process.env.REDIS_URL) {
    let redisUrl = process.env.REDIS_URL;
    
    try {
      // Parse the URL to get its components
      const parsedUrl = new URL(redisUrl);
      const isInternalHostname = isRailwayInternalHostname(parsedUrl.hostname);
      
      // Running inside Railway network - use internal hostname by default
      if (isInsideRailwayNetwork()) {
        console.log('Running inside Railway network');
        
        // If internal hostname exists and we haven't had errors with it, use it
        if (isInternalHostname && !connectionState.hadInternalHostnameError) {
          console.log('Using Railway internal hostname for Redis');
        } 
        // If we've had errors with internal hostname, try proxy hostname
        else if (isInternalHostname && connectionState.hadInternalHostnameError) {
          console.log('CRITICAL: Previous errors with internal hostname, trying proxy hostname');
          
          // Extract proxy hostname and use it if available
          const proxyHostname = extractRailwayProxyHostname(redisUrl);
          if (proxyHostname) {
            parsedUrl.hostname = proxyHostname;
            redisUrl = parsedUrl.toString();
            console.log(`Switched to proxy hostname: ${getRedisConnectionString({ url: redisUrl })}`);
          }
        }
      } 
      // Running outside Railway - always use proxy hostname
      else if (isInternalHostname) {
        console.log('Running outside Railway network, must use proxy hostname');
        
        // Extract proxy hostname and use it if available
        const proxyHostname = extractRailwayProxyHostname(redisUrl);
        if (proxyHostname) {
          parsedUrl.hostname = proxyHostname;
          redisUrl = parsedUrl.toString();
          console.log(`Using proxy hostname: ${getRedisConnectionString({ url: redisUrl })}`);
        }
      }
    } catch (e) {
      console.error('Error processing Redis URL:', e);
    }
    
    console.log(`Using Redis URL with family: 0 for IPv4 resolution`);
    
    // Create a config object with family:0 explicitly set
    const config = {
      url: redisUrl,
      // TLS is only needed for production environments
      tls: process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production',
      ...commonOptions // Contains family: 0
    };
    
    // Log family setting to confirm it's set correctly
    console.log(`CRITICAL: Final family setting for Redis config: ${config.family} (should be 0)`);
    console.log(`CRITICAL: Final Redis URL: ${getRedisConnectionString(config)}`);
    
    return config;
  }
  
  // Individual connection parameters (host, port, etc.)
  if (process.env.REDIS_HOST || process.env.REDISHOST) {
    let host = process.env.REDIS_HOST || process.env.REDISHOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || process.env.REDISPORT || '6379', 10);
    
    // Handle internal hostnames for direct connection too
    if (isRailwayInternalHostname(host)) {
      if (!isInsideRailwayNetwork() || connectionState.hadInternalHostnameError) {
        // If we're outside Railway or had errors, try alternate hostname
        const alternateHost = process.env.REDIS_PUBLIC_HOST || 
                             host.replace('.railway.internal', '.proxy.rlwy.net');
        
        if (alternateHost && alternateHost !== host) {
          console.log(`CRITICAL: Using alternate hostname: ${alternateHost} instead of ${host}`);
          host = alternateHost;
        }
      }
    }
    
    console.log(`Using direct Redis connection to ${host}:${port} with family: 0`);
    
    // Create a config object with family:0 explicitly set
    const config = {
      host,
      port,
      username: process.env.REDIS_USERNAME || process.env.REDISUSER || undefined,
      password: process.env.REDIS_PASSWORD || process.env.REDISPASSWORD || undefined,
      tls: process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.NODE_ENV === 'production',
      db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0,
      ...commonOptions // Contains family: 0
    };
    
    // Log family setting to confirm it's set correctly
    console.log(`CRITICAL: Final family setting for direct host config: ${config.family} (should be 0)`);
    
    return config;
  }
  
  // Fallback for local development
  console.warn('No Redis configuration found in environment, using localhost:6379');
  
  // Create a config object with family:0 explicitly set
  const config = {
    host: 'localhost',
    port: 6379,
    ...commonOptions // Contains family: 0
  };
  
  // Log family setting to confirm it's set correctly
  console.log(`CRITICAL: Final family setting for fallback config: ${config.family} (should be 0)`);
  
  return config;
}

/**
 * Creates a new Redis client with standardized configuration.
 * 
 * @param clientName Optional name for logging purposes
 * @param customConfig Optional custom Redis configuration to override defaults
 * @returns A configured Redis client
 */
export function createRedisClient(clientName: string = 'default', customConfig?: RedisConnectionConfig): Redis {
  // Merge provided config with environment config
  const envConfig = createRedisConfig();
  const mergedConfig = { ...envConfig, ...customConfig };
  
  // CRITICAL: Ensure family is always set to 0 regardless of custom config
  mergedConfig.family = 0;
  
  // Get the connection string for logging (without credentials)
  const connectionString = getRedisConnectionString(mergedConfig);
  console.log(`Creating Redis client "${clientName}" with connection: ${connectionString}`);
  
  // Extract hostname for tracking
  let hostname: string | undefined;
  if (mergedConfig.url) {
    try {
      hostname = new URL(mergedConfig.url).hostname;
    } catch (e) {
      console.error('Error parsing Redis URL:', e);
    }
  } else {
    hostname = mergedConfig.host;
  }
  
  // Create client options from config
  const clientOptions: RedisOptions = {
    ...mergedConfig,
    // Handle TLS properly - pass undefined or a tls settings object, not a boolean
    tls: mergedConfig.tls === true ? {} : undefined,
    // Override with explicit values for BullMQ compatibility
    family: 0, // Force IPv4
    maxRetriesPerRequest: null, // Required by BullMQ
    
    // Add error handling
    reconnectOnError: (err) => {
      const targetError = err.message;
      if (targetError.includes('ETIMEDOUT') || targetError.includes('ECONNRESET')) {
        // Return 1 or 2 to reconnect for these errors
        return 1;
      }
      return false;
    }
  };
  
  // For URL-based connections
  if (mergedConfig.url) {
    console.log(`Using URL connection for "${clientName}" Redis client`);
    const client = new Redis(mergedConfig.url, clientOptions);
    setupRedisClientListeners(client, clientName, hostname);
    return client;
  }
  
  // For direct host/port connections
  console.log(`Using direct connection for "${clientName}" Redis client`);
  const client = new Redis(clientOptions);
  setupRedisClientListeners(client, clientName, hostname);
  return client;
}

/**
 * Gets a Redis client using the singleton pattern.
 * This should be used for shared operations across the application.
 * 
 * @returns A shared Redis client instance
 */
export function getRedisClient(): Redis {
  if (!globalRedisClient) {
    globalRedisClient = createRedisClient('global');
    console.log('Created global Redis client singleton');
  }
  return globalRedisClient;
}

/**
 * Closes the global Redis client if it exists.
 * This should be called during application shutdown.
 */
export async function closeRedisConnection(): Promise<void> {
  if (globalRedisClient) {
    console.log('Closing global Redis connection');
    await globalRedisClient.quit();
    globalRedisClient = null;
  }
}

/**
 * Sets up event listeners for a Redis client
 * 
 * @param client The Redis client
 * @param clientName Name for logging purposes
 * @param hostname Hostname being connected to (for tracking failures)
 */
function setupRedisClientListeners(client: Redis, clientName: string, hostname?: string): void {
  client.on('error', (error: Error) => {
    console.error(`Redis client "${clientName}" error:`, error);
    
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      // Additional debugging for connection errors
      console.error(`CRITICAL: Redis client "${clientName}" connection failed:`, 
                   getRedisConnectionString({ url: client.options.path }));
      
      // If this is an internal hostname and we got ENOTFOUND, mark it for future reference
      if (hostname && isRailwayInternalHostname(hostname) && error.message.includes('ENOTFOUND')) {
        console.error(`CRITICAL: Detected ENOTFOUND error with internal Railway hostname (${hostname})`);
        
        connectionState.hadInternalHostnameError = true;
        connectionState.failedHosts.add(hostname);
        connectionState.useProxyHostnames = true;
        
        // Log the change in strategy
        console.error('CRITICAL: Switching to use proxy hostnames for future connections');
      }
      
      // Log detailed debug info
      if (error.message.includes('redis.railway.internal')) {
        const optionsUrl = client.options.path;
        if (optionsUrl && typeof optionsUrl === 'string' && optionsUrl.includes('redis.railway.internal')) {
          console.error(`CRITICAL: Internal hostname found in Redis client options: ${optionsUrl.replace(/redis:\/\/(.*):(.*)@/, 'redis://$1:***@')}`);
          
          // Log all options to help debug
          console.error('CRITICAL: Full Redis client options:', {
            host: client.options.host,
            port: client.options.port,
            path: typeof client.options.path === 'string' ? 
                  client.options.path.replace(/redis:\/\/(.*):(.*)@/, 'redis://$1:***@') : 
                  client.options.path,
            family: client.options.family
          });
        }
      }
    }
  });
  
  client.on('connect', () => {
    console.log(`Redis client "${clientName}" connected successfully`);
    
    // If we've successfully connected to a hostname that previously failed, clear the error state
    if (hostname && connectionState.failedHosts.has(hostname)) {
      console.log(`CRITICAL: Successfully connected to previously failed hostname (${hostname}), resetting error state`);
      connectionState.failedHosts.delete(hostname);
      if (connectionState.failedHosts.size === 0) {
        connectionState.hadInternalHostnameError = false;
      }
    }
  });
  
  client.on('ready', () => {
    console.log(`Redis client "${clientName}" ready and operational`);
  });
  
  client.on('reconnecting', (ms: number) => {
    console.log(`Redis client "${clientName}" reconnecting in ${ms}ms`);
  });
  
  client.on('end', () => {
    console.log(`Redis client "${clientName}" connection closed`);
  });
}

/**
 * Returns a sanitized string representation of the Redis connection
 * (for logging, without exposing credentials)
 * 
 * @param config Redis connection configuration
 * @returns A sanitized connection string for logging
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

/**
 * Checks Redis health by attempting to ping the server
 * 
 * @returns A health status object
 */
export async function checkRedisHealth(): Promise<{ status: string; message: string; details?: any }> {
  const client = createRedisClient('health-check');
  
  try {
    await client.ping();
    return { status: 'healthy', message: 'Redis connection successful' };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  } finally {
    await client.quit();
  }
}

/**
 * Creates a BullMQ-compatible connection object from Redis configuration
 * Ensures the family: 0 setting is applied
 * 
 * @param config Optional custom Redis configuration
 * @returns A configuration object suitable for BullMQ
 */
export function createBullMQConnection(config?: RedisConnectionConfig): RedisConnectionConfig {
  // Start with base configuration from environment or passed config
  const baseConfig = config || createRedisConfig();
  
  // Ensure critical BullMQ settings
  const bullMQConfig = {
    ...baseConfig,
    // Force these settings for BullMQ compatibility
    family: 0, // CRITICAL: Use IPv4 only
    maxRetriesPerRequest: null // BullMQ requires this to be null, not a number
  };
  
  // Log the configuration
  console.log(`BullMQ Redis configuration created with family=${bullMQConfig.family} (should be 0)`);
  if (bullMQConfig.url) {
    console.log(`BullMQ Redis URL: ${getRedisConnectionString(bullMQConfig)}`);
  } else if (bullMQConfig.host) {
    console.log(`BullMQ Redis host: ${bullMQConfig.host}:${bullMQConfig.port}`);
  }
  
  return bullMQConfig;
} 