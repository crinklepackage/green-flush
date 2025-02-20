// packages/server/api/src/lib/database.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { 
  Database,
  PodcastRecord, 
  SummaryRecord as Summary, 
  VideoMetadata,
  RPCPodcastResponse,
  ProcessingStatus,
  SummaryRecord,
} from '@wavenotes-new/shared'
import { DatabaseError } from '@wavenotes-new/shared'
import { supabase } from './supabase'

export interface DatabaseService {
  getSummary(id: string): Promise<Summary>
  updateStatus(id: string, status: ProcessingStatus): Promise<void>
  createPodcast(data: {
    url: string
    platform: 'youtube' | 'spotify'
    status: ProcessingStatus
  }): Promise<PodcastRecord>
  createPodcastWithSummary(
    podcast: VideoMetadata & { 
      url: string
      platform: 'youtube' | 'spotify'
      youtube_url?: string 
    },
    summaryId: string,
    userId: string
  ): Promise<RPCPodcastResponse>
  getSummaryWithPodcast(summaryId: string): Promise<{
    summary: SummaryRecord
    podcast: PodcastRecord
  }>
  updateSummaryStatus(
    summaryId: string,
    status: string,
    error?: string
  ): Promise<void>
  createSummary(data: {
    podcastId: string
    status: ProcessingStatus
  }): Promise<SummaryRecord>
}

export class DatabaseService {
    constructor(
      private supabase: SupabaseClient<Database>
    ) {}

    async createPodcastWithSummary(
      podcast: VideoMetadata & { 
        url: string; 
        platform: 'youtube' | 'spotify';
        youtube_url?: string 
      }, 
      summaryId: string,
      userId: string
    ): Promise<RPCPodcastResponse> {
      try {
        const { data, error } = await this.supabase
          .rpc('create_podcast_with_summary', {
            podcast_data: {
              url: podcast.url,
              platform: podcast.platform,
              title: podcast.title,
              show_name: podcast.channel,
              thumbnail_url: podcast.thumbnailUrl,
              duration: podcast.duration,
              youtube_url: podcast.platform === 'youtube' ? podcast.url : null
            },
            summary_id: summaryId,
            user_id: userId
          })

        if (error || !data) {
          throw new DatabaseError(
            `Failed to create podcast with summary: ${error?.message}`,
            error?.code || 'UNKNOWN',
            'createPodcastWithSummary',
            { podcast, summaryId, userId }
          )
        }

        return data
      } catch (error) {
        if (error instanceof DatabaseError) throw error
        throw new DatabaseError(
          'Unexpected error creating podcast with summary',
          'UNKNOWN',
          'createPodcastWithSummary',
          { podcast, summaryId, userId }
        )
      }
    }

    async getSummaryWithPodcast(summaryId: string): Promise<{ 
      summary: SummaryRecord; 
      podcast: PodcastRecord 
    }> {
      const { data: summary, error: summaryError } = await this.supabase
        .from('summaries')
        .select(`
          *,
          podcast:podcasts(*)
        `)
        .eq('id', summaryId)
        .single()

      if (summaryError) {
        throw new DatabaseError(
          'Failed to fetch summary',
          summaryError.code,
          'getSummaryWithPodcast',
          { summaryId }
        )
      }

      return {
        summary,
        podcast: summary.podcast
      }
    }

    // Add methods for updating status/progress
    async updateSummaryStatus(
      summaryId: string, 
      status: string, 
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

      if (updateError) {
        throw new DatabaseError(
          'Failed to update summary status',
          updateError.code,
          'updateSummaryStatus',
          { summaryId, status, error }
        )
      }
    }

    async createPodcast(data: {
      url: string
      platform: 'youtube' | 'spotify'
      status: ProcessingStatus
    }): Promise<PodcastRecord> {
      const { data: podcast, error } = await this.supabase
        .from('podcasts')
        .insert(data)
        .select()
        .single()

      if (error) {
        throw new DatabaseError(
          'Failed to create podcast',
          error.code,
          'createPodcast',
          { data }
        )
      }

      return podcast
    }

    async createSummary(data: {
      podcastId: string
      status: ProcessingStatus
    }): Promise<SummaryRecord> {
      const { data: summary, error } = await this.supabase
        .from('summaries')
        .insert({
          podcast_id: data.podcastId,
          status: data.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new DatabaseError(
          'Failed to create summary',
          error.code,
          'createSummary',
          { data }
        )
      }
      return summary
    }
}

// Export a default instance
export const db = new DatabaseService(supabase)