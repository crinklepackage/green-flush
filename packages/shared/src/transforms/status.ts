import { ProcessingStatus } from '@wavenotes-new/shared/src/server/types/status'

export const mapStatusToClient = (serverStatus: ProcessingStatus): string => {
  // Map server statuses to client statuses
  const statusMap: Record<ProcessingStatus, string> = {
    [ProcessingStatus.IN_QUEUE]: 'IN_QUEUE',
    [ProcessingStatus.FETCHING_TRANSCRIPT]: 'FETCHING_TRANSCRIPT',
    [ProcessingStatus.GENERATING_SUMMARY]: 'GENERATING_SUMMARY',
    [ProcessingStatus.COMPLETED]: 'COMPLETED',
    [ProcessingStatus.FAILED]: 'FAILED'
  };
  return statusMap[serverStatus] || serverStatus;
}; 