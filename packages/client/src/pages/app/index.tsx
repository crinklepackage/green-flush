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
import { showToast } from '../../lib/toast'

// Define type for summary with podcast details
interface SummaryWithPodcast {
  id: string;
  status: string;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  creator_id?: string | null;
  podcast?: {
    title: string;
    show_name: string;
    thumbnail_url?: string | null;
    url?: string | null;
    youtube_url?: string | null;
    platform?: string;
  };
  isRetrying: boolean;
}

// Add this interface at the top of the file with other interfaces
interface SummaryRecord {
  id: string;
  status: string;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  podcast_id?: string;
  creator_id?: string | null;
}

// SummaryCard Component
const SummaryCard = ({ summary, onDelete, onRetry, allSummaries = [], currentUserId }: { 
  summary: SummaryWithPodcast;
  onDelete: (id: string) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
  allSummaries?: SummaryWithPodcast[];
  currentUserId?: string;
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [imgError, setImgError] = useState(false);
  const router = useRouter();
  
  // Debug logging
  useEffect(() => {
    console.log('SummaryCard received:', {
      id: summary.id,
      status: summary.status,
      podcast: summary.podcast || 'No podcast data',
      hasThumbnail: summary.podcast?.thumbnail_url ? true : false,
      isRetrying: summary.isRetrying,
      creator: summary.creator_id || 'Unknown'
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
    
    // Prevent event bubbling
    e.nativeEvent.stopImmediatePropagation();
    
    // Call the retry function provided by the parent component
    // Wrap in a try/catch to prevent any errors from bubbling up to React
    try {
      await onRetry(summary.id);
    } catch (error) {
      // Log the error but DON'T rethrow it - error is already handled in parent component
      console.error('Error caught in SummaryCard handleRetry:', error);
      // Error is already handled in the parent's onRetry function, so we don't need
      // to do anything else here
    }
  };
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Always prevent default to stop automatic navigation
    e.preventDefault();

    // Don't navigate if we're retrying or this is a failed summary
    if (summary.isRetrying || isFailed) {
      return;
    }

    // Look for the most advanced summary for this podcast
    if (summary.podcast?.id && allSummaries.length > 0) {
      // Get all summaries for this podcast
      const relatedSummaries = allSummaries.filter(s => 
        s.podcast?.id === summary.podcast?.id &&
        String(s.status).toLowerCase() !== 'failed'
      );
      
      if (relatedSummaries.length > 1) {
        console.log('Found multiple summaries for podcast:', summary.podcast.id);
        
        // Find the most advanced one based on status priority
        const statusPriority = {
          'completed': 5,
          'generating_summary': 4, 
          'fetching_transcript': 3,
          'in_queue': 2,
          'failed': 1
        };
        
        // Sort by priority (highest first)
        relatedSummaries.sort((a, b) => {
          const aPriority = statusPriority[a.status.toLowerCase() as keyof typeof statusPriority] || 0;
          const bPriority = statusPriority[b.status.toLowerCase() as keyof typeof statusPriority] || 0;
          return bPriority - aPriority;
        });
        
        // Use the most advanced summary's ID
        const bestSummary = relatedSummaries[0];
        console.log(`Navigating to best summary ${bestSummary.id} with status ${bestSummary.status} instead of ${summary.id}`);
        
        // Navigate to the best summary
        router.push(`/app/${bestSummary.id}`);
        return;
      }
    }

    // If no related summaries found or only one exists, navigate to this summary
    router.push(`/app/${summary.id}`);
  };
  
  // Force buttons to be visible for any failed items regardless of exact status
  const isFailed = String(summary.status).toLowerCase() === 'failed';
  const isInQueue = String(summary.status).toLowerCase() === 'in_queue';
  const isCreator = summary.creator_id === currentUserId;
  
  const showDeleteButton = isFailed || isInQueue;
  const showRetryButton = isFailed && !summary.isRetrying; // Don't show retry button while retrying
  
  // Get appropriate button text based on whether user is creator
  const deleteButtonText = isDeleting ? 'Processing...' : (isCreator ? 'Delete' : 'Remove');
  
  console.log('Button visibility check:', {
    status: summary.status,
    statusLower: String(summary.status).toLowerCase(),
    isFailed,
    isInQueue,
    isRetrying: summary.isRetrying,
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
            <StatusBadge status={summary.status} className="ml-0" />
          </div>
        </div>
        
        <div className="mt-3 flex gap-4">
          {showDeleteButton && (
            <Button 
              variant="ghost" 
              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-0 h-auto" 
              onClick={handleDelete}
              disabled={isDeleting || summary.isRetrying}
            >
              {deleteButtonText}
            </Button>
          )}
          
          {showRetryButton && (
            <div onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-0 h-auto" 
                onClick={handleRetry}
                disabled={summary.isRetrying}
              >
                  {summary.isRetrying ? (
                    <span className="flex items-center gap-1">
                      <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Retrying...
                    </span>
                  ) : 'Retry'}
                </Button>
            </div>
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
  // Add a ref to track previous completed count for pagination optimization
  const prevCompletedCountRef = useRef<number>(0);

  // Add a ref to track when deduplication is in progress to prevent loops
  const deduplicatingRef = useRef(false);

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
    
    // Track summaries we've already handled optimistically
    // This will help prevent double-processing
    const optimisticSummaryIds = new Set<string>();
    
    // Also track podcast_ids to prevent duplicates showing for the same podcast
    const podcastToSummaryMap = new Map<string, string>();
    
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
            
            if (newSummary?.id) {
              console.log('INSERT event for summary ID:', newSummary.id, 'with podcast_id:', newSummary.podcast_id);
              
              // Check if we already have this summary in our state
              if (summaries.some(s => s.id === newSummary.id)) {
                console.log('Ignoring INSERT for summary we already have:', newSummary.id);
                return;
              }
              
              // Check if this is a summary we've handled optimistically
              if (optimisticSummaryIds.has(newSummary.id)) {
                console.log('Ignoring INSERT for optimistically handled summary:', newSummary.id);
                // Remove from the set so we don't accumulate old IDs
                optimisticSummaryIds.delete(newSummary.id);
                return;
              }
              
              // For truly new summaries from other sources, do a targeted fetch
              // instead of fetching everything
              fetchSingleSummary(newSummary.id);
            }
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
    
    // Expose optimisticSummaryIds to our component scope
    // This way we can add IDs when we create optimistic updates
    (window as any).__optimisticSummaryIds = optimisticSummaryIds;
    
    // Cleanup subscription and timer on unmount
    return () => {
      supabase.removeChannel(subscription);
      delete (window as any).__optimisticSummaryIds;
    };
  }, [user]);

  // New function to fetch a single summary without loading states
  const fetchSingleSummary = async (summaryId: string) => {
    if (!user || !user.id) return;
    
    try {
      // Define the type for our nested query response
      type SupabaseSingleSummaryResponse = {
        summary_id: string;
        summaries: {
          id: string;
          status: string;
          error_message: string | null;
          created_at: string;
          updated_at: string;
          creator_id: string | null;
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

      // Get just this specific summary with its podcast data
      const { data: userSummaryWithPodcast, error: summaryError } = await supabase
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
            creator_id,
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
        .eq('summary_id', summaryId)
        .single();

      if (summaryError || !userSummaryWithPodcast) {
        console.error('Error fetching single summary:', summaryError);
        return;
      }

      // Transform to match our expected format
      const summary = userSummaryWithPodcast.summaries;
      if (!summary) return;

      const newSummaryItem: SummaryWithPodcast = {
        id: summary.id,
        status: summary.status,
        error_message: summary.error_message,
        created_at: summary.created_at,
        updated_at: summary.updated_at,
        creator_id: summary.creator_id,
        podcast: summary.podcast || {
          title: summary.status === 'in_queue' || 
                 summary.status === 'fetching_transcript' || 
                 summary.status === 'generating_summary' 
                 ? 'Processing Podcast' : 'Unknown Podcast',
          show_name: 'Please wait...',
        },
        isRetrying: false
      };

      // Update summaries with extra aggressive deduplication
      setSummaries(prev => {
        // First, we need to see if this new summary has podcast data
        const podcastId = summary.podcast?.id;
        
        if (podcastId) {
          // First, check if we already have this exact summary
          const exactSummaryIndex = prev.findIndex(s => s.id === summary.id);
          if (exactSummaryIndex !== -1) {
            // We already have this exact summary, just update its status
            console.log(`Updating existing summary ${summary.id} status to ${summary.status}`);
            const updatedSummaries = [...prev];
            updatedSummaries[exactSummaryIndex] = {
              ...updatedSummaries[exactSummaryIndex],
              status: summary.status,
              error_message: summary.error_message,
              updated_at: summary.updated_at
            };
            
            // Deduplicate after the update
            return removeDuplicatePodcasts(updatedSummaries);
          }
          
          // Second, look for any existing summary in the "in progress" section that has the same podcast
          const existingInProgressIndices = prev
            .map((s, index) => s.podcast?.id === podcastId && 
                 String(s.status).toLowerCase() !== 'completed' ? index : -1)
            .filter(index => index !== -1);
          
          if (existingInProgressIndices.length > 0) {
            // We found duplicates! Log them
            console.log('Detected duplicate podcasts:', {
              existingIndices: existingInProgressIndices,
              newId: newSummaryItem.id,
              podcastId
            });
            
            // Make a copy of the array
            const updatedSummaries = [...prev];
            
            // Status priority to decide which one to keep
            const statusPriority = {
              'completed': 5,
              'generating_summary': 4, 
              'fetching_transcript': 3,
              'in_queue': 2,
              'failed': 1
            };
            
            // Get priority of new summary
            const newPriority = 
              statusPriority[newSummaryItem.status.toLowerCase() as keyof typeof statusPriority] || 0;
              
            // Check if our new summary has higher priority than any existing ones
            let shouldKeepNew = true;
            for (const index of existingInProgressIndices) {
              const existingStatus = prev[index].status.toLowerCase();
              const existingPriority = statusPriority[existingStatus as keyof typeof statusPriority] || 0;
              
              // If existing has higher or equal priority, we might not need this new one
              if (existingPriority >= newPriority) {
                shouldKeepNew = false;
                break;
              }
            }
            
            if (shouldKeepNew) {
              // Add the new one and remove all others
              return removeDuplicatePodcasts([
                newSummaryItem, 
                ...prev.filter((_, index) => !existingInProgressIndices.includes(index))
              ]);
            } else {
              // Don't add this new one, but ensure we only have one of the existing ones
              return removeDuplicatePodcasts(prev);
            }
          }
        }
        
        // No duplicate found, add as new and still deduplicate result
        return removeDuplicatePodcasts([newSummaryItem, ...prev]);
      });
      
    } catch (err) {
      console.error('Error in fetchSingleSummary:', err);
    }
  };

  // Fetch summaries when user changes
  useEffect(() => {
    if (user && user.id) {
      fetchSummaries();
    }
  }, [user]);
  
  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    // Instead of automatically resetting on every summaries change,
    // only reset when there's a significant change in the completed section
    const completedSummaries = summaries.filter(s => 
      String(s.status).toLowerCase() === 'completed'
    );
    
    // Only reset pagination if the number of completed summaries has changed significantly
    // This prevents resets when we're just updating in-progress summaries
    const currentCompletedCount = completedSummaries.length;
    
    // Using the ref that's already declared at the component level
    if (Math.abs(currentCompletedCount - prevCompletedCountRef.current) > 1) {
      // Only reset if the count has changed by more than 1 (significant change)
      console.log('Resetting pagination due to significant change in completed summaries count');
      setVisibleCompletedCount(10);
      setHasMoreCompleted(currentCompletedCount > 10);
      prevCompletedCountRef.current = currentCompletedCount;
    } else {
      // Just update the hasMore flag based on current state
      setHasMoreCompleted(currentCompletedCount > visibleCompletedCount);
      prevCompletedCountRef.current = currentCompletedCount;
    }
  }, [summaries, visibleCompletedCount]);
  
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
    
    // Only show loading state if we don't already have data
    // This prevents the UI from "flashing" during refreshes
    if (summaries.length === 0) {
      setLoadingSummaries(true);
    }
    
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
          creator_id: string | null;
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
            creator_id,
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
            creator_id: summary.creator_id,
            podcast: summary.podcast || {
              title: summary.status === 'in_queue' || 
                     summary.status === 'fetching_transcript' || 
                     summary.status === 'generating_summary' 
                     ? 'Processing Podcast' : 'Unknown Podcast',
              show_name: 'Please wait...',
            },
            isRetrying: false
          } as SummaryWithPodcast;
        })
        .filter((item): item is SummaryWithPodcast => item !== null);
      
      // Preserve isRetrying state for any summaries that are currently retrying
      const updatedData = transformedData.map(newSummary => {
        const existingSummary = summaries.find(s => s.id === newSummary.id);
        if (existingSummary && existingSummary.isRetrying) {
          return { ...newSummary, isRetrying: true };
        }
        return newSummary;
      });
      
      // Deduplicate summaries for the same podcast in the "in progress" section
      // We'll keep the most recent summary for each podcast
      const deduplicated = removeDuplicatePodcasts(updatedData);
      
      setSummaries(deduplicated);
    } catch (err) {
      console.error('Error in summaries fetch flow:', err);
      setSummaries([]);
    } finally {
      setLoadingSummaries(false);
    }
  };
  
  // After all useEffect hooks, add a new effect to ensure we never have duplicates
  useEffect(() => {
    // Skip if already deduplicating to prevent infinite loops
    if (deduplicatingRef.current) {
      deduplicatingRef.current = false;
      return;
    }
    
    // This effect will run after every summaries state update
    // to ensure we never have duplicates in the "in progress" section
    if (summaries.length > 0) {
      const deduplicated = removeDuplicatePodcasts(summaries);
      
      // Only update state if we actually removed duplicates
      if (deduplicated.length < summaries.length) {
        console.log(`Auto-deduplication effect removed ${summaries.length - deduplicated.length} duplicate summaries`);
        // Set flag to indicate we're doing a deduplication update
        deduplicatingRef.current = true;
        setSummaries(deduplicated);
      }
    }
  }, [summaries]);
  
  // Improve the removeDuplicatePodcasts function to be more aggressive
  const removeDuplicatePodcasts = (summaryList: SummaryWithPodcast[]): SummaryWithPodcast[] => {
    // Keep track of podcast IDs we've seen and the best summary ID to keep for each
    const inProgressMap = new Map<string, string>();
    const inProgress: SummaryWithPodcast[] = [];
    const completed: SummaryWithPodcast[] = [];
    
    // First pass - separate completed and in-progress, and track the best summary for each podcast
    summaryList.forEach(summary => {
      if (String(summary.status).toLowerCase() === 'completed') {
        // Keep all completed summaries
        completed.push(summary);
      } else {
        // For in-progress, track by podcast ID
        const podcastId = summary.podcast?.id;
        
        if (podcastId) {
          // If we already have a summary for this podcast
          if (inProgressMap.has(podcastId)) {
            // Choose which one to keep based on the status priority
            const existingSummaryId = inProgressMap.get(podcastId)!;
            const existingSummary = summaryList.find(s => s.id === existingSummaryId)!;
            
            // Prefer to keep the most advanced status summary
            const statusPriority = {
              'generating_summary': 4, 
              'fetching_transcript': 3,
              'in_queue': 2,
              'failed': 1
            };
            
            const existingPriority = statusPriority[existingSummary.status.toLowerCase() as keyof typeof statusPriority] || 0;
            const currentPriority = statusPriority[summary.status.toLowerCase() as keyof typeof statusPriority] || 0;
            
            // If this summary has higher priority, replace it in our map
            if (currentPriority > existingPriority) {
              inProgressMap.set(podcastId, summary.id);
              console.log(`Preferring ${summary.status} over ${existingSummary.status} for podcast ${podcastId}`);
            }
          } else {
            // First time seeing this podcast, just track it
            inProgressMap.set(podcastId, summary.id);
          }
        } else {
          // If there's no podcast ID, keep it anyway (rare case)
          inProgress.push(summary);
        }
      }
    });
    
    // Second pass - collect all in-progress summaries we want to keep
    summaryList.forEach(summary => {
      if (String(summary.status).toLowerCase() !== 'completed') {
        const podcastId = summary.podcast?.id;
        
        // If this is the summary we decided to keep for this podcast, add it
        if (podcastId && inProgressMap.get(podcastId) === summary.id) {
          inProgress.push(summary);
        }
      }
    });
    
    // Sort in-progress summaries by timestamp (newest first)
    inProgress.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    
    // Log what we're doing
    const numRemoved = summaryList.length - (inProgress.length + completed.length);
    if (numRemoved > 0) {
      console.log(`De-duplication: ${summaryList.length} total → ${inProgress.length + completed.length} (removed ${numRemoved} duplicates)`);
    }
    
    // Combine and return, with in-progress summaries first
    return [...inProgress, ...completed];
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
      
      // Register this ID as something we've handled optimistically
      // This prevents the Supabase subscription from triggering a refetch
      if ((window as any).__optimisticSummaryIds && data.id) {
        (window as any).__optimisticSummaryIds.add(data.id);
      }
      
      // Clear the form
      setUrl('')
      
      // Add an optimistic summary entry to the UI
      // This ensures a card appears immediately
      const optimisticSummary: SummaryWithPodcast = {
        id: data.id,
        status: 'in_queue',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator_id: user?.id,
        podcast: {
          title: 'Processing Podcast',
          show_name: 'Please wait...',
        },
        isRetrying: false
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

  // Updated handleDeleteSummary function
  const handleDeleteSummary = async (id: string) => {
    try {
      // Find the summary to check if the current user is the creator
      const summaryToDelete = summaries.find(s => s.id === id);
      
      // We'll send the action type to the API based on whether the user is the creator
      // This assumes our API supports a query parameter to specify the action
      const isCreator = summaryToDelete?.creator_id === user?.id;
      const actionType = isCreator ? 'delete' : 'remove';
      
      console.log(`Deleting summary ${id}, user is ${isCreator ? 'creator' : 'not creator'}, action: ${actionType}`);
      
      const response = await fetch(`/api/summaries/${id}?action=${actionType}`, {
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
      
      // Remove the deleted summary from state immediately
      // The supabase subscription will handle it if needed
      setSummaries(prevSummaries => prevSummaries.filter(s => s.id !== id));
      
      // Show a toast notification with appropriate message
      const successMessage = isCreator ? 
        'Summary deleted successfully' : 
        'Summary removed from your list';
      showToast.success(successMessage);
      
    } catch (error) {
      console.error('Error deleting summary:', error);
      showToast.error('Failed to delete summary');
      throw error;
    }
  };

  // Add handleRetrySummary function
  const handleRetrySummary = async (id: string) => {
    // Show loading state on this summary
    setSummaries(prevSummaries => prevSummaries.map(s => 
      s.id === id ? { ...s, isRetrying: true } : s
    ));
    
    try {
      // Attempt the retry operation
      let response;
      try {
        response = await fetch(`/api/summaries/${id}/retry`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
      } catch (fetchError) {
        console.error('Network error during retry:', fetchError);
        showToast.error('Network error. Please check your connection and try again.');
        // Reset retrying state
        setSummaries(prevSummaries => prevSummaries.map(s => 
          s.id === id ? { ...s, isRetrying: false } : s
        ));
        return; // Exit early
      }
      
      // Get the response text for debugging
      let responseText = '';
      try {
        responseText = await response.text();
        console.log(`Retry response for summary ${id}:`, responseText);
      } catch (textError) {
        console.error('Error reading response text:', textError);
        showToast.error('Error reading server response');
        // Reset retrying state
        setSummaries(prevSummaries => prevSummaries.map(s => 
          s.id === id ? { ...s, isRetrying: false } : s
        ));
        return; // Exit early
      }
      
      // Parse JSON if possible, otherwise use empty object
      let data = {};
      try {
        if (responseText) {
          data = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        
        // Handle expired Spotify link error specially
        if (responseText && responseText.includes('podcast has expired')) {
          showToast.error('The link to this podcast has expired. Copy it from Spotify and try again.');
          // Reset retrying state
          setSummaries(prevSummaries => prevSummaries.map(s => 
            s.id === id ? { ...s, isRetrying: false } : s
          ));
          return; // Exit early
        }
        
        // Generic parsing error
        showToast.error('Server returned an invalid response');
        // Reset retrying state
        setSummaries(prevSummaries => prevSummaries.map(s => 
          s.id === id ? { ...s, isRetrying: false } : s
        ));
        return; // Exit early
      }
      
      // Check for error responses
      if (!response.ok) {
        const errorMessage = data.error || 'Failed to retry summary';
        console.error('Error response from server:', data);
        showToast.error(errorMessage);
        // Reset retrying state
        setSummaries(prevSummaries => prevSummaries.map(s => 
          s.id === id ? { ...s, isRetrying: false } : s
        ));
        return; // Exit early
      }
      
      // If we got here, the retry was successful
      const newSummaryId = data.newSummaryId;
      console.log(`Summary retry successful. New summary ID: ${newSummaryId || 'unknown'}`);
      
      // Get the podcast data from the old summary to use in the optimistic update
      const oldSummary = summaries.find(s => s.id === id);
      
      if (oldSummary && newSummaryId) {
        // Register this ID as something we've handled optimistically
        // This prevents the Supabase subscription from triggering a refetch
        if ((window as any).__optimisticSummaryIds) {
          console.log('Registering optimistic summary ID:', newSummaryId);
          (window as any).__optimisticSummaryIds.add(newSummaryId);
        }
        
        // Store the podcast ID if available to prevent duplicates
        const podcastId = oldSummary.podcast?.id;
        if (podcastId) {
          console.log('Tracking podcast ID for summary:', { podcastId, summaryId: newSummaryId });
        }
        
        // Create an optimistic entry for the new summary with podcast data from the old one
        const optimisticNewSummary: SummaryWithPodcast = {
          id: newSummaryId,
          status: 'in_queue',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          creator_id: user?.id,
          podcast: oldSummary.podcast, // Copy podcast data from the old summary
          isRetrying: false
        };
        
        // Update the summaries state in a single operation:
        // 1. Remove the old summary
        // 2. Add the new optimistic summary at the top
        setSummaries(prevSummaries => {
          // First remove any other summaries that might be for the same podcast and are in progress
          const podcastId = oldSummary.podcast?.id;
          let filtered = prevSummaries.filter(s => s.id !== id);
          
          if (podcastId) {
            // Check if there are any other summaries for this podcast that are in progress
            const duplicateIndex = filtered.findIndex(s => 
              s.podcast?.id === podcastId && 
              String(s.status).toLowerCase() !== 'completed'
            );
            
            if (duplicateIndex !== -1) {
              console.log('Found duplicate in handleRetry, removing:', filtered[duplicateIndex].id);
              // Remove the duplicate
              filtered = filtered.filter((_, index) => index !== duplicateIndex);
            }
          }
          
          // Add the new optimistic summary at the top
          return [optimisticNewSummary, ...filtered];
        });
        
        // Show success message
        showToast.success('Summary successfully queued for retry');
      } else {
        // If we don't have the necessary data, fall back to a full refresh
        // Show success message first
        showToast.success('Summary successfully queued for retry');
        
        // Remove the old summary
        setSummaries(prevSummaries => prevSummaries.filter(s => s.id !== id));
        
        // Fetch the updated list (try to avoid this path)
        fetchSummaries();
      }
    } catch (error) {
      // Catch-all for any unhandled errors
      console.error('Unexpected error in handleRetrySummary:', error);
      
      // Display generic error message
      showToast.error('An unexpected error occurred');
      
      // Reset retrying state
      setSummaries(prevSummaries => prevSummaries.map(s => 
        s.id === id ? { ...s, isRetrying: false } : s
      ));
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
                        allSummaries={summaries}
                        currentUserId={user?.id}
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
                        allSummaries={summaries}
                        currentUserId={user?.id}
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