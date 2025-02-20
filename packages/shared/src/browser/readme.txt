see readme.txt in types folder

## Browser Types (`browser/types.ts`)
- Simplified types for client UI
- Only includes fields needed for display
- Uses UI-friendly status values:
  ```typescript
  type Podcast = {
    id: string
    url: string
    platform: 'spotify' | 'youtube'
    status: 'pending' | 'processing' | 'completed'
  }
  ```