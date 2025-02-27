// Status types and utilities
export { ProcessingStatus } from './server/types/status';
export { 
  formatStatusForDisplay, 
  getStatusColor, 
  mapStatusToClient 
} from './transforms/status';
export { 
  createStatusUpdatePayload, 
  createStatusHistoryEntry, 
  isValidStatus, 
  getTimestampFieldForStatus, 
  type StatusHistoryEntry 
} from './utils/status-manager';

// Podcast types and schemas
export { PodcastSchema } from './server/schemas/entities/podcast';
export { PodcastJobSchema } from './server/schemas/jobs/podcast';

// Entity exports (app-facing records)
export type { PodcastRecord } from './server/types/entities/podcast';
export type { PodcastJob } from './server/types/jobs/podcast';

// Database exports (database schema records)
export type { DatabasePodcastRecord } from './server/types/database';
export type { Database, SummaryRecord, VideoMetadata, RPCPodcastResponse } from './server/types/metadata';

// Feedback types and schemas
export type { 
  FeedbackRecord,
  FeedbackType,
  FeedbackStatus,
  CreateFeedbackParams,
  UpdateFeedbackParams
} from './server/types/entities/feedback';
export type { FeedbackRequest } from './browser/types/feedback';
export {
  FeedbackTypeSchema,
  FeedbackStatusSchema,
  CreateFeedbackSchema,
  UpdateFeedbackSchema
} from './server/schemas/entities/feedback';

// Errors
export { DatabaseError } from './server/errors';
export { ValidationError } from './server/errors/errors';
export * as errors from './server/errors';

// Re-export transcript types
export * from './server/types/transcript';

// Jobs
export * from './types/jobs';

// URL utilities
export { 
  extractYouTubeVideoId,
  isYouTubeUrl,
  buildYouTubeUrl
} from './utils/url-utils';

// Claude prompts
export { CLAUDE_PROMPTS } from './common/prompts/claude-prompts';

// Namespace exports (use with caution - these might re-export duplicates)
export * as types from './server/types';
export * as schemas from './server/schemas';