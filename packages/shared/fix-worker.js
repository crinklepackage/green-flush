const fs = require('fs');
const path = require('path');

// Path to the worker transcript processor
const workerDir = path.resolve(__dirname, '../server/worker');
const transcriptProcessorPath = path.join(workerDir, 'src/processors/transcript.ts');

console.log('Checking if transcript processor exists:', transcriptProcessorPath);
if (fs.existsSync(transcriptProcessorPath)) {
  // Read the file
  let content = fs.readFileSync(transcriptProcessorPath, 'utf8');
  
  // Check if it contains references to TranscriptSource
  if (content.includes('TranscriptSource.SUPADATA')) {
    console.log('Found TranscriptSource references, creating direct imports...');
    
    // Add a direct definition at the top of the file
    const directDefinition = `
// Direct TranscriptSource definition to prevent runtime errors
const TranscriptSource = {
  SUPADATA: "supadata",
  YOUTUBE_TRANSCRIPT: "youtube-transcript",
  YOUTUBE_API: "YouTube API"
};
`;
    
    // Insert the direct definition after imports
    const importEndIndex = content.lastIndexOf('import ');
    const importEndLineIndex = content.indexOf('\n', importEndIndex);
    
    if (importEndLineIndex !== -1) {
      content = content.substring(0, importEndLineIndex + 1) + directDefinition + content.substring(importEndLineIndex + 1);
      
      // Write back the modified file
      fs.writeFileSync(transcriptProcessorPath, content, 'utf8');
      console.log('Successfully added direct TranscriptSource definition to transcript processor');
    } else {
      console.log('Could not find import section in transcript processor');
    }
  } else {
    console.log('TranscriptSource references not found in transcript processor');
  }
} else {
  console.log('Transcript processor file not found');
}

// Also create a fallback file that will be used during build
const fallbackDir = path.join(__dirname, 'dist/fallback');
if (!fs.existsSync(fallbackDir)) {
  fs.mkdirSync(fallbackDir, { recursive: true });
}

// Create a fallback file with direct TranscriptSource definition
const fallbackContent = `
// Fallback TranscriptSource definition
exports.TranscriptSource = {
  SUPADATA: "supadata", 
  YOUTUBE_TRANSCRIPT: "youtube-transcript",
  YOUTUBE_API: "YouTube API"
};
`;

fs.writeFileSync(path.join(fallbackDir, 'transcript-source.js'), fallbackContent, 'utf8');
console.log('Created fallback TranscriptSource definition');

console.log('Fix worker script completed.'); 