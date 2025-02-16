READ THIS FIRST:
This is how our old code worked. It is not necessarily how the new code in this project will work. It's a reference point, a starting point for conversation and ideas as we re-architect the code in the new codebase. In other words, don't follow these exactly. Before using any of the following, ask to confirm if it's compliant with the new codebase and architecture.

*****

Below is a detailed breakdown of my understanding of what our API components do versus what our worker components do. I’ve combed through the code and left no stone unturned.
---
API Responsibilities
The API layer is responsible for receiving requests from the frontend, handling submissions, and initiating processing by enqueuing jobs. In particular:
URL Submission & Podcast Record Creation
The frontend (via a component such as PodcastUrlForm) collects a podcast URL (either a YouTube URL or a Spotify URL).
The API endpoint (for example, through PodcastService in packages/api/src/services/podcast.service.ts) handles the submitted URL.
It verifies the user’s session and extracts the URL and type (either ‘youtube’ or ‘spotify’).
Depending on the platform:
YouTube submissions:
The API directly uses the URL as the YouTube video URL. It also retrieves video metadata (such as title, channel/show, thumbnail, and duration) using methods in YouTubeService.
Spotify submissions:
The API extracts the episode ID from the Spotify URL using SpotifyService. It retrieves the podcast metadata (title, show name, publisher, thumbnail, and duration) from Spotify.
Because podcast transcript generation requires a YouTube video, the API does not immediately have a YouTube URL. Instead, it creates a podcast record with a null YouTube URL.
After gathering the metadata, the API creates a podcast record in the database via DatabaseService. This record includes details like URL, platform, title, show name, and other metadata.
Next, the API creates a summary record in the database (with a status like in_queue). This summary is associated with the podcast.
Finally, the API creates a user–summary association so the user can later view the summary details.
Job Enqueuing
With the podcast and summary records created, the API uses a queue service (QueueService.addPodcastJob) to enqueue a processing job.
The job contains critical information such as the summaryId, podcastId, the original URL, the platform type, and the user’s ID.
Summary Generation Request (via Anthropic)
Although the heavy lifting of generating the summary occurs on the worker side, the API also includes the SummaryGeneratorService (in packages/api/src/services/summary-generator.service.ts).
This service builds a prompt using a system prompt (which defines the desired Markdown structure and tone) and a user prompt (instructing Claude to analyze the transcript).
It then uses Anthropic’s SDK to kick off a streaming request to generate the summary.
A rate-limiting mechanism is applied to avoid hammering the Anthropic endpoint.
Communication with External Services
The API integrates with external services such as Spotify (for episode metadata) and YouTube (for video metadata retrieval) via dedicated service modules.
It uses these integrations to enrich podcast records and ensure all required data (like YouTube URLs for transcript generation) are available.
In summary, the API accepts user submissions, creates and enriches records in the database, and enqueues jobs for further processing while also offering endpoints (or internal services) to generate summaries via Anthropic.
---
Worker Responsibilities
The worker is designed for asynchronous background processing. Its role is to take queued jobs and run the logic to get the necessary transcript and eventually prepare the data for summary generation. The primary responsibilities include:
Job Processing (ContentProcessorService)
When a podcast processing job is dequeued (by ContentProcessorService), it first logs the details (summaryId, URL, and type).
It retrieves the current summary and podcast records from the database.
Platform Differentiation:
For Spotify jobs:
The worker extracts the Spotify episode ID.
It then fetches the Spotify metadata.
Because a YouTube video is required to generate a transcript, the worker calls YouTubeService.searchForPodcastEpisode (passing the Spotify URL and metadata) to find a matching YouTube video.
If a match is found, the worker updates the podcast record with the discovered YouTube URL.
For YouTube jobs:
The worker confirms the provided YouTube URL exists.
Transcript Acquisition:
If the podcast record does not already contain a transcript, the worker attempts to fetch one.
The worker calls YouTubeService.getTranscript with the YouTube URL. This method implements a cascading fallback mechanism:
First, it uses the youtube-transcript package to try to fetch transcript segments.
If that fails, it falls back to running yt-dlp (by executing a command-line process to obtain auto-captions).
Next, it tries fetching via the YouTube Data API, which involves listing available captions and then downloading the correct caption track.
Finally, if all other methods fail, it falls back to a Supadata integration.
Upon successful transcript retrieval, it updates the podcast record (marking it as having a transcript and saving the text) via DatabaseService.
Summary Status Update:
If the transcript is successfully obtained, the worker updates the summary’s status to transcript_ready indicating that further processing (such as generating a summary via Anthropic) can proceed.
If any step fails (either the matching of a Spotify episode to a YouTube video or transcript fetching itself), the worker logs the error and updates the summary status to failed with details of the failure.
Transcript Fetching Architecture (YouTubeService in Worker)
The YouTubeService in the worker plays a critical role. Besides enabling podcast episode matching (for Spotify submissions), it provides several methods for transcript retrieval:
getTranscript:
Orchestrates parallel attempts using different methods. It logs parameters like whether the video is a YouTube Short versus a standard video.
It defines and iterates over a list of methods (youtube-transcript, yt-dlp, YouTube API), each with its own timeout.
fetchTranscriptWithYtDlp:
Invokes the yt-dlp command with appropriate flags to fetch subtitles/captions in SRT format.
fetchTranscriptWithYouTubeDataApi:
Uses YouTube’s Data API to list captions, finds an English caption track (preferring auto-generated ASR captions if available), and then downloads the captions.
fetchTranscriptFromSupadata:
Uses the Supadata SDK as an alternative source for fetching transcripts when the other methods do not succeed.
Summary Generation Preparation (SummaryGeneratorService)
Once transcript acquisition is complete, the worker may hand off to the SummaryGeneratorService. This service:
Constructs a detailed prompt for Claude by concatenating its pre-defined system prompt (which includes formatting rules, sections like “Overview,” “Key Insights,” etc.) and a user prompt asking for an analysis and summary.
Calls Anthropic’s API to initiate a streaming request to generate summary chunks.
Implements a rate-limiting mechanism to honor configured limits between requests.
Yields each chunk of the summary text back to the caller (which might then be streamed to the frontend).
Logging & Error Handling
Both the ContentProcessorService and YouTubeService use highly detailed logging to document every step—from initiating transcript fetching to matching YouTube videos and handling rate limits.
If any errors occur during processing, the worker updates the status in the database to reflect failure, allowing for troubleshooting and possible retries.
---
Final Overview
API Layer:
Receives podcast URL submissions from the frontend.
Determines whether the submission is from Spotify or YouTube.
Retrieves metadata (using SpotifyService or YouTubeService) and creates corresponding podcast records.
Creates a summary record and associates it with the user.
Enqueues a processing job using QueueService.
Provides a service (SummaryGeneratorService) to generate summaries using Anthropic (Claude) with a detailed Markdown prompt.
Worker Layer:
Listens for queued podcast processing jobs.
For Spotify submissions, searches for a matching YouTube video and updates the record.
Fetches transcripts using a layered, fallback-rich approach (using youtube-transcript, yt-dlp, YouTube Data API, and Supadata).
Updates the database with the transcript and marks the summary as ready or failed based on the success of the steps.
Uses the transcript to trigger summary generation (streaming summary generation via Anthropic).
Emphasizes robust logging and error handling to inform both developers and possibly the user-facing system of processing state.
This detective-level inspection of the codebase confirms that the architecture cleanly separates the API’s responsibility to handle user interaction and data creation from the worker’s responsibility to execute resource-intensive tasks (like matching, transcript fetching, and summary generation) asynchronously.
Does the API also serve up the list of summaries from the database for the user as well? Did you include that? For example, the summaries that show on the dashboard.TSX or the summary details page, is it the same API? Is it a different endpoint? Can you explain that? 


Below is an explanation of how our API handles summaries and how that relates to what you see on the dashboard and summary details page.
---
Summary Creation vs. Summary Retrieval
Summary Creation (POST Endpoint):
When a user submits a podcast URL (whether YouTube or Spotify), the API endpoint (for example, POST /podcasts/summary) is responsible for:
Validating the URL and determining the platform.
Creating a new podcast record (if one doesn’t already exist).
Creating a summary record with a status (usually set to in_queue).
Enqueuing a processing job (so the backend worker can later fetch the transcript, match YouTube videos for Spotify submissions, etc.).
The code for this is implemented in the PodcastService methods that we saw (such as createPodcastRequest and createInitialSummary). The frontend function called createSummary sends a POST request to this endpoint.
Summary Retrieval (GET Endpoint):
The summaries you see on the dashboard or the summary details page are retrieved by a different API endpoint. Although the code snippets you provided focus on creating summaries (and enqueuing processing jobs), our API also exposes one (or more) GET endpoints that:
Query the database for summaries associated with the authenticated user.
Return a list of summaries or the details of a single summary.
This listing endpoint is separate from the creation endpoint. The rationale is that the POST endpoint (used during submission) initiates processing, while the GET endpoint is used by the frontend to display a history of summaries, their statuses, and summary details. For example:
The dashboard might call GET /podcasts/summaries to retrieve all summaries for the current user.
A summary details page might call GET /podcasts/summary/:summaryId to fetch the information for one summary.
While the code we saw in PodcastService (or even in the DatabaseService helper functions) mainly handles creation and scheduling, there is a different part of our API (typically under our routes for podcasts or summaries) that provides these GET endpoints.
---
In Summary
Different Endpoints:
The creation of a summary (and the initiation of transcript processing) is handled by one endpoint (a POST request such as /podcasts/summary).
The retrieval (or listing) of summaries for display on the dashboard or summary details page is handled by one or more separate GET endpoints.

Separation of Concerns:
By having different endpoints, we separate the logic for creating/enqueuing jobs from the logic required to fetch, filter, and present summary data to a user. This ensures that users can see the history and details of their summaries without conflicting with the processing workflow initiated during submission.

So to answer your question: the API does indeed serve up the list of summaries for the user, but it does so with different endpoints than the one used for creating summaries. The POST endpoint is for creating a new summary (and enqueuing its processing), while the GET endpoints (which you’ll see being called in dashboard.tsx or the summary details page) are implemented separately to retrieve and display user-specific summary data.





1. What Does the Podcast (Record Creation & Job Enqueuing) Layer Do?
• The core orchestration for creating a podcast record and enqueuing processing jobs is done in our API layer—specifically in the PodcastService (and indirectly via the types in podcast.ts, which merely define the shape of our data).
• This layer does not itself implement low-level metadata fetching. Instead, it delegates those responsibilities to dedicated platform services (SpotifyService for Spotify and YouTubeService for YouTube).
---
2. Which APIs/Services Are We Using for Metadata Fetching?
For YouTube:
• Metadata Fetching:
 – The API calls YouTubeService.getVideoInfo when a YouTube URL is submitted.
 – This method leverages the YouTube Data API (via the googleapis package) or falls back on other methods (like running yt-dlp) when needed.
 – The metadata includes fields like title, channel (or show name), thumbnail URL, and video duration.
• Transcript Fetching:
 – The YouTubeService also handles transcript fetching via several layered approaches:
  - Primary method using the youtube-transcript package.
  - Fallbacks using yt-dlp (command-line execution), the YouTube Data API (if it can list/download caption tracks), and if necessary, a Supadata integration.
For Spotify:
• Metadata Fetching:
 – The SpotifyService is responsible for extracting details from a Spotify URL.
 – It first extracts the episode ID (using methods like getEpisodeId) and then calls SpotifyService.getPodcastInfo, which communicates with Spotify’s API to retrieve metadata (e.g., title, show, thumbnail, duration).
---
3. The Relationship Between the Podcast/Record Creation Layer and the Platform Services
• Orchestration Responsibility (PodcastService):
 – When a user submits a URL, the PodcastService first checks whether that podcast already exists in the database.
 – It then determines the platform type (YouTube or Spotify) and calls the corresponding service for fetching metadata.
  - For YouTube, it calls YouTubeService.getVideoInfo.
  - For Spotify, it invokes SpotifyService.getPodcastInfo.
 – With the metadata in hand, PodcastService creates a podcast record (using our DatabaseService). This record follows the types defined in podcast.ts.
 – The PodcastService then creates an associated summary record and enqueues a processing job (using QueueService).
• Delegation to Platform Services:
 – PodcastService itself does not have its own, independent metadata fetching logic. It simply coordinates by calling out to the dedicated platform services.
 – This maintains a clean separation of concerns: the orchestration layer handles record creation and the job pipeline, while each platform service takes care of interacting with the external APIs.
---
4. Flow of Metadata From External APIs Into Our System
1. Submission:
 – A user submits a YouTube or Spotify URL via the frontend.
 – The API (PodcastService) receives the URL.
Determining the Platform:
 – The PodcastService inspects the URL and determines whether it’s YouTube or Spotify.
  - For YouTube, it extracts metadata directly by invoking YouTubeService.getVideoInfo.
  - For Spotify, it first extracts the Spotify episode ID and then calls SpotifyService.getPodcastInfo.
Creating Podcast & Summary Records:
 – With the metadata fetched from the external APIs, a new podcast record is created in the database.
 – A summary record is also created (with an initial status of “in_queue”) and associated with the podcast.
 – A processing job is then enqueued to handle further tasks (like transcript fetching).
Platform Matching (Spotify → YouTube):
 – For Spotify submissions, since generating a transcript requires a YouTube URL, the worker comes into play.
 – In the ContentProcessorService (the worker), if the podcast’s platform is Spotify and no YouTube URL exists, it calls YouTubeService.searchForPodcastEpisode.
 – This method uses the Spotify metadata to find a matching YouTube video. Once a match is found, the podcast record is updated with the found YouTube URL.
Transcript Generation:
 – After ensuring there is a valid YouTube URL (either originally from a YouTube submission or by matching for Spotify), the worker then proceeds to fetch the transcript using the layered methods in YouTubeService.
 – The transcript is then stored in the corresponding podcast record, and the summary status is updated accordingly.
---
Summary of the Answers
• Is podcast.ts orchestrating these platform services, or does it have its own metadata fetching logic?
 – The orchestration (podcast record creation and job enqueuing) is handled by PodcastService. It does not implement its own metadata fetching; it delegates to YouTubeService for YouTube URLs and SpotifyService for Spotify URLs.
• For YouTube, are we using both the Data API (for metadata) and other methods (for transcripts)?
 – Yes. Metadata fetching for YouTube is primarily done using methods that likely rely on the YouTube Data API (or similar means via YouTubeService.getVideoInfo), whereas transcript fetching uses multiple methods—including the youtube-transcript package, yt-dlp, the YouTube Data API for captions, and even Supadata as a fallback.
• Where exactly does the platform matching happen (Spotify → YouTube)?
 – The matching occurs in the worker’s processing job within ContentProcessorService. If a Spotify submission lacks a YouTube URL, it calls YouTubeService.searchForPodcastEpisode (using Spotify metadata) to find a matching YouTube video. This matching is essential since a transcript (and summary) requires a YouTube URL.
• What APIs/services we're using for metadata fetching?
 – For YouTube, we use services around the YouTube Data API and fallback methods (like yt-dlp).
 – For Spotify, we use our SpotifyService which communicates with Spotify’s API.
• The relationship between podcast.ts (the record creation layer) and the platform services?
 – PodcastService (which uses the types defined in podcast.ts) is solely responsible for coordinating database record creation and job enqueuing. It delegates the actual fetching of metadata to specialized services (SpotifyService and YouTubeService).
 – This separation means the orchestration layer remains lightweight and focused on workflow management rather than the details of external API calls.
• The flow of how metadata gets from these external APIs into our system?
 – A URL is submitted → the platform service appropriate for that URL is called to retrieve metadata → the metadata populates a podcast record in our database → a summary record is created → the processing job (which also handles further tasks like transcript fetching and platform matching) runs in the worker → the results are updated back into the records.





Below are several curated code snippets that, when viewed together, help illustrate our overall flow. They show what our code is doing from the data type definitions, through record creation and metadata fetching in the API layer, and finally to the worker’s job processing (including the platform matching for Spotify-to-YouTube).
Below you’ll find:
The shared TypeScript types for our podcasts and summaries.
2. The orchestration code in our API’s PodcastService that creates podcast records, fetches metadata via the platform services, creates associated summary records, and enqueues processing jobs.
The worker’s ContentProcessorService that picks up the job, ensures a YouTube URL is available (including matching for Spotify submissions), and is set up to fetch the transcript.

1. Shared Types (Data Definitions)
export interface PodcastData {
  id: string;
  url: string;
  platform: string;
  title: string;
  show_name: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  transcript: string | null;
  youtube_url?: string | null;
  platform_specific_id?: string | null;
  has_transcript?: boolean;
  created_by?: string;
}

export interface PodcastSummary {
  id: string;
  created_at: string;
  updated_at: string;
  podcast_id: string;
  status: string;
  error_message: string | null;
  metadata: Record<string, any> | null;
  key_points: string[] | null;
  notable_quotes: string[] | null;
  topic_breakdown: Record<string, string> | null;
  summary_text: string | null;
  view_count: number;
  cost_estimate: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  last_viewed_at: string | null;
  pending_since: string | null;
  processing_since: string | null;
  completed_at: string | null;
  failed_at: string | null;
  status_history: Record<string, any>[] | null;
}

export interface PodcastRequest {
  url: string;
  type: string;
  userId: string;
}

export interface PodcastResponse {
  summaryId: string;
  status: string;
  podcast: PodcastData;
}





2. API Orchestration (PodcastService)
This service is responsible for receiving the incoming URL, checking if the podcast already exists, fetching metadata via the YouTubeService (for YouTube URLs) or SpotifyService (for Spotify URLs), creating a podcast record and a summary record, then enqueueing a processing job.
export class PodcastService {
  async createPodcastRequest(url: string, type: 'youtube' | 'spotify', userId: string, email: string): Promise<string> {
    const startTime = Date.now();
    try {
      // Ensure the user exists
      await DatabaseService.createUserIfNotExists(userId, email);

      // First check if podcast already exists
      const existingPodcast = await DatabaseService.getPodcastByUrl(url);
      if (existingPodcast) {
        // Refresh metadata in the background
        PodcastService.refreshMetadata(existingPodcast.id).catch((error: Error) => {
          logger.error('Failed to refresh metadata:', { error, podcastId: existingPodcast.id });
        });

        // Get the most recent summary
        const latestSummary = existingPodcast.summaries.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        if (latestSummary) {
          if (latestSummary.status === processing_STATUSES.completed) {
            return latestSummary.id;
          } else {
            // If summary is still processing, add user to existing summary
            try {
              await DatabaseService.createUserSummary({
                user_id: userId,
                summary_id: latestSummary.id
              });
            } catch (error: any) {
              if (error?.code !== '23505') {
                throw error;
              }
            }
            return latestSummary.id;
          }
        }

        // Podcast exists but lacks summaries; create one.
        const summary = await DatabaseService.createSummary({
          podcast_id: existingPodcast.id,
          status: processing_STATUSES.in_queue
        });
        await DatabaseService.createUserSummary({
          user_id: userId,
          summary_id: summary.id
        });
        await QueueService.addPodcastJob({
          summaryId: summary.id,
          podcastId: existingPodcast.id,
          url,
          type,
          userId
        });
        return summary.id;
      }

      // No existing podcast found, so create a new one.
      let podcast;
      let platformInfo;
      let platformId: string | null = null;
      if (type === 'youtube') {
        platformInfo = getPlatformInfo(url);
        platformId = platformInfo.id;
        const metadataStartTime = Date.now();
        let videoInfo;
        try {
          videoInfo = await YouTubeService.getVideoInfo(url);
        } catch (error) {
          if (error instanceof Error && error.message === 'Invalid YouTube URL') {
            videoInfo = {
              title: 'Unknown Title',
              channel: 'Unknown Channel',
              thumbnailUrl: null,
              duration: null,
            };
          } else {
            throw error;
          }
        }
        if (!videoInfo) {
          throw new Error('Failed to fetch video info');
        }
        podcast = await DatabaseService.createPodcast({
          url,
          platform: type,
          youtube_url: url,
          title: videoInfo.title,
          show_name: videoInfo.channel,
          created_by: userId,
          has_transcript: false,
          transcript: null,
          platform_specific_id: platformId,
          thumbnail_url: videoInfo.thumbnailUrl || null,
          duration: videoInfo.duration || null,
        });
      } else if (type === 'spotify') {
        const episodeId = SpotifyService.getEpisodeId(url);
        if (!episodeId) {
          throw new Error("Failed to extract Spotify episode ID");
        }
        const podcastInfo = await SpotifyService.getPodcastInfo(episodeId);
        if (!podcastInfo) {
          throw new Error("Failed to fetch podcast info");
        }
        podcast = await DatabaseService.createPodcast({
          url,
          platform: type,
          youtube_url: null,
          title: podcastInfo.title,
          show_name: podcastInfo.show,
          created_by: userId,
          has_transcript: false,
          transcript: null,
          platform_specific_id: episodeId,
          thumbnail_url: podcastInfo.thumbnailUrl || null,
          duration: podcastInfo.duration || null,
        });
      } else {
        throw new Error(`Unsupported platform: ${type}`);
      }

      const summary = await DatabaseService.createSummary({
        podcast_id: podcast.id,
        status: processing_STATUSES.in_queue,
      });
      await DatabaseService.createUserSummary({
        user_id: userId,
        summary_id: summary.id,
      });
      await QueueService.addPodcastJob({
        summaryId: summary.id,
        podcastId: podcast.id,
        url,
        type,
        userId,
      });

      return summary.id;
    } catch (error) {
      logger.error('Failed to create podcast request:', {
        error,
        url,
        type,
        totalTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  static async createInitialSummary(url: string): Promise<any> {
    const startTime = Date.now();
    try {
      const { platform, id } = await this.validateUrl(url);
      const podcast = await DatabaseService.createPodcast({
        url,
        platform: platform as "youtube" | "spotify",
        youtube_url: platform === '




3. Worker Processing (ContentProcessorService)
Once a job is enqueued, our worker’s ContentProcessorService picks it up. This code shows how it retrieves the podcast and summary from the database, then—if the podcast was submitted via Spotify—it uses the SpotifyService to fetch metadata and calls YouTubeService.searchForPodcastEpisode to find a matching YouTube video (which is required for transcript generation). Later steps for transcript retrieval would follow.

export class ContentProcessorService {
  async processPodcast(job: PodcastProcessingJob): Promise<void> {
    const { summaryId, url, type } = job;

    try {
      logger.info('Processing podcast:', { summaryId, url, type });

      // Retrieve the summary and podcast record from the database
      const { summary, podcast } = await DatabaseService.getSummaryWithPodcast(summaryId);

      // Start with our existing transcript and youtube_url values
      let transcript: string | null = podcast.transcript;
      let youtubeUrl = podcast.youtube_url;

      if (type === 'spotify') {
        // For Spotify, we must find a matching YouTube video (for transcript generation)
        const spotifyId = SpotifyService.extractEpisodeId(url);
        const spotifyMetadata = await SpotifyService.getEpisodeInfo(url);

        if (!spotifyMetadata) {
          throw new Error('Could not fetch Spotify episode metadata');
        }

        // Search for a matching YouTube video using Spotify metadata
        youtubeUrl = await YouTubeService.searchForPodcastEpisode(url, spotifyMetadata);
        if (!youtubeUrl) {
          throw new Error("Sorry! We couldn't find a matching YouTube video for this podcast. We need this to generate a transcript for the summary.");
        }

        // Update the podcast record with the discovered YouTube URL
        await DatabaseService.updatePodcastInfo(podcast.id, {
          youtube_url: youtubeUrl
        });
      }

      if (!youtubeUrl) {
        throw new Error('No YouTube URL available for transcription');
      }

      // At this point, further processing (such as transcript fetching via various fallback methods)
      // would be initiated using the validated YouTube URL.

    } catch (error) {
      logger.error('Failed to process podcast:', { error, summaryId, url, type });
      throw error;
    }
  }
}



Final Remarks
Together these snippets demonstrate how our system – from shared types to API orchestration and worker processing – ensures that:
• The submission (YouTube or Spotify) triggers metadata fetching via dedicated platform services.
• Podcasts are recorded and summaries are created/enqueued for further processing.
• Spotify submissions undergo an additional matching step (using YouTubeService.searchForPodcastEpisode) so that transcript generation can proceed.
This clear separation ensures our services remain modular, with the API layer focusing on orchestration and data creation, and the worker module handling resource‐intensive tasks like transcript fetching and platform matching.




--
Platform Services
YouTubeService – getVideoInfo & searchForPodcastEpisode
export class YouTubeService {
  // Returns video metadata (title, channel, thumbnail, duration) via the YouTube Data API
  static async getVideoInfo(url: string): Promise<{ title: string; channel: string; thumbnailUrl: string; duration: number; }> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }
    const apiKey = process.env.YOUTUBE_API_KEY;
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`);
    const data = await response.json();
    if (data.items.length === 0) {
      throw new Error('Video not found');
    }
    const item = data.items[0];
    return {
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails?.high?.url || '',
      duration: this.parseDuration(item.contentDetails.duration)
    };
  }

  // Helper method to extract the video ID from a URL
  static extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Converts ISO8601 duration (e.g. "PT1H2M3S") to seconds
  static parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) {
      return 0;
    }
    let seconds = 0;
    if (match[1]) seconds += parseInt(match[1], 10) * 3600;
    if (match[2]) seconds += parseInt(match[2], 10) * 60;
    if (match[3]) seconds += parseInt(match[3], 10);
    return seconds;
  }

  // Uses Spotify metadata (e.g. title and show name) to search YouTube for a matching video
  static async searchForPodcastEpisode(spotifyUrl: string, spotifyMetadata: any): Promise<string | null> {
    const query = `${spotifyMetadata.title} ${spotifyMetadata.show}`;
    const apiKey = process.env.YOUTUBE_API_KEY;
    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(query)}&key=${apiKey}&part=snippet&type=video`);
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const videoId = data.items[0].id.videoId;
      return `https://www.youtube.com/watch?v=${videoId}`;
    }
    return null;
  }
}



SpotifyService – getEpisodeId & getPodcastInfo
export class SpotifyService {
  // Extracts the episode ID from a Spotify URL
  static getEpisodeId(url: string): string | null {
    // Supports both spotify://episode/ and open.spotify.com/episode/ formats
    const regex = /spotify(?:\:|\.com\/)episode\/([^?\s]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  // Calls the Spotify API to fetch episode details such as title, show name, thumbnail and duration
  static async getPodcastInfo(episodeId: string): Promise<{ title: string; show: string; thumbnailUrl?: string; duration?: number } | null> {
    const accessToken = process.env.SPOTIFY_ACCESS_TOKEN;
    const response = await fetch(`https://api.spotify.com/v1/episodes/${episodeId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch podcast info from Spotify');
    }
    const data = await response.json();
    return {
      title: data.name,
      show: data.show.name,
      thumbnailUrl: data.images && data.images.length ? data.images[0].url : null,
      duration: data.duration_ms ? data.duration_ms / 1000 : null
    };
  }
}


Database Service
The database service is used by both our API and worker. Below are the key methods for creating a podcast, creating a summary, updating a podcast’s info (such as adding the discovered YouTube URL), and retrieving a summary together with its associated podcast.

// Assume "db" is our configured query builder/ORM connection
export class DatabaseService {
  static async createPodcast(podcastData: any): Promise<any> {
    // Creates a new podcast record in the database
    const result = await db('podcasts').insert(podcastData).returning('*');
    return result[0];
  }

  static async createSummary(summaryData: any): Promise<any> {
    // Creates a new summary record in the database
    const result = await db('summaries').insert(summaryData).returning('*');
    return result[0];
  }

  static async updatePodcastInfo(podcastId: string, updateData: any): Promise<void> {
    // Updates fields on the podcast record
    await db('podcasts').where({ id: podcastId }).update(updateData);
  }

  static async getSummaryWithPodcast(summaryId: string): Promise<{ summary: any, podcast: any }> {
    // Retrieve the summary and join with the associated podcast record
    const summary = await db('summaries').where({ id: summaryId }).first();
    const podcast = await db('podcasts').where({ id: summary.podcast_id }).first();
    return { summary, podcast };
  }

  static async createUserSummary(userSummaryData: any): Promise<void> {
    // Creates the association between a user and a summary record
    await db('user_summaries').insert(userSummaryData);
  }
}



Queue Service
This service is responsible for enqueuing jobs to process podcasts and picking them up in our worker. Here’s how a podcast job is added and how jobs are processed:
Adding a Podcast Job
import Queue from 'bull';

const podcastQueue = new Queue('podcastQueue', {
  redis: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) }
});

export class QueueService {
  static async addPodcastJob(jobData: { summaryId: string; podcastId: string; url: string; type: 'youtube' | 'spotify'; userId: string }): Promise<void> {
    // Enqueue the job with retry configuration
    await podcastQueue.add(jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // Delay 1 minute before retrying
      }
    });
  }
}


Job Processing
In the worker, jobs are picked up and processed by the ContentProcessorService. For example:
import Queue from 'bull';
import { ContentProcessorService } from '../services/content-processor.service.js';

const podcastQueue = new Queue('podcastQueue', {
  redis: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) }
});

podcastQueue.process(async (job) => {
  const processor = new ContentProcessorService();
  await processor.processPodcast(job.data);
  return Promise.resolve();
});

podcastQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});




Status Badge Component
The status badge component is used in the frontend (for example, in the dashboard or details page) to display the current processing status of a podcast/summary record.
import React from 'react';

interface StatusBadgeProps {
  status: string;
}

const statusColors: Record<string, string> = {
  in_queue: 'gray',
  processing: 'blue',
  transcript_ready: 'green',
  completed: 'darkgreen',
  failed: 'red',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const backgroundColor = statusColors[status] || 'black';
  return (
    <span
      style={{
        backgroundColor,
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontWeight: 'bold'
      }}
    >
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
};

export default StatusBadge;



These snippets reveal the core functionality:
• The Platform Services delegate fetching of metadata to external APIs. For YouTube, we use the Data API to get video details and to search for matches when processing Spotify submissions. For Spotify, we extract the episode ID and then retrieve podcast data.
• The Database Service creates and updates podcast and summary records as well as handles their associations (including linking users to summaries).
• The Queue Service is set up with retry/backoff logic to add podcast jobs, and the worker processes these jobs by calling the ContentProcessorService.
• The Status Badge Component displays current processing statuses in the frontend.
Using these as reference points will help us design a clean, modular architecture for our new system. Let me know if you need additional details or further modifications!