#!/bin/bash
echo "Building stdlib first..."
cd /mnt/c/repotemp/sharpee/packages/stdlib
pnpm build

echo -e "\nBuilding engine..."
cd /mnt/c/repotemp/sharpee/packages/engine
pnpm build

if [ $? -eq 0 ]; then
    echo -e "\n✅ Build successful!"
    echo -e "\nRunning tests..."
    pnpm test 2>&1 | tee ../../logs/test-eng-$(date +%Y%m%d-%H%M%S).log
else
    echo -e "\n❌ Build failed!"
fi
