// Server-side processing status (matches DB)
export enum ProcessingStatus {
  IN_QUEUE = 'in_queue',
  FETCHING_TRANSCRIPT = 'fetching_transcript',
  GENERATING_SUMMARY = 'generating_summary',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Client-side status (what UI shows)
export type ClientStatus = 
  | 'in_queue'
  | 'fetching_transcript'
  | 'generating_summary'
  | 'completed'
  | 'failed' 