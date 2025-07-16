#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/event-processor
pnpm build 2>&1 | tee ../../logs/build-ep-final.log
