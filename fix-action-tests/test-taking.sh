#!/bin/bash
# Run only the taking-golden.test.ts file from the stdlib package

cd /mnt/c/repotemp/sharpee/packages/stdlib
pnpm test taking-golden.test.ts
