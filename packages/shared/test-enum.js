// Test file to verify TranscriptSource enum
console.log('Starting test for TranscriptSource...');

try {
  // The file should be available after prebuild
  const shared = require('./dist');
  
  console.log('Shared package loaded:', Object.keys(shared));
  
  if (shared.TranscriptSource) {
    console.log('TranscriptSource enum found:', shared.TranscriptSource);
    console.log('SUPADATA value:', shared.TranscriptSource.SUPADATA);
    console.log('YOUTUBE_TRANSCRIPT value:', shared.TranscriptSource.YOUTUBE_TRANSCRIPT);
    console.log('YOUTUBE_API value:', shared.TranscriptSource.YOUTUBE_API);
  } else {
    console.error('ERROR: TranscriptSource enum not found in shared package!');
    console.log('Available exports:', Object.keys(shared));
  }
  
  // Try importing directly from transcript module
  const transcript = require('./dist/server/types/transcript');
  console.log('Direct transcript module:', Object.keys(transcript));
  console.log('Direct TranscriptSource:', transcript.TranscriptSource);
} catch (error) {
  console.error('Test failed with error:', error);
} 