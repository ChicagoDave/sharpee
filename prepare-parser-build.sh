#!/bin/bash
# Script to prepare parser-en-us for building

set -e

REPO_ROOT="/mnt/c/repotemp/sharpee"
cd "$REPO_ROOT"

echo "Installing dependencies at root level..."
pnpm install

echo ""
echo "Dependencies installed. Ready to build."
