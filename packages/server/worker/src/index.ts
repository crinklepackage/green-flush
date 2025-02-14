//written by o3…needs qa

import { Worker } from 'bullmq';
import { processPodcastJob } from './processors/podcast';
import { logger } from './lib/logger';

const queueName = process.env.PODCAST_QUEUE_NAME || 'podcastQueue';
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

const worker = new Worker(queueName, async job => {
  logger.info(`Started processing job ${job.id}`);
  await processPodcastJob(job.data);
  logger.info(`Finished processing job ${job.id}`);
}, { connection });

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed with error: ${err.message}`);
});

console.log('Worker is running...');