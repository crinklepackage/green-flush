# TypeScript Module Resolution Investigation & Fix

## Problem Discovery

We identified a critical issue in our monorepo structure where the API package couldn't properly resolve imports from the shared package during the build process. The issue manifests as:

```
Error: Cannot find module '@wavenotes-new/shared' or its corresponding type declarations.
```

This occurs despite:
- Individual package builds working correctly
- The shared package building successfully
- The API package building successfully when run directly

## Root Cause Analysis

After comprehensive investigation, we identified a fundamental mismatch in how modules are being resolved:

### 1. Configuration Mismatch

- **TypeScript Path Configuration**: 
  ```json
  // In API's tsconfig.json
  "paths": {
    "@wavenotes-new/shared": ["../../shared/dist"]
  }
  ```

- **Workspace Dependency**:
  ```json
  // In API's package.json
  "@wavenotes-new/shared": "file:../../shared"
  ```

This creates a critical disconnect:
- TypeScript is looking for modules in `../../shared/dist`
- Yarn workspace creates a symlink to the root of the shared package
- The built files in `dist` are not available through the workspace symlink

### 2. Yarn Workspace Behavior

- We recently migrated from Yarn PnP to node-modules linker
- Workspace symlinks point to package roots, not build outputs
- Build artifacts aren't automatically included in workspace links

### 3. Unified Build Process

- The Turbo pipeline correctly specifies build dependencies:
  ```json
  "build": {
    "dependsOn": ["^build"]
  }
  ```
- But the module resolution issue prevents successful cross-package compilation

## Solution Strategy: Incremental Implementation

For our MVP, we'll focus on getting the system working locally and deployed to production with minimal changes:

### Phase 1: Fix Module Resolution (Current Priority)

1. **Align TypeScript Configuration with Workspace Structure**:
   - Update API's tsconfig.json to reference the shared package as it exists in the workspace
   - Fix imports to accurately reflect the file structure

2. **Test Local Development**:
   - Verify successful local builds
   - Ensure dev mode works properly

### Phase 2: Deployment Validation

1. **Test Railway Deployment**:
   - Validate that API builds correctly in CI
   - Verify artifacts are structured correctly for deployment

2. **Test Vercel Integration**:
   - Ensure frontend can interact with deployed API

### Future Enhancements (Post-MVP)

As the project matures, we can consider:

- Adding comprehensive cross-package tests
- Improving local development experience
- Optimizing build performance
- Implementing TypeScript project references for more robust dependency management

## Technical Implementation Plan

### 1. Module Resolution Fix

1. Update API's tsconfig.json:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@wavenotes-new/shared": ["../../shared/src"]
       }
     }
   }
   ```

2. OR use workspace-specific dependencies:
   ```json
   // In API's package.json
   {
     "dependencies": {
       "@wavenotes-new/shared": "workspace:*"
     }
   }
   ```

### 2. Validation Steps

- Build shared package: `cd packages/shared && yarn build`
- Build API package: `cd packages/server/api && yarn build`
- Run full project build: `yarn build`
- Test local development: `yarn dev`

This incremental approach allows us to address the immediate blocking issue while laying the groundwork for more robust solutions as our project matures beyond MVP. 