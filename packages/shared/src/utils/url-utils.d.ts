/**
 * URL utilities for handling various platform-specific URL formats
 */
/**
 * Extracts a YouTube video ID from various YouTube URL formats
 *
 * Supported formats:
 * - Standard watch URLs: youtube.com/watch?v=VIDEO_ID
 * - Shortened URLs: youtu.be/VIDEO_ID
 * - Embed URLs: youtube.com/embed/VIDEO_ID
 * - YouTube Shorts: youtube.com/shorts/VIDEO_ID
 * - Legacy URLs: youtube.com/v/VIDEO_ID
 * - Screening room URLs: youtube.com/ytscreeningroom?v=VIDEO_ID
 *
 * @param url The YouTube URL to extract the video ID from
 * @returns The video ID if successfully extracted, null otherwise
 */
export declare function extractYouTubeVideoId(url: string): string | null;
/**
 * Checks if a URL is a valid YouTube URL
 *
 * @param url The URL to check
 * @returns true if the URL is a valid YouTube URL, false otherwise
 */
export declare function isYouTubeUrl(url: string): boolean;
/**
 * Builds a standard YouTube watch URL from a video ID
 *
 * @param videoId The YouTube video ID
 * @returns A standard YouTube watch URL
 */
export declare function buildYouTubeUrl(videoId: string): string;
//# sourceMappingURL=url-utils.d.ts.map