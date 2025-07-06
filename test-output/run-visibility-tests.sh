#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model
pnpm test -- visibility-behavior.test.ts --verbose 2>&1 | tee /mnt/c/repotemp/sharpee/test-output/visibility-test-output.log
