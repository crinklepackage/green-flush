READ THIS ENTIRE DOCUMENT BEFORE YOU START WORKING ON ANYTHING.
In this project, we are rebuilding our app with the new architecture. We're utilizing existing infrastructure like our supabase (postgresql db) and railway (for api and worker) and vercel (for client). 

ALWAYS:
- Read documentation completely before suggesting changes
- Don't over-interpret single lines of documentation
- Question my assumptions when they lead to major refactors
- Question your assumptions when they lead to major refactors
- Always read the entire file from start to finish
- Always finish reading a file before taking action

Our old code had too many wires crossed and it was too hard to fix. So we took our learnings and started fresh with our new architecture, which is outlined in the @architecture.txt document. 

Always read docs and files, and always read them to the end, from start to finish. If you don't read the whole file from the start, then recognize that, and read it from the bottom. Always finish it before taking action to gain maximum context and undersatnding. 

I've put together an old implementation documentation folder @docs/old-implementation that includes snippets from our old code that can be used to *inform* but not *dictate* our new code in this project. 

Your goal is *not* to copy the old code. It's there as a guide, a communication tool, and in some cases, code we can reuse.

We want to take the best from our old code—whether it be ideas, or actual code—and use that to expedite building our new app. But we don't want to follow the old code exactly, and make the same mistakes. 

So your job is to be smart and judicious. Do not just make decisions based on the old code. Question them, interrogate them, and ensure we're moving forward with a clear separation of services and quality code.


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
