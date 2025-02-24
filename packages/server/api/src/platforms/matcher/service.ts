// packages/server/api/src/platforms/matcher.ts
import { YouTubeService } from '../youtube/service'
import { SpotifyService } from '../spotify/service'
import { config } from '../../config/environment'

const logger = console

export class PlatformMatcher {
  static async findYouTubeMatch(spotifyUrl: string, spotifyService: import('../spotify/service').SpotifyService): Promise<string | null> {
    try {
      // Use the passed-in instance to extract episode ID and fetch metadata
      const spotifyId = spotifyService.getEpisodeId(spotifyUrl);
      const spotifyMetadata = await spotifyService.getEpisodeInfo(spotifyUrl);
      
      if (!spotifyMetadata) {
        logger.error('Could not fetch Spotify metadata', { spotifyUrl });
        return null;
      }

      // 2. Search for matching YouTube video, pass original spotifyUrl
      const youtubeUrl = await this.searchForPodcastEpisode(spotifyUrl, spotifyMetadata);
      
      if (!youtubeUrl) {
        logger.warn('No matching YouTube video found', { 
          spotifyUrl,
          spotifyTitle: spotifyMetadata.title 
        });
        return null;
      }

      logger.info('Found matching YouTube video', { 
        spotifyUrl, 
        youtubeUrl 
      });

      return youtubeUrl;
    } catch (error) {
      logger.error('Error in platform matching', {
        spotifyUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private static async searchForPodcastEpisode(
    spotifyUrl: string,
    spotifyMetadata: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata
  ): Promise<string | null> {
    // Define multiple search queries based on the Spotify metadata
    const searchQueries = [
      `${spotifyMetadata.title} ${spotifyMetadata.showName} podcast`,
      `${spotifyMetadata.title} podcast`,
      `${spotifyMetadata.showName} podcast ${spotifyMetadata.title}`
    ];

    for (const query of searchQueries) {
      try {
        logger.info('Searching YouTube with query', { query });
        const results: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata[] = await YouTubeService.search(query);

        if (!results || results.length === 0) continue;

        // Enrich each result by fetching detailed video info
        const enrichedResults = await Promise.all(results.map(async (video) => {
          try {
            const videoUrl = YouTubeService.buildUrl(video.id);
            const youtubeService = new YouTubeService(config.YOUTUBE_API_KEY);
            const details = await youtubeService.getVideoInfo(videoUrl);
            return details;
          } catch (err) {
            logger.error('Error enriching video result', { videoId: video.id, error: err });
            return null;
          }
        }));

        const validVideos = enrichedResults.filter((v: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata | null): v is import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata => v !== null);
        if (validVideos.length === 0) continue;

        // Compute match scores for each enriched video
        const matches = validVideos.map(video => ({
          video,
          score: this.calculateMatchScore(video, spotifyMetadata),
          query
        }));

        const validMatches = matches.filter(m => m.score >= 0.5);

        if (validMatches.length > 0) {
          const bestMatch = validMatches.reduce((prev, curr) => prev.score > curr.score ? prev : curr);
          const youtubeUrl = YouTubeService.buildUrl(bestMatch.video.id);
          if (bestMatch.score >= 0.8) {
            logger.info('Found high-confidence YouTube match', { 
              spotifyId: spotifyMetadata.id, 
              youtubeUrl, 
              score: bestMatch.score,
              query: bestMatch.query
            });
            return youtubeUrl;
          } else {
            logger.info('Found YouTube match', { 
              spotifyId: spotifyMetadata.id, 
              youtubeUrl, 
              score: bestMatch.score,
              query: bestMatch.query
            });
            return youtubeUrl;
          }
        }
      } catch (error) {
        logger.error('Error during search query', { query, error });
        continue;
      }
    }

    // Log failed search attempt before returning null
    await this.logFailedSearch(spotifyUrl, spotifyMetadata);
    logger.warn('No matching YouTube video found for Spotify metadata', { spotifyId: spotifyMetadata.id });
    return null;
  }

  private static calculateMatchScore(
    video: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata, 
    spotify: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata
  ): number {
    // Calculate title similarity
    const titleSimilarity = this.calculateStringSimilarity(
      video.title.toLowerCase(),
      spotify.title.toLowerCase()
    );

    // Calculate duration values
    const videoDuration = video.duration || 0;
    const spotifyDuration = spotify.duration || 0;
    const durationDiff = Math.abs(videoDuration - spotifyDuration);
    const durationScore = spotifyDuration > 0 && durationDiff < (spotifyDuration * 0.05) ? 0.3 : 0;

    // Calculate channel similarity
    const channelSimilarity = this.calculateStringSimilarity(
      video.channel.toLowerCase(),
      spotify.showName.toLowerCase()
    );

    // Base score calculation
    const baseScore = (titleSimilarity * 0.6) + durationScore + (channelSimilarity * 0.1);

    // Incorporate viewCount into score if available
    let viewScore = 0;
    if (video.viewCount && video.viewCount > 0) {
      // Normalize the viewCount using log scale; cap at 0.1
      viewScore = Math.min(0.1, 0.1 * (Math.log10(video.viewCount + 1)) / 3);
    }
    const totalScore = baseScore + viewScore;

    // Log detailed match score information
    logger.info('Match score details', {
      videoId: video.id,
      videoTitle: video.title,
      spotifyTitle: spotify.title,
      titleSimilarity,
      videoDuration,
      spotifyDuration,
      durationDiff,
      durationScore,
      channelSimilarity,
      viewCount: video.viewCount || 0,
      viewScore,
      baseScore,
      totalScore
    });

    return totalScore;
  }

  private static calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const longerLength = longer.length;
    if (longerLength === 0) return 1;
    const distance = this.levenshteinDistance(longer, shorter);
    return (longerLength - distance) / longerLength;
  }

  private static levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  // New method to log failed YouTube search attempts for a Spotify link
  private static async logFailedSearch(
    spotifyUrl: string,
    spotifyMetadata: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata
  ): Promise<void> {
    logger.warn('Logging failed YouTube search for Spotify link', { spotifyUrl, spotifyMetadata });
    // Optionally, persist this failed search to the database or analytics system if needed
  }
}