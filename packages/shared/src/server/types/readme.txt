# Shared Types

## Core Files
- `status.ts` - Processing status enums and types
  - Server: Database/processing states (snake_case)
  - Client: UI display states (CAPS)
  - Used by: API, Worker, Client UI

- `metadata.ts` - Database and platform types
  - Database schema types (PodcastRecord, SummaryRecord)
  - Platform metadata (VideoMetadata)
  - Used by: API (DB operations), Worker (processing)

- `errors.ts` - Shared error classes
  - ValidationError: For input validation
  - DatabaseError: For DB operations
  - Used by: API, Worker for consistent error handling

## Transforms
- `transforms/status.ts` - Maps between server/client states
  - Converts DB states to UI states
  - Used by: API responses



# Shared Types

## Database Types (`metadata.ts`)
- Full database schema representation
- Used by server-side code (API/Worker)
- Includes all fields needed for processing:
  ```typescript
  interface PodcastRecord {
    id: string
    url: string
    platform: 'spotify' | 'youtube'
    youtube_url: string | null
    title: string
    show_name: string
    transcript: string | null
    has_transcript: boolean
    created_at: string
    // ... other DB fields
  }
  ```

## Browser Types (`browser/types.ts`)
- Simplified types for client UI
- Only includes fields needed for display
- Uses UI-friendly status values:
  ```typescript
  type Podcast = {
    id: string
    url: string
    platform: 'spotify' | 'youtube'
    status: 'pending' | 'processing' | 'completed'
  }
  ```

## Why Separate?
1. Database types match Supabase schema exactly
2. Browser types are minimal for smaller bundle size
3. Clear separation between server/client concerns
4. Different status representations for different needs