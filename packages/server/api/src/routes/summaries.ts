// packages/server/api/src/routes/summaries.ts
import express, { Router, Request, Response } from 'express'
import { SummaryService } from '../services/summary'
import { mapStatusToClient, ProcessingStatus, PodcastJob, SummaryRecord, DatabasePodcastRecord } from '@wavenotes-new/shared'
import { DatabaseService } from '../lib/database'
import { config } from '../config/environment'
import { authMiddleware } from '../middleware/auth'
import { DatabaseError } from '@wavenotes-new/shared'
import { QueueService } from '../services/queue'
import { YouTubeService } from '../platforms/youtube/service'
import { SpotifyService } from '../platforms/spotify/service'
import { PodcastService } from '../services/podcast'

// Create a more specific type definition that matches the actual structure
interface DetailedSummaryRecord {
  id: string;
  podcast_id: string;
  status: ProcessingStatus;
  summary_text?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  creator_id?: string;
}

// Create router with database service injection
export function createSummariesRouter(db: DatabaseService, queue?: QueueService): Router {
  const router = Router()

  // Apply auth middleware to all routes
  router.use(authMiddleware)
  
  /**
   * Stream summary content
   */
  router.get('/:id/stream', async (req: Request, res: Response) => {
    const { id } = req.params

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    try {
      // Get summary generator
      const summaryService = new SummaryService(config.ANTHROPIC_API_KEY)
      const generator = await summaryService.generateSummaryStream(id)

      // Stream chunks to client
      for await (const chunk of generator) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
      }

      res.write('data: [DONE]\n\n')
    } catch (error) {
      console.error('Streaming error:', error)
      res.write(`data: ${JSON.stringify({ error: 'Failed to generate summary' })}\n\n`)
    } finally {
      res.end()
    }
  })

  /**
   * GET summary by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const summaryId = req.params.id
      const userId = req.user.id
      
      // Check if the user has access to this summary
      const hasAccess = await db.userHasAccessToSummary(userId, summaryId)
      if (!hasAccess) {
        return res.status(404).json({ error: 'Summary not found' })
      }
      
      const summary = await db.getSummary(summaryId)
      return res.json(summary)
    } catch (error) {
      console.error('Error fetching summary:', error)
      return res.status(500).json({ error: 'Failed to get summary' })
    }
  })

  /**
   * DELETE summary by ID
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const summaryId = req.params.id
      const userId = req.user.id
      
      console.log(`DELETE request received for summary ${summaryId} by user ${userId}`);
      
      // Try to delete the summary, this will throw an error if the user doesn't have access
      await db.deleteSummary(summaryId, userId)
      
      console.info(`Summary deletion successful: summaryId=${summaryId}, userId=${userId}`)
      
      // Return a 204 No Content response on success
      return res.status(204).send()
    } catch (error) {
      // Structured error logging
      const errorDetails = {
        summaryId: req.params.id,
        userId: req.user?.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorCode: error instanceof DatabaseError ? error.code : 'UNKNOWN',
        stack: error instanceof Error ? error.stack : undefined
      };
      
      console.error('Error deleting summary:', errorDetails);
      
      // Handle specific error types
      if (error instanceof DatabaseError) {
        if (error.message.includes('Access denied')) {
          return res.status(403).json({ 
            error: 'Access denied: You do not have permission to delete this summary',
            details: errorDetails
          });
        }
        
        if (error.message.includes('not found') || error.code === 'NOT_FOUND') {
          return res.status(404).json({ 
            error: 'Summary not found',
            details: errorDetails
          });
        }
        
        // Return the database error details for other cases
        return res.status(500).json({ 
          error: 'Database error while deleting summary',
          details: errorDetails
        });
      }
      
      // Generic server error for other cases
      return res.status(500).json({ 
        error: 'Failed to delete summary',
        details: errorDetails
      });
    }
  })

  /**
   * POST /:id/retry - Retry a failed summary by creating a new request
   */
  router.post('/:id/retry', async (req, res) => {
    try {
      const { id: summaryId } = req.params;
      const userId = req.user.id;

      console.log(`RETRY request received for summary ${summaryId} by user ${userId}`);

      // Get the summary to retry - with explicit casting to our detailed type
      const summary = await db.getSummary(summaryId) as DetailedSummaryRecord;
      if (!summary) {
        return res.status(404).json({ error: 'Summary not found' });
      }

      // Check if the user has access to this summary
      const hasAccess = await db.userHasAccessToSummary(userId, summaryId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied: You do not have permission to retry this summary' });
      }

      // Verify summary status is 'failed' (case-insensitive)
      if (summary.status !== ProcessingStatus.FAILED) {
        return res.status(400).json({ 
          error: `Cannot retry summary with status '${summary.status}'. Only summaries with status 'failed' can be retried.`
        });
      }

      // Get the podcast associated with the summary
      const podcast = await db.getPodcast(summary.podcast_id);
      if (!podcast) {
        return res.status(404).json({ error: 'Associated podcast not found' });
      }

      // Store the URL we need to reprocess
      const originalUrl = podcast.url;
      
      // Import config from environment
      const { config } = require('../config/environment');

      // Instantiate platform services
      const ytService = new YouTubeService(config.YOUTUBE_API_KEY);
      const spotifyService = new SpotifyService({
        clientId: config.SPOTIFY_CLIENT_ID,
        clientSecret: config.SPOTIFY_CLIENT_SECRET
      });

      // Perform basic validation on the URL before proceeding
      try {
        // Determine platform and validate URL format
        if (originalUrl.includes('spotify.com')) {
          // Validate Spotify URL and extract episode ID
          const episodeId = spotifyService.getEpisodeId(originalUrl);
          console.log(`Validated Spotify URL with episode ID: ${episodeId}`);
        } else if (originalUrl.includes('youtube.com') || originalUrl.includes('youtu.be')) {
          // Basic YouTube URL validation could go here if needed
          console.log(`Validated YouTube URL: ${originalUrl}`);
        } else {
          return res.status(400).json({ 
            error: 'Invalid URL format. URL must be from Spotify or YouTube.' 
          });
        }
      } catch (validationError) {
        console.error('URL validation error:', validationError);
        return res.status(400).json({ 
          error: 'Invalid URL format. Please check that the URL is correctly formatted.' 
        });
      }

      // Check if queue service is available
      if (!queue) {
        return res.status(500).json({ 
          error: 'Queue service not available. Cannot retry summary without a queue service.' 
        });
      }

      // Instantiate PodcastService with dependencies
      const podcastService = new PodcastService(db, ytService, spotifyService, queue);
      
      try {
        // Delete the existing summary (this will clean up everything)
        // If this is the only user, it will also delete the podcast
        await db.deleteSummary(summaryId, userId);
        
        // Use the existing podcast processing flow to create a new summary from scratch
        // This is the same flow used when a user enters a new URL
        const newSummaryId = await podcastService.createPodcastRequest(originalUrl, userId);
        
        console.log(`Summary retry successful. Old summaryId=${summaryId}, New summaryId=${newSummaryId}, userId=${userId}`);
        
        // Return the new summary ID for redirection
        return res.status(200).json({ 
          message: 'Summary queued for retry',
          newSummaryId 
        });
      } catch (processingError: any) {
        console.error('Error during podcast processing:', processingError);
        
        // Log retry error to database
        await db.logSummaryRetryError({
          summaryId,
          userId,
          originalPodcastUrl: originalUrl,
          error: processingError.message || 'Error during podcast processing',
          errorDetails: processingError
        });
        
        // Handle specific Spotify API errors
        if (processingError.message && processingError.message.includes('Resource not found')) {
          return res.status(404).json({ 
            error: 'The link to this podcast has expired. Copy it from Spotify and try again.',
            details: processingError.message
          });
        }
        
        // Generic processing error
        return res.status(500).json({ 
          error: 'Failed to process podcast for retry',
          details: processingError.message
        });
      }
    } catch (error) {
      console.error('Error retrying summary:', error);
      
      // Log general retry error to database
      try {
        // For general errors, we still have access to req.params.id and req.user.id
        const errorSummaryId = req.params.id;
        const errorUserId = req.user.id;
        
        await db.logSummaryRetryError({
          summaryId: errorSummaryId,
          userId: errorUserId,
          originalPodcastUrl: 'Unknown URL', // We don't have access to originalUrl here
          error: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: error
        });
      } catch (logError) {
        console.error('Failed to log retry error:', logError);
      }
      
      return res.status(500).json({ 
        error: 'Failed to retry summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router
}

export default createSummariesRouter