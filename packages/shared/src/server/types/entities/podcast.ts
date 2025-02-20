import { ProcessingStatus } from '../status';

export interface PodcastRecord {
  id: string
  url: string
  platform: 'youtube' | 'spotify'
  status: ProcessingStatus
  title: string
  show_name: string
  thumbnail_url: string | null
  duration: number | null
  created_at: string
  updated_at: string
} 