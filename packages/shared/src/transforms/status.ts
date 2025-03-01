import { ProcessingStatus } from '../server/types/status'

export const mapStatusToClient = (serverStatus: ProcessingStatus): string => {
  // Map server statuses to client statuses
  const statusMap: Record<ProcessingStatus, string> = {
    [ProcessingStatus.IN_QUEUE]: 'in_queue',
    [ProcessingStatus.FETCHING_TRANSCRIPT]: 'fetching_transcript',
    [ProcessingStatus.GENERATING_SUMMARY]: 'generating_summary',
    [ProcessingStatus.COMPLETED]: 'completed',
    [ProcessingStatus.FAILED]: 'failed'
  };
  return statusMap[serverStatus] || serverStatus;
};

/**
 * Formats raw database status values into user-friendly display strings
 */
export const formatStatusForDisplay = (status: ProcessingStatus): string => {
  const displayMap: Record<ProcessingStatus, string> = {
    [ProcessingStatus.IN_QUEUE]: 'In Queue',
    [ProcessingStatus.FETCHING_TRANSCRIPT]: 'Fetching Transcript',
    [ProcessingStatus.GENERATING_SUMMARY]: 'Generating Summary',
    [ProcessingStatus.COMPLETED]: 'Completed',
    [ProcessingStatus.FAILED]: 'Failed'
  };
  
  return displayMap[status] || String(status);
};

/**
 * Returns an appropriate color designation for each status
 * Used for visual status indicators in the UI
 */
export const getStatusColor = (status: ProcessingStatus): 'blue' | 'yellow' | 'green' | 'red' | 'gray' => {
  const colorMap: Record<ProcessingStatus, 'blue' | 'yellow' | 'green' | 'red' | 'gray'> = {
    [ProcessingStatus.IN_QUEUE]: 'blue',
    [ProcessingStatus.FETCHING_TRANSCRIPT]: 'yellow',
    [ProcessingStatus.GENERATING_SUMMARY]: 'yellow',
    [ProcessingStatus.COMPLETED]: 'green',
    [ProcessingStatus.FAILED]: 'red'
  };
  
  return colorMap[status] || 'gray';
}; 