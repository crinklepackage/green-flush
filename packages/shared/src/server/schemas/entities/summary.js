"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummarySchema = void 0;
// node/schemas/summary.ts
const zod_1 = require("zod");
exports.SummarySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    podcastId: zod_1.z.string().uuid(),
    content: zod_1.z.string().nullable(),
    status: zod_1.z.enum([
        'IN_QUEUE',
        'FETCHING_TRANSCRIPT',
        'GENERATING_SUMMARY',
        'COMPLETED',
        'FAILED'
    ])
});
//# sourceMappingURL=summary.js.map