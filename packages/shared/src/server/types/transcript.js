"use strict";
/*
 * Transcript types used across the application.
 *
 * TranscriptResult represents the outcome of transcript fetching functions.
 * It contains the fetched transcript text, a flag indicating availability, and the source of the transcript.
 *
 * TranscriptSource is an enum that lists the various strategies used to retrieve transcripts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptError = exports.TranscriptSource = void 0;
var TranscriptSource;
(function (TranscriptSource) {
    TranscriptSource["SUPADATA"] = "supadata";
    TranscriptSource["YOUTUBE_TRANSCRIPT"] = "youtube-transcript";
    TranscriptSource["YOUTUBE_API"] = "YouTube API";
})(TranscriptSource || (exports.TranscriptSource = TranscriptSource = {}));
class TranscriptError extends Error {
    constructor(message, code, context, cause) {
        super(message);
        this.code = code;
        this.context = context;
        if (cause) {
            // Assign cause to the error, if desired (ES2022 supports error.cause)
            this.cause = cause;
        }
        Object.setPrototypeOf(this, TranscriptError.prototype);
    }
}
exports.TranscriptError = TranscriptError;
//# sourceMappingURL=transcript.js.map