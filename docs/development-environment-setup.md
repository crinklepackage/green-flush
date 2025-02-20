# Dependency Troubleshooting Guide

## Common Issues & Fixes

### 1. Module Resolution Issues
When you see "Cannot find module" errors:

```bash
# Refresh package state (Yarn 4 way)
yarn install --refresh-lockfile

# Build shared package
yarn workspace @wavenotes-new/shared build

# Update TypeScript SDK
yarn dlx @yarnpkg/sdks vscode
```

### 2. TypeScript Configuration
Add to your tsconfig.json:
```json
{
  "compilerOptions": {
    "types": ["node"],  // For console, process etc
    "lib": ["ES2020"],  // Modern JS features
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

### 3. Missing Types
Install type definitions:
```bash
# Add types to a workspace
yarn workspace @wavenotes-new/api add -D @types/express
yarn workspace @wavenotes-new/worker add -D @types/node
```

## Package Management
We use Yarn 4 with PnP (Zero-Installs):
- No `node_modules` directories
- Dependencies in `.yarn/cache`
- Package resolution via `.pnp.cjs`

### Key Commands
```bash
# Install/update dependencies
yarn install

# Refresh package state
yarn install --refresh-lockfile

# Add a dependency
yarn workspace @package add dependency

# Add a dev dependency
yarn workspace @package add -D dependency
```