#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/stdlib
pnpm test 2>&1 | tee /mnt/c/repotemp/sharpee/logs/test-stdlib-$(date +%Y%m%d-%H%M%S).log
