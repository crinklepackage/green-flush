import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { SummaryRecord } from '@wavenotes-new/shared'  // using shared types
import ReactMarkdown from 'react-markdown'

interface SummaryWithPodcast extends SummaryRecord {
  podcast?: {
    title: string;
    show_name: string;
    url?: string;
    youtube_url?: string;
    thumbnail_url?: string | null;
  };
}

const loadingMessages: Record<string, string> = {
  IN_QUEUE: 'Preparing to process your podcast...',
  // ... other statuses
  COMPLETED: 'Complete!',
  FAILED: 'Failed to process podcast'
}

export default function SummaryPage() {
  const router = useRouter()
  const { id } = router.query
  const [summary, setSummary] = useState<SummaryWithPodcast | null>(null)

  useEffect(() => {
    if (!id) return

    // Normalize id parameter
    const idString = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : ''

    // Wrap async logic inside an async function
    const fetchSummary = async () => {
      const { data, error } = await supabase
        .from('summaries')
        .select(`
          *,
          podcast: podcasts (
            title,
            show_name,
            url,
            youtube_url,
            thumbnail_url
          )
        `)
        .eq('id', idString)
        .single()

      if (error) {
        console.error('Error fetching summary:', error)
      } else if (data) {
        console.log('Fetched summary data:', data)
        setSummary(data as SummaryWithPodcast)
      }
    }

    fetchSummary()

    const subscription = supabase
      .channel(`summary:${idString}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'summaries',
          filter: `id=eq.${idString}`
        },
        (payload) => {
          console.log('Received real-time update:', payload)
          setSummary((current: SummaryWithPodcast | null) => {
            const newSummary = payload.new as SummaryWithPodcast;
            return current ? { ...current, ...newSummary } : newSummary;
          })
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe().catch(err => console.error('Unsubscribe error:', err));
    }
  }, [id])

  if (!summary) {
    return <div className="container">Loading summary...</div>
  }

  return (
    <div className="container">
      <div className="video-details">
        <h1>{summary?.podcast ? summary.podcast.title : 'Loading title...'}</h1>
        <h3>{summary?.podcast ? summary.podcast.show_name : 'Loading channel...'}</h3>
      </div>
      <p>
        Status: {summary?.error_message ? `Error: ${summary.error_message}` : (loadingMessages[summary?.status || ''] || summary?.status)}
      </p>
      <div className="summary-content">
        {summary?.summary_text ? (
          <ReactMarkdown>{summary.summary_text}</ReactMarkdown>
        ) : (
          'Your summary will appear here as it is generated.'
        )}
      </div>
    </div>
  )
}