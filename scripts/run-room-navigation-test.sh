#!/bin/bash
# Run room navigation integration test
cd /mnt/c/repotemp/sharpee
pnpm test -- packages/world-model/tests/integration/room-navigation.test.ts --verbose
