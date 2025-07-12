#!/bin/bash
cd /mnt/c/repotemp/sharpee
pnpm --filter @sharpee/world-model test tests/unit/world 2>&1 | tee /mnt/c/repotemp/sharpee/logs/test-wm-world-fixed-$(date +%Y%m%d-%H%M%S).log
