#!/bin/bash
cd /mnt/c/repotemp/sharpee/packages/world-model
pnpm test -- --testPathPattern="container-state-visibility" --verbose
