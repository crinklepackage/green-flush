// packages/server/worker/src/index.ts
import { WorkerService } from './worker.service'
import { env } from './config/environment'
import { youtubeApiClient } from './platforms/youtube/api-client'

const startWorker = async () => {
  try {
    // Initialize services
    await youtubeApiClient.initialize()
    
    // Create worker service
    const worker = new WorkerService()

    // Handle shutdown
    process.on('SIGTERM', async () => {
      await worker.close()
      process.exit(0)
    })

    console.log(`Worker started in ${env.NODE_ENV} mode`)
  } catch (error) {
    console.error('Failed to start worker:', error)
    process.exit(1)
  }
}

startWorker()