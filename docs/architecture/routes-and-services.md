

## Naming conventions for endpoints/services:

## Platform Services (like YouTube, Spotify)

- Video Information Endpoint
- Transcript Endpoint
- Search Endpoint


## API Routes
- Podcast Submission Endpoint (POST /api/podcasts)
- Summary Status Endpoint (GET /api/summaries/:id)
- Summary Stream Endpoint (GET /api/summaries/:id/stream)


## Worker Jobs
- Transcript Processing Job
- Summary Generation Job
- Platform Matching Job



// 1. Frontend submits URL
// API ROUTE: POST /api/podcasts
router.post('/podcasts', async (req, res) => {
  const { url } = req.body

  // Uses Platform Service for metadata
  const youtubeService = new YouTubeService(apiKey)
  const metadata = await youtubeService.getVideoInfo(url)  // Platform Service #1
  
  // Create records & enqueue job
  const podcast = await db.createPodcast({ ...metadata })
  await queueService.addJob({ podcastId: podcast.id })
})

// 2. Worker picks up job
// WORKER JOB: Process Podcast
class PodcastProcessor {
  async process(job) {
    const { podcastId } = job.data
    const podcast = await db.getPodcast(podcastId)

    if (podcast.platform === 'spotify') {
      // Uses Platform Service for matching
      const youtubeUrl = await youtubeService.searchForPodcastEpisode(  // Platform Service #2
        podcast.url,
        podcast.metadata
      )
    }

    // Uses Platform Service for transcript
    const transcript = await youtubeService.getTranscript(youtubeUrl)  // Platform Service #3
  }
}


Platform Services are used by both:

API Routes: For quick operations (metadata fetching)
Worker Jobs: For heavy operations (transcript fetching, matching)

That's why we have:

Lightweight Platform Services in /api/platforms/
Heavy Platform Services in /worker/platforms/