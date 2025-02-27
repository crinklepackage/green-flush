"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PodcastJobSchema = void 0;
const zod_1 = require("zod");
exports.PodcastJobSchema = zod_1.z.object({
    summaryId: zod_1.z.string().uuid(),
    podcastId: zod_1.z.string().uuid(),
    url: zod_1.z.string().url(),
    type: zod_1.z.enum(['youtube', 'spotify']),
    userId: zod_1.z.string().uuid()
});
//# sourceMappingURL=jobs.js.map