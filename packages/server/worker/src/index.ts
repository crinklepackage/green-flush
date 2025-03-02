import { Worker, Job } from 'bullmq';
import { WorkerService } from './services/worker-service';
import { config } from './config/environment';
import { YouTubeApiClient } from './platforms/youtube/api-client';
import { ContentProcessorService } from './services/content-processor';
import { PodcastJob, createBullMQConnection } from '@wavenotes-new/shared';
import http from 'http';
import { createRedisConfig } from './config/redis-config';

const startWorker = async () => {
  try {
    // Initialize HTTP server for health checks
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    
    server.listen(config.PORT || 3001, () => {
      console.log(`Worker health check server listening on port ${config.PORT || 3001}`);
    });
    
    // Initialize YouTube client
    const youtube = new YouTubeApiClient(
      config.YOUTUBE_OAUTH_CLIENT_ID,
      config.YOUTUBE_OAUTH_CLIENT_SECRET,
      config.YOUTUBE_OAUTH_REFRESH_TOKEN
    );
    await youtube.initialize();
    
    // Create worker service with YouTube client
    const worker = new WorkerService(youtube);

    // Get Redis connection configuration
    // Using local implementation directly
    const redisConfig = createRedisConfig(process.env.REDIS_URL || '');
    console.log(`[Worker] Using Redis configuration with family: ${redisConfig.family}`);

    // Create BullMQ worker
    const podcastWorker = new Worker(
      'podcast',
      async (job: Job<PodcastJob>) => {
        console.log('Processing job:', job.id, job.data);
        const processor = new ContentProcessorService();
        await processor.processPodcast(job.data);
      },
      { 
        connection: redisConfig
      }
    );

    // BullMQ event listeners
    podcastWorker.on('completed', (job: Job<PodcastJob>) => {
      console.log('Job completed successfully:', job.id);
    });

    podcastWorker.on('failed', (job: Job<PodcastJob> | undefined, error: Error, prev?: string) => {
      console.error('Job failed:', job?.id ?? 'unknown', error);
    });

    // Handle shutdown
    process.on('SIGTERM', async () => {
      console.log('Shutting down...');
      await Promise.all([
        worker.close(),
        podcastWorker.close()
      ]);
      
      // Close HTTP server
      server.close(() => {
        console.log('Health check server closed');
      });
      
      process.exit(0);
    });

    console.log(`Worker started in ${config.NODE_ENV} mode`);
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
};

startWorker();