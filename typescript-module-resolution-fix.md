# TypeScript Module Resolution Investigation & Fix

## Problem Discovery

We identified a critical issue in our monorepo structure where the API package couldn't properly resolve imports from the shared package during both the build process and development mode. The issues manifested as:

```
Error: Cannot find module '@wavenotes-new/shared' or its corresponding type declarations.
```

And in development mode:
```
Error: Cannot find module '/Users/robert/apps/wavenotes-new/packages/server/api/node_modules/@wavenotes-new/shared/dist/index.js'. Please verify that the package.json has a valid "main" entry
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
- In development, Node.js tries to find the module in `node_modules/@wavenotes-new/shared/dist/index.js`, but our TypeScript paths don't align with the runtime resolution

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

## Implemented Solution

We implemented a comprehensive solution addressing both build-time and runtime module resolution:

### 1. TypeScript Path Configuration Fixes

We updated tsconfig.json files to align with how Yarn workspaces structure packages:

**API Package:**
```json
// packages/server/api/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@wavenotes-new/shared": ["../../shared/src"]
    },
    "composite": true
  },
  "references": [
    { "path": "../../shared" }
  ]
}
```

**Worker Package:**
```json
// packages/server/worker/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@wavenotes-new/shared": ["../../shared/src"],
      "@wavenotes-new/api/*": ["../api/src/*"]
    },
    "composite": true
  },
  "references": [
    { "path": "../../shared" },
    { "path": "../api/tsconfig.json" }
  ]
}
```

**Shared Package:**
```json
// packages/shared/tsconfig.json
{
  "compilerOptions": {
    "composite": true,
    "declarationMap": true
  }
}
```

**Root Configuration:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "composite": true
  },
  "references": [
    { "path": "packages/shared" },
    { "path": "packages/server/api" },
    { "path": "packages/server/worker" },
    { "path": "packages/client" }
  ]
}
```

### 2. Development Environment Configuration

For development mode, we addressed the runtime module resolution:

1. **Added tsconfig-paths to resolve TypeScript paths at runtime:**
   ```json
   // packages/server/api/package.json
   {
     "scripts": {
       "dev": "ts-node-dev --require tsconfig-paths/register ./src/index.ts"
     },
     "devDependencies": {
       "tsconfig-paths": "^4.2.0"
     }
   }
   ```

   ```json
   // packages/server/worker/package.json
   {
     "scripts": {
       "dev": "ts-node-dev --require tsconfig-paths/register --respawn --transpile-only ./src/index.ts"
     },
     "devDependencies": {
       "tsconfig-paths": "^4.2.0"
     }
   }
   ```

2. **Updated shared package.json to expose source files:**
   ```json
   // packages/shared/package.json
   {
     "exports": {
       ".": {
         "require": "./dist/index.js",
         "import": "./dist/index.js",
         "source": "./src/index.ts",
         "types": "./dist/index.d.ts"
       }
     },
     "files": [
       "dist",
       "src"
     ]
   }
   ```

### 3. Build Process Enhancements

We updated build scripts to properly handle TypeScript project references:

```json
// packages/shared/package.json
{
  "scripts": {
    "build": "rm -rf dist && tsc --build"
  }
}
```

```json
// packages/server/api/package.json
{
  "scripts": {
    "build": "tsc --build"
  }
}
```

```json
// packages/server/worker/package.json
{
  "scripts": {
    "build": "tsc --build"
  }
}
```

## Validation

We validated our solution with:

1. **Sequential Package Builds:**
   - Shared package builds successfully with `tsc --build`
   - API package builds successfully with `tsc --build`, correctly finding types from shared
   - Worker package builds successfully with `tsc --build`, correctly finding types from shared and API

2. **Development Mode:**
   - API starts without errors using `ts-node-dev --require tsconfig-paths/register`
   - Worker starts without errors using `ts-node-dev --require tsconfig-paths/register`
   - API responds correctly to requests (validated with `curl http://localhost:3001/health`)

## Key Lessons

1. **TypeScript Path Alignment**: TypeScript path configurations must align with how package managers (like Yarn) create symlinks in workspaces.

2. **Runtime vs. Compile-time Resolution**: Both environments need separate solutions - TypeScript paths for compilation and runtime path resolution for development.

3. **Project References**: Using TypeScript project references helps establish correct build order and dependency relationships.

4. **Source vs. Distribution**: For monorepos, pointing to source files during development provides a more consistent experience than relying on built artifacts.

## Future Improvements

As the project matures beyond MVP, we can consider:

1. **Optimizing Build Process**: Enhance Turbo config for more efficient builds
2. **Improved Development Experience**: Pre-building packages for faster startup times
3. **Automated Testing**: Add tests to verify cross-package imports work correctly
4. **Documentation**: Document the module resolution approach for future contributors 