// packages/server/api/src/routes/podcasts.ts
import { z } from 'zod'
import { Router } from 'express'
import { ProcessingStatus } from '@wavenotes/shared'

const router = Router()

// Request validation schemas
const createPodcastSchema = z.object({
  url: z.string().url(),
  platform: z.enum(['spotify', 'youtube'])
})

const getSummarySchema = z.object({
  id: z.string().uuid()
})

// Error handler middleware
const validateRequest = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body)
      next()
    } catch (error) {
      res.status(400).json({
        error: 'Invalid request',
        details: error.errors
      })
    }
  }
}

router.post('/podcasts', 
  validateRequest(createPodcastSchema),
  async (req, res) => {
    const { url, platform } = req.body

    try {
      // Create initial records
      const podcastService = new PodcastService(db, queue)
      const summaryId = await podcastService.createPodcastRequest(url, platform)

      res.json({ summaryId })
    } catch (error) {
      if (error instanceof PlatformError) {
        res.status(400).json({
          error: 'Platform error',
          message: error.message,
          code: error.code
        })
        return
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process podcast'
      })
    }
})

router.get('/summaries/:id',
  validateRequest(getSummarySchema),
  async (req, res) => {
    const { id } = req.params

    try {
      const summary = await db.getSummaryWithPodcast(id)
      res.json(summary)
    } catch (error) {
      if (error instanceof DatabaseError) {
        res.status(404).json({
          error: 'Not found',
          message: 'Summary not found'
        })
        return
      }

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch summary'
      })
    }
})

export default router