# TypeScript Build Issues and Solutions

## Problem Summary

Our TypeScript compilation process has a critical mismatch between:
- The source code organization in `packages/shared/src/*`
- The expected paths in the compiled output at `/dist/shared/*`

This causes build failures specifically:
1. Local TypeScript errors in the API package
2. Failed deployments on Railway
3. Missing type definitions for imported modules

The core issue is that the `@wavenotes-new/shared` package exports from paths like `./server/types/status` but the compiled output structure expects paths like `./types/status`.

## Solution Options

### Option 1: Update index.ts to Match Compiled Structure

This approach keeps the file organization intact but updates the exports to match expected paths.

#### Steps:

1. **Backup the current index.ts file**
   ```bash
   cp packages/shared/src/index.ts packages/shared/src/index.ts.bak
   ```

2. **Create a new index.ts that uses the correct compiled paths**
   ```typescript
   // Core type exports matching the compiled structure
   export * from './types/status';
   export * from './types/database';
   export * from './types/metadata';
   export * from './types/errors';
   
   // Node schemas
   export * from './node/schemas';
   
   // Browser types
   export * from './browser/types';
   
   // Utilities
   export { 
     extractYouTubeVideoId,
     isYouTubeUrl,
     buildYouTubeUrl
   } from './transforms/url';
   
   // Claude prompts
   export { CLAUDE_PROMPTS } from './common/prompts/claude-prompts';
   ```

3. **Create alias files for missing paths**
   - Create the directories and files that are referenced but don't exist
   - Each file would re-export from the actual source location
   - Example: `packages/shared/src/types/status.ts` would export from `packages/shared/src/server/types/status.ts`

4. **Test the build locally**
   ```bash
   cd packages/shared && yarn build
   cd packages/server/api && yarn build
   ```

5. **Update import paths in other packages** if necessary

#### Pros:
- Quick to implement
- Directly addresses the immediate build failures
- Less risky than restructuring files

#### Cons:
- Introduces redirection/indirection
- Doesn't address the underlying architectural inconsistency
- Could make future refactoring more confusing

### Option 2: Fix TypeScript Configuration

This approach focuses on making TypeScript respect your domain organization.

#### Steps:

1. **Update the shared package's tsconfig.json**
   ```json
   {
     "compilerOptions": {
       "rootDir": "./src",
       "outDir": "./dist",
       "declaration": true,
       "preserveSymlinks": true,
       "paths": {
         "@/*": ["./src/*"]
       },
       // Other options...
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist", "**/*.test.ts"]
   }
   ```

2. **Ensure proper module resolution**
   - Add `"moduleResolution": "node"` if not already present
   - Set `"esModuleInterop": true`

3. **Fix the package.json main/types fields**
   ```json
   {
     "name": "@wavenotes-new/shared",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "exports": {
       ".": {
         "import": "./dist/index.js",
         "require": "./dist/index.js",
         "types": "./dist/index.d.ts"
       }
     }
   }
   ```

4. **Update the build script**
   ```json
   "scripts": {
     "build": "rm -rf dist && tsc --project tsconfig.json"
   }
   ```

5. **Test the build locally**
   ```bash
   cd packages/shared && yarn build
   cd packages/server/api && yarn build
   ```

#### Pros:
- Preserves your current architecture and file organization
- More sustainable long-term solution
- Better alignment with your separation of concerns

#### Cons:
- More complex to implement correctly
- May require additional configuration changes
- Risk of breaking other dependencies during the change

## Recommendation: Option 1

**Option 1 (Update index.ts)** is recommended for immediate implementation because:

1. **It's focused on solving your immediate problem** - getting your app deployed to production
2. **Lower risk** - you're only changing a single file, not configuration that might have cascading effects
3. **Quicker implementation** - can be completed in minutes rather than hours
4. **Predictable outcome** - directly addresses the path mismatch causing build failures

## Production Deployment

**You can absolutely get to production without a complete cleanup**. The recommended approach will create the necessary bridge between your current code organization and what the build system expects, allowing your app to compile and deploy.

All you need to do is:
1. Update the index.ts file to use the paths that match the compiled structure
2. Create minimal re-export files for any missing paths
3. Test the build locally
4. Deploy

This is a common pattern in software development - implement a targeted fix to unblock progress, then plan for more thorough refactoring later.

## Long-Term Clean-up Strategy

For cleaning up this technical debt in the future, a **hybrid approach** is recommended:

### Phase 1: Package-Level Architecture Alignment (1-2 weeks)
- Create a clear architecture document for each package
- Ensure each package's tsconfig.json is properly configured
- Define consistent naming patterns (e.g., *.entity.ts, *.schema.ts)
- Set up proper barrel files (index.ts) in each directory

### Phase 2: Domain-by-Domain Migration (2-4 weeks)
- Work on one domain at a time (e.g., podcasts, then feedback, etc.)
- For each domain:
  1. Move the files to their proper locations
  2. Update imports across the codebase
  3. Test thoroughly before moving to the next domain

### Phase 3: Cross-Package Integration Testing (1 week)
- Ensure cross-package references are working correctly
- Set up integration tests between packages
- Validate the build system works in CI environments

This approach balances the need for systematic restructuring with the ability to deliver incremental value. By working domain-by-domain, you:

1. Minimize the risk of system-wide failures
2. Can deploy after each domain is completed
3. Spread the cognitive load over time
4. Make it easier to track progress

Throughout this process, maintain a detailed migration log to help the team understand what changed and why. 