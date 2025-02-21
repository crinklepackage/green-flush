import express, { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate';
import { PodcastSchema, ProcessingStatus, PodcastJob } from '@wavenotes-new/shared';
import { DatabaseService } from '../lib/database';
import { QueueService } from '../services/queue';
// import { authMiddleware } from '../middleware/auth';

/*
  Purpose:
  - POST /summary: Create a podcast record, create a summary record, and enqueue a job.
  - GET /summaries: Retrieve summaries for the dashboard.
  - GET /summary/:id: Retrieve single summary details.
*/

export function podcastRoutes(db: DatabaseService, queue: QueueService) {
  const router = Router();

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

  // POST /podcasts
  router.post('/podcasts',
    // authMiddleware,  // Temporarily disabled for testing without auth
    // validateRequest(PodcastSchema),  // Temporarily disabled validation for testing
    async (req, res, next) => {
      try {
        const { url } = req.body;
        if (!url) {
          return res.status(400).json({ message: 'URL is required' });
        }
        // Determine platform type based on URL (simplistic check)
        const type = url.includes('youtube.com') ? 'youtube' : 'spotify';
        // Use the provided dummy user id for testing
        const userId = '5193a17f-5c16-4f87-af94-932ce9b47c03';

        // Create podcast record in the database
        const podcast = await db.createPodcast({
          url,
          platform: type,
          title: 'Dummy Title', // Ideally, metadata fetched later
          show_name: 'Dummy Show',
          thumbnail_url: null,
          duration: null,
          created_by: userId
        });

        // Create summary record in the database
        const summary = await db.createSummary({
          podcastId: podcast.id,
          status: ProcessingStatus.IN_QUEUE
        });

        // Enqueue processing job
        await queue.add('PROCESS_PODCAST', {
          podcastId: podcast.id,
          summaryId: summary.id,
          url,
          type,
          userId
        } as PodcastJob);

        // Return the created summary record's id and status
        res.status(201).json({ id: summary.id, status: summary.status });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}