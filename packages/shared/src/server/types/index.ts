/*
 * Aggregator for all server type exports.
 * Explicit re-exports to avoid duplicate member conflicts.
 */

/**
 * Server-side types
 */
// Replace wildcard exports with specific named exports to avoid conflicts
export * from './jobs';
export * from './status';

/**
 * EntityPodcastRecord - The entity representation of a podcast
 * Contains the business entity fields including status, but not database-specific fields
 * like transcript or youtube_url.
 */
export type { PodcastRecord as EntityPodcastRecord } from './entities/podcast';
export * from './entities/feedback';

// Export from metadata.ts
export type { Database, Json, SummaryRecord } from './metadata';

/**
 * DatabasePodcastRecord - The database schema representation of a podcast
 * Contains additional fields used in the database like transcript and youtube_url,
 * but does not include the status field used in the entity representation.
 * Use this type when working with direct database operations.
 */
export { DatabasePodcastRecord } from './database';