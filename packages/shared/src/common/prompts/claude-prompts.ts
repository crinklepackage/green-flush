/**
 * Claude AI Prompts
 * 
 * This file contains all prompts used for Claude AI interactions
 * across the application. Centralizing them here ensures consistency
 * and makes them easier to maintain and update.
 */

export const CLAUDE_PROMPTS = {
  /**
   * Models available for different use cases
   * Reference: https://docs.anthropic.com/claude/reference/selecting-a-model
   */
  MODELS: {
    DEFAULT: 'claude-3-7-sonnet-20250219', // Most recent model - best for most use cases
    HAIKU: 'claude-3-haiku-20240307',      // Fastest, most cost-effective
    SONNET: 'claude-3-7-sonnet-20250219',  // Latest Sonnet version - good balance of capabilities
    OPUS: 'claude-3-opus-20240229',        // Most capable for complex tasks
  },

  /**
   * Podcast summary generation prompts
   * Used by the worker service when processing transcripts
   */
  PODCAST_SUMMARY: {
    // System prompt defines Claude's role and expertise
    SYSTEM: `You are an expert podcast analyst and summarizer with deep experience in content curation.
Your summaries are known for being insightful, well-structured, and highlighting the most valuable information.
You excel at identifying key themes, important quotes, and actionable takeaways from conversations.`,

    // User prompt contains the specific task instructions
    USER_TEMPLATE: `Analyze and summarize the following podcast transcript in a clear, structured format.
Please organize your summary in markdown with these sections:
1. Overview (2-3 sentences about the episode)
2. Key Topics (bullet points of main subjects discussed)
3. Main Insights (3-5 key takeaways)
4. Notable Quotes (1-3 standout quotes)
5. Resources Mentioned (any books, articles, or resources discussed)

Transcript:
{transcript}`
  }
}