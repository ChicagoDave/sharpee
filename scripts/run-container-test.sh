#!/bin/bash
cd /mnt/c/repotemp/sharpee
# Run just the failing container test
pnpm --filter @sharpee/world-model test -- --testNamePattern="should handle moving containers with contents" 2>&1 | tee /mnt/c/repotemp/sharpee/logs/test-container-move-$(date +%Y%m%d-%H%M%S).log
