#!/bin/bash
set -e

echo "⚙️ Building shared package..."
cd packages/shared
yarn build

echo "⚙️ Building client package..."
cd ../client
yarn build

echo "✅ Build completed successfully" 