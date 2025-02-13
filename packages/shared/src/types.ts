// packages/shared/src/types.ts

// Platform types
export type Platform = 'spotify' | 'youtube'

export interface PodcastInput {
  url: string
  platform: Platform
}

// Processing status types
export const ProcessingStatus = {
  IN_QUEUE: 'in_queue',
  FINDING_YOUTUBE: 'finding_youtube',
  FETCHING_TRANSCRIPT: 'fetching_transcript',
  TRANSCRIPT_READY: 'transcript_ready',
  GENERATING_SUMMARY: 'generating_summary',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const

export type ProcessingStatus = typeof ProcessingStatus[keyof typeof ProcessingStatus]

// Summary types
export interface Summary {
  id: string
  status: ProcessingStatus
  content?: string
  error?: string
}

// Platform-specific metadata
export interface VideoMetadata {
  id: string
  title: string
  channel: string
  thumbnailUrl: string
  duration: number  // in seconds
}

export interface SpotifyMetadata {
  id: string
  title: string
  showName: string
  duration: number
}

// Transcript types
export const TranscriptSource = {
  YOUTUBE_TRANSCRIPT: 'youtube_transcript',
  YT_DLP: 'yt_dlp',
  KYOUTUBE: 'kyoutube',
  SUPADATA: 'supadata'
} as const

export type TranscriptSource = typeof TranscriptSource[keyof typeof TranscriptSource]

export interface TranscriptResult {
  text: string
  source: TranscriptSource
  metadata?: {
    duration?: number
    segments?: Array<{ text: string; start: number }>
  }
}

// Database types (if needed)
export interface PodcastRecord {
  id: string
  url: string
  platform: Platform
  youtube_url: string | null
  title: string
  transcript: string | null
  has_transcript: boolean
  created_at: Date
  updated_at: Date
}