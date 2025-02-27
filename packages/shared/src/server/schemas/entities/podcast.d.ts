import { z } from 'zod';
export declare const PodcastSchema: z.ZodObject<{
    url: z.ZodString;
    summaryId: z.ZodString;
    platform: z.ZodOptional<z.ZodEnum<["youtube", "spotify"]>>;
}, "strip", z.ZodTypeAny, {
    url: string;
    summaryId: string;
    platform?: "youtube" | "spotify" | undefined;
}, {
    url: string;
    summaryId: string;
    platform?: "youtube" | "spotify" | undefined;
}>;
export declare const PodcastJobSchema: z.ZodObject<{
    summaryId: z.ZodString;
    podcastId: z.ZodString;
    url: z.ZodString;
    type: z.ZodEnum<["youtube", "spotify"]>;
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "youtube" | "spotify";
    podcastId: string;
    url: string;
    summaryId: string;
    userId: string;
}, {
    type: "youtube" | "spotify";
    podcastId: string;
    url: string;
    summaryId: string;
    userId: string;
}>;
export type PodcastRequest = z.infer<typeof PodcastSchema>;
export type PodcastJob = z.infer<typeof PodcastJobSchema>;
//# sourceMappingURL=podcast.d.ts.map