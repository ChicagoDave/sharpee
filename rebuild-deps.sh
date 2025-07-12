#!/bin/bash
cd /mnt/c/repotemp/sharpee
# Build if-domain first
pnpm -F @sharpee/if-domain build
# Then build event-processor
pnpm -F @sharpee/event-processor build
