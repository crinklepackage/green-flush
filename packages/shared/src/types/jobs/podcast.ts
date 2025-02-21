export interface PodcastJob {
  id: string;
  url: string;
  title?: string;
  description?: string;
  userId: string;
  options?: {
    summaryType?: 'concise' | 'detailed';
    language?: string;
  };
} 