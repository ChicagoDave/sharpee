#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/stdlib
pnpm jest tests/unit/actions/turning-golden.test.ts --no-coverage
