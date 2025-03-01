#!/bin/bash
# reset-dev-env.sh
# Script to reset the development environment to a clean state
# Usage: bash scripts/reset-dev-env.sh

set -e # Exit on any error

echo "🧹 Cleaning build artifacts..."
yarn clean

echo "🗑️ Clearing node_modules..."
rm -rf node_modules
rm -rf packages/shared/node_modules
rm -rf packages/server/api/node_modules
rm -rf packages/server/worker/node_modules
rm -rf packages/client/node_modules

echo "🧶 Reinstalling dependencies..."
yarn install

echo "🔨 Rebuilding all packages..."
bash scripts/build-all.sh

echo "✅ Development environment has been reset successfully!"
echo ""
echo "You can now start the development servers with:"
echo "yarn dev" 