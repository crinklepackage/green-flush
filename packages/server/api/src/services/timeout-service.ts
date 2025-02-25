import { supabase } from '../lib/supabase'
import { ProcessingStatus } from '@wavenotes-new/shared'

// Define type for the timeout mapping
type TimeoutMap = {
  [key in ProcessingStatus.IN_QUEUE | ProcessingStatus.FETCHING_TRANSCRIPT | ProcessingStatus.GENERATING_SUMMARY]: number;
};

// Timeouts in minutes for each processing state
const TIMEOUT_MINUTES: TimeoutMap = {
  [ProcessingStatus.IN_QUEUE]: 15,           // 15 minutes in queue is too long
  [ProcessingStatus.FETCHING_TRANSCRIPT]: 30, // 30 minutes for transcript
  [ProcessingStatus.GENERATING_SUMMARY]: 45,  // 45 minutes for summary
}

/**
 * Checks for summaries that have been stuck in a processing state for too long
 * and marks them as failed with an appropriate error message.
 * 
 * @returns {Promise<number>} The number of summaries updated
 */
export async function checkStalledSummaries(): Promise<number> {
  console.log('Checking for stalled summaries...')
  
  // Get all in-progress summaries
  const { data: summaries, error } = await supabase
    .from('summaries')
    .select('id, status, updated_at')
    .in('status', [
      ProcessingStatus.IN_QUEUE,
      ProcessingStatus.FETCHING_TRANSCRIPT, 
      ProcessingStatus.GENERATING_SUMMARY
    ])
  
  if (error) {
    console.error('Error fetching in-progress summaries:', error)
    return 0
  }
  
  let updatedCount = 0
  const now = new Date()
  
  // Check each summary against its specific timeout
  for (const summary of summaries || []) {
    // Only check for statuses that have a defined timeout
    if (
      summary.status === ProcessingStatus.IN_QUEUE ||
      summary.status === ProcessingStatus.FETCHING_TRANSCRIPT ||
      summary.status === ProcessingStatus.GENERATING_SUMMARY
    ) {
      // Now TypeScript knows status is a valid key
      const status = summary.status as keyof TimeoutMap;
      const maxMinutes = TIMEOUT_MINUTES[status];
      const updatedAt = new Date(summary.updated_at);
      const minutesElapsed = (now.getTime() - updatedAt.getTime()) / (1000 * 60);
      
      if (minutesElapsed > maxMinutes) {
        // Update the stalled summary
        const { error: updateError } = await supabase
          .from('summaries')
          .update({ 
            status: ProcessingStatus.FAILED, 
            error_message: `Processing timeout: Task stalled in ${summary.status} state for over ${maxMinutes} minutes`
          })
          .eq('id', summary.id);
        
        if (!updateError) {
          updatedCount++;
          console.log(`Updated stalled summary ${summary.id}: was in ${summary.status} for ${minutesElapsed.toFixed(1)} minutes`);
        } else {
          console.error(`Failed to update stalled summary ${summary.id}:`, updateError);
        }
      }
    }
  }
  
  console.log(`Updated ${updatedCount} stalled summaries`)
  return updatedCount
} 