export class SpotifyApiClient {
    constructor(
      private readonly accessToken: string
    ) {}
  
    getEpisodeId(url: string): string {
      const regex = /spotify(?:\:|\.com\/)episode\/([^?\s]+)/
      const match = url.match(regex)
      if (!match) throw new Error('Invalid Spotify URL')
      return match[1]
    }
  
    async getPodcastInfo(episodeId: string) {
      try {
        const response = await fetch(`https://api.spotify.com/v1/episodes/${episodeId}`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        })
        
        if (!response.ok) throw new Error('Failed to fetch podcast info')
        
        const data = await response.json()
        return {
          title: data.name,
          show: data.show.name,
          thumbnailUrl: data.images?.[0]?.url || null,
          duration: data.duration_ms ? data.duration_ms / 1000 : null
        }
      } catch (error) {
        console.error('Failed to fetch podcast info:', error)
        return null
      }
    }
  }