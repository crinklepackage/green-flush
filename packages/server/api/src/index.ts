// packages/server/api/src/index.ts
import { Router } from 'express';
import { existsSync } from 'fs';
import path from 'path';

// CRITICAL: Sanitize Redis environment variables at the very beginning
// This must come before ANY imports that might use Redis directly or indirectly
function sanitizeRedisEnvironmentVariables() {
  console.log('Sanitizing Redis environment variables at application startup');
  
  if (process.env.REDIS_URL && process.env.REDIS_URL.includes('redis.railway.internal')) {
    try {
      // Parse the URL to extract components
      const parsedUrl = new URL(process.env.REDIS_URL);
      
      // Replace the hostname with the public endpoint
      const publicHost = 'roundhouse.proxy.rlwy.net';
      const publicPort = process.env.REDIS_PUBLIC_PORT ? parseInt(process.env.REDIS_PUBLIC_PORT, 10) : 30105;
      
      // Build the new URL with the same authentication but different host/port
      parsedUrl.hostname = publicHost;
      parsedUrl.port = publicPort.toString();
      
      // Set the sanitized URL back to the environment
      const sanitizedUrl = parsedUrl.toString();
      console.log(`Replaced REDIS_URL internal hostname with public endpoint (credentials hidden)`);
      
      // Set multiple formats to ensure all code paths are covered
      process.env.REDIS_URL = sanitizedUrl;
      
      // Also set individual components for code that might use them directly
      process.env.REDIS_HOST = publicHost;
      process.env.REDISHOST = publicHost;
      process.env.REDIS_PORT = publicPort.toString();
      process.env.REDISPORT = publicPort.toString();
      
      // Set global flag to indicate we've sanitized the environment
      process.env.REDIS_ENV_SANITIZED = 'true';
      
      // Set a public URL environment variable for code that might check for it
      process.env.REDIS_PUBLIC_URL = sanitizedUrl;
      
    } catch (error) {
      console.error('Error sanitizing Redis environment variables:', error);
    }
  } else {
    console.log('No internal Redis hostname detected in environment variables');
  }
}

// Run sanitization before any other code executes
sanitizeRedisEnvironmentVariables();

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
  const summariesRouter = createSummariesRouter(db)
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