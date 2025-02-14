READ THIS ENTIRE DOCUMENT BEFORE YOU START WORKING ON ANYTHING.
In this project, we are rebuilding our app with the new architecture. We're utilizing existing infrastructure like our supabase (postgresql db) and railway (for api and worker) and vercel (for client). 

Our old code had too many wires crossed and it was too hard to fix. So we took our learnings and started fresh with our new architecture, which is outlined in the file tree document. 

I've put together an old implementation documentation folder that includes snippets from our old code that can be used to inform our new code in this project. 

Your goal is not to copy the old code. It's there as a guide, a communication tool, and in some cases, code we can reuse.

We want to take the best from our old code—whether it be ideas, or actual code—and use that to expedite building our new app. But we don't want to follow the old code exactly, and make the same mistakes. 

So your job is to be smart and judicious. Do not just make decisions based on the old code. Question them, interrogate them, and ensure we're moving forward with a clear separation of services and quality code.

Make sure we are building a clean, bulletproof app, with a clear separation of concerns, from client to server. And shared should never be bloated. 


OTHER DOCUMENTS:
- @overview.md
- @architecture.txt
- @database-schema.txt
- @old-implementation


GUIDELINES:
Guidelines for Developers:

1.Clear Separation of Concerns

API does lightweight operations (metadata, record creation)
Worker handles heavy processing (transcripts, matching)
Never mix these responsibilities

2. Platform Service Rules
// ❌ Don't do this in API's youtube.ts
async getTranscript() {
  // Heavy processing belongs in worker
}

// ✅ Do this instead
async getMetadata() {
  // Light API calls only
}


3. Type Safety First

Always use types from shared package
No any types allowed
Define interfaces for all API responses


4. State Management
// ❌ Don't use string literals
status: 'processing'

// ✅ Use shared constants
status: ProcessingStatus.PROCESSING


5. Error Handling

Use custom error types from shared package
Always include context in errors
Handle platform-specific errors appropriately


6. Code Organization

One responsibility per file
Keep services focused and small
Don't duplicate platform logic between API/worker


7. Configuration

All environment variables defined in shared types
Use dependency injection for services
No hard-coded values
