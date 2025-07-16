#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/stdlib
echo "Running TypeScript compiler check..."
npx tsc --noEmit
echo "Exit code: $?"
