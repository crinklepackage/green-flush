import { ProcessingStatus } from '../server/types/status';

export interface StatusHistoryEntry {
  status: ProcessingStatus;
  timestamp: string;
  message?: string;
}

/**
 * Creates a new status history entry with the current timestamp
 */
export function createStatusHistoryEntry(
  status: ProcessingStatus,
  message?: string
): StatusHistoryEntry {
  return {
    status,
    timestamp: new Date().toISOString(),
    ...(message ? { message } : {})
  };
}

/**
 * Creates a payload for updating a summary status
 * This ensures all status updates follow the same pattern
 */
export function createStatusUpdatePayload(
  status: ProcessingStatus,
  message?: string,
  existingHistory: StatusHistoryEntry[] = []
) {
  const now = new Date().toISOString();
  const statusEntry = createStatusHistoryEntry(status, message);
  
  const basePayload = {
    status,
    status_history: [...existingHistory, statusEntry],
    updated_at: now,
  };
  
  // Add additional fields based on status
  switch (status) {
    case ProcessingStatus.IN_QUEUE:
      return {
        ...basePayload,
        pending_since: now,
      };
    case ProcessingStatus.FETCHING_TRANSCRIPT:
    case ProcessingStatus.GENERATING_SUMMARY:
      return {
        ...basePayload,
        processing_since: now,
      };
    case ProcessingStatus.COMPLETED:
      return {
        ...basePayload,
        completed_at: now,
      };
    case ProcessingStatus.FAILED:
      return {
        ...basePayload,
        failed_at: now,
        error_message: message || 'Processing failed',
      };
    default:
      return basePayload;
  }
}

/**
 * Validates if a status is one of the valid ProcessingStatus values
 */
export function isValidStatus(status: string): boolean {
  return Object.values(ProcessingStatus).includes(status as ProcessingStatus);
}

/**
 * Gets the appropriate timestamp field name for a given status
 */
export function getTimestampFieldForStatus(status: ProcessingStatus): string | null {
  switch (status) {
    case ProcessingStatus.IN_QUEUE:
      return 'pending_since';
    case ProcessingStatus.FETCHING_TRANSCRIPT:
    case ProcessingStatus.GENERATING_SUMMARY:
      return 'processing_since';
    case ProcessingStatus.COMPLETED:
      return 'completed_at';
    case ProcessingStatus.FAILED:
      return 'failed_at';
    default:
      return null;
  }
} 