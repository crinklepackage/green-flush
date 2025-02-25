import { ProcessingStatus, formatStatusForDisplay, getStatusColor } from '@wavenotes-new/shared';

interface StatusBadgeProps {
  status: ProcessingStatus;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const displayStatus = formatStatusForDisplay(status);
  const color = getStatusColor(status);
  
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