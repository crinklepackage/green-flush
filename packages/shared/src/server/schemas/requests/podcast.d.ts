import { z } from 'zod';
export declare const PodcastRequestSchema: z.ZodObject<{
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
export type PodcastRequest = z.infer<typeof PodcastRequestSchema>;
//# sourceMappingURL=podcast.d.ts.map