import { FeedbackType } from '../../server/types/entities/feedback';
/**
 * Client-side representation of a feedback request
 */
export interface FeedbackRequest {
    feedbackType: FeedbackType;
    feedbackText: string;
    summaryId?: string;
    podcastId?: string;
    pageUrl?: string;
    browserInfo?: {
        userAgent: string;
        viewport: string;
        [key: string]: any;
    };
}
//# sourceMappingURL=feedback.d.ts.map