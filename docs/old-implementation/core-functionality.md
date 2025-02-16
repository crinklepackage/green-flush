READ THIS FIRST:
This is how our old code worked. It is not necessarily how the new code in this project will work. It's a reference point, a starting point for conversation and ideas as we re-architect the code in the new codebase. In other words, don't follow these exactly. Before using any of the following, ask to confirm if it's compliant with the new codebase and architecture.
*****

# Core Functionality Overview for WaveNotes

This document highlights key code snippets that represent the core functionality of our WaveNotes system.It covers:

- URL submission / validation and platform detection
    - Transcript processing and matching logic
        - Streaming summary generation using Claude Streaming
- Real - time summary updates via Supabase

---

## 1. URL Submission, Validation, & Platform Detection

This snippet is from our Podcast Service.It shows how we validate an incoming URL, extract platform info(Spotify vs.YouTube), and create podcast records.





typescript: packages / api / src / services / podcast.service.ts
export class PodcastService {
    static async validateUrl(url: string) {
        try {
            const { platform, id } = getPlatformInfo(url);
            if (platform === 'spotify') {
                // Validate Spotify URL format
                SpotifyService.getEpisodeId(url);
            }
            return { platform, id };
        } catch (error) {
            throw new AppError(ErrorCodes.INVALID_URL_FORMAT, 'Invalid URL format');
        }
    }
    async createPodcastRequest(url: string, type: 'youtube' | 'spotify', userId: string, email: string) {
        const startTime = Date.now();
        if (type === 'spotify') {
            const platformId = SpotifyService.getEpisodeId(url);
            const podcastInfo = await SpotifyService.getPodcastInfo(platformId);
            if (!podcastInfo) {
                throw new Error('Failed to fetch podcast info');
            }
            const podcast = await DatabaseService.createPodcast({
                url,
                platform: type,
                youtube_url: null,
                title: podcastInfo.title,
                show_name: podcastInfo.show,
                created_by: userId,
                has_transcript: false,
                transcript: null,
                platform_specific_id: platformId,
                thumbnail_url: podcastInfo.thumbnailUrl || null,
                duration: podcastInfo.duration || null
            });
            // Create summary record and enqueue processing job...
        } else if (type === 'youtube') {
            const platformInfo = getPlatformInfo(url);
            const videoInfo = await YouTubeService.getVideoInfo(url);
            if (!videoInfo) {
                throw new Error('Failed to fetch video info');
            }
            // Create podcast record, summary record, and queue YouTube processing job...
        }
    }
}






---

## 2. Transcript Processing(Content Processor Service)

This snippet shows how a podcast processing job is handled.It fetches the transcript—finding a matching YouTube video for Spotify URLs when needed—and updates the status accordingly.


    typescript: packages / worker / src / services / content - processor.service.ts
export class ContentProcessorService {
    async processPodcast(job: PodcastProcessingJob): Promise<void> {
        const { summaryId, url, type } = job;
        try {
            // Retrieve summary and podcast details from the database
            const { summary, podcast } = await DatabaseService.getSummaryWithPodcast(summaryId);
            let transcript: string | null = podcast.transcript;
            let youtubeUrl = podcast.youtube_url;
            if (type === 'spotify') {
                // For Spotify, extract the episode ID and fetch metadata
                const spotifyId = SpotifyService.extractEpisodeId(url);
                const spotifyMetadata = await SpotifyService.getEpisodeInfo(url);
                if (!spotifyMetadata) {
                    throw new Error('Could not fetch Spotify episode metadata');
                }
                // Search for a matching YouTube video for transcription
                youtubeUrl = await YouTubeService.searchForPodcastEpisode(url, spotifyMetadata);
                if (!youtubeUrl) {
                    throw new Error("Sorry! We couldn't find a matching YouTube video for this podcast. Required for transcription.");
                }
                // Update podcast record with the found YouTube URL
                await DatabaseService.updatePodcastInfo(podcast.id, { youtube_url: youtubeUrl });
            }
            if (!youtubeUrl) {
                throw new Error('No YouTube URL available for transcription');
            }
            if (!transcript) {
                // Fetch the transcript using the YouTube service if not already available
                transcript = await YouTubeService.getTranscript(youtubeUrl);
                await DatabaseService.updatePodcastInfo(podcast.id, {
                    transcript,
                    has_transcript: true
                });
                await DatabaseService.updateSummaryStatus(summaryId, processing_STATUSES.transcript_ready);
            } else {
                await DatabaseService.updateSummaryStatus(summaryId, processing_STATUSES.transcript_ready);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await DatabaseService.updateSummaryStatus(
                summaryId,
                processing_STATUSES.failed,
                new Error(Podcast processing failed: ${ errorMessage })
            );
            throw error;
        }
    }
}





---

## 3. Streaming Summary Endpoint(Worker)

This endpoint validates the client's token, fetches the transcript for the given summary, and streams summary chunks (provided by Claude Streaming) back to the client.


typescript: packages / worker / src / routes / summary.ts
router.get('/stream/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { token } = req.query;
    // Validate token presence and type
    if (!token || typeof token !== 'string') {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    // Verify token with Supabase authentication
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        res.status(401).json({ error: 'Invalid authentication' });
        return;
    }
    try {
        const transcript = await getTranscriptById(id); // Helper method to fetch the transcript
        // Stream summary chunks from the generator function
        for await (const chunk of SummaryGeneratorService.generateSummaryStream(transcript)) {
            res.write(chunk);
        }
        res.write('[DONE]');
        res.end();
    } catch (error) {
        logger.error('Error in streaming summary:', error);
        res.status(500).write('Streaming failed');
        res.end();
    }
});





---

## 4. Real - Time Summary Updates via Supabase(API Route)

This alternative endpoint demonstrates real - time updates.It subscribes to changes in the summaries table and streams updates(completion, failures, or status notifications) to the client.


    typescript: packages / api / src / routes / podcast.routes.ts
router.get('/summary/:id/stream', async (req: AuthenticatedRequest, res: ApiResponse) => {
    try {
        // Set up a real-time subscription to summary updates
        const subscription = supabase
            .channel('summary_updates')
            .on(
                'postgres_changes',
                {
                    event: '',
                    schema: 'public',
                    table: 'summaries',
                    filter: id = eq.${ summaryId },
},
    async (payload: any) => {
        const updatedSummary = payload.new;
        if (updatedSummary.status === processing_STATUSES.completed) {
            if (updatedSummary.summary_text) {
                res.write(data: ${ JSON.stringify({ text: updatedSummary.summary_text }) }\n\n);
            }
            res.write('data: [DONE]\n\n');
            res.end();
            subscription.unsubscribe();
        } else if (updatedSummary.status === processing_STATUSES.failed) {
            res.write(data: ${ JSON.stringify({ error: updatedSummary.error_message || 'Summary failed' }) }\n\n);
            res.end();
            subscription.unsubscribe();
        } else if (updatedSummary.status === processing_STATUSES.transcript_ready) {
            res.write('data: :transcript-ready\n\n');
        }
    }
)
    .subscribe();
// Handle client disconnect: clean up the subscription
req.on('close', () => {
    subscription.unsubscribe();
    res.end();
});
} catch (error) {
    logger.error('Error in summary stream:', error);
    return res.status(500).json({ error: 'Failed to stream summary' });
}
});





---

## 5. Streaming Summary Generation(Summary Generator Service)

This snippet illustrates the generator function that uses Claude Streaming to yield summary chunks in real time.


    javascript: packages / api / dist / services / summary - generator.service.js
import { logger } from '@wavenotes/shared/node-index';
import { Anthropic } from '@anthropic-ai/sdk';
export class SummaryGeneratorService {
    // Streaming generator for summary chunks using Claude Streaming
    static async generateSummaryStream(transcript) {
        logger.info(generateSummaryStream initiated with transcript length: ${ transcript.length });
        try {
            // Assume this function interfaces with Claude's SDK to stream summary outcomes
            for await (const chunk of someClaudeStreamingFunction(transcript)) {
                if (chunk.type === 'content_block_delta' &&
                    chunk.delta.type === 'text_delta' &&
                    'text' in chunk.delta) {
                    logger.info('Yielding chunk from Claude Streaming');
                    yield chunk.delta.text;
                }
            }
        } catch (error) {
            logger.error('Error in summary stream generation:', error);
            throw error;
        }
    }
}