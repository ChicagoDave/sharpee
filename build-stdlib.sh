#!/bin/bash
cd /mnt/c/repotemp/sharpee
pnpm run build:stdlib 2>&1 | tee logs/build-stdlib-$(date +%Y%m%d-%H%M%S).log
