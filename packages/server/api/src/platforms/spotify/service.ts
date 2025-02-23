import SpotifyWebApi from 'spotify-web-api-node'
import { VideoMetadata } from '@wavenotes-new/shared/src/server/types/metadata'

interface SpotifyMetadata {
  title: string
  show: string
  duration: number
  thumbnailUrl: string | null
}

export class SpotifyService {
  private client: SpotifyWebApi
  private tokenExpiryTime = 0

  constructor(config: { clientId: string; clientSecret: string }) {
    this.client = new SpotifyWebApi({
      clientId: config.clientId,
      clientSecret: config.clientSecret
    })
  }

  private async ensureValidToken() {
    if (Date.now() >= this.tokenExpiryTime - 5 * 60 * 1000) { // 5 min buffer
      const data = await this.client.clientCredentialsGrant()
      this.client.setAccessToken(data.body.access_token)
      this.tokenExpiryTime = Date.now() + data.body.expires_in * 1000
    }
  }

  getEpisodeId(url: string): string {
    const match = url.match(/spotify\.com\/episode\/([a-zA-Z0-9]+)/)
    if (!match) throw new Error('Invalid Spotify URL')
    return match[1]
  }

  async getPodcastInfo(episodeId: string): Promise<SpotifyMetadata> {
    await this.ensureValidToken()
    const response = await this.client.getEpisode(episodeId)
    
    return {
      title: response.body.name,
      show: response.body.show.name,
      duration: Math.round(response.body.duration_ms / 1000),
      thumbnailUrl: response.body.images[0]?.url || null
    }
  }

  async getEpisodeInfo(url: string): Promise<VideoMetadata> {
    const episodeId = this.getEpisodeId(url);
    if (!episodeId) {
      throw new Error('Invalid Spotify episode URL');
    }

    // Assume we fetch episode information from Spotify API
    const episode = await this.getPodcastInfo(episodeId);
    if (!episode) {
      throw new Error(`Episode not found for id: ${episodeId}`);
    }

    return {
      id: episodeId,
      title: episode.title || 'Unknown Title',
      channel: episode.show || 'Unknown Channel',
      showName: episode.show || 'Unknown Show',
      thumbnailUrl: episode.thumbnailUrl || null,
      duration: episode.duration || null,
      platform: 'spotify'
    };
  }
}