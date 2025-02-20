# Server Architecture

## Overview
Our server is split into two distinct services: API and Worker. Each service has specific responsibilities and never crosses into the other's domain.

## Core Principles

### 1. Clear Separation of Concerns
- **API Service**: Lightweight operations (metadata, record creation)
- **Worker Service**: Heavy processing (transcripts, matching, AI)
- Shared types and utilities via shared package

### 2. Service-Based Architecture
Both services follow the same architectural pattern:
typescript
class BaseService {
constructor(
private db: DatabaseService,
private queue: QueueService
// Additional dependencies as needed
) {}
}


### 3. Environment Configuration
Both services use Zod for runtime validation:
typescript
const envSchema = z.object({
// Shared
SUPABASE_URL: z.string().url(),
SUPABASE_SERVICE_ROLE_KEY: z.string(),
REDIS_URL: z.string().url(),
NODE_ENV: z.enum(['development', 'production']).default('development'),
// Service-specific vars...
})


## API Service

### Purpose
Handles lightweight operations and client interactions.

### Key Components
- `api.service.ts`: Main service orchestration (Express wrapped)
- `platforms/`: Lightweight external API calls
  - YouTube metadata
  - Spotify episode info
- `routes/`: API endpoints
  - Podcast submission
  - Summary status
  - Real-time updates

### Flow Example
1. Receive podcast URL
2. Fetch metadata (lightweight)
3. Create records
4. Enqueue job for worker
5. Return response

### Environment Variables
bash
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
REDIS_URL=
YOUTUBE_API_KEY=



## Worker Service

### Purpose
Handles all heavy-lifting and processing operations.

### Key Components
- `worker.service.ts`: Main service orchestration
- `processors/`
  - `transcript.ts`: Multiple fallback methods
  - `summary.ts`: Claude streaming integration
- `platforms/`: Heavy platform operations
  - YouTube transcript fetching
  - Spotify → YouTube matching

### Transcript Processing Priority
typescript
// Production
[
TranscriptSource.SUPADATA,
TranscriptSource.YOUTUBE_TRANSCRIPT,
TranscriptSource.YOUTUBE_API
]
// Development
[
TranscriptSource.YOUTUBE_TRANSCRIPT,
TranscriptSource.YOUTUBE_API,
TranscriptSource.SUPADATA
]


### Environment Variables
bash
REDIS_URL=
YOUTUBE_OAUTH_CLIENT_ID=
YOUTUBE_OAUTH_CLIENT_SECRET=
YOUTUBE_OAUTH_REFRESH_TOKEN=
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

## Shared Patterns

### Status Management
- Uses shared ProcessingStatus types
- Real-time updates via Supabase
- Clear status flow:
  ```typescript
  IN_QUEUE → FINDING_YOUTUBE → FETCHING_TRANSCRIPT → 
  TRANSCRIPT_READY → GENERATING_SUMMARY → COMPLETED
  ```

### Error Handling
- Uses shared error types
- Proper error context
- Clean error responses
- Retry mechanisms where appropriate

### Database Interactions
- Consistent use of DatabaseService
- Type-safe Supabase queries
- Real-time subscriptions for updates

## Development Guidelines

1. **Never Mix Responsibilities**
   - API does metadata only
   - Worker does processing only

2. **Always Use Types**
   - Import from shared package
   - No `any` types allowed
   - Define interfaces for all responses

3. **Error Handling**
   - Use custom error types
   - Include context
   - Update status appropriately

4. **Configuration**
   - Validate all env vars
   - Use dependency injection
   - No hard-coded values