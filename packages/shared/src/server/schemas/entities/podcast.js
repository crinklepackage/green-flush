"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PodcastJobSchema = exports.PodcastSchema = void 0;
const zod_1 = require("zod");
// API Request Validation
exports.PodcastSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    summaryId: zod_1.z.string().uuid(),
    platform: zod_1.z.enum(['youtube', 'spotify']).optional()
});
// Job Validation
exports.PodcastJobSchema = zod_1.z.object({
    summaryId: zod_1.z.string().uuid(),
    podcastId: zod_1.z.string().uuid(),
    url: zod_1.z.string().url(),
    type: zod_1.z.enum(['youtube', 'spotify']),
    userId: zod_1.z.string().uuid()
});
//# sourceMappingURL=podcast.js.map