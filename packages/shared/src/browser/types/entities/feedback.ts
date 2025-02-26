/**
 * Browser-side types for user feedback entities
 */

export type FeedbackType = 
  | 'general'
  | 'bug' 
  | 'feature_request'
  | 'summary_quality'
  | 'summary_retry_limit';

export type FeedbackStatus = 
  | 'new'
  | 'reviewed'
  | 'implemented'
  | 'closed';

export interface Feedback {
  id: string;
  feedbackType: FeedbackType;
  feedbackText: string;
  submittedAt: string;
  summaryId?: string;
  podcastId?: string;
  pageUrl?: string;
  status: FeedbackStatus;
}

export interface FeedbackRequest {
  feedbackType: FeedbackType;
  feedbackText: string;
  summaryId?: string;
  podcastId?: string;
  pageUrl?: string;
  browserInfo?: {
    userAgent?: string;
    viewport?: string;
    [key: string]: any;
  };
  tags?: string[];
} 