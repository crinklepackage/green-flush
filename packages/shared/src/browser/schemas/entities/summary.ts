// browser/types/summary.ts
export type Summary = {
    id: string
    podcastId: string
    content: string | null
    status: 'IN_QUEUE' | 'FETCHING_TRANSCRIPT' | 'GENERATING_SUMMARY' | 'COMPLETED' | 'FAILED'
  }