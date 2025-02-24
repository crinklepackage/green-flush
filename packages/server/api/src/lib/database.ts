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
    platform_specific_id: string
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
  findPodcastByUrl(url: string): Promise<PodcastRecord | null>
  createUserSummary(data: { user_id: string, summary_id: string }): Promise<any>
  getSummaryForPodcast(podcastId: string): Promise<SummaryRecord | null>
  updatePodcastInfo(podcastId: string, youtubeUrl: string): Promise<void>
  logFailedYouTubeSearch(dataObj: {
    search_query: string;
    spotify_show_name: string;
    spotify_title: string;
    spotify_url: string;
    resolved_youtube_url: string | null;
    resolved: boolean;
    created_at: string;
  }): Promise<void>
  appendSummary(summaryId: string, dataObj: { text: string, status: string }): Promise<void>
  updateSummaryTokens(summaryId: string, inputTokens: number, outputTokens: number): Promise<void>
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
      platform_specific_id: string,
      thumbnail_url: string | null,
      duration: number | null,
      created_by: string,
      has_transcript?: boolean,
      transcript?: string | null,
      youtube_url?: string | null
    }): Promise<PodcastRecord> {
      // Normalize URL
      const normalizedUrl = data.url.trim().toLowerCase();
      const insertData = {
        ...data,
        url: normalizedUrl,
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

    async updateSummaryTokens(summaryId: string, inputTokens: number, outputTokens: number): Promise<void> {
      const { data, error } = await this.supabase
        .from('summaries')
        .update({ 
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          updated_at: new Date().toISOString()
        })
        .eq('id', summaryId)
        .select();

      if (error || !data || data.length === 0) {
        throw new DatabaseError(
          'Failed to update summary tokens',
          error?.code || 'NO_ROWS_UPDATED',
          'updateSummaryTokens',
          { summaryId, inputTokens, outputTokens, data }
        );
      } else {
        console.info(`updateSummaryTokens: Updated summary ${summaryId} with input_tokens: ${inputTokens} and output_tokens: ${outputTokens}`);
      }
    }

    async findPodcastByUrl(url: string): Promise<PodcastRecord | null> {
      const normalizedUrl = url.trim().toLowerCase();
      const { data: podcast, error } = await this.supabase
        .from('podcasts')
        .select('*')
        .eq('url', normalizedUrl)
        .maybeSingle();

      if (error) {
        throw new DatabaseError(
          'Failed to find podcast',
          error.code,
          'findPodcastByUrl',
          { url, error }
        );
      }

      return podcast;
    }

    async createUserSummary(data: { user_id: string, summary_id: string }): Promise<any> {
      // First, check if the association already exists
      const { data: existingAssociation, error: queryError } = await this.supabase
        .from('user_summaries')
        .select('*')
        .eq('user_id', data.user_id)
        .eq('summary_id', data.summary_id)
        .maybeSingle();

      if (queryError) {
        console.error('Error querying user_summaries:', queryError);
      }

      if (existingAssociation) {
        // Association already exists, return it
        return existingAssociation;
      }

      // Otherwise, insert the new association record
      const { data: userSummary, error } = await this.supabase
        .from('user_summaries')
        .insert(data)
        .select()
        .single();

      if (error || !userSummary) {
        throw new DatabaseError(
          'Failed to create user summary association',
          error?.code || 'NO_ROWS',
          'createUserSummary',
          { data }
        );
      }

      return userSummary;
    }

    async getSummaryForPodcast(podcastId: string): Promise<SummaryRecord | null> {
      const { data: summary, error } = await this.supabase
        .from('summaries')
        .select('*')
        .eq('podcast_id', podcastId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch summary for podcast', error);
        return null;
      }

      return summary;
    }

    async updatePodcastInfo(podcastId: string, youtubeUrl: string): Promise<void> {
      const { data, error } = await this.supabase
        .from('podcasts')
        .update({ youtube_url: youtubeUrl })
        .eq('id', podcastId)
        .select();

      if (error || !data || data.length === 0) {
        throw new DatabaseError(
          'Failed to update podcast youtube_url',
          error?.code || 'NO_ROWS_UPDATED',
          'updatePodcastInfo',
          { podcastId, youtubeUrl, data }
        );
      } else {
        console.info(`updatePodcastInfo: Updated podcast ${podcastId} with youtube_url ${youtubeUrl}`);
      }
    }

    // New method to log failed YouTube searches for Spotify links
    async logFailedYouTubeSearch(dataObj: {
      search_query: string;
      spotify_show_name: string;
      spotify_title: string;
      spotify_url: string;
      resolved_youtube_url: string | null;
      resolved: boolean;
      created_at: string;
    }): Promise<void> {
      const { data, error } = await this.supabase
        .from('failed_youtube_searches')
        .insert(dataObj)
        .select();

      if (error || !data || data.length === 0) {
        throw new DatabaseError(
          'Failed to log failed YouTube search',
          error?.code || 'NO_ROWS_INSERTED',
          'logFailedYouTubeSearch',
          { dataObj, data }
        );
      } else {
        console.info('Logged failed YouTube search successfully');
      }
    }
}

// Export a default instance
export const db = new DatabaseService(supabase)