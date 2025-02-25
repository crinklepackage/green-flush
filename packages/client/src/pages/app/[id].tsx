import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase, getSession } from '../../lib/supabase'
import type { SummaryRecord, ProcessingStatus } from '@wavenotes-new/shared'  // using shared types
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card'
import { StatusBadge } from '../../components/StatusBadge'

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
  const [accessToken, setAccessToken] = useState<string | null>(null)

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

  // Add useEffect to get the access token
  useEffect(() => {
    const loadSession = async () => {
      const session = await getSession()
      if (session) {
        setAccessToken(session.access_token)
      }
    }
    loadSession()
  }, [])

  if (!summary) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse text-lg">Loading summary...</div>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="mb-8">
        <Button variant="link" asChild className="mb-4">
          <Link href="/app" className="inline-flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>
        </Button>
        
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              {summary?.podcast?.thumbnail_url && (
                <img 
                  src={summary.podcast.thumbnail_url} 
                  alt={summary.podcast?.title || 'Podcast thumbnail'} 
                  className="w-16 h-16 rounded-md object-cover"
                />
              )}
              <div>
                <CardTitle>
                  {summary?.podcast ? summary.podcast.title : 'Loading title...'}
                </CardTitle>
                <CardDescription>
                  {summary?.podcast ? summary.podcast.show_name : 'Loading channel...'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StatusBadge status={summary?.status as ProcessingStatus} />
            {summary?.error_message && (
              <p className="mt-2 text-sm text-red-600">{summary.error_message}</p>
            )}
          </CardContent>
          {summary?.podcast?.url && (
            <CardFooter>
              <Button variant="outline" asChild>
                <a href={summary.podcast.url} target="_blank" rel="noopener noreferrer">
                  View Original
                </a>
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-indigo prose-lg max-w-none">
            {summary?.summary_text ? (
              <ReactMarkdown>{summary.summary_text}</ReactMarkdown>
            ) : (
              <p className="text-gray-500 italic">Your summary will appear here as it is generated.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}