#!/bin/bash
# Full rebuild and test

echo -e "\033[36m=== Full Rebuild and Test ===\033[0m"

# Rebuild in order
echo -e "\n\033[33mRebuilding packages...\033[0m"

# stdlib (with parser fix)
cd packages/stdlib
rm -rf dist
npx tsc
cd ../..

# story
cd stories/cloak-of-darkness
rm -rf dist

# Create proper tsconfig
cat > tsconfig.build.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@sharpee/core": ["../../packages/core"],
      "@sharpee/world-model": ["../../packages/world-model"],
      "@sharpee/event-processor": ["../../packages/event-processor"],
      "@sharpee/stdlib": ["../../packages/stdlib"],
      "@sharpee/lang-en-us": ["../../packages/lang-en-us"],
      "@sharpee/engine": ["../../packages/engine"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

npx tsc -p tsconfig.build.json
rm -f tsconfig.build.json
cd ../..

echo -e "\n\033[36m=== Running Test ===\033[0m"
./run-cloak-simple.sh
