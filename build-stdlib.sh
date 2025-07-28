#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/stdlib
pnpm build 2>&1 | tee /mnt/c/repotemp/sharpee/logs/build-stdlib-$(date +%Y%m%d-%H%M%S).log
