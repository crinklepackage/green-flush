import { ProcessingStatus } from './status';
import { PodcastRecord } from './entities/podcast';
export interface VideoMetadata {
    id: string;
    title: string;
    channel: string;
    showName: string;
    thumbnailUrl: string | null;
    duration: number | null;
    platform: 'youtube' | 'spotify';
    viewCount?: number;
}
export interface RPCPodcastResponse {
    podcast_id: string;
    summary_id: string;
}
export interface Database {
    public: {
        Tables: {
            podcasts: {
                Row: PodcastRecord;
                Insert: Omit<PodcastRecord, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<PodcastRecord, 'id'>>;
            };
            summaries: {
                Row: SummaryRecord;
                Insert: Omit<SummaryRecord, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<SummaryRecord, 'id'>>;
            };
        };
        Functions: {
            create_podcast_with_summary: {
                Args: {
                    podcast_data: Json;
                    summary_id: string;
                    user_id: string;
                };
                Returns: RPCPodcastResponse;
            };
        };
    };
}
export interface SummaryRecord {
    id: string;
    podcast_id: string;
    status: ProcessingStatus;
    summary_text: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
    completed_at: string | null;
    failed_at: string | null;
}
export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
//# sourceMappingURL=metadata.d.ts.map