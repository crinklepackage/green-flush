import { TranscriptResult, TranscriptError } from '@wavenotes-new/shared';

export const spotifyApiClient = {
  async getTranscript(episodeId: string): Promise<TranscriptResult> {
    if (!episodeId) {
      throw new TranscriptError('Invalid Spotify episode ID', 'INVALID_ID', episodeId);
    }
    // Simulate delay for fetching transcript
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      text: `Simulated transcript for Spotify episode ${episodeId}.`,
      available: true,
      // Casting source as any to bypass schema restrictions; consider updating the TranscriptSource enum if needed
      source: 'SPOTIFY' as any
    };
  }
}; 