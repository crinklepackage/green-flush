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
    title: string
    show_name: string
    thumbnail_url: string | null
    duration: number | null
    created_by: string
    has_transcript?: boolean
    transcript?: string | null
    youtube_url?: string | null
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
      const { data, error: updateError } = await this.supabase
        .from('summaries')
        .update({ 
          status,
          error_message: error,
          updated_at: new Date().toISOString()
        })
        .eq('id', summaryId)
        .select();

      if (updateError || !data || data.length === 0) {
        throw new DatabaseError(
          'Failed to update summary status',
          updateError?.code || 'NO_ROWS_UPDATED',
          'updateSummaryStatus',
          { summaryId, status, error, data }
        );
      } else {
        console.info(`updateSummaryStatus: Updated summary ${summaryId} to status ${status}.`);
      }
    }

    async createPodcast(data: {
      url: string,
      platform: 'youtube' | 'spotify',
      title: string,
      show_name: string,
      thumbnail_url: string | null,
      duration: number | null,
      created_by: string,
      has_transcript?: boolean,
      transcript?: string | null,
      youtube_url?: string | null
    }): Promise<PodcastRecord> {
      const insertData = {
        ...data,
        has_transcript: data.has_transcript ?? false,
        transcript: data.transcript ?? null
      };
      const { data: podcast, error } = await this.supabase
        .from('podcasts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error in createPodcast:', error);
        throw new DatabaseError(
          'Failed to create podcast',
          error.code,
          'createPodcast',
          { data: insertData }
        );
      }

      return podcast;
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

    async updateStatus(summaryId: string, status: ProcessingStatus, errorMessage?: string): Promise<void> {
      // Wrapper for updateSummaryStatus
      await this.updateSummaryStatus(summaryId, status, errorMessage);
    }

    async appendSummary(summaryId: string, dataObj: { text: string, status: string }): Promise<void> {
      const { data, error } = await this.supabase
        .from('summaries')
        .update({ 
          summary_text: dataObj.text,
          status: dataObj.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', summaryId)
        .select();

      if (error || !data || data.length === 0) {
        throw new DatabaseError(
          'Failed to append summary text',
          error?.code || 'NO_ROWS_UPDATED',
          'appendSummary',
          { summaryId, data: dataObj, returnedData: data }
        );
      } else {
        console.info(`appendSummary: Updated summary ${summaryId} with new text chunk. New status: ${dataObj.status}`);
      }
    }
}

// Export a default instance
export const db = new DatabaseService(supabase)