Zod Implementation Strategy

1. Package Structure & Separation of Concerns

We implement Zod with a careful separation between Node.js services and browser code:

packages/shared/
├── src/
│   ├── node/
│   │   └── schemas.ts    # Full Zod schemas for API/Worker
│   ├── browser/
│   │   └── types.ts      # TypeScript-only types for Client
│   └── index.ts          # Re-exports both

Why This Structure?
- Zod adds ~30kb (minified + gzipped) to bundle size
- Node services need runtime validation
- Browser typically only needs TypeScript types
- Keep client bundle lean

Usage Pattern:
```typescript
// API/Worker: Use full schemas with runtime validation
import { PodcastSchema } from '@wavenotes/shared/node'

// Client: Use just types (no runtime overhead)
import type { Podcast } from '@wavenotes/shared'

```
2. Implementation Layers

A. Shared Package (Node)
```typescript
// packages/shared/src/node/schemas.ts
import { z } from 'zod'

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
```
B. Shared Package (Browser)
```typescript
// packages/shared/src/browser/types.ts
export type Podcast = {
  id: string
  url: string
  platform: 'spotify' | 'youtube'
  status: 'pending' | 'processing' | 'completed'
}

export type Summary = {
  id: string
  podcastId: string
  content: string | null
  status: 'IN_QUEUE' | 'FETCHING_TRANSCRIPT' | 'GENERATING_SUMMARY' | 'COMPLETED' | 'FAILED'
}
```
C. API Service
```typescript
// packages/server/api/src/config/environment.ts
import { z } from 'zod'

export const envSchema = z.object({
  PORT: z.number().default(3001),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string(),
  REDIS_URL: z.string().url()
})


// packages/server/api/src/routes/podcasts.ts
const createPodcastRequestSchema = z.object({
  url: z.string().url(),
  summaryId: z.string().uuid(),
  userId: z.string().uuid()
})
```
D. Worker Service
```typescript
// packages/server/worker/src/config/environment.ts
export const envSchema = z.object({
  REDIS_URL: z.string().url(),
  CLAUDE_API_KEY: z.string(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string(),
  NODE_ENV: z.enum(['development', 'production']).default('development')
})

// packages/server/worker/src/types/jobs.ts
export const PodcastJobSchema = z.object({
  type: z.literal('PROCESS_PODCAST'),
  data: z.object({
    podcastId: z.string().uuid(),
    summaryId: z.string().uuid(),
    url: z.string().url()
  })
})
```
3. Benefits

A. Optimal Bundle Sizes
- Node services: Full Zod validation
- Browser: Types only, no runtime overhead

B. Type Safety
- Consistent types across all packages
- Runtime validation where needed
- Compile-time types where appropriate

C. Clear Boundaries
- Service-specific validation in respective packages
- Shared domain types across all packages
- No unnecessary code in client bundle

D. Developer Experience
- Clear import patterns based on needs
- No accidental Zod imports in client code
- Consistent validation patterns in services 