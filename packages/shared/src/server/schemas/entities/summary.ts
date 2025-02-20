// node/schemas/summary.ts
import { z } from 'zod'
import { ProcessingStatus } from '../../types/status'

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

export type Summary = z.infer<typeof SummarySchema>