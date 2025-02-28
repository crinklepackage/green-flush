"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatusColor = exports.formatStatusForDisplay = exports.mapStatusToClient = void 0;
const status_1 = require("../server/types/status");
const mapStatusToClient = (serverStatus) => {
    // Map server statuses to client statuses
    const statusMap = {
        [status_1.ProcessingStatus.IN_QUEUE]: 'IN_QUEUE',
        [status_1.ProcessingStatus.FETCHING_TRANSCRIPT]: 'FETCHING_TRANSCRIPT',
        [status_1.ProcessingStatus.GENERATING_SUMMARY]: 'GENERATING_SUMMARY',
        [status_1.ProcessingStatus.COMPLETED]: 'COMPLETED',
        [status_1.ProcessingStatus.FAILED]: 'FAILED'
    };
    return statusMap[serverStatus] || serverStatus;
};
exports.mapStatusToClient = mapStatusToClient;
/**
 * Formats raw database status values into user-friendly display strings
 */
const formatStatusForDisplay = (status) => {
    const displayMap = {
        [status_1.ProcessingStatus.IN_QUEUE]: 'In Queue',
        [status_1.ProcessingStatus.FETCHING_TRANSCRIPT]: 'Fetching Transcript',
        [status_1.ProcessingStatus.GENERATING_SUMMARY]: 'Generating Summary',
        [status_1.ProcessingStatus.COMPLETED]: 'Completed',
        [status_1.ProcessingStatus.FAILED]: 'Failed'
    };
    return displayMap[status] || String(status);
};
exports.formatStatusForDisplay = formatStatusForDisplay;
/**
 * Returns an appropriate color designation for each status
 * Used for visual status indicators in the UI
 */
const getStatusColor = (status) => {
    const colorMap = {
        [status_1.ProcessingStatus.IN_QUEUE]: 'blue',
        [status_1.ProcessingStatus.FETCHING_TRANSCRIPT]: 'yellow',
        [status_1.ProcessingStatus.GENERATING_SUMMARY]: 'yellow',
        [status_1.ProcessingStatus.COMPLETED]: 'green',
        [status_1.ProcessingStatus.FAILED]: 'red'
    };
    return colorMap[status] || 'gray';
};
exports.getStatusColor = getStatusColor;
//# sourceMappingURL=status.js.map