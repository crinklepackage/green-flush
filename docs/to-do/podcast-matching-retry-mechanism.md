# Podcast Matching Retry Mechanism

## Overview
We need a retry mechanism that allows previously-failed podcast matches to be retried when requested again. This would apply to both Spotify and YouTube links, ensuring we leverage our improved matching algorithm for all requests, not just new ones.

## Current Flow Analysis
From examining the codebase:
1. User submits a Spotify/YouTube link
2. System checks if the URL already exists in the podcast table
3. If found, it returns the existing record without reattempting matching
4. If not found, it attempts matching and stores the result

## Proposed Implementation

### 1. Database Modifications

Add fields to the podcast table:
```sql
ALTER TABLE podcasts ADD COLUMN last_match_attempt TIMESTAMP WITH TIME ZONE;
ALTER TABLE podcasts ADD COLUMN match_attempt_count INTEGER DEFAULT 0;
ALTER TABLE podcasts ADD COLUMN matcher_version VARCHAR(50);
```

These fields will track:
- When we last attempted to match this podcast
- How many times we've tried matching
- Which version of the matching algorithm was used (for future improvements)

### 2. Implementation Logic

#### A. In the PodcastService class
Modify how we process podcast submissions:

```typescript
async processPodcastUrl(url: string, userId: string): Promise<PodcastRecord> {
  // Extract platform and ID from URL
  const platform = this.determinePlatform(url);
  const platformId = this.extractPlatformId(url, platform);
  
  // Check if podcast already exists in database
  const existingPodcast = await this.db.findPodcastByPlatformAndId(platform, platformId);
  
  // Determine if we should retry matching
  const shouldRetryMatching = this.shouldRetryMatching(existingPodcast);
  
  if (existingPodcast && !shouldRetryMatching) {
    // Use existing podcast without rematching
    return existingPodcast;
  }
  
  // Either no existing podcast or we should retry matching
  try {
    // Get matching URL from the other platform (or null if no match)
    const matchedUrl = await this.matchPodcastUrl(url, platform);
    
    // Prepare record for database
    const record = {
      id: existingPodcast?.id || uuid(),
      url: url,
      platform: platform,
      platform_id: platformId,
      matched_url: matchedUrl,
      status: matchedUrl ? 'match_found' : 'no_match',
      created_at: existingPodcast?.created_at || new Date(),
      updated_at: new Date(),
      last_match_attempt: new Date(),
      match_attempt_count: (existingPodcast?.match_attempt_count || 0) + 1,
      matcher_version: CURRENT_MATCHER_VERSION
    };
    
    // Create or update podcast record
    if (existingPodcast) {
      await this.db.updatePodcast(record);
    } else {
      await this.db.createPodcast(record);
    }
    
    // Create user_podcasts association if new
    if (!existingPodcast) {
      await this.db.createUserPodcast(userId, record.id);
    }
    
    return record;
  } catch (error) {
    // Handle errors
    logger.error('Error processing podcast URL', { url, error });
    throw error;
  }
}
```

#### B. Add a method to determine if matching should be retried
```typescript
private shouldRetryMatching(podcast: PodcastRecord | null): boolean {
  if (!podcast) return false;
  
  // Always retry if previous attempt failed to find a match
  if (podcast.status === 'no_match') return true;
  
  // Retry if we're using a newer matching algorithm
  if (podcast.matcher_version !== CURRENT_MATCHER_VERSION) return true;
  
  // Retry if it's been over 30 days since last attempt (platforms might have new content)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  if (podcast.last_match_attempt && podcast.last_match_attempt < thirtyDaysAgo) return true;
  
  // Don't retry if we've already tried matching too many times
  if (podcast.match_attempt_count >= 5) return false;
  
  // Otherwise, don't retry
  return false;
}
```

#### C. Define a matcher version constant
```typescript
// At the top of the file
const CURRENT_MATCHER_VERSION = '2.0'; // Update this whenever we make significant algorithm changes
```

### 3. Logger Enhancements

Add detailed logging to track retry behavior:

```typescript
if (shouldRetryMatching) {
  logger.info('Retrying podcast matching', {
    url,
    platform,
    platformId,
    previousStatus: existingPodcast.status,
    attemptCount: existingPodcast.match_attempt_count,
    lastAttempt: existingPodcast.last_match_attempt,
    previousVersion: existingPodcast.matcher_version,
    currentVersion: CURRENT_MATCHER_VERSION
  });
}
```

### 4. Database Migration

Create a migration to add the new columns:

```typescript
// In a migration file
export async function up(db: any) {
  await db.query(`
    ALTER TABLE podcasts 
    ADD COLUMN IF NOT EXISTS last_match_attempt TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS match_attempt_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS matcher_version VARCHAR(50)
  `);
  
  // Initialize existing records
  await db.query(`
    UPDATE podcasts
    SET last_match_attempt = created_at,
        match_attempt_count = 1,
        matcher_version = '1.0'
    WHERE last_match_attempt IS NULL
  `);
}

export async function down(db: any) {
  await db.query(`
    ALTER TABLE podcasts
    DROP COLUMN IF EXISTS last_match_attempt,
    DROP COLUMN IF EXISTS match_attempt_count,
    DROP COLUMN IF EXISTS matcher_version
  `);
}
```

### 5. Additional Improvements

#### A. Admin Endpoint to Force Retry
Add an admin API endpoint that can force-retry matching for specific URLs or a batch of URLs:

```typescript
// In the podcast router
router.post('/admin/podcasts/retry-matching', adminMiddleware, async (req, res) => {
  const { urls, all_failed } = req.body;
  
  try {
    if (all_failed) {
      // Retry all podcasts with 'no_match' status
      const count = await podcastService.retryAllFailedMatches();
      return res.json({ success: true, message: `Queued ${count} podcasts for rematching` });
    } else if (urls && Array.isArray(urls)) {
      // Retry specific URLs
      const results = await podcastService.retryMatchingForUrls(urls);
      return res.json({ success: true, results });
    } else {
      return res.status(400).json({ error: 'Must provide urls array or all_failed=true' });
    }
  } catch (error) {
    logger.error('Error in retry matching endpoint', { error });
    return res.status(500).json({ error: 'Failed to retry matching' });
  }
});
```

#### B. Background Job for Periodic Retries
Set up a background job to periodically retry matching for failed links:

```typescript
// In a worker file
export async function retryFailedMatches() {
  const failedPodcasts = await db.findPodcastsByStatus('no_match');
  
  for (const podcast of failedPodcasts) {
    // Skip if we've tried too many times already
    if (podcast.match_attempt_count >= 5) continue;
    
    // Skip if we've tried recently
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    if (podcast.last_match_attempt && podcast.last_match_attempt > oneDayAgo) continue;
    
    // Queue a matching job
    await queueService.add('match-podcast', {
      podcastId: podcast.id,
      url: podcast.url,
      isRetry: true
    });
  }
}
```

## Implementation Timeline

1. **Database Migration** (1 hour)
   - Add new columns to track matching attempts
   
2. **Core Logic Changes** (3-4 hours)
   - Update podcast service to implement retry logic
   - Add matcher version tracking
   - Enhance logging
   
3. **Admin Functions** (2 hours)
   - Add endpoints for manual retrying
   - Create background job for periodic retry

4. **Testing** (2-3 hours)
   - Test with previously failed links
   - Verify retry logic works as expected
   - Test with different scenarios (e.g., different status values)

5. **Documentation** (1 hour)
   - Update docs with new retry capabilities
   - Document the matcher versioning approach

Total estimated implementation time: 9-11 hours