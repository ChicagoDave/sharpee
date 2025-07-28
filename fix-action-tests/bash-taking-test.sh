#!/bin/bash
# Run only the taking-golden.test.ts file

cd /mnt/c/repotemp/sharpee
pnpm test packages/stdlib/tests/unit/actions/taking-golden.test.ts
