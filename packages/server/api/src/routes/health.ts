import { Router } from 'express'
import { QueueService } from '../services/queue'
import { createRedisConfig, getRedisConnectionString } from '../config/redis-config'

/**
 * Health check routes
 * 
 * These routes provide information about the health of various components
 * of the application, such as database connections, Redis, etc.
 */
export const healthRouter = Router()

// Basic health check endpoint
healthRouter.get('/', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  })
})

// Redis/Queue health check endpoint
healthRouter.get('/redis', async (req, res) => {
  try {
    // Create a temporary queue service to check Redis connection
    const queueService = new QueueService()
    
    // Get health check information
    const health = await queueService.healthCheck()
    
    // Get connection information for debugging
    const config = createRedisConfig()
    const redisInfo = {
      connectionString: getRedisConnectionString(config),
      isConnected: queueService.isConnected()
    }
    
    // Close the queue service as we don't need it anymore
    await queueService.close()
    
    // Return the health check result
    return res.status(health.status === 'healthy' ? 200 : 503).json({
      ...health,
      redis: redisInfo,
      timestamp: Date.now()
    })
  } catch (error: any) {
    // Return error information
    return res.status(503).json({
      status: 'error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: Date.now()
    })
  }
}) 