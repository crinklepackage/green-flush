# Redis Queue Service Implementation

## Overview

This document outlines the implementation of our queue service using Redis and BullMQ, with particular focus on addressing the "ENOTFOUND redis.railway.internal" error in Railway deployments. The implementation follows clean architecture principles with a strong emphasis on separation of concerns, error handling, and environment-aware configuration.

## Problem Statement

When deploying to Railway, Redis connections may fail with an "ENOTFOUND redis.railway.internal" error. This occurs because:

1. Railway uses service linking to connect your app to Redis
2. When services are linked, Railway injects environment variables with connection details
3. These variables differ from standard Redis URL connections
4. Without proper handling, the application attempts to connect to "redis.railway.internal" directly

## Architecture

Our implementation follows these architecture principles:

1. **Interface-based design**: All queue functionality is defined through interfaces
2. **Multiple implementations**: Concrete implementations for BullMQ and mock services
3. **Factory pattern**: Environment-aware factory for selecting the appropriate implementation
4. **Configuration layer**: Centralized Redis configuration handling
5. **Health checks**: Endpoints to verify connection status
6. **Graceful degradation**: Fallback to mock implementation in development

### Directory Structure

```
packages/server/api/src/
├── config/
│   └── redis-config.ts           # Redis connection configuration
├── services/
│   ├── queue.ts                  # Main queue service (public API)
│   └── queue/                    # Implementation details
│       ├── index.ts              # Exports and factory function
│       ├── queue-service.interface.ts  # Interface definitions
│       ├── bullmq-queue.service.ts     # BullMQ implementation
│       ├── mock-queue.service.ts       # Mock implementation
│       └── queue-service.factory.ts    # Factory for creating services
└── routes/
    └── health.ts                 # Health check endpoints
```

## Key Components

### 1. Queue Service Interface

The interface defines the contract for all queue service implementations:

```typescript
export interface QueueServiceInterface {
  addJob<T>(name: string, data: T, options?: JobOptions): Promise<Job<T>>;
  getJob(id: string): Promise<Job | null>;
  isConnected(): boolean;
  healthCheck(): Promise<{ status: string; details?: any }>;
  close(): Promise<void>;
}
```

### 2. Redis Configuration

The Redis configuration handles different connection methods:

```typescript
export function createRedisConfig(): RedisConnectionConfig {
  // Check if using Railway's environment variables for Redis
  if (process.env.REDIS_HOST || process.env.REDISHOST) {
    return {
      host: process.env.REDIS_HOST || process.env.REDISHOST,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 
            process.env.REDISPORT ? parseInt(process.env.REDISPORT, 10) : 6379,
      // ... other properties
    };
  }
  
  // If REDIS_URL is available, use it
  if (process.env.REDIS_URL) {
    return { 
      url: process.env.REDIS_URL,
      // ... other properties
    };
  }
  
  // Fallback to localhost for development
  return {
    host: 'localhost',
    port: 6379,
    // ... other properties
  };
}
```

### 3. BullMQ Implementation

The BullMQ implementation provides robust connection management:

- Proper initialization and cleanup
- Event listeners for connection monitoring
- Error handling with reconnection logic
- Health check capabilities
- Type-safe job management

### 4. Factory Pattern

The factory determines which implementation to use based on the environment:

```typescript
export function createQueueService(
  queueName: string,
  config?: RedisConnectionConfig,
  options?: { useMock?: boolean; forceReal?: boolean }
): QueueServiceInterface {
  return QueueServiceFactory.createQueueService(queueName, config, options);
}
```

## Railway-Specific Considerations

When deployed to Railway, our implementation addresses specific challenges:

1. **Service linking variables**: Railway provides environment variables when Redis is linked to your app. Our configuration detects and uses these variables.

2. **Connection security**: Railway Redis connections use TLS in production, which our implementation enables automatically.

3. **Error handling**: Our implementation includes comprehensive error handling with reconnection logic.

4. **Health checks**: The health endpoint enables monitoring and verification of the Redis connection.

## Environment Variables

The following environment variables are supported:

| Variable | Purpose | Example |
|----------|---------|---------|
| `REDIS_URL` | Complete Redis connection string | `redis://user:pass@localhost:6379` |
| `REDIS_HOST` | Redis hostname (Railway) | `containers-us-west-123.railway.app` |
| `REDISHOST` | Alternative hostname (Railway) | `containers-us-west-123.railway.app` |
| `REDIS_PORT` | Redis port (Railway) | `6379` |
| `REDISPORT` | Alternative port (Railway) | `6379` |
| `REDIS_PASSWORD` | Redis password (Railway) | `password123` |
| `REDISPASSWORD` | Alternative password (Railway) | `password123` |
| `REDIS_USERNAME` | Redis username (Railway) | `default` |
| `REDISUSER` | Alternative username (Railway) | `default` |
| `REDIS_TLS` | Whether to use TLS (Railway) | `true` |
| `USE_MOCK_QUEUE` | Force mock implementation | `true` |
| `USE_REAL_QUEUE` | Force real implementation | `true` |

## Usage Examples

### Basic Usage

```typescript
import { QueueService } from './services/queue';

// Create a queue service (auto-detects configuration)
const queueService = new QueueService();

// Add a job to the queue
await queueService.add('PROCESS_PODCAST', {
  podcastId: 123,
  episodeId: 456
});

// Check if connected
const isConnected = queueService.isConnected();

// Perform health check
const health = await queueService.healthCheck();

// Close the connection
await queueService.close();
```

### Health Check Endpoint

Access `/health/redis` to view Redis connection status:

```json
{
  "status": "healthy",
  "details": {
    "counts": {
      "active": 0,
      "completed": 5,
      "failed": 1,
      "delayed": 0,
      "waiting": 2
    },
    "connection": "redis://localhost:6379"
  },
  "redis": {
    "connectionString": "redis://localhost:6379",
    "isConnected": true
  },
  "timestamp": 1681234567890
}
```

## Troubleshooting

### ENOTFOUND redis.railway.internal

If you encounter this error:

1. Verify service linking in Railway:
   - Check if Redis service is linked to your app
   - Ensure Redis service is running

2. Check environment variables:
   - Verify that Railway is injecting the Redis variables
   - Log `process.env.REDIS_HOST` and other variables

3. Use health check:
   - Access `/health/redis` endpoint to view connection status
   - Check connection string and error details

### Other Common Issues

1. **Connection timeouts**:
   - Check network rules in Railway
   - Verify Redis service is running

2. **Authentication failures**:
   - Check password in environment variables
   - Try connecting with Redis CLI to verify credentials

3. **Client disconnections**:
   - Our implementation includes reconnection logic
   - Check if error is persistent or temporary

## Conclusion

This implementation provides a robust, maintainable, and environment-aware queue service using Redis and BullMQ. It addresses the "ENOTFOUND redis.railway.internal" error in Railway deployments while maintaining clean architecture principles and proper separation of concerns. 