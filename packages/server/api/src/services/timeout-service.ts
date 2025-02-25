import { supabase } from '../lib/supabase'
import { ProcessingStatus } from '@wavenotes-new/shared'
import { createStatusUpdatePayload } from '@wavenotes-new/shared/src/utils/status-manager'

// Configuration for timeout thresholds (in hours)
const TIMEOUT_CONFIG: Partial<Record<ProcessingStatus, number>> = {
  [ProcessingStatus.IN_QUEUE]: 1, // 1 hour
  [ProcessingStatus.FETCHING_TRANSCRIPT]: 2, // 2 hours
  [ProcessingStatus.GENERATING_SUMMARY]: 4, // 4 hours
}

/**
 * Gets the appropriate timeout threshold for a status in milliseconds
 */
function getTimeoutThreshold(status: ProcessingStatus): number {
  const hours = TIMEOUT_CONFIG[status] || 2 // Default to 2 hours
  return hours * 60 * 60 * 1000 // Convert hours to milliseconds
}

/**
 * Checks for stalled summaries and marks them as failed
 * This should be called periodically by a scheduled job
 */
export async function checkStalledSummaries(): Promise<number> {
  console.log('Checking for stalled summaries...')
  
  // Get all in-progress summaries
  const processingStatuses = [
    ProcessingStatus.IN_QUEUE,
    ProcessingStatus.FETCHING_TRANSCRIPT,
    ProcessingStatus.GENERATING_SUMMARY
  ]
  
  const { data: inProgressSummaries, error } = await supabase
    .from('summaries')
    .select('id, status, updated_at, status_history')
    .in('status', processingStatuses)
  
  if (error) {
    console.error('Error fetching in-progress summaries:', error)
    throw error
  }
  
  if (!inProgressSummaries || inProgressSummaries.length === 0) {
    console.log('No in-progress summaries found.')
    return 0
  }
  
  console.log(`Found ${inProgressSummaries.length} in-progress summaries.`)
  
  // Check each summary to see if it's stalled
  const now = new Date()
  let updatedCount = 0
  
  for (const summary of inProgressSummaries) {
    const status = summary.status as ProcessingStatus
    const updatedAt = new Date(summary.updated_at)
    const timeoutThreshold = getTimeoutThreshold(status)
    
    // Check if the summary has exceeded its timeout threshold
    const timeDifference = now.getTime() - updatedAt.getTime()
    
    if (timeDifference > timeoutThreshold) {
      console.log(`Summary ${summary.id} with status ${status} has exceeded timeout threshold (${timeoutThreshold/3600000}h). Last update: ${updatedAt.toISOString()}`)
      
      // Update the summary status to failed
      const updatePayload = createStatusUpdatePayload(
        ProcessingStatus.FAILED,
        `Summary processing timed out while in ${status} status`,
        summary.status_history || []
      )
      
      const { error: updateError } = await supabase
        .from('summaries')
        .update(updatePayload)
        .eq('id', summary.id)
      
      if (updateError) {
        console.error(`Error updating summary ${summary.id}:`, updateError)
      } else {
        console.log(`Updated summary ${summary.id} from ${status} to failed status due to timeout`)
        updatedCount++
      }
    }
  }
  
  console.log(`Timeout check complete: ${updatedCount} summaries marked as failed`)
  return updatedCount
}

/**
 * Gets timeout statistics, showing how many summaries are in each state
 * and how many are approaching timeout thresholds
 */
export async function getTimeoutStatistics() {
  // Get all in-progress summaries
  const processingStatuses = [
    ProcessingStatus.IN_QUEUE,
    ProcessingStatus.FETCHING_TRANSCRIPT,
    ProcessingStatus.GENERATING_SUMMARY
  ]
  
  const { data: inProgressSummaries, error } = await supabase
    .from('summaries')
    .select('id, status, updated_at')
    .in('status', processingStatuses)
  
  if (error) {
    console.error('Error fetching in-progress summaries:', error)
    throw error
  }
  
  if (!inProgressSummaries || inProgressSummaries.length === 0) {
    return {
      total: 0,
      byStatus: {},
      atRisk: 0,
      stalled: 0
    }
  }
  
  // Calculate statistics
  const now = new Date()
  const stats = {
    total: inProgressSummaries.length,
    byStatus: {} as Record<string, number>,
    atRisk: 0, // 75% of timeout threshold
    stalled: 0 // Exceeded timeout threshold
  }
  
  // Count summaries by status
  for (const summary of inProgressSummaries) {
    const status = summary.status
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1
    
    // Check timeout risk
    const updatedAt = new Date(summary.updated_at)
    const timeoutThreshold = getTimeoutThreshold(status as ProcessingStatus)
    const timeDifference = now.getTime() - updatedAt.getTime()
    
    if (timeDifference > timeoutThreshold) {
      stats.stalled++
    } else if (timeDifference > timeoutThreshold * 0.75) {
      stats.atRisk++
    }
  }
  
  return stats
} 