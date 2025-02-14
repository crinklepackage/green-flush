
1. Matching Logic (Spotify → YouTube)
This snippet shows our matching logic where we take a Spotify link, extract its metadata, and then search for a corresponding YouTube video by calling our YouTube service. The matching logic also updates the podcast record if a good match is found.

// Matching logic for a Spotify podcast
if (type === 'spotify') {
  // Extract Spotify episode ID and fetch its metadata
  const spotifyId = SpotifyService.extractEpisodeId(url);
  const spotifyMetadata = await SpotifyService.getEpisodeInfo(url);
  if (!spotifyMetadata) {
    throw new Error('Could not fetch Spotify episode metadata');
  }

  // Search for a matching YouTube video using the metadata
  const youtubeUrl = await YouTubeService.searchForPodcastEpisode(url, spotifyMetadata);
  if (!youtubeUrl) {
    throw new Error("Sorry! We couldn't find a matching YouTube video for this podcast. We need this to generate a transcript for the summary.");
  }

  // Update the podcast record with the found YouTube URL
  await DatabaseService.updatePodcastInfo(podcast.id, { youtube_url: youtubeUrl });
}




2. YouTube Service – Transcript Fetching Methods
//we have a cascading series of methods we use to try to get the transcript; here we shoudld have an update for the order: if it's local, use existing order, if it's prod, use supadata first
This snippet outlines how our YouTube service tries different methods to obtain a video transcript. It first attempts to fetch via an API method and then falls back to a scraping approach if necessary.

import { logger } from '@wavenotes/shared';
import { YoutubeTranscript } from 'youtube-transcript';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

/**
 * YouTubeService provides multiple ways to interact with YouTube,
 * including fetching video metadata and transcript retrieval using a cascading fallback.
 */
export class YouTubeService {
  // ... other methods ...

  /**
   * Fetches a transcript for the given YouTube URL using multiple fallback methods:
   * 1. youtube-transcript package
   * 2. yt-dlp utility
   * 3. kyoutubetranscript package
   * 4. Supadata integration
   *
   * @param youtubeUrl URL of the YouTube video.
   * @returns A transcript as a string.
   * @throws Error if no transcript could be retrieved.
   */
  static async getTranscript(youtubeUrl: string): Promise<string> {
    let transcript: string | null = null;

    // 1. Attempt: using the youtube-transcript package
    try {
      logger.info('Attempting to fetch transcript using youtube-transcript package.');
      const segments = await YoutubeTranscript.fetchTranscript(youtubeUrl);
      if (segments && segments.length > 0) {
        transcript = segments.map(segment => segment.text).join(' ');
        if (transcript.trim().length > 0) {
          logger.info('Transcript successfully fetched via youtube-transcript.');
          return transcript;
        }
      }
    } catch (error) {
      logger.error('youtube-transcript package failed', { error });
    }

    // 2. Attempt: using yt-dlp
    try {
      logger.info('Attempting to fetch transcript using yt-dlp.');
      transcript = await this.fetchTranscriptUsingYTDLP(youtubeUrl);
      if (transcript && transcript.trim().length > 0) {
        logger.info('Transcript successfully fetched via yt-dlp.');
        return transcript;
      }
    } catch (error) {
      logger.error('yt-dlp method failed', { error });
    }

    // 3. Attempt: using kyoutubetranscript package
    try {
      logger.info('Attempting to fetch transcript using kyoutubetranscript package.');
      transcript = await this.fetchTranscriptUsingKyoutubetranscript(youtubeUrl);
      if (transcript && transcript.trim().length > 0) {
        logger.info('Transcript successfully fetched via kyoutubetranscript.');
        return transcript;
      }
    } catch (error) {
      logger.error('kyoutubetranscript method failed', { error });
    }

    // 4. Attempt: using Supadata integration
    try {
      logger.info('Attempting to fetch transcript using Supadata integration.');
      transcript = await this.fetchTranscriptUsingSupadata(youtubeUrl);
      if (transcript && transcript.trim().length > 0) {
        logger.info('Transcript successfully fetched via Supadata integration.');
        return transcript;
      }
    } catch (error) {
      logger.error('Supadata integration failed', { error });
    }

    throw new Error('Transcript not available from any source.');
  }

  /**
   * Fallback: Uses the yt-dlp utility to fetch transcripts.
   * This method invokes yt-dlp as a child process.
   *
   * @param youtubeUrl URL of the YouTube video.
   * @returns Transcript text as a string.
   */
  static async fetchTranscriptUsingYTDLP(youtubeUrl: string): Promise<string> {
    // Example command: use yt-dlp to get auto-generated subtitles as SRT.
    const command = `yt-dlp --skip-download --write-auto-sub --sub-lang en --convert-subs srt --get-subs ${youtubeUrl}`;
    logger.info('Executing yt-dlp command:', command);
    try {
      const { stdout } = await execAsync(command);
      return stdout.trim();
    } catch (error) {
      logger.error('yt-dlp command failed', { error });
      throw error;
    }
  }

  /**
   * Fallback: Uses the kyoutubetranscript package to fetch transcripts.
   * Replace with the actual implementation from our codebase.
   *
   * @param youtubeUrl URL of the YouTube video.
   * @returns Transcript text as a string.
   */
  static async fetchTranscriptUsingKyoutubetranscript(youtubeUrl: string): Promise<string> {
    // Replace with real call to kyoutubetranscript API
    // For example:
    // import kyTranscript from 'kyoutubetranscript';
    // return await kyTranscript.getTranscript(youtubeUrl);
    return '';
  }

  /**
   * Fallback: Uses Supadata integration to fetch transcripts.
   * Replace with the actual Supadata API call as implemented in our code.
   *
   * @param youtubeUrl URL of the YouTube video.
   * @returns Transcript text as a string.
   */
  static async fetchTranscriptUsingSupadata(youtubeUrl: string): Promise<string> {
    // Replace with actual Supadata call
    return '';
  }

  // ... other methods such as getVideoInfo, searchForPodcastEpisode, etc.
}









3. YouTube Service – Fetching Video Metadata
//we use this to get metadata immediately to show the user on the summary details page, even before the summary is completed (ux polish)
This snippet demonstrates how we grab video metadata by extracting the video ID from the URL and querying the YouTube Data API. It returns key information such as title, channel, thumbnail URL, and duration.

export interface VideoInfo {
  title: string;
  channel: string;
  thumbnailUrl: string;
  duration: string; // duration in seconds (or formatted string as needed)
}

export class YouTubeService {
  static async getVideoInfo(youtubeUrl: string): Promise<VideoInfo | null> {
    try {
      // Extract the video ID from the URL
      const videoId = this.extractVideoId(youtubeUrl);
      const apiKey = process.env.YOUTUBE_API_KEY;
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`
      );
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        return {
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnailUrl: item.snippet.thumbnails.high.url,
          duration: this.parseDuration(item.contentDetails.duration),
        };
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to fetch video info: ${(error as Error).message}`);
    }
  }

  // Helper method to extract the video ID from a YouTube URL
  static extractVideoId(url: string): string {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\\s]{11})/;
    const match = url.match(regex);
    if (match && match[1]) {
      return match[1];
    }
    throw new Error('Unable to extract video ID from URL');
  }

  // Helper to parse ISO 8601 duration into seconds (as a string)
  static parseDuration(duration: string): string {
    let hours = 0, minutes = 0, seconds = 0;
    const hourMatch = duration.match(/(\d+)H/);
    const minuteMatch = duration.match(/(\d+)M/);
    const secondMatch = duration.match(/(\d+)S/);
    if (hourMatch) hours = parseInt(hourMatch[1], 10);
    if (minuteMatch) minutes = parseInt(minuteMatch[1], 10);
    if (secondMatch) seconds = parseInt(secondMatch[1], 10);
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds.toString();
  }
}