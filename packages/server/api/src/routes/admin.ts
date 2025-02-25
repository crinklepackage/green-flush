import { Router } from 'express'
import { checkStalledSummaries } from '../services/timeout-service'
import { authMiddleware } from '../middleware/auth'

const router = Router()

/**
 * POST /admin/check-timeouts
 * Checks for stalled summaries and marks them as failed if they've exceeded timeout limits
 * This endpoint is designed to be called periodically by a cron job
 */
router.post('/check-timeouts', authMiddleware, async (req, res) => {
  try {
    console.log('Running stalled summary check, triggered by API call')
    const updatedCount = await checkStalledSummaries()
    res.json({ success: true, updatedCount })
  } catch (error) {
    console.error('Error in timeout check:', error)
    res.status(500).json({ error: 'Failed to process timeout check' })
  }
})

export default router 