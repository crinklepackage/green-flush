import { ProcessingStatus } from './status'
import { RPCPodcastResponse } from './metadata'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface PodcastRecord {
  id: string
  url: string
  platform: 'spotify' | 'youtube'
  youtube_url: string | null
  title: string
  show_name: string
  transcript: string | null
  has_transcript: boolean
  created_at: string
  updated_at: string
  thumbnail_url: string | null
  duration: number | null
  platform_specific_id: string | null
  created_by: string
}

export interface SummaryRecord {
  id: string
  podcast_id: string
  status: ProcessingStatus
  summary_text: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  failed_at: string | null
}

export interface Database {
  public: {
    Tables: {
      podcasts: {
        Row: PodcastRecord
        Insert: Omit<PodcastRecord, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PodcastRecord, 'id'>>
      }
      summaries: {
        Row: SummaryRecord
        Insert: Omit<SummaryRecord, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SummaryRecord, 'id'>>
      }
    }
    Functions: {
      create_podcast_with_summary: {
        Args: {
          podcast_data: Json
          summary_id: string
          user_id: string
        }
        Returns: RPCPodcastResponse
      }
    }
  }
} 