import { validateEnv } from './config/environment'
import { ApiService } from './services/api-service'
import { DatabaseService } from './services/database'
import { QueueService } from './services/queue'

async function main() {
  const env = validateEnv()
  
  const db = new DatabaseService(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
  const queue = new QueueService(env.REDIS_URL)
  const api = new ApiService(db, queue)

  await api.start(Number(env.PORT))

  process.on('SIGTERM', async () => {
    await api.shutdown()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('Failed to start API:', error)
  process.exit(1)
})