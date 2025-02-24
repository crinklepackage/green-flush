import { SpotifyService } from './service';
import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

// Load environment variables, adjust path as needed
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const clientId = process.env.SPOTIFY_CLIENT_ID || '';
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';

if (!clientId || !clientSecret) {
  console.error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in environment.');
  process.exit(1);
}

const spotifyService = new SpotifyService({ clientId, clientSecret });

// Test Spotify episode URL (replace with a valid one if needed)
const testUrl = 'https://open.spotify.com/episode/4wBBTubCNU6OZMdeb7zmHf?si=43538d99d47b4401';

(async () => {
  console.log('--- Test using SpotifyService.getEpisodeInfo ---');
  try {
    const info = await spotifyService.getEpisodeInfo(testUrl);
    console.log('Episode info (from spotifyService):', info);
  } catch (error) {
    console.error('Error during test-get-episode (spotifyService):', error);
  }

  console.log('--- Manual axios test ---');
  const episodeId = spotifyService.getEpisodeId(testUrl);
  try {
    const token = spotifyService['client'].getAccessToken(); // accessing the token directly
    console.log('Access token from client (for axios test):', token);
    const axiosResponse = await axios.get(`https://api.spotify.com/v1/episodes/${episodeId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Episode info (from axios):', axiosResponse.data);
  } catch (error) {
    console.error('Error during manual axios test:', error);
  }
})(); 