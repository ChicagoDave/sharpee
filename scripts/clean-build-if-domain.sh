#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/if-domain
# Clean the dist folder first
rm -rf dist
# Then build
pnpm build
