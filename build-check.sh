#!/bin/bash
cd /mnt/c/repotemp/sharpee
echo "Building stdlib package..."
pnpm run build:stdlib 2>&1 | tee logs/build-stdlib-$(date +%Y%m%d-%H%M%S).log
echo "Build complete. Check the log for any remaining errors."
