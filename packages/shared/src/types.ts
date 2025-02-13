export interface PodcastInput {
  url: string;
  platform: 'spotify' | 'youtube';
}

export interface Summary {
  id: string;
  status: 'pending' | 'processing' | 'completed';
  content?: string;
}
