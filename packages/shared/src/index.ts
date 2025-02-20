// Expose ProcessingStatus as part of the public API
export { ProcessingStatus } from './server/types/status';

// Expose PodcastSchema for schema validation
export { PodcastSchema } from './server/schemas/entities/podcast';

// Expose PodcastJobSchema for job validation
export { PodcastJobSchema } from './server/schemas/jobs/podcast';

/* Updated minimal export for shared package: Only exporting required types */
export * from './server/types/entities/podcast';
//export { PodcastJobValue as PodcastJob } from './server/types/jobs/podcast';
export type { PodcastJob } from './server/types/jobs/podcast';

// Re-export additional types from metadata
export { Database, SummaryRecord, VideoMetadata, RPCPodcastResponse } from './server/types/metadata';

// Re-export DatabaseError from errors folder using its index
export { DatabaseError } from './server/errors';
export { ValidationError } from './server/errors/errors';

export * as types from './server/types';
export * as schemas from './server/schemas';
export * as errors from './server/errors';

// Re-export transcript types
export * from './server/types/transcript';