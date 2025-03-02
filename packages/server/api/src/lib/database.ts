// packages/server/api/src/lib/database.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { 
  Database,
  DatabasePodcastRecord,
  SummaryRecord as Summary, 
  VideoMetadata,
  RPCPodcastResponse,
  ProcessingStatus,
  SummaryRecord,
} from '@wavenotes-new/shared'
import { 
  DatabaseError,
  FeedbackRecord,
  CreateFeedbackParams,
  UpdateFeedbackParams
} from '@wavenotes-new/shared'
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
  }): Promise<DatabasePodcastRecord>
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
    podcast: DatabasePodcastRecord
  }>
  updateSummaryStatus(
    summaryId: string,
    status: string,
    error?: string
  ): Promise<void>
  createSummary(data: {
    podcastId: string
    status: ProcessingStatus
    creatorId: string
  }): Promise<SummaryRecord>
  findPodcastByUrl(url: string): Promise<DatabasePodcastRecord | null>
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
  deleteSummary(summaryId: string, userId: string): Promise<void>
  userHasAccessToSummary(userId: string, summaryId: string): Promise<boolean>
  // Feedback methods
  createFeedback(data: CreateFeedbackParams): Promise<FeedbackRecord>
  getFeedback(filters?: Record<string, any>, sortOptions?: Record<string, 1 | -1>): Promise<FeedbackRecord[]>
  getFeedbackById(id: string): Promise<FeedbackRecord | null>
  updateFeedback(id: string, data: UpdateFeedbackParams): Promise<FeedbackRecord>
  isUserOriginalSummarizer(userId: string, summaryId: string): Promise<boolean>
  getPodcast(id: string): Promise<DatabasePodcastRecord | null>
  logSummaryRetryError(data: {
    summaryId: string,
    userId: string,
    originalPodcastUrl: string,
    error: string,
    errorDetails?: any
  }): Promise<void>
  getInProgressSummaries(statuses: ProcessingStatus[]): Promise<SummaryRecord[]>
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
      podcast: DatabasePodcastRecord 
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
    }): Promise<DatabasePodcastRecord> {
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
      creatorId: string
    }): Promise<SummaryRecord> {
      const { data: summary, error } = await this.supabase
        .from('summaries')
        .insert({
          podcast_id: data.podcastId,
          status: data.status,
          creator_id: data.creatorId,
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

    async findPodcastByUrl(url: string): Promise<DatabasePodcastRecord | null> {
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

    async userHasAccessToSummary(userId: string, summaryId: string): Promise<boolean> {
      console.log(`Checking access for user ${userId} to summary ${summaryId}`);
      
      const { data, error } = await this.supabase
        .from('user_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('summary_id', summaryId)
        .maybeSingle();

      if (error) {
        console.error('Error checking user access to summary:', error);
        throw new DatabaseError(
          'Failed to check user access to summary',
          error.code,
          'userHasAccessToSummary',
          { userId, summaryId }
        );
      }

      const hasAccess = !!data;
      console.log(`Access check result for user ${userId} to summary ${summaryId}: ${hasAccess}`, { data });
      
      return hasAccess;
    }

    async deleteSummary(summaryId: string, userId: string): Promise<void> {
      try {
        // Check if the summary exists and get its status
        const { data: summary, error: summaryCheckError } = await this.supabase
          .from('summaries')
          .select('id, status, podcast_id')
          .eq('id', summaryId)
          .maybeSingle();

        if (summaryCheckError) {
          throw new DatabaseError(
            'Failed to check if summary exists',
            summaryCheckError.code,
            'deleteSummary',
            { summaryId }
          );
        }

        if (!summary) {
          throw new DatabaseError(
            'Summary not found',
            'NOT_FOUND',
            'deleteSummary',
            { summaryId }
          );
        }
        
        // Check if the status allows deletion (must be 'failed' or 'in_queue')
        const allowedStatuses = ['failed', 'in_queue'];
        if (!allowedStatuses.includes(summary.status)) {
          throw new DatabaseError(
            `Cannot delete summary with status '${summary.status}'. Only summaries with status 'failed' or 'in_queue' can be deleted.`,
            'PERMISSION_DENIED',
            'deleteSummary',
            { summaryId, status: summary.status }
          );
        }

        // Check if the user has access to this summary
        const hasAccess = await this.userHasAccessToSummary(userId, summaryId);
        if (!hasAccess) {
          throw new DatabaseError(
            'Access denied: User does not have access to this summary',
            'PERMISSION_DENIED',
            'deleteSummary',
            { summaryId, userId }
          );
        }

        // Delete the user-summary association first
        const { error: deleteUserSummaryError } = await this.supabase
          .from('user_summaries')
          .delete()
          .eq('user_id', userId)
          .eq('summary_id', summaryId);

        if (deleteUserSummaryError) {
          throw new DatabaseError(
            'Failed to delete user-summary association',
            deleteUserSummaryError.code,
            'deleteSummary',
            { summaryId, userId }
          );
        }

        // Check if any other users have access to this summary
        const { count, error: countError } = await this.supabase
          .from('user_summaries')
          .select('*', { count: 'exact', head: true })
          .eq('summary_id', summaryId);

        if (countError) {
          throw new DatabaseError(
            'Failed to count remaining summary associations',
            countError.code,
            'deleteSummary',
            { summaryId }
          );
        }

        // If no other users have access, delete the summary
        if (count === 0) {
          const podcastId = summary.podcast_id;

          // Delete the summary
          const { error: deleteSummaryError } = await this.supabase
            .from('summaries')
            .delete()
            .eq('id', summaryId);

          if (deleteSummaryError) {
            throw new DatabaseError(
              'Failed to delete summary',
              deleteSummaryError.code,
              'deleteSummary',
              { summaryId }
            );
          }

          // Check if any other summaries reference this podcast
          const { count: podcastCount, error: podcastCountError } = await this.supabase
            .from('summaries')
            .select('*', { count: 'exact', head: true })
            .eq('podcast_id', podcastId);

          if (podcastCountError) {
            throw new DatabaseError(
              'Failed to count remaining podcast references',
              podcastCountError.code,
              'deleteSummary',
              { podcastId }
            );
          }

          // If no other summaries reference this podcast, delete it too
          if (podcastCount === 0) {
            const { error: deletePodcastError } = await this.supabase
              .from('podcasts')
              .delete()
              .eq('id', podcastId);

            if (deletePodcastError) {
              throw new DatabaseError(
                'Failed to delete orphaned podcast',
                deletePodcastError.code,
                'deleteSummary',
                { podcastId }
              );
            }
            
            console.info(`deleteSummary: Deleted podcast ${podcastId} as it no longer has associated summaries.`);
          }
          
          console.info(`deleteSummary: Successfully deleted summary ${summaryId} for user ${userId}.`);
        } else {
          console.info(`deleteSummary: Removed user ${userId} access to summary ${summaryId}. Summary still has ${count} other users.`);
        }
      } catch (error) {
        if (error instanceof DatabaseError) {
          throw error;
        }
        throw new DatabaseError(
          'Unexpected error while deleting summary',
          'UNKNOWN',
          'deleteSummary',
          { summaryId, userId, error }
        );
      }
    }

    async createFeedback(data: CreateFeedbackParams): Promise<FeedbackRecord> {
      const { data: feedback, error } = await this.supabase
        .from('user_feedback')
        .insert({
          user_id: data.user_id,
          feedback_type: data.feedback_type,
          feedback_text: data.feedback_text,
          summary_id: data.summary_id,
          podcast_id: data.podcast_id,
          page_url: data.page_url,
          browser_info: data.browser_info,
          tags: data.tags,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new DatabaseError(
          'Failed to create feedback',
          error.code,
          'createFeedback',
          { data }
        );
      }

      return feedback;
    }

    async getFeedback(filters: Record<string, any> = {}, sortOptions: Record<string, 1 | -1> = { submitted_at: -1 }): Promise<FeedbackRecord[]> {
      let query = this.supabase
        .from('user_feedback')
        .select('*');

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      // Apply sorting (most recent first by default)
      const sortKey = Object.keys(sortOptions)[0] || 'submitted_at';
      const sortDirection = sortOptions[sortKey] === 1 ? 'asc' : 'desc';
      query = query.order(sortKey, { ascending: sortDirection === 'asc' });

      const { data, error } = await query;

      if (error) {
        throw new DatabaseError(
          'Failed to fetch feedback',
          error.code,
          'getFeedback',
          { filters, sortOptions }
        );
      }

      return data || [];
    }

    async getFeedbackById(id: string): Promise<FeedbackRecord | null> {
      const { data, error } = await this.supabase
        .from('user_feedback')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new DatabaseError(
          'Failed to fetch feedback',
          error.code,
          'getFeedbackById',
          { id }
        );
      }

      return data;
    }

    async updateFeedback(id: string, data: UpdateFeedbackParams): Promise<FeedbackRecord> {
      const { data: feedback, error } = await this.supabase
        .from('user_feedback')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new DatabaseError(
          'Failed to update feedback',
          error.code,
          'updateFeedback',
          { id, data }
        );
      }

      return feedback;
    }

    async isUserOriginalSummarizer(userId: string, summaryId: string): Promise<boolean> {
      try {
        // Get all user_summaries for this summary, ordered by created_at
        const { data, error } = await this.supabase
          .from('user_summaries')
          .select('*')
          .eq('summary_id', summaryId)
          .order('created_at', { ascending: true })
          .limit(1);

        if (error) {
          throw new DatabaseError(
            'Failed to check if user is original summarizer',
            error.code,
            'isUserOriginalSummarizer',
            { userId, summaryId }
          );
        }

        // If there's at least one record and the first (oldest) one belongs to this user,
        // they are the original summarizer
        return data && data.length > 0 && data[0].user_id === userId;
      } catch (error) {
        console.error('Error checking if user is original summarizer:', error);
        return false;
      }
    }

    async getPodcast(id: string): Promise<DatabasePodcastRecord | null> {
      try {
        const { data, error } = await this.supabase
          .from('podcasts')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching podcast:', error);
          throw new DatabaseError('Failed to fetch podcast', error.code, 'getPodcast', error);
        }

        return data;
      } catch (error) {
        console.error('Error in getPodcast:', error);
        if (error instanceof DatabaseError) {
          throw error;
        }
        throw new DatabaseError(
          'Failed to fetch podcast', 
          'UNKNOWN', 
          'getPodcast', 
          error instanceof Error ? { message: error.message } : { message: 'Unknown error' }
        );
      }
    }

    async getSummary(id: string): Promise<Summary> {
      try {
        const { data, error } = await this.supabase
          .from('summaries')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching summary:', error);
          throw new DatabaseError('Failed to fetch summary', error.code, 'getSummary', error);
        }

        return data;
      } catch (error) {
        console.error('Error in getSummary:', error);
        if (error instanceof DatabaseError) {
          throw error;
        }
        throw new DatabaseError(
          'Failed to fetch summary', 
          'UNKNOWN', 
          'getSummary', 
          error instanceof Error ? { message: error.message } : { message: 'Unknown error' }
        );
      }
    }

    // New method to log summary retry errors to the job_history table
    async logSummaryRetryError(data: {
      summaryId: string,
      userId: string,
      originalPodcastUrl: string,
      error: string,
      errorDetails?: any
    }): Promise<void> {
      try {
        const { summaryId, userId, originalPodcastUrl, error, errorDetails } = data;
        
        // Create a structured error log record
        const logEntry = {
          job_type: 'summary_retry',
          source_service: 'api',
          target_service: 'worker',
          status: 'error',
          created_at: new Date().toISOString(),
          input_payload: {
            summaryId,
            userId,
            originalPodcastUrl
          },
          error_message: error,
          output_payload: errorDetails ? { details: errorDetails } : null
        };
        
        // Insert the log record
        const { data: result, error: insertError } = await this.supabase
          .from('job_history')
          .insert(logEntry)
          .select();
          
        if (insertError) {
          console.error('Failed to log summary retry error:', insertError);
          // We don't throw here as this is a logging operation that shouldn't
          // interrupt the main flow if it fails
        } else {
          console.info('Successfully logged summary retry error');
        }
      } catch (err) {
        // Just log to console if database logging fails
        console.error('Error in logSummaryRetryError:', err);
      }
    }

    /**
     * Gets summaries with specified processing statuses
     */
    async getInProgressSummaries(statuses: ProcessingStatus[]): Promise<SummaryRecord[]> {
      const { data, error } = await this.supabase
        .from('summaries')
        .select('*') // Select all fields to match SummaryRecord type
        .in('status', statuses);

      if (error) {
        console.error('Database error fetching in-progress summaries:', error);
        throw new DatabaseError(
          'Failed to fetch in-progress summaries', 
          error.code || 'UNKNOWN',
          'getInProgressSummaries',
          { statuses }
        );
      }

      return data || [];
    }
}

// Export a default instance
export const db = new DatabaseService(supabase)