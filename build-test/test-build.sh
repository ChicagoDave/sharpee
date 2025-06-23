#!/bin/bash
cd ..
echo "Running TypeScript build..."
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
