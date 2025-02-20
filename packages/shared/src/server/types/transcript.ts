/*
 * Transcript types used across the application.
 *
 * TranscriptResult represents the outcome of transcript fetching functions.
 * It contains the fetched transcript text, a flag indicating availability, and the source of the transcript.
 *
 * TranscriptSource is an enum that lists the various strategies used to retrieve transcripts.
 */

export enum TranscriptSource {
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
  constructor(message: string, code: string, context: any, cause?: Error) {
    super(message);
    this.code = code;
    this.context = context;
    if (cause) {
      // Assign cause to the error, if desired (ES2022 supports error.cause)
      (this as any).cause = cause;
    }
    Object.setPrototypeOf(this, TranscriptError.prototype);
  }
} 