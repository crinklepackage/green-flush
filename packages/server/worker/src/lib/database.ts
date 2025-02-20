import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database, ProcessingStatus } from '@wavenotes-new/shared'
import { config } from '../config/environment'
import { supabase } from './supabase'

export class DatabaseService {
  constructor(
    private supabase: SupabaseClient<Database> = supabase
  ) {}

  // Method called in PodcastProcessor
  async updateStatus(
    summaryId: string, 
    status: ProcessingStatus,
    error?: string
  ): Promise<void> {
    const { error: updateError } = await this.supabase
      .from('summaries')
      .update({ 
        status,
        error_message: error,
        updated_at: new Date().toISOString()
      })
      .eq('id', summaryId)

    if (updateError) throw updateError
  }

  // Method for appending summary chunks
  async appendSummary(
    summaryId: string, 
    update: { 
      text: string, 
      status: ProcessingStatus 
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('summaries')
      .update({
        summary_text: update.text,
        status: update.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', summaryId)

    if (error) throw error
  }

  // Method for podcast updates
  async updatePodcast(
    podcastId: string,
    update: {
      transcript?: string
      has_transcript?: boolean
      status?: ProcessingStatus
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('podcasts')
      .update({
        ...update,
        updated_at: new Date().toISOString()
      })
      .eq('id', podcastId)

    if (error) throw error
  }

  // Method for getting podcast data
  async getPodcast(id: string) {
    const { data, error } = await this.supabase
      .from('podcasts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async updateSummary(id: string, update: any) {
    const { error } = await this.supabase
      .from('summaries')
      .update(update)
      .eq('id', id)

    if (error) throw error
  }
} 