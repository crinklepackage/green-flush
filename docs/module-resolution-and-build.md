# Module Resolution and Build Process

This document explains our approach to module resolution and the build process in this monorepo. Understanding these concepts is crucial for maintaining a consistent and reliable development environment.

## Module Resolution Approach

We've implemented a consistent approach to TypeScript module resolution that ensures:

1. **Build-time type checking works correctly**
2. **Runtime imports resolve correctly**
3. **Development mode works seamlessly**

### Key Principles

1. **Source + Dist Resolution**: We configure TypeScript to look for modules in both `src` and `dist` directories, prioritizing source files during development.

```json
"paths": {
  "@wavenotes-new/shared": ["../../shared/src", "../../shared/dist"]
}
```

2. **Project References**: We use TypeScript project references to enforce build order:

```json
"references": [
  { "path": "../../shared" }
]
```

3. **Consistent Dependency Declarations**: Package dependencies are declared in both:
   - Workspace dependencies in `package.json`
   - TypeScript project references in `tsconfig.json`

## Build Process

The build process must follow the dependency order:

1. **shared package**: Contains types, utilities, and constants used by all services
2. **API package**: Depends on shared
3. **worker package**: Depends on both shared and API

The `build-all.sh` script handles this automatically, including proper error checking.

## Dev Environment Setup

Development mode uses TypeScript's path mapping to resolve imports directly to the source files, allowing for instant reflection of changes.

### Dev Environment Management

We provide two scripts to help manage the development environment:

1. **Full Reset**: When major changes are made or when module resolution issues occur:
   ```
   bash scripts/reset-dev-env.sh
   ```
   This performs a complete cleanup and reinstall of all dependencies.

2. **Rebuild**: When only the build artifacts need to be refreshed:
   ```
   bash scripts/build-all.sh
   ```
   This rebuilds all packages in the correct order.

## Module Resolution Details

### For Imports in API Package

When importing from the shared package in the API:

```typescript
import { SomeType } from '@wavenotes-new/shared'
```

TypeScript will look for the type in:
1. `../../shared/src` (for development)
2. `../../shared/dist` (for built artifacts)

### For Imports in Worker Package

When importing from the API package in the worker:

```typescript
import { something } from '@wavenotes-new/api/lib/someModule'
```

TypeScript will look in:
1. `../api/src/lib/someModule` (for development)
2. `../api/dist/lib/someModule` (for built artifacts)

## Troubleshooting

### Common Issues

1. **Missing Type Declarations**:
   - Error: `Could not find a declaration file for module '@wavenotes-new/shared'`
   - Solution: Ensure the shared package is built first

2. **Runtime Module Resolution**:
   - Error: `Cannot find module '@wavenotes-new/shared'`
   - Solution: Ensure the path mappings in tsconfig.json are correct

3. **Circular Dependencies**:
   - If you encounter circular dependency warnings, refactor the code to remove them
   - Move shared functionality to the shared package

### Reset Procedure

If you encounter module resolution issues that seem unsolvable:

1. Run the full reset script: `bash scripts/reset-dev-env.sh`
2. Check for error messages during the build
3. If errors persist, examine the specific file causing the problem

## Library Dependencies and Related Requirements  

Each package has its own `package.json` that defines its dependencies. We follow these rules:

1. Any module used by multiple packages is declared at the root `package.json`
2. Package-specific dependencies are declared in the package's own `package.json`

For TypeScript path resolution to work correctly across builds and dev mode:

1. Always maintain symmetry between package.json dependencies and tsconfig.json path references
2. When adding a new import path, update all relevant tsconfig.json files

## Conclusion

By following these guidelines, we maintain a clean separation of concerns while ensuring all packages can build and run correctly in all environments. 