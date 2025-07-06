#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model

# Run a single test with more detail
pnpm test -- --testNamePattern="should return false for entity in closed opaque container" --verbose --no-coverage
