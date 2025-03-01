import { ProcessingStatus, formatStatusForDisplay, getStatusColor } from '@wavenotes-new/shared';

interface StatusBadgeProps {
  status: ProcessingStatus | string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  // Map lowercase string statuses to ProcessingStatus enum for compatibility
  let statusEnum: ProcessingStatus;
  
  if (typeof status === 'string') {
    // Convert status to lowercase for case-insensitive comparison
    const statusLower = status.toLowerCase();
    switch(statusLower) {
      case 'in_queue':
        statusEnum = ProcessingStatus.IN_QUEUE;
        break;
      case 'fetching_transcript':
        statusEnum = ProcessingStatus.FETCHING_TRANSCRIPT;
        break;
      case 'generating_summary':
        statusEnum = ProcessingStatus.GENERATING_SUMMARY;
        break;
      case 'completed':
        statusEnum = ProcessingStatus.COMPLETED;
        break;
      case 'failed':
        statusEnum = ProcessingStatus.FAILED;
        break;
      default:
        statusEnum = status as ProcessingStatus;
    }
  } else {
    statusEnum = status;
  }
  
  const displayStatus = formatStatusForDisplay(statusEnum);
  const color = getStatusColor(statusEnum);
  
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-800'
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClasses[color]} ${className}`}>
      {displayStatus}
    </span>
  );
} 