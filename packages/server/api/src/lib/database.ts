// packages/server/api/src/lib/database.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { 
  Database,
  PodcastRecord, 
  SummaryRecord, 
  DatabaseError,
  VideoMetadata,
  RPCPodcastResponse
} from '@wavenotes/shared'
import { supabase } from './supabase'

export class DatabaseService {
    constructor(
      private supabase: SupabaseClient<Database> = supabase
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
}

// Export a default instance
export const db = new DatabaseService(supabase)