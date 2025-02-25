#!/usr/bin/env node
/**
 * Script to check for stalled summaries that have been stuck in a processing state
 * Can be called directly or via a scheduled job (cron)
 */

import '../config/environment'; // Load environment variables
import { checkStalledSummaries } from '../services/timeout-service';

async function main() {
  console.log('Starting scheduled timeout check at', new Date().toISOString());
  
  try {
    const updatedCount = await checkStalledSummaries();
    console.log(`Timeout check completed. Updated ${updatedCount} stalled summaries.`);
  } catch (error) {
    console.error('Error during timeout check:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main(); 