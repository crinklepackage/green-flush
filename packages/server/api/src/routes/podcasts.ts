// packages/server/api/src/services/podcast.ts
//import { 
//  PlatformError, 
//  DatabaseError,
//  VideoMetadata
// } from '@wavenotes/shared'
// import { DatabaseService } from '../lib/database'
// import { YouTubeService } from '../platforms/youtube'
// import { QueueService } from '../lib/queue'
import express, { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate';
import { PodcastSchema, ProcessingStatus } from '@wavenotes-new/shared/node';
import { DatabaseService } from '../services/database';
import { QueueService } from '../services/queue';

const router = Router();

/*
  Purpose:
  - POST /summary: Create a podcast record, create a summary record, and enqueue a job.
  - GET /summaries: Retrieve summaries for the dashboard.
  - GET /summary/:id: Retrieve single summary details.
*/

// Request schema
const createPodcastRequestSchema = z.object({
  url: z.string().url(),
  summaryId: z.string().uuid()
});

// POST /summary
router.post('/summary', async (req, res) => {
  // 1. Create podcast record
  // 2. Create summary record
  // 3. Enqueue job
  // (Insert your logic here)
  res.status(201).send({ message: 'Podcast summary created' });
});

// GET /summaries
router.get('/summaries', async (req, res) => {
  // Retrieve summary list for dashboard
  // (Insert your logic here)
  res.send({ message: 'Summary list retrieved' });
});

// GET /summary/:id
router.get('/summary/:id', async (req, res) => {
  // Retrieve a single summary's details
  // (Insert your logic here)
  res.send({ message: `Summary details for id: ${req.params.id}` });
});

// POST /api/podcasts
export function podcastRoutes(db: DatabaseService, queue: QueueService) {
  router.post('/podcasts',
    validateRequest(createPodcastRequestSchema),
    async (req, res, next) => {
      try {
        const { url, summaryId } = req.body;
        
        // 1. Create podcast record
        const podcast = await db.createPodcast({
          url,
          platform: url.includes('youtube.com') ? 'youtube' : 'spotify',
          status: ProcessingStatus.IN_QUEUE
        });

        // 2. Enqueue processing job
        await queue.add('PROCESS_PODCAST', {
          podcastId: podcast.id,
          summaryId,
          url
        });
        
        res.status(201).json({ 
          id: podcast.id,
          status: podcast.status 
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}