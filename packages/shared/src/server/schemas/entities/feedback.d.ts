import { z } from 'zod';
/**
 * Zod schemas for validating feedback-related data
 */
export declare const FeedbackTypeSchema: z.ZodEnum<["general", "bug", "feature_request", "summary_quality", "summary_retry_limit"]>;
export declare const FeedbackStatusSchema: z.ZodEnum<["new", "reviewed", "implemented", "closed"]>;
export declare const BrowserInfoSchema: z.ZodObject<{
    userAgent: z.ZodOptional<z.ZodString>;
    viewport: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    userAgent: z.ZodOptional<z.ZodString>;
    viewport: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    userAgent: z.ZodOptional<z.ZodString>;
    viewport: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>;
export declare const CreateFeedbackSchema: z.ZodObject<{
    feedback_type: z.ZodEnum<["general", "bug", "feature_request", "summary_quality", "summary_retry_limit"]>;
    feedback_text: z.ZodString;
    summary_id: z.ZodOptional<z.ZodString>;
    podcast_id: z.ZodOptional<z.ZodString>;
    page_url: z.ZodOptional<z.ZodString>;
    browser_info: z.ZodOptional<z.ZodObject<{
        userAgent: z.ZodOptional<z.ZodString>;
        viewport: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        userAgent: z.ZodOptional<z.ZodString>;
        viewport: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        userAgent: z.ZodOptional<z.ZodString>;
        viewport: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    feedback_type: "general" | "bug" | "feature_request" | "summary_quality" | "summary_retry_limit";
    feedback_text: string;
    summary_id?: string | undefined;
    podcast_id?: string | undefined;
    page_url?: string | undefined;
    browser_info?: z.objectOutputType<{
        userAgent: z.ZodOptional<z.ZodString>;
        viewport: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    tags?: string[] | undefined;
}, {
    feedback_type: "general" | "bug" | "feature_request" | "summary_quality" | "summary_retry_limit";
    feedback_text: string;
    summary_id?: string | undefined;
    podcast_id?: string | undefined;
    page_url?: string | undefined;
    browser_info?: z.objectInputType<{
        userAgent: z.ZodOptional<z.ZodString>;
        viewport: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    tags?: string[] | undefined;
}>;
export declare const UpdateFeedbackSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["new", "reviewed", "implemented", "closed"]>>;
    admin_notes: z.ZodOptional<z.ZodString>;
    priority: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    status?: "new" | "reviewed" | "implemented" | "closed" | undefined;
    tags?: string[] | undefined;
    admin_notes?: string | undefined;
    priority?: number | undefined;
}, {
    status?: "new" | "reviewed" | "implemented" | "closed" | undefined;
    tags?: string[] | undefined;
    admin_notes?: string | undefined;
    priority?: number | undefined;
}>;
export type CreateFeedbackSchemaType = z.infer<typeof CreateFeedbackSchema>;
export type UpdateFeedbackSchemaType = z.infer<typeof UpdateFeedbackSchema>;
//# sourceMappingURL=feedback.d.ts.map