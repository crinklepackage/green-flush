// packages/server/api/src/routes/summaries.ts
import { Router, Request, Response } from 'express'
import { SummaryService } from '../services/summary'
import { mapStatusToClient, ProcessingStatus, PodcastJob } from '@wavenotes-new/shared'
import { DatabaseService } from '../lib/database'
import { config } from '../config/environment'
import { authMiddleware } from '../middleware/auth'
import { DatabaseError } from '@wavenotes-new/shared'
import { QueueService } from '../services/queue'

// Define the types locally to match the database structure
interface SummaryRecord {
  id: string;
  podcast_id: string;
  status: string;
  summary_text: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  failed_at: string | null;
}

interface DatabasePodcastRecord {
  id: string;
  url: string;
  platform: 'spotify' | 'youtube';
  youtube_url: string | null;
  title: string;
  show_name: string;
  transcript: string | null;
  has_transcript: boolean;
  created_at: string;
  updated_at: string;
  thumbnail_url: string | null;
  duration: number | null;
  platform_specific_id: string | null;
  created_by: string;
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
   * POST /:id/retry - Retry a failed summary
   */
  router.post('/:id/retry', async (req, res) => {
    try {
      const { id: summaryId } = req.params;
      const userId = req.user.id;

      if (!summaryId) {
        return res.status(400).json({ error: 'Missing summary ID' });
      }

      console.log(`RETRY request received for summary ${summaryId} by user ${userId}`);

      // Get the summary to retry
      const summary = await db.getSummary(summaryId) as SummaryRecord;
      if (!summary) {
        return res.status(404).json({ error: 'Summary not found' });
      }

      // Check if the user has access to this summary
      const hasAccess = await db.userHasAccessToSummary(userId, summaryId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied: You do not have permission to retry this summary' });
      }

      // Verify summary status is 'failed' (case-insensitive)
      if (summary.status !== 'failed') {
        return res.status(400).json({ 
          error: `Cannot retry summary with status '${summary.status}'. Only summaries with status 'failed' can be retried.`
        });
      }

      // Get the podcast associated with the summary
      const podcast = await db.getPodcast(summary.podcast_id) as DatabasePodcastRecord;
      if (!podcast) {
        return res.status(404).json({ error: 'Associated podcast not found' });
      }

      // Update the summary status to pending
      await db.updateSummaryStatus(summaryId, 'pending');

      // Add the job to the queue
      if (!queue) {
        return res.status(500).json({ error: 'Queue service unavailable' });
      }
      
      await queue.add('PROCESS_PODCAST', {
        id: `retry_${summaryId}_${Date.now()}`,
        status: 'in_queue',
        summaryId,
        podcastId: summary.podcast_id,
        url: podcast.url,
        type: podcast.platform,
        userId
      } as PodcastJob);

      console.log(`Summary retry successful: summaryId=${summaryId}, userId=${userId}`);
      return res.status(200).json({ message: 'Summary queued for retry' });
    } catch (error) {
      console.error('Error retrying summary:', error);
      return res.status(500).json({ error: 'Failed to retry summary' });
    }
  });

  return router
}

export default createSummariesRouter