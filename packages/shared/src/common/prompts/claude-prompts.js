"use strict";
/**
 * Claude AI Prompts
 *
 * This file contains all prompts used for Claude AI interactions
 * across the application. Centralizing them here ensures consistency
 * and makes them easier to maintain and update.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAUDE_PROMPTS = void 0;
exports.CLAUDE_PROMPTS = {
    /**
     * Models available for different use cases
     * Reference: https://docs.anthropic.com/claude/reference/selecting-a-model
     */
    MODELS: {
        DEFAULT: 'claude-3-7-sonnet-20250219', // Most recent model - best for most use cases
        HAIKU: 'claude-3-haiku-20240307', // Fastest, most cost-effective
        SONNET: 'claude-3-7-sonnet-20250219', // Latest Sonnet version - good balance of capabilities
        OPUS: 'claude-3-opus-20240229', // Most capable for complex tasks
    },
    /**
     * Token limits for different operations
     *
     * These token limits are carefully tuned for different use cases across our architecture.
     * Each service has specific requirements for token usage based on its role and constraints.
     */
    TOKEN_LIMITS: {
        /**
         * Used by: API's SummaryService
         * Purpose: Provides higher token limit for direct client-facing streaming
         * File: packages/server/api/src/services/summary.ts
         *
         * The streaming API needs more tokens because it's directly serving content
         * to users who expect comprehensive, complete summaries with all details.
         */
        SUMMARY_STREAMING: 4096,
        /**
         * Used by: Worker's SummaryGeneratorService
         * Purpose: Primary summary generation service - needs sufficient tokens for quality
         * File: packages/server/worker/src/services/summary-generator.ts
         *
         * Using the same token limit as the streaming service (4096) to ensure
         * we generate high-quality, comprehensive summaries for our users.
         */
        SUMMARY_GENERATOR: 4096,
        /**
         * Used as a fallback when no specific limit is provided
         * This ensures consistency if developers forget to specify a token limit.
         */
        DEFAULT: 4000,
    },
    /**
     * Podcast summary generation prompts
     * Used by the worker service when processing transcripts
     */
    PODCAST_SUMMARY: {
        // System prompt defines Claude's role and expertise
        SYSTEM: `You are an expert podcast and video content analyst and summarizer with deep experience in content curation.
Your summaries are known for being insightful, well-structured, and highlighting the most valuable information.
You excel at identifying key themes, important quotes, and actionable takeaways from conversations.`,
        // User prompt contains the specific task instructions
        USER_TEMPLATE: `

Here is the transcript you need to analyze: 

<transcript>
{{TRANSCRIPT}}
</transcript>

Provide a summary based on the content type you've identified. Use the following guidelines:

For Podcasts:
- Adjust the summary length based on the podcast duration (longer summary for longer podcasts).
- Use markdown formatting with these sections:
  1. Overview (2-3 sentences about the episode)
  2. Key Topics (bullet points of main subjects discussed)
  3. Main Insights (3-5 key takeaways)
  4. Notable Quotes (1-3 standout quotes, counting words for each)
  5. Resources Mentioned (any books, articles, or resources discussed) — Search the web for links, and if the right link is found, hyperlink it, otherwise leave it unlinked.


Remember to focus on maximizing value for the reader by capturing the most important information and making the summary actionable where appropriate.

Please begin your content analysis now.`
    }
};
//# sourceMappingURL=claude-prompts.js.map