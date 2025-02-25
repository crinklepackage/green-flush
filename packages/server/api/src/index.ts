// packages/server/api/src/index.ts
import { Router } from 'express';
import { config } from './config/environment'
import { ApiService } from './services/api-service'
import { DatabaseService } from './lib/database'
import { QueueService } from './services/queue'
import { podcastRoutes } from './routes/podcasts'
import { createSummariesRouter } from './routes/summaries'
import { supabase } from './lib/supabase';
import adminRouter from './routes/admin';

export const db = new DatabaseService(supabase)
export { DatabaseService }

async function main() {
  const db = new DatabaseService(supabase)
  const queue = new QueueService(config.REDIS_URL)
  const api = new ApiService(db, queue)
  
  // Create routers
  const podcastRouter = podcastRoutes(db, queue)
  const summariesRouter = createSummariesRouter(db)
  
  // Create a root router and mount the other routers with path prefixes
  const rootRouter = Router();
  rootRouter.use('/podcasts', podcastRouter);
  rootRouter.use('/summaries', summariesRouter);
  rootRouter.use('/admin', adminRouter);
  
  // Start API with the root router
  await api.start(Number(config.PORT), rootRouter)

  process.on('SIGTERM', async () => {
    await api.shutdown()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('Failed to start API:', error)
  process.exit(1)
})