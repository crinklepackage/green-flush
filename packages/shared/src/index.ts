// Expose ProcessingStatus as part of the public API
export { ProcessingStatus } from './server/types/status';

// Expose PodcastSchema for schema validation
export { PodcastSchema } from './server/schemas/entities/podcast';

// Expose PodcastJobSchema for job validation
export { PodcastJobSchema } from './server/schemas/jobs/podcast';

/* Updated minimal export for shared package: Only exporting required types */
/**
 * PodcastRecord - Entity representation for podcasts with status field
 * This is the default version used in most application code for type safety.
 * For database operations requiring youtube_url or transcript fields, use DatabasePodcastRecord.
 */
export type { EntityPodcastRecord as PodcastRecord } from './server/types';

/**
 * DatabasePodcastRecord - Database schema representation for podcasts
 * Contains additional fields like youtube_url, transcript, and has_transcript
 * that are stored in the database but not part of the entity representation.
 * Use this type when working directly with database operations that need these fields.
 */
export type { DatabasePodcastRecord } from './server/types';

export type { PodcastJob } from './server/types/jobs/podcast';

// Export feedback types
export type { 
  FeedbackRecord,
  FeedbackType,
  FeedbackStatus,
  CreateFeedbackParams,
  UpdateFeedbackParams
} from './server/types/entities/feedback';

// Export browser-side feedback types
export type { FeedbackRequest } from './browser/types/feedback';

// Export feedback schemas
export {
  FeedbackTypeSchema,
  FeedbackStatusSchema,
  CreateFeedbackSchema,
  UpdateFeedbackSchema
} from './server/schemas/entities/feedback';

// Re-export additional types from metadata
export type { Database, SummaryRecord, VideoMetadata, RPCPodcastResponse } from './server/types/metadata';

// Re-export DatabaseError from errors folder using its index
export { DatabaseError } from './server/errors';
export { ValidationError } from './server/errors/errors';

export * as types from './server/types';
export * as schemas from './server/schemas';
export * as errors from './server/errors';

// Re-export transcript types
export * from './server/types/transcript';

export * from './types/jobs';

// Export status transforms
export { formatStatusForDisplay, getStatusColor, mapStatusToClient } from './transforms/status';

// Export status manager utilities
export { 
  createStatusUpdatePayload, 
  createStatusHistoryEntry, 
  isValidStatus, 
  getTimestampFieldForStatus, 
  type StatusHistoryEntry 
} from './utils/status-manager';

// Export Claude prompts
export { CLAUDE_PROMPTS } from './common/prompts/claude-prompts';

// Export URL utility functions
export { 
  extractYouTubeVideoId,
  isYouTubeUrl,
  buildYouTubeUrl
} from './utils/url-utils';

// Re-export everything to match the compiled output structure
export * from './node/schemas';
export * from './browser/types';
export * from './types/errors';
export * from './types/metadata';
export * from './types/status';
export * from './types/database';

// Add missing exports that the API is trying to use
export type { 
  PodcastRecord, 
  SummaryRecord, 
  Database,
  DatabasePodcastRecord 
} from './types/database';

export type {
  FeedbackRecord,
  CreateFeedbackParams,
  UpdateFeedbackParams
} from './node/schemas';

export {
  CreateFeedbackSchema,
  UpdateFeedbackSchema
} from './node/schemas';

export type { PodcastJob } from './types/metadata';

// Export utility functions
export { 
  extractYouTubeVideoId,
  isYouTubeUrl,
  buildYouTubeUrl
} from './transforms/url';

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
  ProcessingStatus 
} from './types/status';

// Export Claude prompts
export { CLAUDE_PROMPTS } from './common/prompts/claude-prompts';

// Export errors
export * as errors from './types/errors';