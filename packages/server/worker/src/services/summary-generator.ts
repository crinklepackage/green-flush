import { Anthropic } from '@anthropic-ai/sdk';

// Simple logger for local development
const logger = console;

export class SummaryGeneratorService {
  static async generateSummary(transcript: string, onChunk: (chunk: string) => Promise<void>): Promise<void> {
    try {
      logger.info('Generating summary from transcript', { transcriptLength: transcript.length });

      const prompt = `You are an expert podcast summarizer. Your task is to analyze and summarize the following podcast transcript in a clear, structured format.

Please provide your response in markdown format with detailed sections.

Here's the transcript:\n${transcript}\n
Remember to be concise and accurate.`;

      // Instantiate the Anthropic client (Claude)
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      
      // Create the completion with streaming enabled
      const stream = await anthropic.completions.create({
        model: 'claude-v1', // adjust to your specific Claude model version if needed
        prompt,
        stream: true,
        max_tokens_to_sample: 800,
      });

      // Stream the output, calling onChunk for each chunk
      for await (const chunk of stream) {
        const textChunk = chunk.completion;
        logger.info('Received streaming chunk from Claude', { chunk: textChunk });
        await onChunk(textChunk);
      }

      logger.info('Summary generation complete');
    } catch (error) {
      logger.error('Error generating summary', { error });
      throw error;
    }
  }
} 