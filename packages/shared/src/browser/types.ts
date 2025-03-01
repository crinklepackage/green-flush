// packages/shared/src/browser/types.ts
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
  status: 'in_queue' | 'fetching_transcript' | 'generating_summary' | 'completed' | 'failed'
} 