#!/usr/bin/env bash

# Build test script for world-model package

echo "Building world-model package..."
cd /c/repotemp/sharpee/packages/world-model

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist

# Run TypeScript compiler
echo "Running TypeScript compiler..."
npx tsc 2>&1

echo "Build complete."
