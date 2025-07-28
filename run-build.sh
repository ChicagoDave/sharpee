#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/stdlib
echo "Building stdlib package..."
pnpm build 2>&1 | tee /mnt/c/repotemp/sharpee/logs/build-stdlib-$(date +%Y%m%d-%H%M%S).log
echo "Build complete. Check the log for any errors."
