#!/bin/bash
cd /mnt/c/repotemp/sharpee

echo "Building stdlib..."
cd packages/stdlib
pnpm build

echo -e "\nBuilding engine..."
cd ../engine
pnpm build
