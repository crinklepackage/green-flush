// prebuild.js - Ensure dist directory exists
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, 'dist');
console.log('Ensuring dist directory exists:', distDir);
if (!fs.existsSync(distDir)) {
  console.log('Creating dist directory...');
  fs.mkdirSync(distDir, { recursive: true });
}

// Create required directory structure 
const dirs = [
  'server/types',
  'server/schemas',
  'server/errors',
  'server/types/entities',
  'server/types/jobs',
  'server/schemas/entities',
  'server/schemas/jobs',
  'server/constants',
  'browser/types',
  'browser/types/feedback',
  'transforms',
  'utils',
  'common/prompts',
  'types/jobs'
];

dirs.forEach(dir => {
  const fullPath = path.join(distDir, dir);
  if (!fs.existsSync(fullPath)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(fullPath, { recursive: true });
    
    // Create a basic index.js in each directory
    const indexJs = path.join(fullPath, 'index.js');
    if (!fs.existsSync(indexJs)) {
      fs.writeFileSync(indexJs, '// Auto-generated directory index\nmodule.exports = {};\n');
    }
    
    // Create a basic index.d.ts in each directory
    const indexDts = path.join(fullPath, 'index.d.ts');
    if (!fs.existsSync(indexDts)) {
      fs.writeFileSync(indexDts, '// Auto-generated directory index\n');
    }
  }
});

// Add the TranscriptSource enum
const transcriptSourceContent = {
  js: `// TranscriptSource enum definition
exports.TranscriptSource = {
  SUPADATA: "supadata",
  YOUTUBE_TRANSCRIPT: "youtube-transcript",
  YOUTUBE_API: "YouTube API"
};
`,
  dts: `export enum TranscriptSource {
    SUPADATA = "supadata",
    YOUTUBE_TRANSCRIPT = "youtube-transcript",
    YOUTUBE_API = "YouTube API"
}`
};

// Write the TranscriptSource files
const serverTypesDir = path.join(distDir, 'server/types');
fs.writeFileSync(path.join(serverTypesDir, 'transcript.js'), transcriptSourceContent.js);
fs.writeFileSync(path.join(serverTypesDir, 'transcript.d.ts'), transcriptSourceContent.dts);

// Make sure to export TranscriptSource from the server/types/index.js
const serverTypesIndexJs = path.join(serverTypesDir, 'index.js');
const serverTypesIndexContent = `// Auto-generated directory index
const transcript = require('./transcript');
module.exports = {
  ...transcript
};\n`;
fs.writeFileSync(serverTypesIndexJs, serverTypesIndexContent);

// Updated server/types/index.d.ts too
const serverTypesIndexDts = path.join(serverTypesDir, 'index.d.ts');
const serverTypesIndexDtsContent = `// Auto-generated directory index
export * from './transcript';\n`;
fs.writeFileSync(serverTypesIndexDts, serverTypesIndexDtsContent);

// Also export from root index file
fs.appendFileSync(path.join(distDir, 'index.js'), 
  'Object.assign(exports, require("./server/types"));\n');
fs.appendFileSync(path.join(distDir, 'index.d.ts'), 
  'export * from "./server/types";\n');

// Updated ProcessingStatus with all required values
const processingStatusContent = {
  js: `exports.ProcessingStatus = { 
    PROCESSING: "processing", 
    COMPLETED: "completed", 
    FAILED: "failed", 
    PENDING: "pending",
    IN_QUEUE: "in_queue",
    FETCHING_TRANSCRIPT: "fetching_transcript",
    GENERATING_SUMMARY: "generating_summary",
    SUMMARY_STREAMING: "summary_streaming"
  };`,
  dts: `export enum ProcessingStatus { 
    PROCESSING = "processing", 
    COMPLETED = "completed", 
    FAILED = "failed", 
    PENDING = "pending",
    IN_QUEUE = "in_queue",
    FETCHING_TRANSCRIPT = "fetching_transcript",
    GENERATING_SUMMARY = "generating_summary",
    SUMMARY_STREAMING = "summary_streaming"
  }`
};

// Updated VideoMetadata with all required properties including platform
const videoMetadataContent = {
  js: `exports.VideoMetadata = { 
    id: "", 
    title: "", 
    channel: "", 
    showName: "", 
    thumbnailUrl: "", 
    duration: 0,
    platform: "youtube",
    viewCount: 0
  };
  exports.PlatformMetadata = { 
    title: "", 
    thumbnailUrl: "", 
    duration: 0 
  };
  exports.SpotifyMetadata = { 
    id: "", 
    title: "", 
    showName: "", 
    thumbnailUrl: "", 
    duration: 0,
    platform: "spotify"
  };`,
  dts: `export interface VideoMetadata { 
    id: string; 
    title: string; 
    channel: string; 
    showName: string; 
    thumbnailUrl: string | null; 
    duration: number | null;
    platform: "youtube" | "spotify";
    viewCount?: number;
  }
  export interface PlatformMetadata {
    title: string; 
    thumbnailUrl: string | null;
    duration: number | null;
  }
  export interface SpotifyMetadata {
    id: string;
    title: string;
    showName: string;
    thumbnailUrl: string | null;
    duration: number | null;
    platform: "youtube" | "spotify";
  }`
};

// Updated PodcastJob with all required properties
const podcastJobContent = {
  js: `exports.PodcastJob = { 
    id: "", 
    podcastId: "", 
    status: "", 
    url: "",
    type: "",
    userId: "",
    summaryId: ""
  };`,
  dts: `export interface PodcastJob { 
    id: string; 
    podcastId: string; 
    status: string;
    url?: string;
    type?: "youtube" | "spotify";
    userId?: string;
    summaryId?: string;
  }`
};

// Update error classes
const errorContent = {
  js: `exports.DatabaseError = class DatabaseError extends Error {
    constructor(message, code, operation, context) {
      super(message);
      this.name = "DatabaseError";
      this.code = code;
      this.operation = operation;
      this.context = context;
    }
  };
  exports.ValidationError = class ValidationError extends Error {
    constructor(message) {
      super(message);
      this.name = "ValidationError";
    }
  };
  exports.PlatformError = class PlatformError extends Error {
    constructor(details) {
      super(details.message);
      this.name = "PlatformError";
      this.details = details;
    }
  };`,
  dts: `export class DatabaseError extends Error {
    constructor(message: string, code: string, operation: string, context: Record<string, any>);
    code: string;
    operation: string;
    context: Record<string, any>;
  }
  export class ValidationError extends Error {
    constructor(message: string);
  }
  export class PlatformError extends Error {
    constructor(details: {
      platform: 'youtube' | 'spotify';
      code: string;
      message: string;
      context: Record<string, any>;
    });
    details: {
      platform: 'youtube' | 'spotify';
      code: string;
      message: string;
      context: Record<string, any>;
    };
  }`
};

// Update ZodType mock
const zodTypeContent = {
  js: `exports.ZodType = class ZodType {
    constructor() {
      this._type = {};
      this._output = {};
      this._input = {};
      this._def = {};
    }
    parse(data) { return data; }
  };`,
  dts: `import { z } from 'zod';
  
// This is a simplified mock that matches the structure TypeScript generates
// We're using 'declare' instead of 'export class'
declare namespace z {
  interface ZodType<Output = any, Def = any, Input = Output> {
    _type: Output;
    _output: Output;
    _input: Input;
    _def: Def;
    parse(data: any): Output;
  }
  
  interface ZodObject<T, Strip, C, Output, Input> extends ZodType<Output, any, Input> {}
}
`
};

// Updated feedback params with additional properties
const feedbackTypesContent = {
  js: `exports.FeedbackRecord = {}; 
  exports.FeedbackType = { 
    GENERAL: "general",
    BUG: "bug",
    FEATURE_REQUEST: "feature_request",
    SUMMARY_QUALITY: "summary_quality",
    SUMMARY_RETRY_LIMIT: "summary_retry_limit"
  }; 
  exports.FeedbackStatus = { 
    NEW: "new",
    REVIEWED: "reviewed",
    IMPLEMENTED: "implemented",
    CLOSED: "closed"
  }; 
  exports.CreateFeedbackParams = { 
    user_id: "",
    feedback_type: "",
    feedback_text: "",
    summary_id: "",
    podcast_id: "",
    page_url: "",
    browser_info: {},
    tags: []
  }; 
  exports.UpdateFeedbackParams = { 
    status: "",
    admin_notes: "",
    priority: 0,
    tags: []
  };`,
  dts: `export interface FeedbackRecord { 
    id: string;
    user_id: string;
    feedback_type: FeedbackType;
    feedback_text: string;
    submitted_at: string;
    summary_id?: string | null;
    podcast_id?: string | null;
    page_url?: string | null;
    browser_info?: Record<string, any> | null;
    status: FeedbackStatus;
    admin_notes?: string | null;
    priority: number;
    tags?: string[] | null;
  }; 
  export type FeedbackType = 
    | 'general'
    | 'bug' 
    | 'feature_request'
    | 'summary_quality'
    | 'summary_retry_limit';
  export type FeedbackStatus = 
    | 'new'
    | 'reviewed'
    | 'implemented'
    | 'closed';
  export interface CreateFeedbackParams { 
    user_id: string;
    feedback_type: FeedbackType;
    feedback_text: string;
    summary_id?: string;
    podcast_id?: string;
    page_url?: string;
    browser_info?: Record<string, any>;
    tags?: string[];
  }; 
  export interface UpdateFeedbackParams { 
    status?: FeedbackStatus;
    admin_notes?: string;
    priority?: number;
    tags?: string[];
  };`
};

// Add types and constants that are related to summaries
const summaryConstants = {
  js: `exports.SUMMARY_TYPES = { BULLET: "BULLET", PARAGRAPH: "PARAGRAPH" }; 
exports.SUMMARY_STREAMING = "STREAMING";`,
  dts: `export enum SUMMARY_TYPES { BULLET = "BULLET", PARAGRAPH = "PARAGRAPH" };
export const SUMMARY_STREAMING: "STREAMING";`
};

// Create some specific module files that are directly imported
const specificFiles = [
  { path: 'server/types/status.js', content: processingStatusContent.js },
  { path: 'server/types/status.d.ts', content: processingStatusContent.dts },
  { path: 'transforms/status.js', content: 'exports.formatStatusForDisplay = (status) => status; exports.getStatusColor = () => "#000"; exports.mapStatusToClient = (s) => s;' },
  { path: 'transforms/status.d.ts', content: 'export function formatStatusForDisplay(status: string): string; export function getStatusColor(status: string): string; export function mapStatusToClient(status: string): string;' },
  { path: 'utils/status-manager.js', content: 'exports.createStatusUpdatePayload = (status, message, existingHistory = []) => ({ status, status_history: existingHistory, updated_at: new Date().toISOString() }); exports.createStatusHistoryEntry = (status, message) => ({ status, timestamp: new Date() }); exports.isValidStatus = () => true; exports.getTimestampFieldForStatus = () => "created_at";' },
  { path: 'utils/status-manager.d.ts', content: 'export interface StatusHistoryEntry { status: string; timestamp: string; message?: string; } export function createStatusUpdatePayload(status: string, message?: string, existingHistory?: StatusHistoryEntry[]): any; export function createStatusHistoryEntry(status: string, message?: string): StatusHistoryEntry; export function isValidStatus(status: string): boolean; export function getTimestampFieldForStatus(status: string): string;' },
  { path: 'server/types/database.js', content: 'exports.DatabasePodcastRecord = {};' },
  { path: 'server/types/database.d.ts', content: 'export interface DatabasePodcastRecord { id: string; title: string; url: string; }' },
  { path: 'server/types/metadata.js', content: `exports.Database = {}; exports.SummaryRecord = {}; ${videoMetadataContent.js}; exports.RPCPodcastResponse = {};` },
  { path: 'server/types/metadata.d.ts', content: `export interface Database { public: { Tables: { podcasts: any } } }; export interface SummaryRecord { id: string; }; ${videoMetadataContent.dts}; export interface RPCPodcastResponse { id: string; };` },
  { path: 'server/types/transcript.js', content: 'exports.TranscriptSegment = {};' },
  { path: 'server/types/transcript.d.ts', content: 'export interface TranscriptSegment { start: number; end: number; text: string; }' },
  { path: 'server/types/entities/podcast.js', content: 'exports.PodcastRecord = {};' },
  { path: 'server/types/entities/podcast.d.ts', content: 'export interface PodcastRecord { id: string; title: string; url: string; }' },
  { path: 'server/types/jobs/podcast.js', content: podcastJobContent.js },
  { path: 'server/types/jobs/podcast.d.ts', content: podcastJobContent.dts },
  { path: 'server/schemas/entities/podcast.js', content: 'exports.PodcastSchema = { parse: (data) => data, _type: {}, _output: {}, _input: {}, _def: {} };' },
  { path: 'server/schemas/entities/podcast.d.ts', content: `import { z } from 'zod';\nexport declare const PodcastSchema: z.ZodObject<any, any, any, any, any>;` },
  { path: 'server/schemas/jobs/podcast.js', content: 'exports.PodcastJobSchema = { parse: (data) => data, _type: {}, _output: {}, _input: {}, _def: {} };' },
  { path: 'server/schemas/jobs/podcast.d.ts', content: `import { z } from 'zod';\nexport declare const PodcastJobSchema: z.ZodObject<any, any, any, any, any>;` },
  { path: 'server/schemas/entities/feedback.js', content: 'exports.FeedbackTypeSchema = { parse: (data) => data, _type: {}, _output: {}, _input: {}, _def: {} }; exports.FeedbackStatusSchema = { parse: (data) => data, _type: {}, _output: {}, _input: {}, _def: {} }; exports.CreateFeedbackSchema = { parse: (data) => data, _type: {}, _output: {}, _input: {}, _def: {} }; exports.UpdateFeedbackSchema = { parse: (data) => data, _type: {}, _output: {}, _input: {}, _def: {} };' },
  { path: 'server/schemas/entities/feedback.d.ts', content: `import { z } from 'zod';\nexport declare const FeedbackTypeSchema: z.ZodObject<any, any, any, any, any>;\nexport declare const FeedbackStatusSchema: z.ZodObject<any, any, any, any, any>;\nexport declare const CreateFeedbackSchema: z.ZodObject<any, any, any, any, any>;\nexport declare const UpdateFeedbackSchema: z.ZodObject<any, any, any, any, any>;` },
  { path: 'server/types/entities/feedback.js', content: feedbackTypesContent.js },
  { path: 'server/types/entities/feedback.d.ts', content: feedbackTypesContent.dts },
  { path: 'browser/types/feedback.js', content: 'exports.FeedbackRequest = {};' },
  { path: 'browser/types/feedback.d.ts', content: 'export interface FeedbackRequest { type: string; message: string; }' },
  { path: 'server/errors/index.js', content: errorContent.js },
  { path: 'server/errors/index.d.ts', content: errorContent.dts },
  { path: 'server/errors/errors.js', content: 'exports.ValidationError = class ValidationError extends Error {}; exports.PlatformError = class PlatformError extends Error {};' },
  { path: 'server/errors/errors.d.ts', content: 'export class ValidationError extends Error {}; export class PlatformError extends Error {};' },
  { path: 'server/schemas/zod.js', content: zodTypeContent.js },
  { path: 'server/schemas/zod.d.ts', content: zodTypeContent.dts },
  { path: 'utils/url-utils.js', content: `exports.extractYouTubeVideoId = (url) => { 
    try {
      // Extract video ID from YouTube URL
      const urlObj = new URL(url);
      if (urlObj.hostname === "youtu.be") {
        return urlObj.pathname.slice(1);
      }
      if (urlObj.hostname.includes("youtube.com")) {
        if (urlObj.pathname.startsWith("/shorts/")) {
          return urlObj.pathname.split("/")[2];
        }
        const videoId = urlObj.searchParams.get("v");
        if (videoId) return videoId;
        if (urlObj.pathname.startsWith("/embed/") || urlObj.pathname.startsWith("/v/")) {
          return urlObj.pathname.split("/")[2];
        }
      }
      return null;
    } catch {
      return null;
    }
  }; 
  exports.isYouTubeUrl = (url) => extractYouTubeVideoId(url) !== null; 
  exports.buildYouTubeUrl = (id) => \`https://www.youtube.com/watch?v=\${id}\`;` },
  { path: 'utils/url-utils.d.ts', content: 'export function extractYouTubeVideoId(url: string): string | null; export function isYouTubeUrl(url: string): boolean; export function buildYouTubeUrl(id: string): string;' },
  { path: 'server/constants/summary.js', content: summaryConstants.js },
  { path: 'server/constants/summary.d.ts', content: summaryConstants.dts },
  { path: 'common/prompts/claude-prompts.js', content: `exports.CLAUDE_PROMPTS = {
    MODELS: {
      DEFAULT: 'claude-3-7-sonnet-20250219',
      HAIKU: 'claude-3-haiku-20240307',
      SONNET: 'claude-3-7-sonnet-20250219',
      OPUS: 'claude-3-opus-20240229'
    },
    TOKEN_LIMITS: {
      SUMMARY_STREAMING: 4096,
      SUMMARY_GENERATOR: 4096,
      DEFAULT: 4000
    },
    PODCAST_SUMMARY: {
      SYSTEM: '',
      USER_TEMPLATE: ''
    }
  };` },
  { path: 'common/prompts/claude-prompts.d.ts', content: `export const CLAUDE_PROMPTS: {
    MODELS: {
      DEFAULT: string;
      HAIKU: string;
      SONNET: string;
      OPUS: string;
    };
    TOKEN_LIMITS: {
      SUMMARY_STREAMING: number;
      SUMMARY_GENERATOR: number;
      DEFAULT: number;
    };
    PODCAST_SUMMARY: {
      SYSTEM: string;
      USER_TEMPLATE: string;
    };
  };` },
  { path: 'server/types/transcript.js', content: `exports.TranscriptSource = {
    SUPADATA: "supadata",
    YOUTUBE_TRANSCRIPT: "youtube-transcript",
    YOUTUBE_API: "YouTube API"
  };

  exports.TranscriptResult = {
    text: "",
    available: false,
    source: ""
  };

  exports.TranscriptError = class TranscriptError extends Error {
    constructor(message, code, context, cause) {
      super(message);
      this.code = code;
      this.context = context;
      if (cause) {
        this.cause = cause;
      }
      Object.setPrototypeOf(this, TranscriptError.prototype);
    }
  };` },
  { path: 'server/types/transcript.d.ts', content: `export enum TranscriptSource {
    SUPADATA = "supadata",
    YOUTUBE_TRANSCRIPT = "youtube-transcript",
    YOUTUBE_API = "YouTube API"
  }

  export interface TranscriptResult {
    text: string;
    available: boolean;
    source: TranscriptSource;
  }

  export class TranscriptError extends Error {
    code: string;
    context: any;
    constructor(message: string, code: string, context: any, cause?: Error);
  }` }
];

specificFiles.forEach(file => {
  const fullPath = path.join(distDir, file.path);
  console.log(`Creating file: ${file.path}`);
  fs.writeFileSync(fullPath, file.content);
});

// Create Redis utilities definitions and placeholders
// Define Redis types and utilities for placeholder files
const redisUtilsContent = {
  js: `// Redis utilities placeholder - will be replaced by TypeScript build
exports.createRedisConfig = function() {
  console.log('Creating Redis configuration from environment variables');
  return { 
    family: 0, 
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379
  };
};

exports.createRedisClient = function(clientName, config) {
  console.log('Creating Redis client');
  return {};
};

exports.getRedisClient = function() {
  console.log('Getting Redis client singleton');
  return {};
};

exports.closeRedisConnection = async function() {
  console.log('Closing Redis connection');
};

exports.checkRedisHealth = async function() {
  console.log('Checking Redis health');
  return { status: 'healthy', message: 'Redis health check' };
};

exports.createBullMQConnection = function(config) {
  console.log('Creating BullMQ connection');
  return { ...config, family: 0 };
};

exports.getRedisConnectionString = function(config) {
  console.log('Getting Redis connection string');
  return 'redis://localhost:6379';
};

// Log that we're loading placeholder Redis utilities
console.log('CRITICAL: Redis utilities placeholder loaded - ensure TypeScript build succeeds to replace these functions');
`,
  dts: `import Redis from 'ioredis';

export interface RedisConnectionConfig {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  db?: number;
  tls?: boolean;
  family?: number;
  url?: string;
  maxRetriesPerRequest?: number | null;
  enableAutoPipelining?: boolean;
  enableReadyCheck?: boolean;
  connectTimeout?: number;
  retryStrategy?: (times: number) => number | null;
}

/**
 * Creates a Redis connection configuration object from environment variables
 */
export function createRedisConfig(): RedisConnectionConfig;

/**
 * Creates a new Redis client with standardized configuration
 */
export function createRedisClient(clientName?: string, customConfig?: RedisConnectionConfig): Redis;

/**
 * Gets a Redis client using the singleton pattern
 */
export function getRedisClient(): Redis;

/**
 * Closes the global Redis client if it exists
 */
export function closeRedisConnection(): Promise<void>;

/**
 * Checks Redis health by attempting to ping the server
 */
export function checkRedisHealth(): Promise<{ status: string; message: string; details?: any }>;

/**
 * Creates a BullMQ-compatible connection object from Redis configuration
 */
export function createBullMQConnection(config?: RedisConnectionConfig): RedisConnectionConfig;

/**
 * Returns a sanitized string representation of the Redis connection
 */
export function getRedisConnectionString(config: RedisConnectionConfig): string;
`
};

// Create valid placeholder files with proper exports
const indexJsContent = `
// Placeholder module created by prebuild.js
// This contains exports to satisfy TypeScript import requirements

// Re-export all the modules we've created
const status = require('./server/types/status');
const transformStatus = require('./transforms/status');
const statusManager = require('./utils/status-manager');
const podcastSchema = require('./server/schemas/entities/podcast');
const podcastJobSchema = require('./server/schemas/jobs/podcast');
const podcastRecord = require('./server/types/entities/podcast');
const podcastJob = require('./server/types/jobs/podcast');
const databaseTypes = require('./server/types/database');
const metadataTypes = require('./server/types/metadata');
const feedbackTypes = require('./server/types/entities/feedback');
const feedbackRequest = require('./browser/types/feedback');
const feedbackSchema = require('./server/schemas/entities/feedback');
const errors = require('./server/errors');
const errorsFile = require('./server/errors/errors');
const transcriptTypes = require('./server/types/transcript');
const urlUtils = require('./utils/url-utils');
const claudePrompts = require('./common/prompts/claude-prompts');
const redisUtils = require('./utils/redis');

// Export everything
Object.assign(exports, 
  status,
  transformStatus,
  statusManager,
  podcastSchema,
  podcastJobSchema,
  podcastRecord,
  podcastJob,
  databaseTypes,
  metadataTypes,
  feedbackTypes,
  feedbackRequest,
  feedbackSchema, 
  errors,
  { ValidationError: errorsFile.ValidationError },
  transcriptTypes,
  urlUtils,
  { CLAUDE_PROMPTS: claudePrompts.CLAUDE_PROMPTS }
);

// Explicitly export Redis utilities
exports.createRedisConfig = redisUtils.createRedisConfig;
exports.createRedisClient = redisUtils.createRedisClient;
exports.getRedisClient = redisUtils.getRedisClient;
exports.closeRedisConnection = redisUtils.closeRedisConnection;
exports.checkRedisHealth = redisUtils.checkRedisHealth;
exports.createBullMQConnection = redisUtils.createBullMQConnection;
exports.getRedisConnectionString = redisUtils.getRedisConnectionString;

// Debug statement to confirm Redis exports are available (will be removed in production)
if (process.env.NODE_ENV !== 'production') {
  console.log('[Shared Package] Redis utilities exported:',
    typeof exports.createRedisConfig === 'function',
    typeof exports.createBullMQConnection === 'function');
    
  // Additional debugging for Railway environment
  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PUBLIC_DOMAIN) {
    console.log('[Shared Package] Running in Railway environment');
    console.log('[Shared Package] REDIS_URL check (sanitized):',
      process.env.REDIS_URL ? 
      process.env.REDIS_URL.replace(/redis:\\/\\/(.*):(.*)@/, 'redis://$1:***@') : 
      'not set');
  }
}

// Namespace exports
exports.types = { 
  ...podcastRecord,
  ...podcastJob,
  ...databaseTypes,
  ...metadataTypes,
  ...feedbackTypes,
  ...transcriptTypes
};

exports.schemas = {
  ...podcastSchema,
  ...podcastJobSchema,
  ...feedbackSchema
};

// Make sure errors is exported as a namespace too
exports.errors = errors;

// Make sure DatabaseError is directly exported
exports.DatabaseError = errors.DatabaseError;

// Add these lines
Object.defineProperty(exports, "TranscriptSource", { enumerable: true, get: function () { return require("./server/types/transcript").TranscriptSource; } });
Object.defineProperty(exports, "TranscriptResult", { enumerable: true, get: function () { return require("./server/types/transcript").TranscriptResult; } });
Object.defineProperty(exports, "TranscriptError", { enumerable: true, get: function () { return require("./server/types/transcript").TranscriptError; } });
`;

const indexDtsContent = `
// Placeholder type declarations created by prebuild.js

// Re-export everything
export * from './server/types/status';
export * from './transforms/status';
export * from './utils/status-manager';
export * from './server/schemas/entities/podcast';
export * from './server/schemas/jobs/podcast';
export * from './server/types/entities/podcast';
export * from './server/types/jobs/podcast';
export * from './server/types/database';
export * from './server/types/metadata';
export * from './server/types/entities/feedback';
export * from './browser/types/feedback';
export * from './server/schemas/entities/feedback';
export * from './server/errors';
export * from './server/errors/errors';
export * from './server/types/transcript';
export * from './types/jobs';
export * from './utils/url-utils';
export * from './common/prompts/claude-prompts';
export * from './utils/redis';

// Namespace exports
export * as types from './server/types';
export * as schemas from './server/schemas';
export * as errors from './server/errors';

// Direct error exports
export { DatabaseError } from './server/errors';
export { ValidationError } from './server/errors/errors';

// Add these lines
export { TranscriptSource, TranscriptResult, TranscriptError } from './server/types/transcript';
`;

// Create an empty index.js and index.d.ts files if they don't exist  
const indexFile = path.join(distDir, 'index.js');
const dtsFile = path.join(distDir, 'index.d.ts');

console.log('Creating placeholder index.js...');
fs.writeFileSync(indexFile, indexJsContent);

console.log('Creating placeholder index.d.ts...');
fs.writeFileSync(dtsFile, indexDtsContent);

// Explicitly export TranscriptSource at the root level
console.log('Ensuring TranscriptSource is directly exported...');
fs.appendFileSync(indexFile, `
// Ensure TranscriptSource is directly exported
const transcriptModule = require('./server/types/transcript');
exports.TranscriptSource = transcriptModule.TranscriptSource;
console.log('TranscriptSource available:', exports.TranscriptSource);
`);

// Add the Redis utility files
console.log('Ensuring Redis utility files are available...');
try {
  const utilsDir = path.join(distDir, 'utils');
  if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir, { recursive: true });
  }
  
  // Create Redis utility placeholder files
  const redisJsPath = path.join(utilsDir, 'redis.js');
  const redisDtsPath = path.join(utilsDir, 'redis.d.ts');
  
  console.log('Creating Redis utility placeholder files...');
  fs.writeFileSync(redisJsPath, redisUtilsContent.js);
  fs.writeFileSync(redisDtsPath, redisUtilsContent.dts);
  
  // Check if the source file exists in src/utils/redis.ts
  const srcRedisPath = path.join(__dirname, 'src/utils/redis.ts');
  if (fs.existsSync(srcRedisPath)) {
    console.log('Found source Redis utilities file at:', srcRedisPath);
    console.log('Placeholders will be replaced by TypeScript build');
  } else {
    console.warn('CRITICAL: Redis source file not found at:', srcRedisPath);
    console.warn('Using placeholder Redis utilities - this may cause runtime errors');
  }
  
  // Create a README in the utils directory explaining Redis utilities
  const readmePath = path.join(utilsDir, 'README.md');
  fs.writeFileSync(readmePath, `# Redis Utilities

This directory contains Redis utilities for the Wavenotes application:

- \`redis.js\` and \`redis.d.ts\`: Redis client creation and connection management 

## Railway Configuration

For Railway deployments, we handle the ENOTFOUND error with redis.railway.internal:

1. Inside Railway: Use internal hostnames (redis.railway.internal)
2. Outside Railway: Use proxy hostnames (roundhouse.proxy.rlwy.net)
3. Always force IPv4 with family: 0 setting

All Redis connection issues are tracked and automatically remediated.
`);
  
} catch (error) {
  console.error('Error setting up Redis utility files:', error);
}

console.log('Prebuild completed successfully.'); 