// packages/server/api/src/services/summary.ts
import { Anthropic } from '@anthropic-ai/sdk'
import { supabase } from '../lib/supabase'
import { CLAUDE_PROMPTS } from '@wavenotes-new/shared'

export class SummaryService {
    private claude: Anthropic

    constructor(private apiKey: string) {
        this.claude = new Anthropic({ apiKey })
    }

    async *generateSummaryStream(summaryId: string) {
      let accumulatedText = ''
  
      try {
        // Start Claude streaming
        const stream = await this.claude.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: CLAUDE_PROMPTS.TOKEN_LIMITS.SUMMARY_STREAMING,
          messages: [{ role: 'user', content: 'Your podcast summary prompt' }],
          stream: true,
          system: 'You are an expert podcast summarizer...'
        })
  
        // Stream and save chunks simultaneously
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && 
              chunk.delta.type === 'text_delta' && 
              'text' in chunk.delta) {
            const newText = chunk.delta.text
            accumulatedText += newText
  
            // Save to DB as we go
            await supabase
              .from('summaries')
              .update({ 
                content: accumulatedText,
                status: 'GENERATING_SUMMARY'
              })
              .eq('id', summaryId)
  
            // Yield to client immediately
            yield newText
          }
        }
  
        // Update final status
        await supabase
          .from('summaries')
          .update({ 
            content: accumulatedText,
            status: 'COMPLETED'
          })
          .eq('id', summaryId)
  
      } catch (error) {
        console.error('Stream generation error:', error)
        throw error
      }
    }
}