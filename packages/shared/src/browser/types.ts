// Re-export types for browser use
export type Podcast = {
  id: string
  url: string
  platform: 'spotify' | 'youtube'
  status: 'pending' | 'processing' | 'completed'
}

export type Summary = {
  id: string
  podcastId: string
  content: string | null
  status: 'IN_QUEUE' | 'FETCHING_TRANSCRIPT' | 'GENERATING_SUMMARY' | 'COMPLETED' | 'FAILED'
} 