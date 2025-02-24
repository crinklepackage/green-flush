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

// Define type for summary with podcast details
interface SummaryWithPodcast {
  id: string;
  status: string;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  podcast?: {
    title: string;
    show_name: string;
    thumbnail_url?: string | null;
    url?: string;
  };
}

// SummaryCard Component
function SummaryCard({ summary }: { summary: SummaryWithPodcast }) {
  return (
    <div className="border p-4 rounded-lg shadow hover:shadow-md transition duration-200">
      {summary.podcast && summary.podcast.thumbnail_url && (
        <img src={summary.podcast.thumbnail_url} alt="Podcast thumbnail" className="w-16 h-16 rounded mb-2" />
      )}
      <h3 className="text-lg font-semibold">{summary.podcast?.title || 'Unknown Podcast'}</h3>
      <p className="text-sm text-gray-600">{summary.podcast?.show_name || 'Unknown Show'}</p>
      <p className="mt-1 text-sm">Status: {summary.status}</p>
      <a href={`/app/${summary.id}`} className="mt-2 inline-block text-indigo-600 hover:underline">View Summary</a>
    </div>
  );
}

export default function AppDashboard() {
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [accessToken, setAccessToken] = useState<string>('')
  const [summaries, setSummaries] = useState<SummaryWithPodcast[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState<boolean>(false);
  const router = useRouter()

  // Load user session on component mount
  useEffect(() => {
    const loadUser = async () => {
      const session = await getSession()
      console.log('Session object:', session);
      if (session) {
        setAccessToken(session.access_token)
        const currentUser = await getUser()
        setUser(currentUser)
      }
    }
    loadUser()
  }, [])

  // Fetch summaries from Supabase
  useEffect(() => {
    const fetchSummaries = async () => {
      setLoadingSummaries(true);
      try {
        const { data, error } = await supabase
          .from('summaries')
          .select(`*, podcast:podcasts(title, show_name, thumbnail_url, url)`) 
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error fetching summaries:', error);
        } else {
          setSummaries(data || []);
        }
      } catch (err) {
        console.error('Error fetching summaries:', err);
      }
      setLoadingSummaries(false);
    };
    // Fetch only if user is set
    if (user) {
      fetchSummaries();
    }
  }, [user]);

  // URL submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    console.log('Access token:', accessToken);
    console.log('Request headers:', { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` });

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

  // Filter summaries based on status
  const inProgressSummaries = summaries.filter(s => s.status !== ProcessingStatus.COMPLETED && s.status !== ProcessingStatus.FAILED);
  const completedSummaries = summaries.filter(s => s.status === ProcessingStatus.COMPLETED);

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
            {loadingSummaries ? <p>Loading summaries...</p> : (
              inProgressSummaries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {inProgressSummaries.map(summary => (
                    <SummaryCard key={summary.id} summary={summary} />
                  ))}
                </div>
              ) : <p>No summaries in progress.</p>
            )}
          </section>

          {/* Completed Section */}
          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900">Completed</h2>
            {loadingSummaries ? <p>Loading summaries...</p> : (
              completedSummaries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {completedSummaries.map(summary => (
                    <SummaryCard key={summary.id} summary={summary} />
                  ))}
                </div>
              ) : <p>No completed summaries.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}