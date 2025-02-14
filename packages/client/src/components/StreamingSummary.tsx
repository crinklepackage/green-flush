// packages/client/src/components/StreamingSummary.tsx
export function StreamingSummary({ summaryId, isGenerating }: StreamingSummaryProps) {
    const [content, setContent] = useState('')
  
    useEffect(() => {
      if (!summaryId || !isGenerating) return
  
      const eventSource = new EventSource(`/api/summaries/${summaryId}/stream`)
  
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data === '[DONE]') {
            eventSource.close()
            return
          }
  
          // Append new text immediately as it comes in
          if (data.text) {
            setContent(current => current + data.text)
          }
        } catch (error) {
          console.error('Error parsing stream data:', error)
        }
      }
  
      return () => eventSource.close()
    }, [summaryId, isGenerating])
  
    // No need for DB fallback - content streams directly from Claude
    return (
      <div className="prose max-w-none">
        {content}
        {isGenerating && <span className="inline-block w-2 h-4 bg-black animate-pulse" />}
      </div>
    )
  }