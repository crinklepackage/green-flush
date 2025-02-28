// Export types from their correct locations
export { ProcessingStatus } from './server/types/status';
export { PodcastSchema } from './server/schemas/entities/podcast';
export { PodcastJobSchema } from './server/schemas/jobs/podcast';

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

// Export from jobs directory
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

// Export browser types
export * from './browser/types';

// This is to maintain exports for the API and worker
// We'll just re-export from the server locations instead
// of the old paths that don't exist anymore