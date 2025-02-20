import { z } from 'zod'

export const PodcastRequestSchema = z.object({
  url: z.string().url(),
  summaryId: z.string().uuid(),
  platform: z.enum(['youtube', 'spotify']).optional()
})

export type PodcastRequest = z.infer<typeof PodcastRequestSchema>