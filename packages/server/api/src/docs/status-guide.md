# Status Management Guide

This guide explains how to properly use the status management utilities in the Wavenotes application to ensure consistent status handling.

## 1. Status Overview

Wavenotes uses a standardized status system defined in the `ProcessingStatus` enum:

```typescript
enum ProcessingStatus {
  IN_QUEUE = 'in_queue',
  FETCHING_TRANSCRIPT = 'fetching_transcript',
  GENERATING_SUMMARY = 'generating_summary',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

These statuses represent the lifecycle of a podcast summary:

1. **IN_QUEUE**: Initial state, waiting to be processed
2. **FETCHING_TRANSCRIPT**: Actively retrieving the podcast transcript
3. **GENERATING_SUMMARY**: Using AI to generate the summary
4. **COMPLETED**: Successfully completed processing
5. **FAILED**: Processing failed with an error

## 2. Status Update Pattern

Use the shared status utilities to update summary statuses:

```typescript
import { createStatusUpdatePayload, ProcessingStatus } from '@wavenotes-new/shared';

// Fetch the current summary
const { data: summary } = await supabase
  .from('summaries')
  .select('*')
  .eq('id', summaryId)
  .single();

// Create a status update payload
const updatePayload = createStatusUpdatePayload(
  ProcessingStatus.GENERATING_SUMMARY,
  'Starting summary generation',
  summary.status_history || []
);

// Update the summary
await supabase
  .from('summaries')
  .update(updatePayload)
  .eq('id', summaryId);
```

This approach ensures that:
- The status is valid
- Status history is properly tracked
- Timestamps are correctly set
- Error messages are recorded when needed

## 3. Status Validation

All status updates go through validation:

1. **API Validation**: The `validateStatusMiddleware` middleware validates all status values in request bodies.
2. **Utils Validation**: The `isValidStatus()` function checks if a status is valid.

```typescript
import { isValidStatus, ProcessingStatus } from '@wavenotes-new/shared';

// Check if a status is valid
if (!isValidStatus(status)) {
  throw new Error(`Invalid status: ${status}`);
}
```

## 4. Status Timeouts

Summaries in intermediate processing statuses are monitored for timeouts:

```typescript
// Timeout thresholds (in hours)
const TIMEOUT_CONFIG = {
  [ProcessingStatus.IN_QUEUE]: 1,            // 1 hour
  [ProcessingStatus.FETCHING_TRANSCRIPT]: 2, // 2 hours
  [ProcessingStatus.GENERATING_SUMMARY]: 4,  // 4 hours
};
```

Summaries that exceed these thresholds are automatically marked as failed.

You can:
- Run `yarn check-timeouts` to manually check for stalled summaries
- Use the admin API at `POST /admin/check-timeouts` to trigger a check
- Check timeout statistics at `GET /admin/status`

## 5. Status History

Each status update is recorded in the `status_history` array, providing a complete audit trail:

```json
"status_history": [
  {
    "status": "in_queue",
    "timestamp": "2025-02-10T15:30:00.000Z",
    "message": "Podcast added to processing queue"
  },
  {
    "status": "fetching_transcript",
    "timestamp": "2025-02-10T15:31:12.000Z",
    "message": "Starting transcript retrieval"
  },
  {
    "status": "generating_summary",
    "timestamp": "2025-02-10T15:35:43.000Z",
    "message": "Starting summary generation"
  },
  {
    "status": "completed",
    "timestamp": "2025-02-10T15:40:22.000Z"
  }
]
```

## Best Practices

1. **Always use the status manager utilities** - Never manually construct status update payloads
2. **Include meaningful messages** - Provide context for status changes
3. **Handle transitions properly** - Follow the expected status flow
4. **Validate inputs** - Verify status values before processing
5. **Monitor timeouts** - Check for stalled summaries regularly 