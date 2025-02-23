// packages/server/api/src/platforms/matcher.ts
import { YouTubeService } from '../youtube/service'
import { SpotifyService } from '../spotify/service'

const logger = console

export class PlatformMatcher {
  static async findYouTubeMatch(spotifyUrl: string): Promise<string | null> {
    try {
      // 1. Get Spotify metadata
      const spotifyId = SpotifyService.prototype.getEpisodeId(spotifyUrl)
      const spotifyMetadata = await SpotifyService.prototype.getEpisodeInfo(spotifyUrl)
      
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
    spotifyMetadata: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata
  ): Promise<string | null> {
    const searchQuery = this.buildSearchQuery(spotifyMetadata)
    const results: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata[] = await YouTubeService.search(searchQuery)

    // Filter and score results
    const scoredResults = results.map((video) => ({
      video,
      score: this.calculateMatchScore(video, spotifyMetadata)
    }))

    // Sort by score and get best match
    const sortedResults = scoredResults.sort((a, b) => b.score - a.score)
    const bestMatch = sortedResults.find((result) => result.score > 0.8)

    return bestMatch ? YouTubeService.buildUrl(bestMatch.video.id) : null
  }

  private static buildSearchQuery(metadata: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata): string {
    return `${metadata.title} ${metadata.showName} podcast`
  }

  private static calculateMatchScore(
    video: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata, 
    spotify: import('@wavenotes-new/shared/src/server/types/metadata').VideoMetadata
  ): number {
    let score = 0

    // Title similarity
    const titleSimilarity = this.calculateStringSimilarity(
      video.title.toLowerCase(),
      spotify.title.toLowerCase()
    )
    score += titleSimilarity * 0.6 // Title is most important

    // Duration match (within 5% is good)
    const videoDuration = video.duration || 0
    const spotifyDuration = spotify.duration || 0
    const durationDiff = Math.abs(videoDuration - spotifyDuration)
    const durationScore = spotifyDuration > 0 && durationDiff < (spotifyDuration * 0.05) ? 0.3 : 0
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
    // Placeholder for actual similarity logic; returning 0 to indicate no similarity
    return 0
  }
}