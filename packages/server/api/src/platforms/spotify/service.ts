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
    console.log('Initializing SpotifyService with clientId:', config.clientId);
    this.client = new SpotifyWebApi({
      clientId: config.clientId,
      clientSecret: config.clientSecret
    })
  }

  private async ensureValidToken() {
    if (Date.now() >= this.tokenExpiryTime - 5 * 60 * 1000) { // 5 min buffer
      const data = await this.client.clientCredentialsGrant()
      console.log('Spotify clientCredentialsGrant response:', data)
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
    console.log('Spotify client in getPodcastInfo:', this.client)
    const token = this.client.getAccessToken()
    console.log('Access token being used:', token)
    if (typeof this.client.getEpisode !== 'function') {
      console.error('Spotify client does not have getEpisode method.')
    }
    try {
      const response = await this.client.getEpisode(episodeId)
      return {
        title: response.body.name,
        show: response.body.show.name,
        duration: Math.round(response.body.duration_ms / 1000),
        thumbnailUrl: response.body.images[0]?.url || null
      }
    } catch (error) {
      const err = error as any;
      console.error('Error fetching episode from Spotify:', err);
      if (err?.body?.error === 'invalid_client') {
        throw new Error(`Failed to fetch episode: Invalid client. ${err?.body?.error_description || ''} Please check your SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.`);
      }
      throw error;
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