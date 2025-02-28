export declare enum TranscriptSource {
    SUPADATA = "supadata",
    YOUTUBE_TRANSCRIPT = "youtube-transcript",
    YOUTUBE_API = "YouTube API"
}
export interface TranscriptResult {
    text: string;
    available: boolean;
    source: TranscriptSource;
}
export declare class TranscriptError extends Error {
    code: string;
    context: any;
    constructor(message: string, code: string, context: any, cause?: Error);
}
//# sourceMappingURL=transcript.d.ts.map