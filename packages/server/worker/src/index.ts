import { Worker, Job } from 'bullmq';
import { WorkerService } from './services/worker-service';
import { config } from './config/environment';
import { YouTubeApiClient } from './platforms/youtube/api-client';
import { ContentProcessorService } from './services/content-processor';
import { PodcastJob } from '@wavenotes-new/shared';

const startWorker = async () => {
  try {
    // Initialize YouTube client
    const youtube = new YouTubeApiClient(
      config.YOUTUBE_OAUTH_CLIENT_ID,
      config.YOUTUBE_OAUTH_CLIENT_SECRET,
      config.YOUTUBE_OAUTH_REFRESH_TOKEN
    );
    await youtube.initialize();
    
    // Create worker service with YouTube client
    const worker = new WorkerService(youtube);

    // Create BullMQ worker
    const podcastWorker = new Worker(
      'podcast_processing',
      async (job: Job<PodcastJob>) => {
        console.log('Processing job:', job.id, job.data);
        const processor = new ContentProcessorService();
        await processor.processPodcast(job.data);
      },
      { 
        connection: { 
          url: config.REDIS_URL 
        } 
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
      process.exit(0);
    });

    console.log(`Worker started in ${config.NODE_ENV} mode`);
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
};

startWorker();