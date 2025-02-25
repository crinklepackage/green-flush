# API Services

This directory contains service classes that handle the core business logic for the API layer.

## SummaryService

`SummaryService` handles real-time streaming of AI-generated summary content to clients.

### Purpose

- Provides direct, real-time streaming of summary content to waiting clients
- Acts as the client-facing component of the summary generation system
- Streams chunks to clients as they're generated
- Updates the database with generated content

### Implementation Details

- Uses Claude API with streaming enabled
- Configured with a higher token limit (4096) for comprehensive client-facing responses
- Implemented as an async generator function that yields chunks as they're produced
- Updates database status in real-time as chunks are generated

### Usage

The service is primarily used in the `/summaries/:id/stream` endpoint, which:
1. Creates a new `SummaryService` instance
2. Initiates the streaming generation process
3. Forwards chunks to the client using Server-Sent Events (SSE)

```typescript
// Example usage in routes
const summaryService = new SummaryService(apiKey)
const generator = await summaryService.generateSummaryStream(summaryId)

// Stream chunks to client
for await (const chunk of generator) {
  res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
}
```

### Flow in the Application

In the typical application flow:
1. Summary is initially created and processed by the worker
2. Client connects to the streaming endpoint
3. `SummaryService` streams the generated content directly to the client

### Configuration

Token limits and model settings are configured via the shared `CLAUDE_PROMPTS` constants:

```typescript
max_tokens: CLAUDE_PROMPTS.TOKEN_LIMITS.SUMMARY_STREAMING, // 4096 tokens
``` 