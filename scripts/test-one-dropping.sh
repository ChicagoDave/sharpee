#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/stdlib
# Run just one failing test to see the debug output
pnpm test -- --testNamePattern="should fail when no target specified" dropping-golden.test.ts
