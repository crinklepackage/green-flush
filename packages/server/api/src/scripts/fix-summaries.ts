#!/usr/bin/env node
/**
 * Script to fix summaries that are stuck in legacy or incorrect processing statuses
 */

import '../config/environment'; // Load environment variables
import { supabase } from '../lib/supabase';
import { ProcessingStatus } from '@wavenotes-new/shared';

// Map legacy statuses to the correct enum values
const STATUS_MAPPING: Record<string, string> = {
  'creating_summary': ProcessingStatus.GENERATING_SUMMARY,
  'finding_podcast': ProcessingStatus.FETCHING_TRANSCRIPT,
  'fetching_details': ProcessingStatus.FETCHING_TRANSCRIPT,
  'getting_transcript': ProcessingStatus.FETCHING_TRANSCRIPT,
  'In queue...': ProcessingStatus.IN_QUEUE,
  'processing': ProcessingStatus.GENERATING_SUMMARY
};

async function checkSummaryStatus() {
  console.log('Checking current summary statuses...');
  
  // Get status counts
  const { data: statusCounts, error: countError } = await supabase
    .from('summaries')
    .select('status');
    
  if (countError) {
    console.error('Error fetching status counts:', countError);
    return;
  }
  
  // Group by status
  const counts: Record<string, number> = {};
  statusCounts?.forEach(item => {
    const status = item.status;
    counts[status] = (counts[status] || 0) + 1;
  });
  
  console.log('Status counts in database:');
  console.table(counts);
}

async function fixStuckSummaries() {
  console.log('Fixing stuck and legacy status summaries...');
  
  let totalFixed = 0;
  
  for (const [legacyStatus, correctStatus] of Object.entries(STATUS_MAPPING)) {
    // Skip if legacyStatus matches correctStatus
    if (legacyStatus === correctStatus) continue;
    
    // Find summaries with legacy status
    const { data: stuckSummaries, error: findError } = await supabase
      .from('summaries')
      .select('*')
      .eq('status', legacyStatus)
      .limit(20);
      
    if (findError) {
      console.error(`Error finding summaries with status '${legacyStatus}':`, findError);
      continue;
    }
    
    if (!stuckSummaries || stuckSummaries.length === 0) {
      console.log(`No summaries with status '${legacyStatus}' found.`);
      continue;
    }
    
    console.log(`Found ${stuckSummaries.length} summaries with status '${legacyStatus}'.`);
    
    // Check if they're actually stuck (older than 2 hours)
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    const stalledSummaries = stuckSummaries.filter(s => new Date(s.updated_at) < twoHoursAgo);
    
    if (stalledSummaries.length === 0) {
      console.log(`No stalled summaries with status '${legacyStatus}' found.`);
      continue;
    }
    
    console.log(`Found ${stalledSummaries.length} stalled summaries with status '${legacyStatus}'.`);
    
    // Decide what to do with them - mark as failed if stalled, or update to correct status
    for (const summary of stalledSummaries) {
      // Should we mark as failed or update to the correct status?
      // For now, we'll mark as failed if they're old
      
      // Update the summary status to failed
      const { error: updateError } = await supabase
        .from('summaries')
        .update({
          status: ProcessingStatus.FAILED,
          error_message: `Summary got stuck in ${legacyStatus} status`,
          failed_at: new Date().toISOString(),
          status_history: [...(summary.status_history || []), { 
            status: ProcessingStatus.FAILED,
            timestamp: new Date().toISOString(),
            message: `Fixed by admin script - was stuck in ${legacyStatus} status`
          }]
        })
        .eq('id', summary.id);
        
      if (updateError) {
        console.error(`Error updating summary ${summary.id}:`, updateError);
      } else {
        console.log(`Updated summary ${summary.id} from ${legacyStatus} to failed status`);
        totalFixed++;
      }
    }
  }
  
  console.log(`Update complete: ${totalFixed} summaries fixed`);
}

async function main() {
  await checkSummaryStatus();
  
  // Ask if user wants to fix the summaries
  console.log('\nDo you want to fix stuck summaries? Type "yes" to continue:');
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', async (input) => {
    if (input.toString().trim().toLowerCase() === 'yes') {
      await fixStuckSummaries();
      await checkSummaryStatus(); // Check again after fixes
    } else {
      console.log('Operation cancelled.');
    }
    process.exit(0);
  });
}

main(); 