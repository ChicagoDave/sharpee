#!/bin/bash
cd /mnt/c/repotemp/sharpee
pnpm test:stdlib 2>&1 | tee logs/test-stdlib-$(date +%Y%m%d-%H%M%S).log
