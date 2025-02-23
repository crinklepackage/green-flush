// packages/server/api/src/index.ts
import { config } from './config/environment'
import { ApiService } from './services/api-service'
import { DatabaseService } from './lib/database'
import { QueueService } from './services/queue'
import { podcastRoutes } from './routes/podcasts'
import { supabase } from './lib/supabase';

export const db = new DatabaseService(supabase)
export { DatabaseService }

async function main() {
  const db = new DatabaseService(supabase)
  const queue = new QueueService(config.REDIS_URL)
  const api = new ApiService(db, queue)
  const router = podcastRoutes(db, queue)

  await api.start(Number(config.PORT), router)

  process.on('SIGTERM', async () => {
    await api.shutdown()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('Failed to start API:', error)
  process.exit(1)
})