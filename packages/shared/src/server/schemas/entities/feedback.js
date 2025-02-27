"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateFeedbackSchema = exports.CreateFeedbackSchema = exports.BrowserInfoSchema = exports.FeedbackStatusSchema = exports.FeedbackTypeSchema = void 0;
const zod_1 = require("zod");
/**
 * Zod schemas for validating feedback-related data
 */
exports.FeedbackTypeSchema = zod_1.z.enum([
    'general',
    'bug',
    'feature_request',
    'summary_quality',
    'summary_retry_limit'
]);
exports.FeedbackStatusSchema = zod_1.z.enum([
    'new',
    'reviewed',
    'implemented',
    'closed'
]);
exports.BrowserInfoSchema = zod_1.z.object({
    userAgent: zod_1.z.string().optional(),
    viewport: zod_1.z.string().optional(),
}).passthrough();
exports.CreateFeedbackSchema = zod_1.z.object({
    feedback_type: exports.FeedbackTypeSchema,
    feedback_text: zod_1.z.string().min(1, "Feedback cannot be empty"),
    summary_id: zod_1.z.string().uuid().optional(),
    podcast_id: zod_1.z.string().uuid().optional(),
    page_url: zod_1.z.string().optional(),
    browser_info: exports.BrowserInfoSchema.optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional()
});
exports.UpdateFeedbackSchema = zod_1.z.object({
    status: exports.FeedbackStatusSchema.optional(),
    admin_notes: zod_1.z.string().optional(),
    priority: zod_1.z.number().min(1).max(5).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional()
});
//# sourceMappingURL=feedback.js.map