#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model
echo "Building world-model..."
pnpm build
echo "Running visibility tests..."
pnpm test -- --testNamePattern="visibility"
