#!/bin/bash
#
# Quick dungeo-only rebuild
# Skips platform compilation — only rebuilds story + re-bundles CLI.
# Use when only story files (stories/dungeo/src/) have changed.
#

set -e

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT"

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Dungeo Quick Build${NC}"
echo ""

# 1. Build story TypeScript
echo -n "[dungeo] "
if pnpm --filter '@sharpee/story-dungeo' build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    pnpm --filter '@sharpee/story-dungeo' build 2>&1 | tail -20
    exit 1
fi

# 2. Re-bundle CLI (includes story code)
echo -n "[bundle] "
if npx esbuild scripts/bundle-entry.js --bundle --platform=node --target=node18 --outfile=dist/cli/sharpee.js --external:readline --format=cjs --sourcemap \
  --alias:@sharpee/core=./packages/core/dist/index.js \
  --alias:@sharpee/if-domain=./packages/if-domain/dist/index.js \
  --alias:@sharpee/world-model=./packages/world-model/dist/index.js \
  --alias:@sharpee/stdlib=./packages/stdlib/dist/index.js \
  --alias:@sharpee/engine=./packages/engine/dist/index.js \
  --alias:@sharpee/parser-en-us=./packages/parser-en-us/dist/index.js \
  --alias:@sharpee/lang-en-us=./packages/lang-en-us/dist/index.js \
  --alias:@sharpee/event-processor=./packages/event-processor/dist/index.js \
  --alias:@sharpee/text-blocks=./packages/text-blocks/dist/index.js \
  --alias:@sharpee/text-service=./packages/text-service/dist/index.js \
  --alias:@sharpee/if-services=./packages/if-services/dist/index.js \
  --alias:@sharpee/ext-basic-combat=./packages/extensions/basic-combat/dist/index.js \
  --alias:@sharpee/plugins=./packages/plugins/dist/index.js \
  --alias:@sharpee/plugin-npc=./packages/plugin-npc/dist/index.js \
  --alias:@sharpee/plugin-scheduler=./packages/plugin-scheduler/dist/index.js \
  --alias:@sharpee/plugin-state-machine=./packages/plugin-state-machine/dist/index.js \
  --alias:@sharpee/transcript-tester=./packages/transcript-tester/dist/index.js > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ FAILED${NC}"
    exit 1
fi

# 3. Quick load test
BUNDLE_SIZE=$(ls -lh dist/cli/sharpee.js | awk '{print $5}')
echo -n "Bundle: $BUNDLE_SIZE, load: "
node -e "const s=Date.now();require('./dist/cli/sharpee.js');console.log((Date.now()-s)+'ms')"

echo ""
echo -e "${GREEN}Done${NC}"
