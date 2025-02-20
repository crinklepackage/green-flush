// packages/server/worker/src/worker.service.ts
import type { YouTubeApiClient } from '../platforms/youtube/api-client';

export class WorkerService {
  private youtube: YouTubeApiClient;

  constructor(youtube: YouTubeApiClient) {
    this.youtube = youtube;
  }

  async close(): Promise<void> {
    // Implement any required shutdown logic here, if needed.
  }
}