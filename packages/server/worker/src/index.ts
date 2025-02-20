import { WorkerService } from './services/worker-service'
import { config } from './config/environment'
import { YouTubeApiClient } from './platforms/youtube/api-client'

const startWorker = async () => {
  try {
    // Initialize YouTube client
    const youtube = new YouTubeApiClient(
      config.YOUTUBE_OAUTH_CLIENT_ID,
      config.YOUTUBE_OAUTH_CLIENT_SECRET,
      config.YOUTUBE_OAUTH_REFRESH_TOKEN
    )
    await youtube.initialize()
    
    // Create worker service with YouTube client
    const worker = new WorkerService(youtube)

    // Handle shutdown
    process.on('SIGTERM', async () => {
      await worker.close()
      process.exit(0)
    })

    console.log(`Worker started in ${config.NODE_ENV} mode`)
  } catch (error) {
    console.error('Failed to start worker:', error)
    process.exit(1)
  }
}

startWorker()