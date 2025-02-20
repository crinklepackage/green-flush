# Worker Processors

## Overview
Three processors handle different aspects of podcast processing:

### TranscriptProcessor
- Gets transcripts with multiple fallback methods
- Methods defined in `platforms/youtube/`
- Pure transcript fetching, no state management

### SummaryProcessor
- Single responsibility: Claude AI integration
- Takes transcript, returns streaming summary
- No database/state management
- Pure AI interaction

### PodcastProcessor
- Main orchestrator of the process
- Manages job flow and state:
  1. Validates job data
  2. Coordinates transcript fetching
  3. Handles summary generation
  4. Updates status/progress
  5. Manages error states

## Flow
1. PodcastProcessor receives job
2. TranscriptProcessor fetches transcript
3. SummaryProcessor generates summary via Claude
4. Summary streams to client while saving to DB

## Key Principle
Each processor has a single responsibility:
- TranscriptProcessor: HOW to get transcripts
- SummaryProcessor: HOW to generate summaries
- PodcastProcessor: WHAT happens during processing




—————
Let me explain the functionality and how these pieces fit together:
1. Core Flow:
User submits a podcast URL
System fetches transcript
System generates summary while streaming updates
Everything gets saved to database

Each Component's Role:
PodcastProcessor: The Orchestrator
- Takes a job with podcast details
- Manages the entire process flow
- Updates status/progress at each step
- Handles errors if anything fails
- Most importantly: Coordinates between transcript and summary generation

SummaryProcessor: The AI Handler
- Single responsibility: Talk to Claude
- Takes a transcript, returns a streaming summary
- Doesn't care about database or status - just AI interaction
- Streams the summary back chunk by chunk

DatabaseService: The State Manager
- Keeps track of everything's status
- Saves transcripts when we get them
- Updates summary text as it streams in
- Records any errors that happen

The key interactions:
- PodcastProcessor asks TranscriptProcessor for a transcript
- When it gets it, tells DatabaseService to save it
- Passes transcript to SummaryProcessor for summarization
- As SummaryProcessor streams back chunks:
    - Appends them to build the full summary
    - Uses DatabaseService to save progress
    - Updates status so frontend knows what's happening

It's like an assembly line where:
- PodcastProcessor is the supervisor
- TranscriptProcessor and SummaryProcessor are specialized workers
- DatabaseService is keeping track of everything
