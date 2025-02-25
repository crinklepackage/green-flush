# Shared Prompts

This directory contains centralized prompt configurations used across the application.

## Claude Prompts

The `claude-prompts.ts` file contains all shared configurations for Claude AI interactions, ensuring consistency across API and worker services.

### Structure

```typescript
export const CLAUDE_PROMPTS = {
  MODELS: { /* Available models */ },
  TOKEN_LIMITS: { /* Token limits for different operations */ },
  PODCAST_SUMMARY: { /* Podcast summary prompt templates */ }
}
```

### Models

The `MODELS` section defines the available Claude models:

```typescript
MODELS: {
  DEFAULT: 'claude-3-7-sonnet-20250219', // Most recent model - best for most use cases
  HAIKU: 'claude-3-haiku-20240307',      // Fastest, most cost-effective
  SONNET: 'claude-3-7-sonnet-20250219',  // Latest Sonnet version - good balance 
  OPUS: 'claude-3-opus-20240229',        // Most capable for complex tasks
}
```

### Token Limits

The `TOKEN_LIMITS` section defines standardized token limits for different operations:

```typescript
TOKEN_LIMITS: {
  SUMMARY_GENERATION: 4000,  // Used in worker for generating full summaries
  SUMMARY_STREAMING: 4096,   // Used in API for streaming summaries
  SUMMARY_GENERATOR: 1024,   // Used in summary generator service
  DEFAULT: 4000,             // Default token limit
}
```

These limits are used in:
- `SummaryService` (API): Uses `SUMMARY_STREAMING` (4096 tokens)
- `SummaryGeneratorService` (Worker): Uses `SUMMARY_GENERATOR` (1024 tokens)
- `SummaryProcessor` (Legacy): Uses `SUMMARY_GENERATION` (4000 tokens)

### Prompts

The `PODCAST_SUMMARY` section contains the system and user prompts for podcast summarization:

```typescript
PODCAST_SUMMARY: {
  // System prompt defines Claude's role
  SYSTEM: `You are an expert podcast and video content analyst...`,
  
  // User prompt template with placeholder for transcript
  USER_TEMPLATE: `You are an expert content analyst...{transcript}...`
}
```

## Usage

These shared constants should be used across the application to ensure consistency:

```typescript
import { CLAUDE_PROMPTS } from '@wavenotes-new/shared';

// Using a model
const model = CLAUDE_PROMPTS.MODELS.DEFAULT;

// Using a token limit
const maxTokens = CLAUDE_PROMPTS.TOKEN_LIMITS.SUMMARY_STREAMING;

// Using a prompt template
const userContent = CLAUDE_PROMPTS.PODCAST_SUMMARY.USER_TEMPLATE.replace('{transcript}', transcript);
```

## Maintenance Guidelines

1. **Centralized Updates**: All prompt and model changes should be made here, not in individual services
2. **Version Compatibility**: When updating model versions, ensure compatibility across all services
3. **Token Limit Optimization**: Adjust token limits based on performance metrics and cost considerations
4. **Prompt Versioning**: Major prompt changes should be versioned appropriately
5. **Testing**: Test prompt changes with various content types before deploying to production 