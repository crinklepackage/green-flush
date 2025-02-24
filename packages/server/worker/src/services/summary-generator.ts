import Anthropic from '@anthropic-ai/sdk';

// Simple logger for local development
const logger = console;

export class SummaryGeneratorService {
  static async generateSummary(transcript: string, onChunk: (chunk: string) => Promise<void>): Promise<{ inputTokens: number, outputTokens: number }> {
    try {
      logger.info('Generating summary from transcript', { transcriptLength: transcript.length });
      
      // Merge system instruction and transcript into a single user message
      const combinedMessage = `You are an expert podcast summarizer. Your task is to analyze and summarize the following podcast transcript in a clear, structured format. Please provide your response in markdown format with detailed sections.\n\nTranscript:\n${transcript}`;
      
      // Define messages array using only allowed roles ('user')
      const messages = [
        { role: 'user' as const, content: combinedMessage }
      ];
      
      // Use Anthropic SDK's streaming method with a configurable max_tokens value
      const client = new Anthropic();
      const stream = await client.messages.stream({
        model: 'claude-3-5-sonnet-20241022',
        messages: messages,
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
      
      // Count tokens for input message
      const inputTokens = await SummaryGeneratorService.countMessageTokens([
        { role: 'user', content: combinedMessage }
      ]);
      
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

  static async countMessageTokens(messages: object[]): Promise<number> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': process.env.ANTHROPIC_API_KEY || ''
        },
        body: JSON.stringify({ messages })
      });
      const data = await response.json() as { input_tokens: number };
      return data.input_tokens;
    } catch (error) {
      logger.error('Error counting message tokens', { error });
      throw error;
    }
  }
} 