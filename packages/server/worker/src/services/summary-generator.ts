import Anthropic from '@anthropic-ai/sdk';

// Simple logger for local development
const logger = console;

export class SummaryGeneratorService {
  static async generateSummary(transcript: string, onChunk: (chunk: string) => Promise<void>): Promise<void> {
    try {
      logger.info('Generating summary from transcript', { transcriptLength: transcript.length });
      
      // Merge system instruction and transcript into a single user message
      const combinedMessage = `You are an expert podcast summarizer. Your task is to analyze and summarize the following podcast transcript in a clear, structured format. Please provide your response in markdown format with detailed sections.\n\nTranscript:\n${transcript}`;
      
      // Define messages array using only allowed roles ('user')
      const messages = [
        { role: 'user' as const, content: combinedMessage }
      ];
      
      // Use Anthropic SDK's streaming method
      const client = new Anthropic();
      const stream = await client.messages.stream({
        model: 'claude-3-5-sonnet-20241022',
        messages: messages,
        max_tokens: 1024
      });

      stream.on('text', async (text: string) => {
        logger.info('Received streaming chunk from Anthropic SDK', { chunk: text });
        await onChunk(text);
      });

      // Wait for the stream to end using a promise
      await new Promise<void>((resolve, reject) => {
        stream.on('end', () => resolve());
        stream.on('error', (err) => reject(err));
      });
      
      logger.info('Summary generation complete');
    } catch (error) {
      logger.error('Error generating summary', { error });
      throw error;
    }
  }
} 