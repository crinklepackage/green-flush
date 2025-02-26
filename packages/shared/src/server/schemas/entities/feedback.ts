import { z } from 'zod';

/**
 * Zod schemas for validating feedback-related data
 */

export const FeedbackTypeSchema = z.enum([
  'general',
  'bug',
  'feature_request',
  'summary_quality',
  'summary_retry_limit'
]);

export const FeedbackStatusSchema = z.enum([
  'new', 
  'reviewed', 
  'implemented', 
  'closed'
]);

export const BrowserInfoSchema = z.object({
  userAgent: z.string().optional(),
  viewport: z.string().optional(),
}).passthrough();

export const CreateFeedbackSchema = z.object({
  feedback_type: FeedbackTypeSchema,
  feedback_text: z.string().min(1, "Feedback cannot be empty"),
  summary_id: z.string().uuid().optional(),
  podcast_id: z.string().uuid().optional(),
  page_url: z.string().optional(),
  browser_info: BrowserInfoSchema.optional(),
  tags: z.array(z.string()).optional()
});

export const UpdateFeedbackSchema = z.object({
  status: FeedbackStatusSchema.optional(),
  admin_notes: z.string().optional(),
  priority: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional()
});

export type CreateFeedbackSchemaType = z.infer<typeof CreateFeedbackSchema>;
export type UpdateFeedbackSchemaType = z.infer<typeof UpdateFeedbackSchema>; 