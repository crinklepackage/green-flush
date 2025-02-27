// packages/server/api/src/platforms/matcher.ts
import { YouTubeService } from '../youtube/service'
import { SpotifyService } from '../spotify/service'
import { config } from '../../config/environment'

const logger = console

export class PlatformMatcher {
  private readonly spotify: SpotifyService;
  private readonly youtube: YouTubeService;

  constructor(spotify: SpotifyService, youtube: YouTubeService) {
    this.spotify = spotify;
    this.youtube = youtube;
  }

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
    // Normalize and clean up the title and show name
    const cleanTitle = this.normalizeText(spotifyMetadata.title);
    const cleanShowName = this.normalizeText(spotifyMetadata.showName);
    
    // Extract episode number if present - expanded pattern to catch more variants
    const episodeMatch = cleanTitle.match(/ep\.?\s*(\d+)|episode\s*(\d+)|#(\d+)|(\d+)\s*:/i);
    const episodeNumber = episodeMatch ? 
      (episodeMatch[1] || episodeMatch[2] || episodeMatch[3] || episodeMatch[4]) : null;
    
    // Define multiple search queries based on the Spotify metadata
    const searchQueries: string[] = [];
    
    // Prioritize episode number queries if available
    if (episodeNumber) {
      // Add episode number specific searches as the highest priority
      searchQueries.push(
        `${spotifyMetadata.showName} EP.${episodeNumber}`, // With period
        `${spotifyMetadata.showName} EP ${episodeNumber}`, // Without period
        `${spotifyMetadata.showName} episode ${episodeNumber}`,
        `${spotifyMetadata.showName} #${episodeNumber}`,
        `${spotifyMetadata.showName} ${episodeNumber}`, // Just the number
        `EP.${episodeNumber} ${spotifyMetadata.showName}`, // Episode first
        `Episode ${episodeNumber} ${spotifyMetadata.showName}`
      );
    }
    
    // Add the general search queries
    searchQueries.push(
      // Original queries
      `${spotifyMetadata.title} ${spotifyMetadata.showName} podcast`,
      `${spotifyMetadata.title} podcast`,
      `${spotifyMetadata.showName} podcast ${spotifyMetadata.title}`,
      
      // New queries with more variations
      `${spotifyMetadata.showName} ${spotifyMetadata.title}`, // Without "podcast"
      `"${spotifyMetadata.title}" "${spotifyMetadata.showName}"`, // Exact phrase matching
      spotifyMetadata.title // Just the title
    );

    // Log what we're searching for
    logger.info('Searching for podcast with metadata', { 
      title: spotifyMetadata.title,
      showName: spotifyMetadata.showName,
      episodeNumber,
      searchQueries
    });

    for (const query of searchQueries) {
      try {
        logger.info('Searching YouTube with query', { query });
        const results: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata[] = await YouTubeService.search(query);

        if (!results || results.length === 0) continue;

        // Enrich each result by fetching detailed video info
        const enrichedResults = await Promise.all(results.map(async (video: { id: string }) => {
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

        const validVideos = enrichedResults.filter((v: any): v is import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata => v !== null);
        if (validVideos.length === 0) continue;

        // Compute match scores for each enriched video
        const matches = validVideos.map((video: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata) => ({
          video,
          score: this.calculateMatchScore(video, spotifyMetadata),
          query
        }));

        // Increase the threshold from 0.4 to 0.5 for more reliable matches
        const validMatches = matches.filter((m: { score: number }) => m.score >= 0.5);

        if (validMatches.length > 0) {
          const bestMatch = validMatches.reduce(
            (prev: typeof validMatches[0], curr: typeof validMatches[0]) => 
              prev.score > curr.score ? prev : curr
          );
          const youtubeUrl = YouTubeService.buildUrl(bestMatch.video.id);
          
          // Increase high confidence threshold from 0.7 to 0.75
          if (bestMatch.score >= 0.75) {
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
    // Normalize titles for better comparison
    const normalizedVideoTitle = this.normalizeText(video.title);
    const normalizedSpotifyTitle = this.normalizeText(spotify.title);
    
    // Extract key elements that might be present in both titles
    // 1. Episode numbers - expanded pattern to catch more variants
    const videoEpMatch = normalizedVideoTitle.match(/ep\.?\s*(\d+)|episode\s*(\d+)|#(\d+)|(\d+)\s*:/i);
    const spotifyEpMatch = normalizedSpotifyTitle.match(/ep\.?\s*(\d+)|episode\s*(\d+)|#(\d+)|(\d+)\s*:/i);
    const videoEpNumber = videoEpMatch ? 
      (videoEpMatch[1] || videoEpMatch[2] || videoEpMatch[3] || videoEpMatch[4]) : null;
    const spotifyEpNumber = spotifyEpMatch ? 
      (spotifyEpMatch[1] || spotifyEpMatch[2] || spotifyEpMatch[3] || spotifyEpMatch[4]) : null;
    
    // 2. Guest names - assume first part of title could be guest name
    const possibleVideoGuest = normalizedVideoTitle.split(' - ')[0];
    const possibleSpotifyGuest = normalizedSpotifyTitle.split(' - ')[0];
    
    // Calculate direct string similarity
    const titleSimilarity = this.calculateStringSimilarity(
      normalizedVideoTitle,
      normalizedSpotifyTitle
    );
    
    // Calculate similarity bonuses
    let titleBonus = 0;
    
    // Exact episode number match is a very strong signal
    if (videoEpNumber && spotifyEpNumber && videoEpNumber === spotifyEpNumber) {
      titleBonus += 0.4;
      
      // Additional bonus if the episode number appears in a similar position in both titles
      const videoEpIndex = normalizedVideoTitle.indexOf(videoEpNumber);
      const spotifyEpIndex = normalizedSpotifyTitle.indexOf(spotifyEpNumber);
      
      if (Math.abs(videoEpIndex - spotifyEpIndex) < 10) {
        titleBonus += 0.1; // Even more bonus if positioned similarly
      }
    }
    
    // If the guest names match well, that's a good signal
    if (possibleVideoGuest && possibleSpotifyGuest) {
      const guestSimilarity = this.calculateStringSimilarity(possibleVideoGuest, possibleSpotifyGuest);
      if (guestSimilarity > 0.8) {
        titleBonus += 0.2;
      }
    }
    
    // Calculate duration score
    const videoDuration = video.duration || 0;
    const spotifyDuration = spotify.duration || 0;
    
    let durationScore = 0;
    let durationPenalty = 0;
    if (spotifyDuration > 0 && videoDuration > 0) {
      // If either duration is 0, we can't compare
      const durationDiff = Math.abs(videoDuration - spotifyDuration);
      const durationPercent = spotifyDuration > 0 ? durationDiff / spotifyDuration : 1;
      
      // More flexible duration matching - podcasts often have different durations
      // between platforms due to ads, intros, etc.
      if (durationPercent < 0.05) {  // Within 5%
        durationScore = 0.3;
      } else if (durationPercent < 0.1) {  // Within 10%
        durationScore = 0.2;
      } else if (durationPercent < 0.2) {  // Within 20%
        durationScore = 0.1;
      } else if (durationPercent > 0.5) { // More than 50% different
        // Apply a penalty for very different durations
        durationPenalty = 0.2;
      }
    }

    // Calculate channel similarity
    const normalizedChannel = this.normalizeText(video.channel);
    const normalizedShowName = this.normalizeText(spotify.showName);
    
    const channelSimilarity = this.calculateStringSimilarity(
      normalizedChannel,
      normalizedShowName
    );
    
    // Apply channel bonus if the channel includes the show name or vice versa
    let channelBonus = 0;
    
    // Increase the importance of channel matching significantly
    if (normalizedChannel === normalizedShowName) {
      // Perfect match between channel and show name
      channelBonus = 0.4;
    } else if (normalizedChannel.includes(normalizedShowName) || normalizedShowName.includes(normalizedChannel)) {
      // One contains the other (partial match)
      channelBonus = 0.2;
    } else if (channelSimilarity < 0.3) {
      // Apply penalty if channel and show name have almost nothing in common
      channelBonus = -0.3;
    }

    // Base score calculation with updated weights
    // Reduce title weight from 0.5 to 0.4, increase channel weight from 0.1 to 0.25
    const baseScore = (titleSimilarity * 0.4) + titleBonus + durationScore - durationPenalty + (channelSimilarity * 0.25) + channelBonus;

    // Incorporate viewCount into score if available, but with less weight
    let viewScore = 0;
    if (video.viewCount && video.viewCount > 0) {
      // Normalize the viewCount using log scale; cap at 0.05 (half the previous value)
      viewScore = Math.min(0.05, 0.05 * (Math.log10(video.viewCount + 1)) / 3);
    }
    
    // Additional matching criteria - check for key phrases that must match
    // If these are major signals that the content is different, apply penalties
    let contentMismatchPenalty = 0;
    
    // If titles contain specific date/year markers, they should match
    const videoYearMatch = normalizedVideoTitle.match(/\b(20\d\d)\b/);
    const spotifyYearMatch = normalizedSpotifyTitle.match(/\b(20\d\d)\b/);
    
    if (videoYearMatch && spotifyYearMatch && videoYearMatch[1] !== spotifyYearMatch[1]) {
      // Different years in title suggests different content
      contentMismatchPenalty += 0.2;
    }
    
    const totalScore = Math.max(0, baseScore + viewScore - contentMismatchPenalty);

    // Log detailed match score information
    logger.info('Match score details', {
      videoId: video.id,
      videoTitle: video.title,
      spotifyTitle: spotify.title,
      normalizedVideoTitle,
      normalizedSpotifyTitle,
      titleSimilarity,
      titleBonus,
      videoDuration,
      spotifyDuration,
      durationScore,
      durationPenalty,
      channelSimilarity,
      channelBonus,
      contentMismatchPenalty,
      viewCount: video.viewCount || 0,
      viewScore,
      baseScore,
      totalScore,
      videoEpNumber,
      spotifyEpNumber,
      possibleVideoGuest,
      possibleSpotifyGuest
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

  /**
   * Helper method to normalize text for better comparison
   */
  private static normalizeText(text: string): string {
    if (!text) return '';
    
    return text.toLowerCase()
              .replace(/[^\w\s]/g, ' ')  // Replace non-alphanumeric with spaces
              .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
              .trim();                   // Remove leading/trailing spaces
  }
  
  /**
   * Helper method to clean podcast title for search
   */
  private cleanTitleForSearch(title: string): string {
    // Remove common podcast suffixes
    let cleaned = title.replace(/ podcast$/i, '')
                        .replace(/ with .*$/i, '')  // "with host name"
                        .replace(/ ep\.? \d+$/i, '')  // "ep 123"
                        .replace(/ episode \d+$/i, '');  // "episode 123"
    
    // Remove special characters
    cleaned = cleaned.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  public async searchForPodcastEpisode(spotifyId: string): Promise<string | null> {
    try {
      logger.info('Starting match process for Spotify ID', { spotifyId });

      // Fetch podcast metadata from Spotify - using getEpisodeInfo which already exists
      const spotifyUrl = `https://open.spotify.com/episode/${spotifyId}`;
      const spotifyMetadata = await this.spotify.getEpisodeInfo(spotifyUrl);
      if (!spotifyMetadata) return null;

      // Normalize the title and show name for better search
      const normalizedTitle = PlatformMatcher.normalizeText(spotifyMetadata.title);
      const normalizedShowName = PlatformMatcher.normalizeText(spotifyMetadata.showName);
      
      // Try to extract episode number if present - expanded pattern to catch more variants
      const episodeMatch = normalizedTitle.match(/ep\.?\s*(\d+)|episode\s*(\d+)|#(\d+)|(\d+)\s*:/i);
      const episodeNumber = episodeMatch ? 
        (episodeMatch[1] || episodeMatch[2] || episodeMatch[3] || episodeMatch[4]) : null;

      // Generate multiple search queries for better results
      const searchQueries: string[] = [];
      
      // Prioritize episode number queries if available
      if (episodeNumber) {
        // Add episode number specific searches as the highest priority
        searchQueries.push(
          `${spotifyMetadata.showName} EP.${episodeNumber}`, // With period
          `${spotifyMetadata.showName} EP ${episodeNumber}`, // Without period
          `${spotifyMetadata.showName} episode ${episodeNumber}`,
          `${spotifyMetadata.showName} #${episodeNumber}`,
          `${spotifyMetadata.showName} ${episodeNumber}`, // Just the number
          `EP.${episodeNumber} ${spotifyMetadata.showName}`, // Episode first
          `Episode ${episodeNumber} ${spotifyMetadata.showName}`
        );
      }
      
      // Then add the general search queries
      searchQueries.push(
        // Primary search queries
        `${spotifyMetadata.showName} ${spotifyMetadata.title}`, // Full show name and title
        `${spotifyMetadata.title} ${spotifyMetadata.showName}`, // Title first, then show name
        
        // Try with quotes for exact phrase matching
        `"${spotifyMetadata.title}"`  // Exact title in quotes
      );
      
      // Try a more focused search without the word "podcast" if it's in the show name
      if (normalizedShowName.includes('podcast')) {
        const cleanedShowName = normalizedShowName.replace(/podcast/gi, '').trim();
        searchQueries.push(`${cleanedShowName} ${normalizedTitle}`);
      }
      
      // Log all search queries being used
      logger.info('Search queries for YouTube', { 
        spotifyId,
        queries: searchQueries,
        normalizedTitle,
        normalizedShowName,
        episodeNumber
      });
      
      // Try each search query in order
      let bestMatchAcrossQueries: { video: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata, score: number, query: string } | null = null;
      let bestScoreAcrossQueries = 0;

      for (const query of searchQueries) {
        // Search for YouTube videos based on metadata - using static method
        const results = await YouTubeService.search(query);
        
        // Fetch full video details for each search result
        const enrichedResults = await Promise.all(
          results.map(async (video: { id: string }) => {
            try {
              // Create URL from ID and use getVideoInfo instead of getVideoMetadata
              const videoUrl = YouTubeService.buildUrl(video.id);
              return await this.youtube.getVideoInfo(videoUrl);
            } catch (error) {
              logger.error('Error fetching video metadata', { videoId: video.id, error });
              return null;
            }
          })
        );
        
        // Filter out failed fetches
        const validVideos = enrichedResults.filter((v: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata | null): v is import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata => !!v);
        
        // Compute match scores for each enriched video
        const matches = validVideos.map((video: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata) => ({
          video,
          score: PlatformMatcher.calculateMatchScore(video, spotifyMetadata),
          query
        }));
        
        // Look for valid matches with this query
        // Increase the threshold from 0.4 to 0.5 for more reliable matches
        const validMatches = matches.filter((m: { score: number }) => m.score >= 0.5);
        
        if (validMatches.length > 0) {
          const bestQueryMatch = validMatches.reduce((prev: typeof validMatches[0], curr: typeof validMatches[0]) => 
            prev.score > curr.score ? prev : curr);
          
          // Track the best match across all queries
          if (bestQueryMatch.score > bestScoreAcrossQueries) {
            bestMatchAcrossQueries = bestQueryMatch;
            bestScoreAcrossQueries = bestQueryMatch.score;
          }
          
          // Increase high confidence threshold from 0.7 to 0.75
          if (bestQueryMatch.score >= 0.75) {
            const youtubeUrl = YouTubeService.buildUrl(bestQueryMatch.video.id);
            logger.info('Found high-confidence YouTube match', { 
              spotifyId: spotifyMetadata.id, 
              youtubeUrl, 
              score: bestQueryMatch.score,
              query: bestQueryMatch.query
            });
            return youtubeUrl;
          }
        }
      }
      
      // If we have a decent match from any query, return it
      // Increase the threshold from 0.4 to 0.5 for more reliable matches
      if (bestMatchAcrossQueries && bestScoreAcrossQueries >= 0.5) {
        const youtubeUrl = YouTubeService.buildUrl(bestMatchAcrossQueries.video.id);
        logger.info('Found YouTube match after trying multiple queries', { 
          spotifyId: spotifyMetadata.id, 
          youtubeUrl, 
          score: bestScoreAcrossQueries,
          query: bestMatchAcrossQueries.query
        });
        return youtubeUrl;
      }
      
      // If initial search failed, try fallback strategies
      logger.info('No good match found with initial searches, trying fallback approaches', { spotifyId });
      
      // Fallback approach 1: Try more creative search queries
      const fallbackQueries = [
        // Try with just the title but cleaned up
        this.cleanTitleForSearch(spotifyMetadata.title),
        
        // Try guest name focused search if there seems to be a guest
        normalizedTitle.includes(':') ? 
          `${spotifyMetadata.showName} ${normalizedTitle.split(':')[0].trim()}` : null,
      ].filter(Boolean) as string[];
      
      // Log fallback queries
      logger.info('Trying fallback search queries', { spotifyId, fallbackQueries });
      
      // Process fallback queries
      for (const query of fallbackQueries) {
        const results = await YouTubeService.search(query);
        
        // Fetch full video details for each search result
        const enrichedResults = await Promise.all(
          results.map(async (video: { id: string }) => {
            try {
              const videoUrl = YouTubeService.buildUrl(video.id);
              return await this.youtube.getVideoInfo(videoUrl);
            } catch (error) {
              logger.error('Error fetching video metadata', { videoId: video.id, error });
              return null;
            }
          })
        );
        
        // Filter out failed fetches
        const validVideos = enrichedResults.filter((v: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata | null): v is import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata => !!v);
        
        // Compute match scores with a more lenient approach
        const matches = validVideos.map((video: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata) => ({
          video,
          score: PlatformMatcher.calculateMatchScore(video, spotifyMetadata),
          query
        }));
        
        // Try with a higher threshold for fallback than before
        // Increase from 0.35 to 0.45
        const validMatches = matches.filter((m: { score: number }) => m.score >= 0.45);
        
        if (validMatches.length > 0) {
          const bestMatch = validMatches.reduce((prev: typeof validMatches[0], curr: typeof validMatches[0]) => 
            prev.score > curr.score ? prev : curr);
          const youtubeUrl = YouTubeService.buildUrl(bestMatch.video.id);
          
          logger.info('Found YouTube match via fallback query', { 
            spotifyId: spotifyMetadata.id, 
            youtubeUrl, 
            score: bestMatch.score,
            query: bestMatch.query
          });
          return youtubeUrl;
        }
      }
      
      // If still no match, give up
      logger.info('No YouTube match found after exhaustive search', { spotifyId });
      return null;
    } catch (error) {
      logger.error('Error in searchForPodcastEpisode', { spotifyId, error });
      return null;
    }
  }
}