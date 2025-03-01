// packages/client/src/pages/app/index.tsx
//TO-DO:
// Add the StatusBadge component
// Set up the real-time status hook
// Create the summary card component
// Each of these can be added incrementally as we build out the functionality. Which would you like to tackle first?
// Also, I notice the old code uses React Router, but since we're using Next.js now, we'll use its built-in routing. Should I show you how to adapt the routing parts?




import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/router'
import { ProcessingStatus } from '@wavenotes-new/shared'
import { getSession, getUser, supabase } from '../../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { StatusBadge } from '../../components/StatusBadge'
import { PlatformLinks } from '../../components/PlatformLinks'
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
    url?: string | null;
    youtube_url?: string | null;
    platform?: string;
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
const SummaryCard = ({ summary, onDelete, onRetry }: { 
  summary: SummaryWithPodcast;
  onDelete: (id: string) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
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
    
    // Remove confirmation dialog and proceed directly
    setIsDeleting(true);
    try {
      await onDelete(summary.id);
    } catch (error) {
      console.error('Failed to delete summary:', error);
      setIsDeleting(false);
    }
  };

  const handleRetry = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Remove confirmation dialog and proceed directly
    setIsRetrying(true);
    try {
      // Call the retry function provided by the parent component
      await onRetry(summary.id);
    } catch (error) {
      console.error('Failed to retry summary:', error);
    } finally {
      setIsRetrying(false);
    }
  };
  
  const handleCardClick = () => {
    router.push(`/app/${summary.id}`);
  };
  
  // Force buttons to be visible for any failed items regardless of exact status
  const isFailed = String(summary.status).toLowerCase() === 'failed';
  const isInQueue = String(summary.status).toLowerCase() === 'in_queue';
  
  const showDeleteButton = isFailed || isInQueue;
  const showRetryButton = isFailed;
  
  console.log('Button visibility check:', {
    status: summary.status,
    statusLower: String(summary.status).toLowerCase(),
    isFailed,
    isInQueue,
    showDeleteButton,
    showRetryButton
  });
  
  return (
    <Card 
      className="overflow-hidden hover:bg-gray-50 transition duration-200 cursor-pointer"
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
                <div className="h-16 w-16 bg-gray-0 rounded flex items-center justify-center">
                  <span className="text-gray-400 text-xs">No image</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold line-clamp-2">{summary.podcast?.title || 'Unknown Podcast'}</h3>
              <p className="text-sm text-muted-foreground">{summary.podcast?.show_name || 'Unknown Show'}</p>
              {summary.podcast && (
                <PlatformLinks
                  className="mt-2"
                  youtubeUrl={summary.podcast.youtube_url}
                  spotifyUrl={summary.podcast.platform === 'spotify' ? summary.podcast.url : null}
                />
              )}
            </div>
          </div>
          <div className="flex-shrink-0 ml-4 w-[100px] text-right">
            <StatusBadge status={summary.status as unknown as ProcessingStatus} />
          </div>
        </div>
        
        <div className="mt-3 flex gap-4">
          {showDeleteButton && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-0 h-auto" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </Button>
          )}
          
          {showRetryButton && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-0 h-auto" 
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          )}
        </div>
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
  
  // Pagination state for completed summaries
  const [visibleCompletedCount, setVisibleCompletedCount] = useState<number>(10);
  const [hasMoreCompleted, setHasMoreCompleted] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const completedContainerRef = useRef<HTMLDivElement>(null);

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
  
  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    // Reset visible count when summaries change
    setVisibleCompletedCount(10);
    setHasMoreCompleted(true);
    
    // Check if we need to set hasMoreCompleted to false initially
    const completedSummaries = summaries.filter(s => 
      String(s.status).toLowerCase() === 'completed'
    );
    if (completedSummaries.length <= 10) {
      setHasMoreCompleted(false);
    }
  }, [summaries]);
  
  // Intersection observer for infinite scrolling
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMoreCompleted && !loadingMore) {
        loadMoreCompletedSummaries();
      }
    }, options);
    
    const loadMoreElement = document.getElementById('load-more-trigger');
    if (loadMoreElement) {
      observer.observe(loadMoreElement);
    }
    
    return () => {
      if (loadMoreElement) {
        observer.unobserve(loadMoreElement);
      }
    };
  }, [hasMoreCompleted, loadingMore, visibleCompletedCount]);
  
  // Function to load more completed summaries
  const loadMoreCompletedSummaries = useCallback(() => {
    setLoadingMore(true);
    
    // Simulate a delay to prevent rapid loading
    setTimeout(() => {
      const completedSummaries = summaries.filter(s => 
        String(s.status).toLowerCase() === 'completed'
      );
      const newVisibleCount = visibleCompletedCount + 10;
      
      setVisibleCompletedCount(newVisibleCount);
      setHasMoreCompleted(newVisibleCount < completedSummaries.length);
      setLoadingMore(false);
    }, 300);
  }, [summaries, visibleCompletedCount]);

  // Extract fetchSummaries function to be reusable
  const fetchSummaries = async () => {
    if (!user || !user.id) return;
    
    setLoadingSummaries(true);
    try {
      // Define the type for our nested query response
      type SupabaseSummaryResponse = {
        summary_id: string;
        summaries: {
          id: string;
          status: string;
          error_message: string | null;
          created_at: string;
          updated_at: string;
          podcast: {
            id: string;
            title: string;
            show_name: string;
            thumbnail_url: string | null;
            url: string | null;
            youtube_url: string | null;
            platform: string | null;
          } | null;
        } | null;
      };

      // Get summaries with their associated podcasts in a single query
      const { data: userSummariesWithPodcasts, error: summariesError } = await supabase
        .from('user_summaries')
        .select(`
          summary_id,
          added_at,
          summaries:summary_id (
            id,
            status,
            error_message,
            created_at,
            updated_at,
            podcast:podcast_id (
              id,
              title,
              show_name,
              thumbnail_url,
              url,
              youtube_url,
              platform
            )
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (summariesError) {
        console.error('Error fetching summaries:', summariesError);
        setSummaries([]);
        return;
      }

      // Transform the nested data structure into our expected format
      const transformedData = ((userSummariesWithPodcasts || []) as unknown as SupabaseSummaryResponse[])
        .map(item => {
          const summary = item.summaries;
          if (!summary) return null;

          return {
            id: summary.id,
            status: summary.status,
            error_message: summary.error_message,
            created_at: summary.created_at,
            updated_at: summary.updated_at,
            podcast: summary.podcast || {
              title: summary.status === 'in_queue' || 
                     summary.status === 'fetching_transcript' || 
                     summary.status === 'generating_summary' 
                     ? 'Processing Podcast' : 'Unknown Podcast',
              show_name: 'Please wait...',
            }
          } as SummaryWithPodcast;
        })
        .filter((item): item is SummaryWithPodcast => item !== null);
      
      setSummaries(transformedData);
    } catch (err) {
      console.error('Error in summaries fetch flow:', err);
      setSummaries([]);
    } finally {
      setLoadingSummaries(false);
    }
  };

  // URL submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    console.log('Access token:', accessToken);
    console.log('Request headers:', { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` });

    try {
      const response = await fetch('/api/podcasts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ url })
      })

      if (!response.ok) {
        let errorMessage = 'Failed to submit podcast';
        
        // Check content type to determine how to parse response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorResp = await response.json();
            errorMessage = errorResp.message || errorMessage;
          } catch (parseError) {
            console.error('Error parsing JSON response:', parseError);
            // Fall back to text response if JSON parsing fails
            errorMessage = await response.text();
          }
        } else {
          // Not a JSON response, get text directly
          errorMessage = await response.text();
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json()
      console.log('Podcast submitted successfully:', data)
      
      // Clear the form
      setUrl('')
      
      // Add an optimistic summary entry to the UI
      // This ensures a card appears immediately
      const optimisticSummary: SummaryWithPodcast = {
        id: data.id,
        status: 'in_queue',
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
      const response = await fetch(`/api/summaries/${id}`, {
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

  // Add handleRetrySummary function
  const handleRetrySummary = async (id: string) => {
    try {
      const response = await fetch(`/api/summaries/${id}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        // Try to extract detailed error information
        let errorMessage = 'Failed to retry summary';
        try {
          const errorData = await response.json();
          console.error('Retry summary error details:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }
      
      // Update the status of this summary in the UI
      setSummaries(prevSummaries => prevSummaries.map(s => 
        s.id === id 
          ? { ...s, status: 'in_queue' }
          : s
      ));
      
      // Refresh after a short delay to ensure server processing is complete
      setTimeout(() => {
        fetchSummaries();
      }, 500);
      
    } catch (error) {
      console.error('Error retrying summary:', error);
      throw error;
    }
  };

  // Filter summaries based on status
  const inProgressSummaries = summaries.filter(s => 
    String(s.status).toLowerCase() !== 'completed'
  );
  const completedSummaries = summaries.filter(s => 
    String(s.status).toLowerCase() === 'completed'
  );
  // Get only the visible completed summaries
  const visibleCompletedSummaries = completedSummaries.slice(0, visibleCompletedCount);

  return (
    <div className="min-h-screen bg-gray-0">
      {/* Header */}
      <header className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-lg font-bold text-gray-900">WaveNotes</h1>
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
                      <SummaryCard 
                        key={summary.id} 
                        summary={summary} 
                        onDelete={handleDeleteSummary}
                        onRetry={handleRetrySummary}
                      />
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
                  <div ref={completedContainerRef} className="grid grid-cols-1 gap-4">
                    {visibleCompletedSummaries.map(summary => (
                      <SummaryCard 
                        key={summary.id} 
                        summary={summary} 
                        onDelete={handleDeleteSummary}
                        onRetry={handleRetrySummary}
                      />
                    ))}
                    
                    {/* Load more indicator */}
                    {hasMoreCompleted && (
                      <div id="load-more-trigger" className="py-4 text-center">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={loadMoreCompletedSummaries}
                          disabled={loadingMore}
                        >
                          {loadingMore ? 'Loading...' : 'Load More'}
                        </Button>
                      </div>
                    )}
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