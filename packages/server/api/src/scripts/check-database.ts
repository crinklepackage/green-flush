#!/usr/bin/env node
/**
 * Script to check the database and see what's happening with stalled summaries
 */

import '../config/environment'; // Load environment variables
import { supabase } from '../lib/supabase';
import { ProcessingStatus } from '@wavenotes-new/shared';

async function main() {
  console.log('Checking database to debug stalled summaries...');
  
  // Get status counts
  const { data: statusCounts, error: countError } = await supabase
    .from('summaries')
    .select('status');
    
  if (countError) {
    console.error('Error fetching status counts:', countError);
    process.exit(1);
  }
  
  // Group by status
  const counts: Record<string, number> = {};
  statusCounts?.forEach(item => {
    const status = item.status;
    counts[status] = (counts[status] || 0) + 1;
  });
  
  console.log('Status counts in database:');
  console.table(counts);
  
  // Check summaries with creating_summary status
  const { data: creatingSummaries, error: creatingError } = await supabase
    .from('summaries')
    .select('*')
    .eq('status', 'creating_summary')
    .limit(10);
    
  if (creatingError) {
    console.error('Error fetching creating_summary records:', creatingError);
  } else if (creatingSummaries && creatingSummaries.length > 0) {
    console.log('Found summaries with creating_summary status:');
    console.table(creatingSummaries);
  } else {
    console.log('No summaries with creating_summary status found.');
  }
  
  // Check summaries with in_queue status
  const { data: inQueueSummaries, error: queueError } = await supabase
    .from('summaries')
    .select('*')
    .eq('status', ProcessingStatus.IN_QUEUE)
    .limit(10);
    
  if (queueError) {
    console.error('Error fetching in_queue records:', queueError);
  } else if (inQueueSummaries && inQueueSummaries.length > 0) {
    console.log('Found summaries with in_queue status:');
    console.table(inQueueSummaries);
  } else {
    console.log('No summaries with in_queue status found.');
  }

  // Check stalled summaries (fetching_transcript or generating_summary with old update time)
  const stalledStatuses = [
    ProcessingStatus.FETCHING_TRANSCRIPT,
    ProcessingStatus.GENERATING_SUMMARY
  ];
  
  const twoHoursAgo = new Date();
  twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
  
  const { data: stalledSummaries, error: stalledError } = await supabase
    .from('summaries')
    .select('*')
    .in('status', stalledStatuses)
    .lt('updated_at', twoHoursAgo.toISOString())
    .limit(10);
    
  if (stalledError) {
    console.error('Error fetching stalled records:', stalledError);
  } else if (stalledSummaries && stalledSummaries.length > 0) {
    console.log('Found stalled summaries (older than 2 hours):');
    console.table(stalledSummaries);
  } else {
    console.log('No stalled summaries found.');
  }
  
  process.exit(0);
}

main(); 