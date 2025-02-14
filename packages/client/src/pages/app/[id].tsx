// packages/client/src/pages/app/[id].tsx
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ProcessingStatus } from '@wavenotes/shared'
import { StreamingSummary } from '@/components/StreamingSummary'

interface Summary {
  id: string
  status: ProcessingStatus
  podcast?: {
    title: string
    show_name: string
    url: string
    youtube_url?: string
    thumbnail_url?: string
  }
  content?: string
  error_message?: string
}

const loadingMessages: Record<ProcessingStatus, string> = {
  IN_QUEUE: 'Preparing to process your podcast...',
  FINDING_YOUTUBE: 'Finding your podcast content...',
  FETCHING_TRANSCRIPT: 'Getting the transcript...',
  TRANSCRIPT_READY: 'Transcript is ready...',
  GENERATING_SUMMARY: 'Creating your summary...',
  COMPLETED: 'Complete!',
  FAILED: 'Failed to process podcast'
}

export default function SummaryPage() {
  const router = useRouter()
  const { id } = router.query
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!id) return

    // Initial fetch
    const fetchSummary = async () => {
      const { data, error } = await supabase
        .from('summaries')
        .select(`
          *,
          podcast (
            title,
            show_name,
            url,
            youtube_url,
            thumbnail_url
          )
        `)
        .eq('id', id)
        .single()

      if (!error && data) {
        setSummary(data)
      }
    }

    fetchSummary()

    // Real-time updates
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
          setSummary(current => ({
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

  const handleDelete = async () => {
    if (!summary) return
    
    try {
      setIsDeleting(true)
      await supabase
        .from('summaries')
        .delete()
        .eq('id', summary.id)
      router.push('/app')
    } catch (error) {
      console.error('Failed to delete:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!summary) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <Link 
          href="/app" 
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Dashboard
        </Link>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Podcast Info */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">
          {summary.podcast?.title || 'Processing Podcast...'}
        </h1>
        {summary.podcast?.show_name && (
          <p className="text-gray-600 mb-4">{summary.podcast.show_name}</p>
        )}
        {summary.podcast?.url && (
          <div className="flex gap-4">
            <a 
              href={summary.podcast.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              View Original
            </a>
            {summary.podcast.youtube_url && (
              <a 
                href={summary.podcast.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                View on YouTube
              </a>
            )}
          </div>
        )}
      </div>

      {/* Status & Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="mb-4">
          <StatusBadge status={summary.status} />
        </div>

        {summary.status === 'FAILED' ? (
          <div className="bg-red-50 text-red-700 p-4 rounded">
            {summary.error_message || 'Failed to process podcast'}
          </div>
        ) : summary.status === 'COMPLETED' ? (
          <div className="prose max-w-none">
            {summary.content}
          </div>
        ) : (
          <StreamingSummary
            summaryId={id as string}
            isGenerating={summary.status === 'GENERATING_SUMMARY'}
          />
        )}
      </div>
    </div>
  )
}