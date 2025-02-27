"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PodcastRequestSchema = void 0;
const zod_1 = require("zod");
exports.PodcastRequestSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    summaryId: zod_1.z.string().uuid(),
    platform: zod_1.z.enum(['youtube', 'spotify']).optional()
});
//# sourceMappingURL=podcast.js.map