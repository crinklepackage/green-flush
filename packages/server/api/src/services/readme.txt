# Core Components

## API Server
- `api-service.ts`: Main orchestrator
  - Handles podcast requests
  - Creates DB records
  - Queues processing jobs
  - Manages platform clients (YouTube/Spotify)

- `summaries.ts` (Routes):
  - Exposes summary endpoints
  - Streams summary updates to client
  - Transforms DB data to client-friendly format

- `database.ts` & `supabase.ts`:
  - Database access layer
  - Handles all Supabase operations
  - Type-safe DB operations

## Worker
- `summary.ts`: AI Integration
  - Handles Claude API interaction
  - Generates summaries from transcripts
  - Streams summary chunks

- `podcast-processor.ts`: Job Handler
  - Processes queued podcast jobs
  - Coordinates transcript and summary generation
  - Updates job status and progress

## Data Flow
1. API receives podcast URL
2. Creates records & queues job
3. Worker processes transcript
4. Worker generates summary
5. API streams updates to client

## Type System
- Server types match DB schema
- Client types simplified for UI
- Transform layer handles conversion