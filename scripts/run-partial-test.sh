#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/stdlib
pnpm test -- --testPathPattern="registry-golden|taking-golden" 2>&1 | tee /mnt/c/repotemp/sharpee/test-output/partial-test.log
