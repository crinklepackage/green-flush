import { z } from 'zod';
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
export type PodcastJob = z.infer<typeof PodcastJobSchema>;
//# sourceMappingURL=jobs.d.ts.map