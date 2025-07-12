#!/bin/bash

cd /mnt/c/repotemp/sharpee/packages/world-model

# Run the integration tests
pnpm test -- tests/integration/container-hierarchies.test.ts tests/integration/room-navigation.test.ts tests/integration/door-mechanics.test.ts tests/integration/trait-combinations.test.ts tests/integration/visibility-chains.test.ts
