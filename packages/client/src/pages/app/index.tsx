// packages/client/src/pages/app/index.tsx
//TO-DO:
// Add the StatusBadge component
// Set up the real-time status hook
// Create the summary card component
// Each of these can be added incrementally as we build out the functionality. Which would you like to tackle first?
// Also, I notice the old code uses React Router, but since we're using Next.js now, we'll use its built-in routing. Should I show you how to adapt the routing parts?

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { ProcessingStatus } from '@wavenotes-new/shared'
import { getSession, getUser, supabase } from '../../lib/supabase'

// Existing type for summary details from [id].tsx, extended with podcast info
interface SummaryWithPodcast {
  id: string;
  status: string;
  summary_text?: string | null;
  error_message?: string | null;
  // Additional fields, e.g., created_at, updated_at, etc., from SummaryRecord can be added if needed
  podcast?: {
    title: string;
    show_name: string;
    url?: string;
    youtube_url?: string;
    thumbnail_url?: string | null;
  };
}

// New type for user summary records from the join between user_summaries, summaries, and podcasts
interface UserSummaryRecord {
  id: string; // id from the user_summaries table
  summary: SummaryWithPodcast;
}

const loadingMessages: Record<string, string> = {
  IN_QUEUE: 'Preparing to process your podcast...',
  FETCHING_TRANSCRIPT: 'Fetching transcript...',
  GENERATING_SUMMARY: 'Generating summary...',
  COMPLETED: 'Complete!',
  FAILED: 'Failed to process podcast'
}

export default function AppDashboard() {
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [accessToken, setAccessToken] = useState<string>('')
  const [userSummaries, setUserSummaries] = useState<UserSummaryRecord[]>([])
  const router = useRouter()

  // Load user session on component mount
  useEffect(() => {
    const loadUser = async () => {
      const session = await getSession()
      console.log("Session object:", session);
      if (session) {
        setAccessToken(session.access_token)
        const currentUser = await getUser()
        setUser(currentUser)
      }
    }
    loadUser()
  }, [])

  // Fetch user summaries once user is loaded
  const fetchUserSummaries = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_summaries')
      .select(`
        *,
        summary: summaries (
          id,
          status,
          summary_text,
          podcast: podcasts (
            title,
            show_name,
            url,
            youtube_url,
            thumbnail_url
          )
        )
      `)
      .eq('user_id', user.id)
    if (error) {
      console.error("Error fetching user summaries:", error)
    } else if (data) {
      console.log("Fetched user summaries:", data)
      setUserSummaries(data as UserSummaryRecord[])
    }
  }

  useEffect(() => {
    if (user) {
      fetchUserSummaries()
    }
  }, [user])

  // URL submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    console.log("Access token:", accessToken);
    console.log("Request headers:", { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` });

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/podcasts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Use accessToken from Supabase session
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ url })
      })

      if (!response.ok) {
        const errorResp = await response.json()
        throw new Error(errorResp.message || 'Failed to submit podcast')
      }

      const data = await response.json()
      console.log('Podcast submitted successfully:', data)
      
      // Clear the form
      setUrl('')

      // Navigate to the summary details page using the returned summary ID
      router.push(`/app/${data.id}`)
    } catch (err) {
      console.error('Failed to submit podcast:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit podcast')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtering summaries into groups based on status
  const inProgressStatuses = ['in_queue', 'fetching_transcript', 'generating_summary']
  const completedStatuses = ['completed', 'failed']

  const inProgressSummaries = userSummaries.filter(us => inProgressStatuses.includes(us.summary.status))
  const completedSummaries = userSummaries.filter(us => completedStatuses.includes(us.summary.status))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">WaveNotes</h1>
            {/* Display welcome message if user is available */}
            {user && (
              <span className="text-sm text-gray-700">Welcome, {user.email}</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* URL Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700">
              Podcast URL
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="url"
                name="url"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 block w-full rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Paste a Spotify or YouTube URL"
                disabled={isSubmitting}
              />
              <button
                type="submit"
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                disabled={isSubmitting || !url}
              >
                {isSubmitting ? 'Submitting...' : 'Summarize'}
              </button>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
        </form>

        {/* Summaries Sections */}
        <div className="mt-8 space-y-8">
          {/* In Progress Section */}
          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900">In Progress</h2>
            {inProgressSummaries.length === 0 ? (
              <p className="text-sm text-gray-500">No summaries in progress.</p>
            ) : (
              inProgressSummaries.map((record) => (
                <div key={record.summary.id} className="p-4 border rounded mb-2 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold">{record.summary.podcast?.title || 'No title'}</h3>
                    <p className="text-sm">{record.summary.podcast?.show_name || 'No channel'}</p>
                    <p className="text-xs text-gray-500">Status: {record.summary.status}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/app/${record.summary.id}`)}
                    className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                  >
                    View Details
                  </button>
                </div>
              ))
            )}
          </section>

          {/* Completed Section */}
          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900">Completed</h2>
            {completedSummaries.length === 0 ? (
              <p className="text-sm text-gray-500">No completed summaries.</p>
            ) : (
              completedSummaries.map((record) => (
                <div key={record.summary.id} className="p-4 border rounded mb-2 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold">{record.summary.podcast?.title || 'No title'}</h3>
                    <p className="text-sm">{record.summary.podcast?.show_name || 'No channel'}</p>
                    <p className="text-xs text-gray-500">Status: {record.summary.status}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/app/${record.summary.id}`)}
                    className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                  >
                    View Details
                  </button>
                </div>
              ))
            )}
          </section>
        </div>
      </main>
    </div>
  )
}