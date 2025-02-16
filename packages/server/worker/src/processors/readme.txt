transcript.ts
This processor handles getting the transcript, with multiple fallback methods.
methods are defined in server/worker/src/platforms/youtube/

summary.ts
This processor handles the Claude streaming integration

The flow is:
TranscriptProcessor gets the transcript using various methods
SummaryProcessor uses that transcript to generate a summary via Claude
Summary is streamed back to client in real-time while also being saved to DB