import SpotifyWebApi from 'spotify-web-api-node'
import { VideoMetadata } from '@wavenotes-new/shared'
import axios from 'axios'

interface SpotifyMetadata {
  title: string
  show: string
  duration: number
  thumbnailUrl: string | null
}

export class SpotifyService {
  private client: SpotifyWebApi
  private tokenExpiryTime = 0
  private maxRetries = 3
  private retryDelay = 1000 // 1 second

  constructor(config: { clientId: string; clientSecret: string }) {
    console.log('Initializing SpotifyService with clientId:', config.clientId);
    this.client = new SpotifyWebApi({
      clientId: config.clientId,
      clientSecret: config.clientSecret
    })
  }

  private async ensureValidToken() {
    try {
      if (Date.now() >= this.tokenExpiryTime - 5 * 60 * 1000) { // 5 min buffer
        console.log('Spotify token expired or not set, requesting new token...');
        const data = await this.client.clientCredentialsGrant()
        console.log('Spotify token granted successfully with expiry:', data.body.expires_in);
        this.client.setAccessToken(data.body.access_token)
        this.tokenExpiryTime = Date.now() + data.body.expires_in * 1000
      }
    } catch (error) {
      console.error('Error getting Spotify access token:', error);
      throw new Error(`Failed to authenticate with Spotify: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getEpisodeId(url: string): string {
    const match = url.match(/spotify\.com\/episode\/([a-zA-Z0-9]+)/)
    if (!match) throw new Error('Invalid Spotify URL')
    return match[1]
  }

  // Retry wrapper for API calls
  private async withRetry<T>(apiCall: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error: any) {
        lastError = error;
        console.warn(`Spotify API call failed (attempt ${attempt}/${this.maxRetries}):`, 
          error?.statusCode || error?.body?.error || error?.message || error);
        
        // Don't retry on certain errors
        if (error?.body?.error === 'invalid_client' || error?.body?.error === 'invalid_grant') {
          throw error;
        }
        
        // Don't retry on 400 errors, but do retry on 5xx errors
        if (error?.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          throw error;
        }
        
        // Last attempt, don't delay just throw
        if (attempt === this.maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  // Alternative direct method using axios as fallback
  private async getEpisodeDirectly(episodeId: string): Promise<SpotifyMetadata> {
    await this.ensureValidToken();
    const token = this.client.getAccessToken();
    
    try {
      console.log(`Attempting direct API call to Spotify for episode ${episodeId}`);
      const response = await axios.get(`https://api.spotify.com/v1/episodes/${episodeId}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        decompress: true,
        timeout: 10000 // 10 second timeout
      });
      
      const data = response.data;
      return {
        title: data.name,
        show: data.show.name,
        duration: Math.round(data.duration_ms / 1000),
        thumbnailUrl: data.images[0]?.url || null
      };
    } catch (error: any) {
      console.error('Direct Spotify API call failed:', error.response?.status, error.response?.statusText);
      console.error('Response data:', error.response?.data);
      throw new Error(`Direct Spotify API call failed: ${error.response?.status} ${error.response?.statusText}`);
    }
  }

  async getPodcastInfo(episodeId: string): Promise<SpotifyMetadata> {
    await this.ensureValidToken()
    console.log(`Fetching Spotify episode: ${episodeId}`);
    const token = this.client.getAccessToken()
    console.log('Access token being used:', token ? token.substring(0, 10) + '...' : 'NO TOKEN');
    
    try {
      return await this.withRetry(async () => {
        try {
          console.log('Attempting to fetch episode with spotify-web-api-node');
          const response = await this.client.getEpisode(episodeId);
          return {
            title: response.body.name,
            show: response.body.show.name,
            duration: Math.round(response.body.duration_ms / 1000),
            thumbnailUrl: response.body.images[0]?.url || null
          };
        } catch (error: any) {
          // If the library fails with 503, try direct axios approach
          if (error?.statusCode === 503) {
            console.log('spotify-web-api-node failed with 503, trying direct axios approach');
            return await this.getEpisodeDirectly(episodeId);
          }
          throw error;
        }
      });
    } catch (error: any) {
      console.error('All attempts to fetch Spotify episode failed:', error);
      
      if (error?.statusCode === 503) {
        throw new Error(`Spotify service temporarily unavailable (503). Please try again later.`);
      }
      
      if (error?.body?.error === 'invalid_client') {
        throw new Error(`Failed to fetch episode: Invalid client. ${error?.body?.error_description || ''} Please check your SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.`);
      }
      
      throw new Error(`Failed to fetch Spotify episode: ${error?.message || 'Unknown error'}`);
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