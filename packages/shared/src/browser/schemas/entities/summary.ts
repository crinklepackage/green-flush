// browser/types/summary.ts
export type Summary = {
    id: string
    podcastId: string
    content: string | null
    status: 'in_queue' | 'fetching_transcript' | 'generating_summary' | 'completed' | 'failed'
  }