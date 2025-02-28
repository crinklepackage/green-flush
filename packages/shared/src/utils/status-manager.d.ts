import { ProcessingStatus } from '../server/types/status';
export interface StatusHistoryEntry {
    status: ProcessingStatus;
    timestamp: string;
    message?: string;
}
/**
 * Creates a new status history entry with the current timestamp
 */
export declare function createStatusHistoryEntry(status: ProcessingStatus, message?: string): StatusHistoryEntry;
/**
 * Creates a payload for updating a summary status
 * This ensures all status updates follow the same pattern
 */
export declare function createStatusUpdatePayload(status: ProcessingStatus, message?: string, existingHistory?: StatusHistoryEntry[]): {
    status: ProcessingStatus;
    status_history: StatusHistoryEntry[];
    updated_at: string;
} | {
    pending_since: string;
    status: ProcessingStatus;
    status_history: StatusHistoryEntry[];
    updated_at: string;
} | {
    processing_since: string;
    status: ProcessingStatus;
    status_history: StatusHistoryEntry[];
    updated_at: string;
} | {
    completed_at: string;
    status: ProcessingStatus;
    status_history: StatusHistoryEntry[];
    updated_at: string;
} | {
    failed_at: string;
    error_message: string;
    status: ProcessingStatus;
    status_history: StatusHistoryEntry[];
    updated_at: string;
};
/**
 * Validates if a status is one of the valid ProcessingStatus values
 */
export declare function isValidStatus(status: string): boolean;
/**
 * Gets the appropriate timestamp field name for a given status
 */
export declare function getTimestampFieldForStatus(status: ProcessingStatus): string | null;
//# sourceMappingURL=status-manager.d.ts.map