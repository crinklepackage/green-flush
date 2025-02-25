# Podcast Processing Timeout System

This document explains how our podcast processing timeout system works to prevent podcasts from being stuck indefinitely in a processing state.

## Two-Layer Protection

We use a dual-layer approach to handle timeouts:

1. **Real-time Timeouts (Worker Side)**
   - Each processing step has a dedicated timeout
   - Transcript fetching: 5 minutes
   - Summary generation: 10 minutes
   - Spotify to YouTube matching: 3 minutes

2. **Scheduled Checks (API Side)**
   - A scheduled task runs periodically to check for summaries stuck in processing
   - Different timeouts for each processing stage:
     - In queue: 15 minutes
     - Fetching transcript: 30 minutes
     - Generating summary: 45 minutes

## Implementation Details

### Worker-Side Timeouts

The worker uses a Promise.race() approach to implement timeouts for each processing step. This prevents any individual step from hanging indefinitely.

```typescript
// Example from podcast-processor.ts
const transcript = await withTimeout(
  transcriptPromise,
  5 * 60 * 1000, // 5 minutes
  'Transcript fetching timed out after 5 minutes'
);
```

### API-Side Scheduled Checks

The API includes a service that checks for stalled summaries based on their updated_at timestamp.

```typescript
// From timeout-service.ts
const MAX_PROCESSING_TIME = {
  [ProcessingStatus.IN_QUEUE]: 15 * 60 * 1000,           // 15 minutes
  [ProcessingStatus.FETCHING_TRANSCRIPT]: 30 * 60 * 1000, // 30 minutes
  [ProcessingStatus.GENERATING_SUMMARY]: 45 * 60 * 1000,  // 45 minutes
};
```

## Running Scheduled Checks

The scheduled timeout check can be triggered in three ways:

1. **API Endpoint**: 
   ```
   POST /admin/check-timeouts
   Authorization: Bearer YOUR_TOKEN
   ```

2. **Direct Script Execution**:
   ```bash
   # From project root
   yarn workspace @wavenotes-new/api exec ts-node src/scripts/check-timeouts.ts
   ```

3. **Cron Job**:
   Set up a cron job to run every hour using one of the above methods.

## Configuration

Timeout values can be adjusted in:
- `packages/server/worker/src/processors/podcast-processor.ts`
- `packages/server/worker/src/services/content-processor.ts`
- `packages/server/api/src/services/timeout-service.ts` 