// packages/server/api/src/routes/summaries.ts
import { Router, Request, Response } from 'express'
import { SummaryService } from '../services/summary'
import { mapStatusToClient } from '@wavenotes-new/shared'
import { DatabaseService } from '../lib/database'
import { config } from '../config/environment'
import { authMiddleware } from '../middleware/auth'
import { DatabaseError } from '@wavenotes-new/shared'

// Create router with database service injection
export function createSummariesRouter(db: DatabaseService): Router {
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

  return router
}

export default createSummariesRouter