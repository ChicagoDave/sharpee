#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model
pnpm test -- --testNamePattern="should handle deeply nested visibility" --verbose
