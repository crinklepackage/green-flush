"use strict";
/**
 * URL utilities for handling various platform-specific URL formats
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractYouTubeVideoId = extractYouTubeVideoId;
exports.isYouTubeUrl = isYouTubeUrl;
exports.buildYouTubeUrl = buildYouTubeUrl;
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
function extractYouTubeVideoId(url) {
    try {
        // First try with URL parsing for robustness
        const urlObj = new URL(url);
        // Handle youtu.be format (shortened URLs)
        if (urlObj.hostname === 'youtu.be') {
            return urlObj.pathname.slice(1);
        }
        // Handle youtube.com formats
        if (urlObj.hostname.includes('youtube.com')) {
            // Handle /shorts/ format
            if (urlObj.pathname.startsWith('/shorts/')) {
                return urlObj.pathname.split('/')[2];
            }
            // Handle watch?v= format (standard)
            const videoId = urlObj.searchParams.get('v');
            if (videoId)
                return videoId;
            // Handle /embed/, /v/, or other path-based formats
            if (urlObj.pathname.startsWith('/embed/') ||
                urlObj.pathname.startsWith('/v/')) {
                return urlObj.pathname.split('/')[2];
            }
            // Handle ytscreeningroom format
            if (urlObj.pathname.startsWith('/ytscreeningroom')) {
                const screeningId = urlObj.searchParams.get('v');
                if (screeningId)
                    return screeningId;
            }
        }
        // Fallback to regex for any edge cases
        // This regex matches the standard 11-character YouTube video ID
        const fallbackRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(fallbackRegex);
        return match ? match[1] : null;
    }
    catch {
        // If URL parsing fails, fall back to regex
        try {
            const fallbackRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const match = url.match(fallbackRegex);
            return match ? match[1] : null;
        }
        catch {
            return null;
        }
    }
}
/**
 * Checks if a URL is a valid YouTube URL
 *
 * @param url The URL to check
 * @returns true if the URL is a valid YouTube URL, false otherwise
 */
function isYouTubeUrl(url) {
    return extractYouTubeVideoId(url) !== null;
}
/**
 * Builds a standard YouTube watch URL from a video ID
 *
 * @param videoId The YouTube video ID
 * @returns A standard YouTube watch URL
 */
function buildYouTubeUrl(videoId) {
    return `https://www.youtube.com/watch?v=${videoId}`;
}
//# sourceMappingURL=url-utils.js.map