#!/bin/bash
# Quick test - just run the cloak story without rebuilding everything

echo -e "\033[36m=== Running Cloak of Darkness ===\033[0m"
echo "Starting game..."

# Override Node module resolution to handle @sharpee packages
NODE_PATH="packages/core:packages/world-model:packages/event-processor:packages/stdlib:packages/lang-en-us:packages/engine" \
node --require ./module-resolver.js stories/cloak-of-darkness/dist/test-runner.js
