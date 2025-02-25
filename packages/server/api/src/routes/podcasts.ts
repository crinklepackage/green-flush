import express, { Router } from 'express';
import { z } from 'zod';
import { validateRequest } from '../middleware/validate';
import { PodcastSchema, ProcessingStatus, PodcastJob } from '@wavenotes-new/shared';
import { DatabaseService } from '../lib/database';
import { QueueService } from '../services/queue';
import { authMiddleware } from '../middleware/auth';
import { YouTubeService } from '../platforms/youtube/service';
import { SpotifyService } from '../platforms/spotify/service';
import { PodcastService } from '../services/podcast';

/*
  Purpose:
  - POST /: Submit a podcast URL for processing (mounted as /podcasts)
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
  router.get('/summary/:id', async (req, res, next) => {
    try {
      const result = await db.getSummaryWithPodcast(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /podcasts
  router.post('/',
    authMiddleware,
    async (req, res, next) => {
      try {
        const { url } = req.body;
        if (!url) {
          return res.status(400).json({ message: 'URL is required' });
        }
        // Use authenticated user id from req.user
        const userId = req.user.id;

        // Import config from environment
        const { config } = require('../config/environment');

        // Instantiate platform services
        const ytService = new YouTubeService(config.YOUTUBE_API_KEY);
        const spotifyService = new SpotifyService({
          clientId: config.SPOTIFY_CLIENT_ID,
          clientSecret: config.SPOTIFY_CLIENT_SECRET
        });

        // Instantiate PodcastService with dependencies
        const podcastService = new PodcastService(db, ytService, spotifyService, queue);

        // Create podcast request using hybrid logic
        const summaryId = await podcastService.createPodcastRequest(url, userId);

        // Return the created summary record's id
        res.status(201).json({ id: summaryId });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}