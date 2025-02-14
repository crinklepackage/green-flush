// packages/server/api/src/routes/summaries.ts
import { Router } from 'express'
import { SummaryService } from '../services/summary'

const router = Router()

router.get('/:id/stream', async (req, res) => {
  const { id } = req.params

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    // Get summary generator
    const generator = await SummaryService.generateSummaryStream(id)

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

export default router