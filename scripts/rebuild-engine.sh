#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/engine

# Clean everything
rm -rf dist/*
rm -f *.bak
rm -f *.sh

# Rebuild
echo "Building engine package..."
pnpm build
