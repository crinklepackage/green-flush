import { z } from 'zod'

// API Request Validation
export const PodcastSchema = z.object({
  url: z.string().url(),
  summaryId: z.string().uuid(),
  platform: z.enum(['youtube', 'spotify']).optional()
})

// Job Validation
export const PodcastJobSchema = z.object({
  summaryId: z.string().uuid(),
  podcastId: z.string().uuid(),
  url: z.string().url(),
  type: z.enum(['youtube', 'spotify']),
  userId: z.string().uuid()
})

export type PodcastRequest = z.infer<typeof PodcastSchema>
export type PodcastJob = z.infer<typeof PodcastJobSchema> 