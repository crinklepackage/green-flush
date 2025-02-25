# Worker Services

This directory contains service classes that handle the core business logic for the worker layer.

## SummaryGeneratorService

`SummaryGeneratorService` handles the background processing of podcast transcripts into AI-generated summaries.

### Purpose

- Processes podcast transcripts asynchronously in the background
- Implements the core content summarization logic
- Tracks token usage for analytics and billing
- Uses callback approach for handling generated chunks
- Provides detailed error handling and logging

### Implementation Details

- Uses Claude API with event-based streaming
- Configured with appropriate token limits (1024) for efficient background processing
- Uses centralized prompt templates from shared package
- Implements token counting for usage metrics
- Provides robust error handling with context

### Usage

The service is primarily used by the `ContentProcessorService` when processing podcast jobs:

```typescript
// Example usage in content processor
const { inputTokens, outputTokens } = await SummaryGeneratorService.generateSummary(
  transcript.text,
  async (chunk) => {
    // Process and save each chunk
    accumulatedSummary += chunk;
    await database.appendSummary(summaryId, {
      text: accumulatedSummary,
      status: ProcessingStatus.GENERATING_SUMMARY
    });
  }
);
```

### Flow in the Application

In the typical application flow:
1. Worker receives a job from the queue
2. ContentProcessorService processes the job
3. SummaryGeneratorService generates the summary
4. Chunks are saved to the database as they're generated
5. Token counts are tracked and recorded

### Configuration

Token limits and model settings are configured via the shared `CLAUDE_PROMPTS` constants:

```typescript
model: CLAUDE_PROMPTS.MODELS.DEFAULT,
system: CLAUDE_PROMPTS.PODCAST_SUMMARY.SYSTEM,
max_tokens: CLAUDE_PROMPTS.TOKEN_LIMITS.SUMMARY_GENERATOR, // 1024 tokens
```

### Token Counting

The service also provides token counting functionality for both input and output:

```typescript
// Count tokens for input messages
const inputTokens = await SummaryGeneratorService.countMessageTokens([
  { role: 'user', content: userContent }
], system);

// Count tokens for the generated output
const outputTokens = await SummaryGeneratorService.countMessageTokens([
  { role: 'assistant', content: accumulatedSummary }
]);
``` 