#!/usr/bin/env node
/**
 * Script to check for stalled summaries and mark them as failed
 * This can be run as a cron job or scheduled task
 * 
 * Example crontab entry (runs every 30 minutes):
 * 30 * * * * /path/to/node /path/to/check-timeouts.js >> /var/log/wavenotes/timeouts.log 2>&1
 */

import '../config/environment'; // Load environment variables
import { checkStalledSummaries } from '../services/timeout-service';

async function main() {
  console.log(`[${new Date().toISOString()}] Running scheduled stalled summary check...`);
  
  try {
    const updatedCount = await checkStalledSummaries();
    console.log(`[${new Date().toISOString()}] Timeout check complete. ${updatedCount} summaries updated.`);
    process.exit(0);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in timeout check:`, error);
    process.exit(1);
  }
}

// Run the check
main(); 