export interface PodcastRecord {
  id: string
  url: string
  platform: 'spotify' | 'youtube'
  // ... rest of fields
}

export interface SummaryRecord {
  id: string
  podcast_id: string
  // ... rest of fields
} 