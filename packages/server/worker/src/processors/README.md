# Worker Processors Directory

This directory previously contained processor classes that handled specific processing operations for the worker layer.

## Removed Processors

The following processors have been **removed** from the codebase:

1. **SummaryProcessor**: Previously handled Claude API interactions for summary generation
2. **PodcastProcessor**: Previously handled podcast processing workflows

These processors were removed because they have been completely replaced by the service-based approach in the `services` directory.

## Modern Architecture

Our current architecture uses the following services instead:

- **SummaryGeneratorService**: Located in `packages/server/worker/src/services/summary-generator.ts`
- **ContentProcessorService**: Located in `packages/server/worker/src/services/content-processor.ts`

## Migration Path

All code should use the services from the `services` directory:

```typescript
// Modern approach with SummaryGeneratorService
import { SummaryGeneratorService } from '../services/summary-generator';

await SummaryGeneratorService.generateSummary(transcript, async (chunk) => {
  // Process chunk
});
```

## Why We Migrated

1. **Architecture**: Service-based approach is more consistent with our application architecture
2. **Functionality**: Services include token counting and use modern API patterns
3. **Maintenance**: Centralizing functionality in services reduces duplication
4. **Configurability**: Services leverage shared constants more effectively
5. **Testing**: Services are easier to mock and test

## Directory Retention

This directory is retained for:
1. Historical documentation
2. Potential future processors that fit the worker architecture 