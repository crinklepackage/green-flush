import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_PROMPTS } from '@wavenotes-new/shared';

// Simple logger for local development
const logger = console;

export class SummaryGeneratorService {
  static async generateSummary(transcript: string, onChunk: (chunk: string) => Promise<void>): Promise<{ inputTokens: number, outputTokens: number }> {
    try {
      logger.info('Generating summary from transcript', { transcriptLength: transcript.length });
      
      // Prepare user message with transcript inserted
      const userContent = CLAUDE_PROMPTS.PODCAST_SUMMARY.USER_TEMPLATE.replace('{transcript}', transcript);
      
      // Use Anthropic SDK's streaming method with model from shared constants
      const client = new Anthropic();
      const stream = await client.messages.stream({
        model: CLAUDE_PROMPTS.MODELS.DEFAULT,
        system: CLAUDE_PROMPTS.PODCAST_SUMMARY.SYSTEM,
        messages: [
          { role: 'user' as const, content: userContent }
        ],
        max_tokens: 1024
      });

      let finished = false;
      let accumulatedSummary = '';

      // Capture each chunk and pass it to onChunk
      stream.on('text', async (text: string) => {
        accumulatedSummary += text; // Accumulate chunks for token counting
        logger.info('Received streaming chunk from Anthropic SDK', { chunk: text });
        await onChunk(text);
      });

      // Wait for the stream to end
      await new Promise<void>((resolve, reject) => {
        stream.once('end', () => {
          finished = true;
          resolve();
        });
        stream.on('error', (err) => reject(err));
      });
      
      logger.info('Summary generation complete');
      
      // Count tokens for input messages (including system)
      const inputTokens = await SummaryGeneratorService.countMessageTokens([
        { role: 'user', content: userContent }
      ], CLAUDE_PROMPTS.PODCAST_SUMMARY.SYSTEM);
      
      // Count tokens for the generated output message
      const outputTokens = await SummaryGeneratorService.countMessageTokens([
        { role: 'assistant', content: accumulatedSummary }
      ]);
      
      logger.info('Token counts', { inputTokens, outputTokens });
      
      return { inputTokens, outputTokens };
    } catch (error) {
      logger.error('Error generating summary', { error });
      throw error;
    }
  }

  static async countMessageTokens(messages: object[], system?: string): Promise<number> {
    try {
      const payload: any = { messages };
      
      // Add system parameter if provided
      if (system) {
        payload.system = system;
      }
      
      const response = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': process.env.ANTHROPIC_API_KEY || ''
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json() as { input_tokens: number };
      return data.input_tokens;
    } catch (error) {
      logger.error('Error counting message tokens', { error });
      throw error;
    }
  }
} 