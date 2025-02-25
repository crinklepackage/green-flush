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
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

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
    <Card className="overflow-hidden hover:shadow-md transition duration-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {summary.podcast && summary.podcast.thumbnail_url && (
            <img src={summary.podcast.thumbnail_url} alt="Podcast thumbnail" className="w-16 h-16 rounded" />
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{summary.podcast?.title || 'Unknown Podcast'}</h3>
            <p className="text-sm text-muted-foreground">{summary.podcast?.show_name || 'Unknown Show'}</p>
            <p className="mt-1 text-sm">Status: <span className="text-blue-600">{summary.status}</span></p>
            <a href={`/app/${summary.id}`} className="mt-2 inline-block text-primary hover:underline">View Summary</a>
          </div>
        </div>
      </CardContent>
    </Card>
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
        <Card>
          <CardHeader>
            <CardTitle>Add a New Podcast</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Podcast URL</Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    name="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste a Spotify or YouTube URL"
                    disabled={isSubmitting}
                  />
                  <Button 
                    type="submit"
                    disabled={isSubmitting || !url}
                  >
                    {isSubmitting ? 'Submitting...' : 'Summarize'}
                  </Button>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Summaries Sections */}
        <div className="mt-8 space-y-8">
          {/* In Progress Section */}
          <Card>
            <CardHeader>
              <CardTitle>In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSummaries ? <p>Loading summaries...</p> : (
                inProgressSummaries.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inProgressSummaries.map(summary => (
                      <SummaryCard key={summary.id} summary={summary} />
                    ))}
                  </div>
                ) : <p>No summaries in progress.</p>
              )}
            </CardContent>
          </Card>

          {/* Completed Section */}
          <Card>
            <CardHeader>
              <CardTitle>Completed</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSummaries ? <p>Loading summaries...</p> : (
                completedSummaries.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {completedSummaries.map(summary => (
                      <SummaryCard key={summary.id} summary={summary} />
                    ))}
                  </div>
                ) : <p>No completed summaries.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}