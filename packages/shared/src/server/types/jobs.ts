import { z } from 'zod'

export const PodcastJobSchema = z.object({
  summaryId: z.string().uuid(),
  podcastId: z.string().uuid(),
  url: z.string().url(),
  type: z.enum(['youtube', 'spotify']),
  userId: z.string().uuid()
})

export type PodcastJob = z.infer<typeof PodcastJobSchema> 