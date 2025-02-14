# WaveNotes Project Documentation

## Overview
WaveNotes is a podcast transcription and summarization service that processes both Spotify and YouTube content. The application allows users to submit podcast URLs and receive AI-generated summaries.

## Core Business Flow
1. User submits a podcast URL (Spotify or YouTube)
2. System processes the URL:
   - For YouTube: Direct transcript fetching
   - For Spotify: Find matching YouTube video → fetch transcript
3. System generates summary using Claude AI
4. Real-time updates show progress to user

## Tech Stack
- **Frontend**: Next.js deployed on Vercel
- **Backend**: Express API and Worker services on Railway
- **Database**: Supabase (PostgreSQL + Auth)
- **Queue**: BullMQ with Redis
- **AI**: Claude/Anthropic for summarization
- **Infrastructure**: Vercel (frontend) and Railway (backend services)

## Project Structure
```plaintext
/wavenotes
├── package.json  # Workspace definitions
└── packages
    ├── shared           
    │   └── src
    │       └── types.ts # Shared types across packages
    │
    ├── server
    │   ├── api/        # Deploys to Railway (API service)
    │   │   └── src/
    │   │       ├── platforms/
    │   │       │   ├── youtube.ts    # YouTube metadata & search
    │   │       │   ├── spotify.ts    # Spotify API integration
    │   │       │   └── matcher.ts    # Spotify → YouTube matching
    │   │       └── routes/
    │   │           └── podcasts.ts   # API endpoints
    │   │
    │   └── worker/     # Deploys to Railway (Worker service) 
    │       └── src/
    │           ├── platforms/
    │           │   └── youtube/
    │           │       └── transcript.ts  # Transcript fetching
    │           └── processors/
    │               ├── podcast.ts    # Main processing logic
    │               └── summary.ts    # Claude integration
    │
    └── client          # Deploys to Vercel
        └── src/
            ├── pages/
            │   ├── index.tsx         # Marketing homepage
            │   ├── pricing.tsx       # Pricing page
            │   ├── auth/
            │   │   ├── login.tsx     # /auth/login
            │   │   └── signup.tsx    # /auth/signup
            │   ├── app/
            │   │   ├── index.tsx     # /app (dashboard)
            │   │   └── [id].tsx      # /app/[id] (summary page)
            │   └── s/
            │       └── [id].tsx      # /s/[id] (public summaries)
            ├── components/
            │   ├── marketing/        # Marketing components
            │   └── app/             # App components
            └── lib/
                ├── supabase.ts      # Supabase client
                └── api.ts           # API client functions

```

## Key Components Implemented

### 1. Shared Types
```typescript
// packages/shared/src/types.ts
export type Platform = 'spotify' | 'youtube'

export const ProcessingStatus = {
  IN_QUEUE: 'in_queue',
  FINDING_YOUTUBE: 'finding_youtube',
  FETCHING_TRANSCRIPT: 'fetching_transcript',
  TRANSCRIPT_READY: 'transcript_ready',
  GENERATING_SUMMARY: 'generating_summary',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const

// ... other type definitions
```

### 2. Transcript Processing
The worker implements multiple fallback methods for transcript fetching:
- YouTube Transcript API
- yt-dlp utility
- Kyoutube package
- Supadata integration

Order is configurable between environments via environment variables.

### 3. Platform Matching
Robust matching logic to find YouTube equivalents of Spotify podcasts using:
- Title similarity matching
- Duration comparison
- Channel/show name matching
- Configurable scoring weights

## Current Status
- Basic project structure established
- Core types defined
- Transcript processing logic implemented with fallbacks
- Platform matching logic implemented
- Next steps include implementing the API endpoints and frontend components

## Deployment
- Frontend deploys to Vercel
- API and Worker services deploy to Railway
- Each service has its own environment variables and configuration

## Environment Variables
```bash
# Frontend (.env)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=

# API Service (.env)
DATABASE_URL=
SUPABASE_SERVICE_KEY=
YOUTUBE_API_KEY=

# Worker Service (.env)
DATABASE_URL=
SUPABASE_SERVICE_KEY=
CLAUDE_API_KEY=
REDIS_URL=
```