export type ClientStatus = 'IN_QUEUE' | 'GENERATING_SUMMARY' | 'COMPLETED' | 'FAILED'

export const mapStatusToClient = (status: string): ClientStatus => {
  const statusMap: Record<string, ClientStatus> = {
    'IN_QUEUE': 'IN_QUEUE',
    'GENERATING_SUMMARY': 'GENERATING_SUMMARY',
    'COMPLETED': 'COMPLETED',
    'FAILED': 'FAILED'
  }
  return statusMap[status] || 'FAILED'
}
