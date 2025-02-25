# Wavenotes Server

This package contains the server-side components of the Wavenotes application, including both the API and worker services.

## Critical Flow: Podcast Summary Generation

The podcast summary generation is a core feature of our application. It involves a coordinated process between the API and worker services, with both using Claude AI for different aspects of the workflow.

### Overview Diagram

```
┌────────────┐    1. Submit URL     ┌────────────┐    2. Queue Job     ┌────────────┐
│            │─────────────────────▶│            │───────────────────▶│            │
│   Client   │                      │    API     │                     │   Worker   │
│            │◀ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │            │                     │            │
└────────────┘  5. Stream Results   └────────────┘                     └────────────┘
       ▲                                                                     │
       │                                                                     │
       │                                                                     │
       └─────────────────────────────────────────────────────────────────────┘
                               4. Save Results
                                 to Database
                                      ▲
                                      │
                                      │
                                      │
                               ┌────────────┐
                               │            │
                               │ Database   │
                               │            │
                               └────────────┘
                                      ▲
                                      │
                                      │ 3. Generate
                                      │   Summary
                                      │
                                ┌────────────┐
                                │            │
                                │  Claude    │
                                │    AI      │
                                │            │
                                └────────────┘
```

### Complete Flow Explanation

1. **URL Submission**:
   - User submits a YouTube or Spotify URL through the client application
   - Client makes a POST request to `/api/podcasts` endpoint
   - API creates summary record with `IN_QUEUE` status

2. **Job Queuing**:
   - API adds a job to the podcast processing queue using `QueueService`
   - Job contains podcast ID, summary ID, and URL information
   - Client is redirected to summary page to await results

3. **Background Processing (Worker)**:
   - Worker picks up the job from the queue
   - Fetches transcript using `TranscriptProcessor`
   - Uses `SummaryGeneratorService` to generate summary with Claude
   - Summary generation uses `CLAUDE_PROMPTS.TOKEN_LIMITS.SUMMARY_GENERATOR` (1024 tokens)
   - Leverages shared prompt templates from `CLAUDE_PROMPTS.PODCAST_SUMMARY`

4. **Database Updates**:
   - Worker updates the database with summary chunks as they're generated
   - Status is updated to `GENERATING_SUMMARY` during processing
   - Token usage metrics are recorded for analytics
   - Final status is set to `COMPLETED` when finished

5. **Client Streaming**:
   - Client connects to `/api/summaries/:id/stream` using EventSource
   - API uses `SummaryService` to stream summary content directly to client
   - Streaming API uses `CLAUDE_PROMPTS.TOKEN_LIMITS.SUMMARY_STREAMING` (4096 tokens)
   - Client displays summary content in real-time as chunks arrive

### Components Involved

**API Components**:
- `PodcastUrlForm` component (client): Submits URL to API
- `summaries.ts` routes: Handles `/summaries/:id/stream` endpoint
- `SummaryService`: Handles client-facing streaming of summary content
- `QueueService`: Adds jobs to the queue for processing

**Worker Components**:
- `ContentProcessorService`: Main processor for podcast jobs
- `SummaryGeneratorService`: Generates summaries from transcripts
- `TranscriptProcessor`: Extracts transcripts from video URLs

**Shared Components**:
- `CLAUDE_PROMPTS`: Centralized configuration for Claude AI interactions

## Claude AI Usage

Both the API and worker services use Claude AI, but for different purposes:

1. **Worker (SummaryGeneratorService)**:
   - Primary summary generation
   - Background processing with 4096 token limit
   - Modern event-based API
   - Performs token usage counting
   - Uses full prompt templates

2. **API (SummaryService)**:
   - Direct client streaming
   - Real-time with 4096 token limit
   - Uses iterator-based streaming
   - Handles database updates during streaming
   - Simplified prompt approach

## Common Points of Configuration

All Claude AI interactions are configured through the shared constants in:
`packages/shared/src/common/prompts/claude-prompts.ts`

This ensures consistent models, token limits, and prompt templates across the application.

## Error Handling and Recovery

The summary generation flow includes:
- Timeout handling for long-running operations
- Status updates for error conditions
- Fallback mechanisms when platform services fail
- Clear error reporting for debugging


###Actual Usage Analysis in the Core Workflow

The Single Flow

Based on our analysis, your application has a single primary workflow for summary generation, and it uses both services in sequence:

Initial Request Through PodcastUrlForm:
- User submits URL which creates a summary record and makes a POST to /api/podcasts
- The API creates a job and adds it to the queue (QueueService.add)
- The client is redirected to /app/[summaryId]

Background Processing Through SummaryGeneratorService:
- The worker picks up the job from the queue
- ContentProcessorService is invoked with the job data
- ContentProcessorService uses SummaryGeneratorService to generate the summary
- As chunks are generated, they're saved to the database

Streaming Results Through SummaryService:
- On the summary page, the client connects to /api/summaries/:id/stream using EventSource
- This endpoint creates a SummaryService instance
- SummaryService streams the actual summary content directly to the client

Key Evidence
Client Workflow:
   // First creates record and submits to API
   const response = await fetch('/api/podcasts', {
     method: 'POST',
     body: JSON.stringify({ url, summaryId })
   })
   
   // Then connects to streaming endpoint
   const eventSource = new EventSource(`/api/summaries/${summaryId}/stream`)


Streaming API Endpoint:
   router.get('/:id/stream', async (req, res) => {
     // Uses SummaryService for streaming
     const summaryService = new SummaryService(config.ANTHROPIC_API_KEY)
     const generator = await summaryService.generateSummaryStream(id)
     
     for await (const chunk of generator) {
       res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
     }
   })

The Actual Flow
Your core workflow uses both services in this sequence:

Background Processing (Worker):
- SummaryGeneratorService generates and saves summary chunks in the background

Client-Facing Streaming (API):
- SummaryService handles streaming those saved chunks to the client in real-time

This means that both services are indeed being used in your core workflow, but for different parts of the process - one for background generation and DB storage, and one for real-time streaming to the client.

The confusion might arise because there's a "chained" relationship between these services, rather than them being alternative paths. Together they complete your described workflow.