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
import { StatusBadge } from '../../components/StatusBadge'
import withAuth from '../../components/withAuth'

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

// Add this interface at the top of the file with other interfaces
interface SummaryRecord {
  id: string;
  status: string;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  podcast_id?: string;
}

// SummaryCard Component
function SummaryCard({ summary, onDelete }: { 
  summary: SummaryWithPodcast;
  onDelete: (id: string) => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [imgError, setImgError] = useState(false);
  const router = useRouter();
  
  // Debug logging
  useEffect(() => {
    console.log('SummaryCard received:', {
      id: summary.id,
      status: summary.status,
      podcast: summary.podcast || 'No podcast data',
      hasThumbnail: summary.podcast?.thumbnail_url ? true : false
    });
  }, [summary]);
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to remove this summary?')) {
      setIsDeleting(true);
      try {
        await onDelete(summary.id);
      } catch (error) {
        console.error('Failed to delete summary:', error);
        setIsDeleting(false);
      }
    }
  };
  
  const handleCardClick = () => {
    router.push(`/app/${summary.id}`);
  };
  
  const showDeleteButton = 
    summary.status === 'failed' || 
    summary.status === 'in_queue';
  
  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition duration-200 cursor-pointer"
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3 max-w-[calc(100%-120px)]">
            <div className="w-16 h-16 flex-shrink-0">
              {summary.podcast && summary.podcast.thumbnail_url && !imgError ? (
                <img 
                  src={summary.podcast.thumbnail_url} 
                  alt="Podcast thumbnail" 
                  className="h-16 w-16 rounded object-cover" 
                  onError={(e) => {
                    console.error('Error loading thumbnail:', summary.podcast?.thumbnail_url);
                    setImgError(true);
                  }}
                />
              ) : (
                <div className="h-16 w-16 bg-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-400 text-xs">No image</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold line-clamp-2">{summary.podcast?.title || 'Unknown Podcast'}</h3>
              <p className="text-sm text-muted-foreground">{summary.podcast?.show_name || 'Unknown Show'}</p>
            </div>
          </div>
          <div className="flex-shrink-0 ml-4 w-[100px] text-right">
            <StatusBadge status={summary.status as ProcessingStatus} />
          </div>
        </div>
        
        {showDeleteButton && (
          <div className="mt-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-0 h-auto" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default withAuth(function AppDashboard() {
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

  // Set up real-time subscription to summaries
  useEffect(() => {
    if (!user || !user.id) return;
    
    // Keep the debounced fetch for situations where we need a full refresh
    let debounceTimer: NodeJS.Timeout | null = null;
    
    const debouncedFetch = () => {
      // Clear any existing timer
      if (debounceTimer) clearTimeout(debounceTimer);
      
      // Set a new timer
      debounceTimer = setTimeout(() => {
        console.log('Debounced fetch triggered');
        fetchSummaries();
      }, 1000); // 1 second debounce
    };
    
    // Set up subscriptions to listen for changes
    const subscription = supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'summaries'
        },
        async (payload: any) => {
          console.log('Real-time update received:', payload);
          
          // Extract the updated summary data from the payload with proper typing
          const updatedSummary = payload.new as SummaryRecord;
          
          // Only handle updates - not inserts or deletes (those are handled elsewhere)
          if (payload.eventType === 'UPDATE' && updatedSummary?.id) {
            // Update just this specific summary in state rather than refetching everything
            setSummaries(prevSummaries => {
              // Find if this summary exists in our current state
              const existingIndex = prevSummaries.findIndex(s => s.id === updatedSummary.id);
              
              // If it doesn't exist in our state, don't do anything
              if (existingIndex === -1) return prevSummaries;
              
              // Clone the previous summaries array
              const updatedSummaries = [...prevSummaries];
              
              // Get the existing summary to preserve its podcast data
              const existingSummary = updatedSummaries[existingIndex];
              
              // Update just the changed fields, preserving the podcast data
              updatedSummaries[existingIndex] = {
                ...existingSummary,
                status: updatedSummary.status,
                error_message: updatedSummary.error_message,
                updated_at: updatedSummary.updated_at
              };
              
              console.log(`Summary ${updatedSummary.id} status changed from ${existingSummary.status} to ${updatedSummary.status}`);
              
              return updatedSummaries;
            });
          } else if (payload.eventType === 'INSERT') {
            // For new summaries, we may need to fetch the podcast data
            // But we can skip this if it was our optimistic update
            const newSummary = payload.new as SummaryRecord;
            if (newSummary?.id && summaries.some(s => s.id === newSummary.id)) {
              console.log('Ignoring INSERT for summary we already have:', newSummary.id);
              return;
            }
            
            // For truly new summaries, we can do a targeted fetch
            debouncedFetch();
          } else if (payload.eventType === 'DELETE') {
            // Remove the summary from state
            const oldSummary = payload.old as SummaryRecord;
            if (oldSummary?.id) {
              setSummaries(prevSummaries => 
                prevSummaries.filter(s => s.id !== oldSummary.id)
              );
            }
          }
        }
      )
      .subscribe();
    
    // Cleanup subscription and timer on unmount
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(subscription);
    };
  }, [user]);

  // Fetch summaries when user changes
  useEffect(() => {
    if (user && user.id) {
      fetchSummaries();
    }
  }, [user]);

  // Extract fetchSummaries function to be reusable
  const fetchSummaries = async () => {
    if (!user || !user.id) return;
    
    setLoadingSummaries(true);
    try {
      // First get the summary IDs this user has access to
      const { data: userSummaries, error: userSummariesError } = await supabase
        .from('user_summaries')
        .select('summary_id')
        .eq('user_id', user.id);
        
      if (userSummariesError) {
        console.error('Error fetching user summaries:', userSummariesError);
        setLoadingSummaries(false);
        return;
      }
      
      // If no summaries found, set empty array and return
      if (!userSummaries || userSummaries.length === 0) {
        setSummaries([]);
        setLoadingSummaries(false);
        return;
      }
      
      // Extract summary IDs
      // @ts-ignore: Temporarily ignoring type checking here
      const summaryIds = userSummaries.map(item => item.summary_id);
      
      // Simple direct query to get both summaries and podcasts
      const { data: podcastData, error: podcastError } = await supabase
        .from('podcasts')
        .select('*');
        
      if (podcastError) {
        console.error('Error fetching podcasts:', podcastError);
      }
      
      // Create a map of podcasts by ID for easy lookup
      type PodcastMap = {
        [key: string]: {
          id: string;
          title: string;
          show_name: string;
          thumbnail_url?: string | null;
          url?: string;
        }
      };
      
      const podcastMap: PodcastMap = {};
      if (podcastData) {
        podcastData.forEach(podcast => {
          podcastMap[podcast.id] = podcast;
        });
      }
      
      console.log('Podcast map:', podcastMap);
      
      // Get summaries
      const { data: summariesData, error: summariesError } = await supabase
        .from('summaries')
        .select('*')
        .in('id', summaryIds)
        .order('created_at', { ascending: false });
        
      if (summariesError) {
        console.error('Error fetching summaries:', summariesError);
        setSummaries([]);
        setLoadingSummaries(false);
        return;
      }
      
      console.log('Raw summaries data:', summariesData);
      
      // Debug: Show podcast_id from each summary to verify relationship
      if (summariesData && summariesData.length > 0) {
        console.log('Summary to podcast relationships:');
        summariesData.forEach(summary => {
          console.log(`Summary ${summary.id} has podcast_id: ${summary.podcast_id}`);
          if (summary.podcast_id && podcastMap[summary.podcast_id]) {
            console.log(`  Found matching podcast: ${podcastMap[summary.podcast_id].title}`);
          } else {
            console.log(`  No matching podcast found in podcast map`);
          }
        });
      }
        
      // Transform the data with the podcast map lookup
      const transformedData = (summariesData || []).map(summary => {
        // Get the podcast using the podcast_id if available
        const podcastInfo = summary.podcast_id && podcastMap[summary.podcast_id] 
          ? {
              id: podcastMap[summary.podcast_id].id,
              title: podcastMap[summary.podcast_id].title || 'Unknown Title',
              show_name: podcastMap[summary.podcast_id].show_name || 'Unknown Show',
              thumbnail_url: podcastMap[summary.podcast_id].thumbnail_url,
              url: podcastMap[summary.podcast_id].url
            }
          : {
              // For in-progress summaries with missing podcast data, provide default values
              // This ensures cards still appear in the "In Progress" section
              title: summary.status === ProcessingStatus.IN_QUEUE || 
                     summary.status === ProcessingStatus.FETCHING_TRANSCRIPT || 
                     summary.status === ProcessingStatus.GENERATING_SUMMARY 
                     ? 'Processing Podcast' : 'Unknown Podcast',
              show_name: 'Please wait...',
            };
            
        return {
          id: summary.id,
          status: summary.status,
          error_message: summary.error_message,
          created_at: summary.created_at,
          updated_at: summary.updated_at,
          podcast: podcastInfo
        };
      });
      
      console.log('Transformed summaries with podcasts:', transformedData);
      setSummaries(transformedData);
    } catch (err) {
      console.error('Error in summaries fetch flow:', err);
      setSummaries([]);
    }
    setLoadingSummaries(false);
  };

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
      
      // Add an optimistic summary entry to the UI
      // This ensures a card appears immediately
      const optimisticSummary: SummaryWithPodcast = {
        id: data.id,
        status: ProcessingStatus.IN_QUEUE,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        podcast: {
          title: 'Processing Podcast',
          show_name: 'Please wait...',
        }
      };
      
      setSummaries(prev => [optimisticSummary, ...prev]);

      // Navigate to the summary details page using the returned summary ID
      router.push(`/app/${data.id}`)
    } catch (err) {
      console.error('Failed to submit podcast:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit podcast')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add handleDeleteSummary function
  const handleDeleteSummary = async (id: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/summaries/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        // Try to extract detailed error information
        let errorMessage = 'Failed to delete summary';
        try {
          const errorData = await response.json();
          console.error('Delete summary error details:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }
      
      // Remove the deleted summary from state and refresh data
      setSummaries(prevSummaries => prevSummaries.filter(s => s.id !== id));
      
      // Refresh after a short delay to ensure server processing is complete
      setTimeout(() => {
        fetchSummaries();
      }, 500);
      
    } catch (error) {
      console.error('Error deleting summary:', error);
      throw error;
    }
  };

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
          {inProgressSummaries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSummaries ? <p>Loading summaries...</p> : (
                  <div className="grid grid-cols-1 gap-4">
                    {inProgressSummaries.map(summary => (
                      <SummaryCard key={summary.id} summary={summary} onDelete={handleDeleteSummary} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Completed Section */}
          <Card>
            <CardHeader>
              <CardTitle>Completed</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSummaries ? <p>Loading summaries...</p> : (
                completedSummaries.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {completedSummaries.map(summary => (
                      <SummaryCard key={summary.id} summary={summary} onDelete={handleDeleteSummary} />
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
})