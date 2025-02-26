import { z } from 'zod';

/**
 * Browser-side Zod schemas for feedback validation
 */

export const FeedbackTypeSchema = z.enum([
  'general',
  'bug',
  'feature_request',
  'summary_quality',
  'summary_retry_limit'
]);

export const BrowserInfoSchema = z.object({
  userAgent: z.string().optional(),
  viewport: z.string().optional(),
}).passthrough();

export const FeedbackRequestSchema = z.object({
  feedbackType: FeedbackTypeSchema,
  feedbackText: z.string().min(1, "Feedback cannot be empty"),
  summaryId: z.string().uuid().optional(),
  podcastId: z.string().uuid().optional(),
  pageUrl: z.string().optional(),
  browserInfo: BrowserInfoSchema.optional(),
  tags: z.array(z.string()).optional()
}); 