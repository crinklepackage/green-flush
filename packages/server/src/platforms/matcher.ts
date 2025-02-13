// packages/server/api/src/platforms/matcher.ts
import { SpotifyMetadata, VideoMetadata } from '@wavenotes/shared'
import { logger } from '../lib/logger'
import { SpotifyService } from './spotify'
import { YouTubeService } from '../../worker/src/platforms/youtube'

export class PlatformMatcher {
  static async findYouTubeMatch(spotifyUrl: string): Promise<string | null> {
    try {
      // 1. Get Spotify metadata
      const spotifyId = SpotifyService.extractEpisodeId(spotifyUrl)
      const spotifyMetadata = await SpotifyService.getEpisodeInfo(spotifyId)
      
      if (!spotifyMetadata) {
        logger.error('Could not fetch Spotify metadata', { spotifyUrl })
        return null
      }

      // 2. Search for matching YouTube video
      const youtubeUrl = await this.searchForPodcastEpisode(spotifyMetadata)
      
      if (!youtubeUrl) {
        logger.warn('No matching YouTube video found', { 
          spotifyUrl,
          spotifyTitle: spotifyMetadata.title 
        })
        return null
      }

      logger.info('Found matching YouTube video', { 
        spotifyUrl, 
        youtubeUrl 
      })

      return youtubeUrl
    } catch (error) {
      logger.error('Error in platform matching', {
        spotifyUrl,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  private static async searchForPodcastEpisode(
    spotifyMetadata: SpotifyMetadata
  ): Promise<string | null> {
    const searchQuery = this.buildSearchQuery(spotifyMetadata)
    const results = await YouTubeService.search(searchQuery)

    // Filter and score results
    const scoredResults = results.map(video => ({
      video,
      score: this.calculateMatchScore(video, spotifyMetadata)
    }))

    // Sort by score and get best match
    const bestMatch = scoredResults
      .sort((a, b) => b.score - a.score)
      .find(result => result.score > 0.8)

    return bestMatch ? YouTubeService.buildUrl(bestMatch.video.id) : null
  }

  private static buildSearchQuery(metadata: SpotifyMetadata): string {
    return `${metadata.title} ${metadata.showName} podcast`
  }

  private static calculateMatchScore(
    video: VideoMetadata, 
    spotify: SpotifyMetadata
  ): number {
    let score = 0

    // Title similarity
    const titleSimilarity = this.calculateStringSimilarity(
      video.title.toLowerCase(),
      spotify.title.toLowerCase()
    )
    score += titleSimilarity * 0.6 // Title is most important

    // Duration match (within 5% is good)
    const durationDiff = Math.abs(video.duration - spotify.duration)
    const durationScore = durationDiff < (spotify.duration * 0.05) ? 0.3 : 0
    score += durationScore

    // Channel name matches podcast name
    const channelSimilarity = this.calculateStringSimilarity(
      video.channel.toLowerCase(),
      spotify.showName.toLowerCase()
    )
    score += channelSimilarity * 0.1

    return score
  }

  private static calculateStringSimilarity(str1: string, str2: string): number {
    // Your existing string similarity implementation
    // Could be Levenshtein distance or another algorithm
    return 0 // Replace with actual implementation
  }
}