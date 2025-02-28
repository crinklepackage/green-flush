import { z } from 'zod';
export declare const SummarySchema: z.ZodObject<{
    id: z.ZodString;
    podcastId: z.ZodString;
    content: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["IN_QUEUE", "FETCHING_TRANSCRIPT", "GENERATING_SUMMARY", "COMPLETED", "FAILED"]>;
}, "strip", z.ZodTypeAny, {
    status: "IN_QUEUE" | "FETCHING_TRANSCRIPT" | "GENERATING_SUMMARY" | "COMPLETED" | "FAILED";
    id: string;
    podcastId: string;
    content: string | null;
}, {
    status: "IN_QUEUE" | "FETCHING_TRANSCRIPT" | "GENERATING_SUMMARY" | "COMPLETED" | "FAILED";
    id: string;
    podcastId: string;
    content: string | null;
}>;
export type Summary = z.infer<typeof SummarySchema>;
//# sourceMappingURL=summary.d.ts.map