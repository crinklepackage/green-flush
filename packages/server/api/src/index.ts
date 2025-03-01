// packages/server/api/src/index.ts

// Simple Redis hostname fix - must be before any imports
if (process.env.REDIS_URL && process.env.REDIS_URL.includes('redis.railway.internal')) {
  process.env.REDIS_URL = process.env.REDIS_URL.replace('redis.railway.internal', 'roundhouse.proxy.rlwy.net');
  console.log('Fixed Redis URL to use public endpoint');
}

// Also fix individual host variables that might be used directly
if (process.env.REDISHOST === 'redis.railway.internal') {
  process.env.REDISHOST = 'roundhouse.proxy.rlwy.net';
  console.log('Fixed REDISHOST to use public endpoint');
}

if (process.env.REDIS_HOST === 'redis.railway.internal') {
  process.env.REDIS_HOST = 'roundhouse.proxy.rlwy.net';
  console.log('Fixed REDIS_HOST to use public endpoint');
}

import { Router } from 'express';
import { existsSync } from 'fs';
import path from 'path';

// Check for conflicting .env files
const envPath = path.resolve(__dirname, '../../.env');
const envLocalPath = path.resolve(__dirname, '../../.env.local');

if (existsSync(envPath)) {
  if (existsSync(envLocalPath)) {
    console.warn('⚠️ WARNING: Both .env and .env.local exist in the API directory.');
    console.warn('⚠️ This can cause environment variable conflicts. Consider removing .env.');
    console.warn('⚠️ Using: ', envLocalPath);
  } else {
    console.warn('⚠️ Using .env file instead of recommended .env.local');
  }
}

import { config } from './config/environment'
import { ApiService } from './services/api-service'
import { DatabaseService } from './lib/database'
import { QueueService } from './services/queue'
import { podcastRoutes } from './routes/podcasts'
import { createSummariesRouter } from './routes/summaries'
import { feedbackRoutes } from './routes/feedback'
import { supabase } from './lib/supabase';
import adminRouter from './routes/admin';
import { validateStatusMiddleware } from './middleware/validate-status';
import { checkStalledSummaries } from './services/timeout-service';
import { healthRouter } from './routes/health';

export const db = new DatabaseService(supabase)
export { DatabaseService }

async function main() {
  // Log some important environment variables for debugging
  console.log('==== ENVIRONMENT INFO ====');
  console.log({
    NODE_ENV: process.env.NODE_ENV,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
    PORT: config.PORT
  });
  
  const db = new DatabaseService(supabase)
  
  // Initialize the queue service using our centralized Redis configuration
  console.log('Creating QueueService with centralized Redis configuration');
  const queue = new QueueService();
  
  const api = new ApiService(db, queue)
  
  // Create routers
  const podcastRouter = podcastRoutes(db, queue)
  const summariesRouter = createSummariesRouter(db, queue)
  const feedbackRouter = feedbackRoutes(db)
  
  // Create a root router and mount the other routers with path prefixes
  const rootRouter = Router();
  
  // Apply the status validation middleware to all routes
  rootRouter.use(validateStatusMiddleware);
  
  rootRouter.use('/podcasts', podcastRouter);
  rootRouter.use('/summaries', summariesRouter);
  rootRouter.use('/feedback', feedbackRouter);
  rootRouter.use('/admin', adminRouter);
  rootRouter.use('/health', healthRouter);
  
  // Start API with the root router
  await api.start(Number(config.PORT), rootRouter)

  // Check for stalled summaries on startup
  try {
    console.log('Checking for stalled summaries on server startup...');
    const updatedCount = await checkStalledSummaries();
    console.log(`Startup timeout check complete: ${updatedCount} summaries updated`);
  } catch (error) {
    console.error('Error checking for stalled summaries on startup:', error);
  }

  // Setup interval to check for stalled summaries every hour
  const CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  setInterval(async () => {
    try {
      console.log('Running scheduled stalled summary check...');
      await checkStalledSummaries();
    } catch (error) {
      console.error('Error in scheduled stalled summary check:', error);
    }
  }, CHECK_INTERVAL_MS);

  process.on('SIGTERM', async () => {
    await api.shutdown()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('Failed to start API:', error)
  process.exit(1)
})