import { Router } from 'express'
import { checkStalledSummaries, getTimeoutStatistics } from '../services/timeout-service'
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

/**
 * GET /admin/status
 * Returns system status information including summary processing statistics
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const timeoutStats = await getTimeoutStatistics()
    
    // Add any other system status information here
    
    res.json({
      success: true,
      timeoutStats,
      systemStatus: 'healthy',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching status:', error)
    res.status(500).json({ error: 'Failed to fetch system status' })
  }
})

export default router 