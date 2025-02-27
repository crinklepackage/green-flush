/**
 * Claude AI Prompts
 *
 * This file contains all prompts used for Claude AI interactions
 * across the application. Centralizing them here ensures consistency
 * and makes them easier to maintain and update.
 */
export declare const CLAUDE_PROMPTS: {
    /**
     * Models available for different use cases
     * Reference: https://docs.anthropic.com/claude/reference/selecting-a-model
     */
    MODELS: {
        DEFAULT: string;
        HAIKU: string;
        SONNET: string;
        OPUS: string;
    };
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
        SUMMARY_STREAMING: number;
        /**
         * Used by: Worker's SummaryGeneratorService
         * Purpose: Primary summary generation service - needs sufficient tokens for quality
         * File: packages/server/worker/src/services/summary-generator.ts
         *
         * Using the same token limit as the streaming service (4096) to ensure
         * we generate high-quality, comprehensive summaries for our users.
         */
        SUMMARY_GENERATOR: number;
        /**
         * Used as a fallback when no specific limit is provided
         * This ensures consistency if developers forget to specify a token limit.
         */
        DEFAULT: number;
    };
    /**
     * Podcast summary generation prompts
     * Used by the worker service when processing transcripts
     */
    PODCAST_SUMMARY: {
        SYSTEM: string;
        USER_TEMPLATE: string;
    };
};
//# sourceMappingURL=claude-prompts.d.ts.map