// packages/server/api/src/routes/summaries.ts
import { Router, Request, Response } from 'express'
import { SummaryService } from '../services/summary'
import { mapStatusToClient } from '@wavenotes-new/shared/browser/types/status'
import { DatabaseService } from '../lib/database'
import { config } from '../config/environment'

const router = Router()

router.get('/:id/stream', async (req, res) => {
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

// Inject db service
export const createSummariesRouter = (db: DatabaseService) => {
  const router = Router()

  router.get('/summaries/:id', async (req: Request, res: Response) => {
    const summary = await db.getSummary(req.params.id)
    
    res.json({
      ...summary,
      status: mapStatusToClient(summary.status)
    })
  })

  return router
}

export default router