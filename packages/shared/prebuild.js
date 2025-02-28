// prebuild.js - Ensure dist directory exists
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, 'dist');

console.log('Ensuring dist directory exists:', distDir);
if (!fs.existsSync(distDir)) {
  console.log('Creating dist directory...');
  fs.mkdirSync(distDir, { recursive: true });
}

// Create an empty index.js and index.d.ts files if they don't exist
// This helps with potential race conditions in importing packages
const indexFile = path.join(distDir, 'index.js');
const dtsFile = path.join(distDir, 'index.d.ts');

if (!fs.existsSync(indexFile)) {
  console.log('Creating placeholder index.js...');
  fs.writeFileSync(indexFile, '// Placeholder file created by prebuild.js\n');
}

if (!fs.existsSync(dtsFile)) {
  console.log('Creating placeholder index.d.ts...');
  fs.writeFileSync(dtsFile, '// Placeholder file created by prebuild.js\n');
}

console.log('Prebuild completed successfully.'); 