import { z } from 'zod'

// Core domain schemas
export const PodcastSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  platform: z.enum(['spotify', 'youtube']),
  status: z.enum(['pending', 'processing', 'completed']),
})

export const SummarySchema = z.object({
  id: z.string().uuid(),
  podcastId: z.string().uuid(),
  content: z.string().nullable(),
  status: z.enum([
    'IN_QUEUE',
    'FETCHING_TRANSCRIPT',
    'GENERATING_SUMMARY',
    'COMPLETED',
    'FAILED'
  ])
}) 