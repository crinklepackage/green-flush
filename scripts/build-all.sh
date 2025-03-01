#!/bin/bash
# build-all.sh
# Script to build all packages in the correct dependency order
# Usage: bash scripts/build-all.sh

set -e # Exit on any error

echo "🧹 Cleaning previous builds..."
yarn clean

echo "🔨 Building packages in dependency order..."

# Step 1: Build shared package first
echo "📦 Building shared package..."
yarn workspace @wavenotes-new/shared build
if [ $? -ne 0 ]; then
  echo "❌ Shared package build failed! See errors above."
  exit 1
fi
echo "✅ Shared package built successfully!"

# Step 2: Build API package next (depends on shared)
echo "📦 Building API package..."
yarn workspace @wavenotes-new/api build
if [ $? -ne 0 ]; then
  echo "❌ API package build failed! See errors above."
  exit 1
fi
echo "✅ API package built successfully!"

# Step 3: Build worker package last (depends on both shared and API)
echo "📦 Building worker package..."
yarn workspace @wavenotes-new/worker build
if [ $? -ne 0 ]; then
  echo "❌ Worker package build failed! See errors above."
  exit 1
fi
echo "✅ Worker package built successfully!"

echo "🎉 All packages built successfully!" 