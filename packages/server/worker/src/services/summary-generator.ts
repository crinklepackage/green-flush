import { Anthropic } from '@anthropic-ai/sdk';

// Simple logger for local development
const logger = console;

export class SummaryGeneratorService {
  static async generateSummary(transcript: string, onChunk: (chunk: string) => Promise<void>): Promise<void> {
    try {
      logger.info('Generating summary from transcript', { transcriptLength: transcript.length });
      
      // Define messages array for the Messages API
      const messages = [
        {
          role: 'system',
          content: "You are an expert podcast summarizer. Your task is to analyze and summarize the following podcast transcript in a clear, structured format. Please provide your response in markdown format with detailed sections."
        },
        { role: 'user', content: transcript }
      ];
      
      // Use fetch to call Anthropic's chat completions endpoint
      const response = await fetch('https://api.anthropic.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || ''
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          messages: messages,
          stream: true,
          max_tokens_to_sample: 800
        })
      });
      
      if (!response.body) {
        throw new Error('No response body');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const rawChunk = decoder.decode(value);
          logger.debug('Raw chunk received:', { rawChunk });

          const lines = rawChunk.split(/\r?\n/).filter(line => line.trim() !== '');
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              logger.debug('Parsed chunk JSON:', { parsed });
              const textChunk = parsed.message?.content || parsed.completion || '';
              if (textChunk.trim() === '') {
                logger.warn('Empty textChunk encountered', { line, parsed });
              } else {
                logger.info('Received streaming chunk from Anthropic Messages API', { chunk: textChunk });
              }
              await onChunk(textChunk);
            } catch (e) {
              logger.error('Error parsing chunk', { line, error: e });
            }
          }
        }
      }
      
      logger.info('Summary generation complete');
    } catch (error) {
      logger.error('Error generating summary', { error });
      throw error;
    }
  }
} 