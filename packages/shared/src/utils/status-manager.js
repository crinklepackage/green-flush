"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStatusHistoryEntry = createStatusHistoryEntry;
exports.createStatusUpdatePayload = createStatusUpdatePayload;
exports.isValidStatus = isValidStatus;
exports.getTimestampFieldForStatus = getTimestampFieldForStatus;
const status_1 = require("../server/types/status");
/**
 * Creates a new status history entry with the current timestamp
 */
function createStatusHistoryEntry(status, message) {
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
function createStatusUpdatePayload(status, message, existingHistory = []) {
    const now = new Date().toISOString();
    const statusEntry = createStatusHistoryEntry(status, message);
    const basePayload = {
        status,
        status_history: [...existingHistory, statusEntry],
        updated_at: now,
    };
    // Add additional fields based on status
    switch (status) {
        case status_1.ProcessingStatus.IN_QUEUE:
            return {
                ...basePayload,
                pending_since: now,
            };
        case status_1.ProcessingStatus.FETCHING_TRANSCRIPT:
        case status_1.ProcessingStatus.GENERATING_SUMMARY:
            return {
                ...basePayload,
                processing_since: now,
            };
        case status_1.ProcessingStatus.COMPLETED:
            return {
                ...basePayload,
                completed_at: now,
            };
        case status_1.ProcessingStatus.FAILED:
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
function isValidStatus(status) {
    return Object.values(status_1.ProcessingStatus).includes(status);
}
/**
 * Gets the appropriate timestamp field name for a given status
 */
function getTimestampFieldForStatus(status) {
    switch (status) {
        case status_1.ProcessingStatus.IN_QUEUE:
            return 'pending_since';
        case status_1.ProcessingStatus.FETCHING_TRANSCRIPT:
        case status_1.ProcessingStatus.GENERATING_SUMMARY:
            return 'processing_since';
        case status_1.ProcessingStatus.COMPLETED:
            return 'completed_at';
        case status_1.ProcessingStatus.FAILED:
            return 'failed_at';
        default:
            return null;
    }
}
//# sourceMappingURL=status-manager.js.map