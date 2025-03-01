export type ClientStatus = 'in_queue' | 'generating_summary' | 'completed' | 'failed'

export const mapStatusToClient = (status: string): ClientStatus => {
  const statusMap: Record<string, ClientStatus> = {
    'in_queue': 'in_queue',
    'generating_summary': 'generating_summary',
    'completed': 'completed',
    'failed': 'failed'
  }
  return statusMap[status] || 'failed'
}
