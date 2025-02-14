// packages/server/api/src/services/summary.ts
export class SummaryService {
    static async *generateSummaryStream(summaryId: string) {
      const claude = new Anthropic() // Your Claude client
      let accumulatedText = ''
  
      try {
        // Start Claude streaming
        const stream = await claude.messages.create({
          max_tokens: 4096,
          messages: [{ role: 'user', content: 'Your podcast summary prompt' }],
          stream: true
        })
  
        // Stream and save chunks simultaneously
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.text) {
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