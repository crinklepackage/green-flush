/**
 * Server-side types for user feedback entities
 */
export type FeedbackType = 'general' | 'bug' | 'feature_request' | 'summary_quality' | 'summary_retry_limit';
export type FeedbackStatus = 'new' | 'reviewed' | 'implemented' | 'closed';
export interface FeedbackRecord {
    id: string;
    user_id: string;
    feedback_type: FeedbackType;
    feedback_text: string;
    submitted_at: string;
    summary_id?: string | null;
    podcast_id?: string | null;
    page_url?: string | null;
    browser_info?: Record<string, any> | null;
    status: FeedbackStatus;
    admin_notes?: string | null;
    priority: number;
    tags?: string[] | null;
}
export interface CreateFeedbackParams {
    user_id: string;
    feedback_type: FeedbackType;
    feedback_text: string;
    summary_id?: string;
    podcast_id?: string;
    page_url?: string;
    browser_info?: Record<string, any>;
    tags?: string[];
}
export interface UpdateFeedbackParams {
    status?: FeedbackStatus;
    admin_notes?: string;
    priority?: number;
    tags?: string[];
}
//# sourceMappingURL=feedback.d.ts.map