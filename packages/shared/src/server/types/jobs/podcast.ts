export interface PodcastJob {
  summaryId: string;
  podcastId: string;
  url: string;
  type: 'youtube' | 'spotify';
  userId: string;
}

// Dummy runtime export to make PodcastJob available at runtime
export const PodcastJobValue = {} as PodcastJob; 