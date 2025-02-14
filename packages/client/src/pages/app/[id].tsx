import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Summary } from '@wavenotes/shared'  // using shared types

const loadingMessages: Record<string, string> = {
  IN_QUEUE: 'Preparing to process your podcast...',
  // ... other statuses
  COMPLETED: 'Complete!',
  FAILED: 'Failed to process podcast'
}

export default function SummaryPage() {
  const router = useRouter()
  const { id } = router.query
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    if (!id) return

    // Wrap async logic inside an async function
    const fetchSummary = async () => {
      const { data, error } = await supabase
        .from('summaries')
        .select(`
          *,
          podcasts (
            title,
            show_name,
            url,
            youtube_url,
            thumbnail_url
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching summary:', error)
      } else if (data) {
        console.log('Fetched summary data:', data)
        setSummary(data)
      }
    }

    fetchSummary()

    const subscription = supabase
      .channel(`summary:${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'summaries',
          filter: `id=eq.${id}`
        },
        (payload) => {
          console.log('Received real-time update:', payload)
          setSummary((current) => ({
            ...current,
            ...payload.new
          }))
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [id])

  if (!summary) {
    return <div className="container">Loading summary...</div>
  }

  return (
    <div className="container">
      <h2>Summary Details</h2>
      <p>Status: {loadingMessages[summary.status] || summary.status}</p>
      <div className="summary-content">
        {summary.summary_text || 'Your summary will appear here as it is generated.'}
      </div>
    </div>
  )
}