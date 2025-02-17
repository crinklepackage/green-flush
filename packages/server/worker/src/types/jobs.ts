import { z } from 'zod'

export const PodcastJobSchema = z.object({
  type: z.literal('PROCESS_PODCAST'),
  data: z.object({
    podcastId: z.string().uuid(),
    summaryId: z.string().uuid(),
    url: z.string().url()
  })
})

export type PodcastJob = z.infer<typeof PodcastJobSchema>

// Validate job data before processing
export function validateJobData(job: unknown): PodcastJob {
  return PodcastJobSchema.parse(job)
} 