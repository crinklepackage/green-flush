# Timeout Implementation for Stalled Summaries

This document describes how Wavenotes handles stalled podcast summaries through automated timeout checks.

## Overview

Podcast summary processing goes through several states (`in_queue`, `fetching_transcript`, `generating_summary`, etc.). Sometimes, due to various issues, summaries can get "stuck" in a processing state. Our timeout implementation automatically detects and fixes these stalled summaries.

## Implementation Details

### 1. Timeout Service

The core functionality exists in `packages/server/api/src/lib/timeout-service.ts`. This service:

- Defines timeout thresholds for each processing state
- Provides a `checkStalledSummaries()` function that:
  - Queries for summaries in processing states
  - Checks if they've exceeded their allowed processing time
  - Updates stalled summaries to a `failed` status with an appropriate error message

### 2. Server Integration

The timeout check is integrated in two ways:

1. **On Server Startup**: The API server automatically runs a timeout check when it starts
2. **Scheduled Checks**: The server sets up an interval to check for stalled summaries every hour

```typescript
// From packages/server/api/src/index.ts
import { checkStalledSummaries } from './lib/timeout-service';

// Check for stalled summaries when server starts
try {
  console.log('Checking for stalled summaries on server startup...');
  const updatedCount = await checkStalledSummaries();
  console.log(`Startup stalled summary check complete. ${updatedCount} summaries updated.`);
} catch (error) {
  console.error('Error checking for stalled summaries on startup:', error);
}

// Set up scheduled check every hour
setInterval(async () => {
  try {
    console.log('Running scheduled stalled summary check...');
    const updatedCount = await checkStalledSummaries();
    console.log(`Scheduled stalled summary check complete. ${updatedCount} summaries updated.`);
  } catch (error) {
    console.error('Error in scheduled stalled summary check:', error);
  }
}, 60 * 60 * 1000); // every hour
```

### 3. Command-line Script

A dedicated script is available for manual or scheduled checks:

```
packages/server/api/src/scripts/check-timeouts.ts
```

The script can be run with:
```
yarn workspace @wavenotes-new/api check-timeouts
```

### 4. Production Deployment (Railway)

For production, we use Railway's built-in cron service:

1. In the Railway dashboard for the API project:
   - Add a new Cron Service
   - Set the schedule to: `*/30 * * * *` (every 30 minutes)
   - Set the command to: `yarn workspace @wavenotes-new/api check-timeouts`

Alternatively, this can be configured in `railway.json` or `railway.toml`:

```json
{
  "crons": [
    {
      "schedule": "*/30 * * * *", 
      "command": "yarn workspace @wavenotes-new/api check-timeouts"
    }
  ]
}
```

## Timeout Thresholds

Current timeout thresholds for each processing state:

- `in_queue`: 30 minutes
- `fetching_transcript`: 10 minutes
- `generating_summary`: 15 minutes
- `creating_summary`: 15 minutes

## Manual Testing

To manually test the timeout functionality:

1. Run the timeout check script:
```
yarn workspace @wavenotes-new/api check-timeouts
```

2. Monitor the logs for information about detected stalled summaries

## Related Files

- `packages/server/api/src/lib/timeout-service.ts` - Core timeout logic
- `packages/server/api/src/scripts/check-timeouts.ts` - CLI script
- `packages/shared/src/utils/status-manager.ts` - Status management utilities
- `packages/server/api/src/index.ts` - Server integration 