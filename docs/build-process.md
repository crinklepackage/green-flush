# Build Process Documentation

This document explains how the build process works in both local development and production environments.

## Package Dependencies

Our monorepo consists of several packages with dependencies between them:

```
shared package
    ↑
    | (depends on)
API package
    ↑
    | (depends on)
worker package
```

These dependencies require packages to be built in a specific order:

1. First build the `shared` package
2. Then build the `API` package (which depends on `shared`)
3. Finally build the `worker` package (which depends on both `shared` and `API`)

## Local Development Build

For local development, we've created a script that handles building all packages in the correct order:

```bash
# Run from project root
./scripts/build-all.sh
```

This script:
- Builds the shared package first
- Then builds the API package 
- Finally builds the worker package

If you're encountering TypeScript errors related to missing declaration files, it's likely because the packages weren't built in the correct order. The most common issue is the worker package failing to build because it can't find declaration files from the API package.

### Manual Build Process

If you prefer to build packages individually, make sure to follow this order:

```bash
# Step 1: Build shared
yarn workspace @wavenotes-new/shared build

# Step 2: Build API (depends on shared)
yarn workspace @wavenotes-new/api build

# Step 3: Build worker (depends on both shared and API)
yarn workspace @wavenotes-new/worker build
```

## Production Deployment (Railway)

In production, each service is deployed separately on Railway:

1. **Shared Package**: Not deployed directly, but built as part of the API and worker builds
2. **API Service**: Deployed as a separate service
3. **Worker Service**: Deployed as a separate service

### Production Build Process

When code is pushed to the main branch, Railway automatically builds and deploys each service:

1. **API Service Build**:
   - Railway runs the build command specified in `.railway/api.service.json`
   - This builds the shared package first, then the API package

2. **Worker Service Build**:
   - Railway runs the build command specified in `.railway/worker.service.json` and `nixpacks-worker.toml`
   - This builds the shared package first, then the worker package

Each service builds its dependencies separately, so there's no need for coordination between the builds.

## Common Build Issues

### Missing Declaration Files

If you see errors like:

```
Could not find a declaration file for module '@wavenotes-new/api/lib/database'
```

It means TypeScript can't find the type definitions for the API package. This typically happens when:

1. The API package hasn't been built yet
2. The API package was built without the `declaration: true` option in tsconfig.json

### Solution

Always build packages in the correct dependency order:
1. Shared
2. API 
3. Worker

The easiest way is to use the provided script: `./scripts/build-all.sh`

## Architecture Considerations

Our current architecture has the worker package directly importing from the API package. This creates a tighter coupling than is typical in microservices architecture. 

For future improvements, consider:
- Moving shared functionality to the shared package
- Reducing direct dependencies between services
- Using a more message-based approach for service communication 