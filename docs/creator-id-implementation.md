# Creator ID Implementation Documentation

This document outlines the changes made to implement the `creator_id` field and enhance the delete and retry functionality in the WaveNotes application.

## Overview

We implemented the `creator_id` field in our database schema to track which user created each summary. This allows us to:

1. Properly attribute summaries to their creators
2. Implement different deletion behaviors based on creator status
3. Ensure the retry functionality maintains proper ownership

## Database Changes

### Schema Update

Added the `creator_id` column to the `summaries` table:

```sql
ALTER TABLE summaries 
ADD COLUMN creator_id UUID REFERENCES auth.users(id);
```

For existing records, we needed to populate the field using the first user associated with each summary:

```sql
-- For existing summaries, set creator_id to the first user who was associated with it
UPDATE summaries
SET creator_id = user_summaries.user_id
FROM (
  SELECT DISTINCT ON (summary_id) summary_id, user_id
  FROM user_summaries
  ORDER BY summary_id, created_at ASC
) AS user_summaries
WHERE summaries.id = user_summaries.summary_id
AND summaries.creator_id IS NULL;
```

## Backend Changes

### Database Service (`packages/server/api/src/lib/database.ts`)

Updated the `createSummary` function to accept and store the `creator_id`:

```typescript
async createSummary(data: {
  podcastId: string
  status: ProcessingStatus
  creatorId: string  // Added this parameter
}): Promise<SummaryRecord> {
  const { data: summary, error } = await this.supabase
    .from('summaries')
    .insert({
      podcast_id: data.podcastId,
      status: data.status,
      creator_id: data.creatorId,  // Added this field
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new DatabaseError(
      'Failed to create summary',
      error.code,
      'createSummary',
      { data }
    )
  }
  return summary
}
```

### Podcast Service (`packages/server/api/src/services/podcast.ts`)

Updated the `createPodcastRequest` method to pass the `userId` as `creatorId` to the `createSummary` function:

```typescript
// When creating a new summary for an existing podcast
summary = await this.db.createSummary({
  podcastId: podcast.id,
  status: ProcessingStatus.IN_QUEUE,
  creatorId: userId  // Added this parameter
});

// And when creating a summary for a new podcast
summary = await this.db.createSummary({
  podcastId: podcast.id,
  status: ProcessingStatus.IN_QUEUE,
  creatorId: userId  // Added this parameter
});
```

### Retry Endpoint (`packages/server/api/src/routes/summaries.ts`)

The retry endpoint was already properly using the `podcastService.createPodcastRequest` method with the `userId` parameter, which now correctly sets the `creator_id` field:

```typescript
// Use the existing podcast processing flow to create a new summary from scratch
// This is the same flow used when a user enters a new URL
const newSummaryId = await podcastService.createPodcastRequest(originalUrl, userId);
```

## Frontend Changes

### Main Dashboard (`packages/client/src/pages/app/index.tsx`)

1. Updated Supabase queries to include `creator_id` when fetching summaries:

```typescript
const { data } = await supabase
  .from('user_summaries')
  .select(`
    summary_id,
    summaries!inner (
      id,
      status,
      summary_text,
      created_at,
      updated_at,
      podcast_id,
      creator_id,  // Added this field
      podcasts (
        id,
        title,
        show_name,
        url,
        thumbnail_url,
        platform,
        platform_specific_id
      )
    )
  `)
  .eq('user_id', user.id);
```

2. Updated single summary fetch to include `creator_id`:

```typescript
const { data } = await supabase
  .from('summaries')
  .select(`
    id,
    status,
    summary_text,
    created_at,
    updated_at,
    podcast_id,
    creator_id,  // Added this field
    podcasts (
      id,
      title,
      show_name,
      url,
      thumbnail_url,
      platform,
      platform_specific_id
    )
  `)
  .eq('id', summaryId)
  .single();
```

3. Updated the optimistic update in handleSubmit to include `creator_id`:

```typescript
// Create optimistic summary entry
const optimisticSummary = {
  id: summaryId,
  status: 'in_queue',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  creator_id: user?.id,  // Added this field
  podcast: {
    id: 'temp-id',
    title: podcastTitle,
    show_name: channelName,
    url: url,
    thumbnail_url: thumbnailUrl,
    platform: platform,
    platform_specific_id: 'temp-id'
  }
};
```

4. Enhanced the `handleDeleteSummary` function to handle different actions based on creator status:

```typescript
const handleDeleteSummary = async (id: string) => {
  try {
    // Find the summary to check if the current user is the creator
    const summaryToDelete = summaries.find(s => s.id === id);
    
    // We'll send the action type to the API based on whether the user is the creator
    const isCreator = summaryToDelete?.creator_id === user?.id;
    const actionType = isCreator ? 'delete' : 'remove';
    
    console.log(`Deleting summary ${id}, user is ${isCreator ? 'creator' : 'not creator'}, action: ${actionType}`);
    
    const response = await fetch(`/api/summaries/${id}?action=${actionType}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    // Handle response...
    
    // Show a toast notification with appropriate message
    const successMessage = isCreator ? 
      'Summary deleted successfully' : 
      'Summary removed from your list';
    showToast.success(successMessage);
    
  } catch (error) {
    console.error('Error deleting summary:', error);
    showToast.error('Failed to delete summary');
    throw error;
  }
};
```

5. Updated the `handleRetrySummary` function to include `creator_id` in the optimistic update:

```typescript
// Create an optimistic entry for the new summary with podcast data from the old one
const optimisticNewSummary: SummaryWithPodcast = {
  id: newSummaryId,
  status: 'in_queue',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  creator_id: user?.id,  // Added this field
  podcast: oldSummary.podcast, // Copy podcast data from the old summary
  isRetrying: false
};
```

## Authentication Issues and Resolution

After implementing these changes, we encountered "invalid token" errors with the delete and retry functionality. This was resolved by:

1. Restarting the API server to refresh the authentication state
2. Ensuring proper synchronization between client tokens and server authentication

## Files Modified

1. **Database Schema**:
   - SQL migration to add `creator_id` column

2. **Backend**:
   - `packages/server/api/src/lib/database.ts` - Updated `createSummary` function
   - `packages/server/api/src/services/podcast.ts` - Updated `createPodcastRequest` method

3. **Frontend**:
   - `packages/client/src/pages/app/index.tsx` - Updated Supabase queries, optimistic updates, and handler functions

## Testing

To test this implementation:
1. Create a new summary as one user
2. Log in as a different user and share the summary
3. Verify that only the creator can fully delete the summary
4. Verify that the retry functionality properly sets the new summary's creator to the current user
5. Ensure no duplicate cards appear in the UI

## Future Considerations

- Add explicit permissions system for summaries
- Implement admin functionality to manage summaries regardless of creator
- Consider adding explicit sharing functionality between users 