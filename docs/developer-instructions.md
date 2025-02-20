READ THIS ENTIRE DOCUMENT BEFORE YOU START WORKING ON ANYTHING.
In this project, we are rebuilding our app with the new architecture. We're utilizing existing infrastructure like our supabase (postgresql db) and railway (for api and worker) and vercel (for client). 

ALWAYS
When suggesting solutions, code, and changes:
- Read documentation completely before suggesting changes
- Don't over-interpret single lines of documentation
- Question my assumptions when they lead to major refactors
- Question your assumptions when they lead to major refactors
- Always read the entire file from start to finish
- Always finish reading a file before taking action
- Always keep separation of concerns in mind. Every time you suggest code, you must first consider separation of concerns. No patches or quick immediate fixes. Always zoom out and see the bigger picture before suggesting code.
- Think about architecture first, not just fixing errors
- Consider where code should live, not just where it could live
- Look for patterns in our existing codebase
- Consider reusability and maintainability
- Suggest proper separation of concerns
- If you're not sure about architecture, ask before implementing
- Work within our existing structure first
- Reference but don't blindly copy old code
- Follow the patterns we've already established
- Ask to see relevant files if needed
- Suggest new files only when they clearly fit our architecture
- Check for similar patterns in our codebase
- Only suggest new files if you can't find existing solutions

Or more simply:
- "Don't just fix the immediate problem - think about where this code belongs in our architecture and why."


ALWAYS when dealing with file path issues:
- Check if these services already exist in our codebase (maybe under a different name or file name)
- Look at how similar services are structured in our API or other packages
- See if we're just having import/path issues


Working in the /client package:
The key is keeping parallel structure between node and browser while maintaining the separation between:

Entities (database records)
Requests (API inputs)
Jobs (queue processing)

—
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

Working in the /client package:
The key is keeping parallel structure between node and browser while maintaining the separation between:

Entities (database records)
Requests (API inputs)
Jobs (queue processing)

packages/shared/src/
├── browser/                # Browser-specific code
│   └── types/
│       ├── entities/      # Client-side record types
│       ├── requests/      # API request types
│       └── jobs/          # Job types
├── node/                  # Node-specific code
│   ├── schemas/          # Zod validation
│   ├── types/            # Full DB types
│   └── errors/           # Server errors
└── common/               # Truly shared code
    ├── transforms/       # Pure functions like mapStatusToClient
    ├── constants/        # Shared constants
    └── types/            # Shared type utilities

Good for common: 
// common/transforms/status.ts
export const mapStatusToClient = (serverStatus: string): string => {
  const statusMap = {
    'in_queue': 'IN_QUEUE',
    'processing': 'PROCESSING'
  } as const
  return statusMap[serverStatus] || serverStatus
}

// common/constants/status.ts
export const PROCESSING_STATUSES = ['in_queue', 'processing'] as const


Not for common:
// This belongs in node/types/database.ts
export interface Database {
  public: {
    Tables: {
      podcasts: { /* ... */ }
    }
  }
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
