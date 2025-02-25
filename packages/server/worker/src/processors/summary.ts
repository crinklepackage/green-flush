// packages/server/worker/src/processors/summary.ts
import { Anthropic } from '@anthropic-ai/sdk'
import { ProcessingStatus, CLAUDE_PROMPTS } from '@wavenotes-new/shared'

export class SummaryProcessor {
  private static readonly SYSTEM_PROMPT = `You are an expert podcast summarizer...`

  constructor(private claude: Anthropic) {}

  // Only handles Claude integration
  async *generateSummary(transcript: string) {
    const stream = await this.claude.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: CLAUDE_PROMPTS.TOKEN_LIMITS.SUMMARY_GENERATION,
      messages: [{ role: 'user', content: transcript }],
      system: SummaryProcessor.SYSTEM_PROMPT,
      stream: true
    })

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && 
          chunk.delta.type === 'text_delta' && 
          'text' in chunk.delta) {
        yield chunk.delta.text
      }
    }
  }
}