#!/bin/bash
# Tag @sharpee packages as "latest" on npm
# Usage: ./scripts/npm-latest.sh [--version X.Y.Z] [--dry-run]

set -e

VERSION="0.9.61-beta"
DRY_RUN=""
OTP=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --version) VERSION="$2"; shift 2 ;;
    --dry-run) DRY_RUN="true"; shift ;;
    --otp) OTP="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--version X.Y.Z] [--otp CODE] [--dry-run]"
      echo "Tags all @sharpee packages at the given version as 'latest' on npm."
      echo ""
      echo "Options:"
      echo "  --otp CODE    Pass OTP once for all packages (avoids per-package 2FA prompts)"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

OTP_FLAG=""
if [ -n "$OTP" ]; then
  OTP_FLAG="--otp $OTP"
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# npm package names (extensions/testing publishes as ext-testing)
PACKAGES=(
  core
  if-domain
  world-model
  event-processor
  text-blocks
  text-service
  lang-en-us
  parser-en-us
  if-services
  plugin-npc
  plugin-scheduler
  plugin-state-machine
  plugins
  stdlib
  engine
  sharpee
  platform-browser
  transcript-tester
  ext-testing
)

echo -e "${GREEN}=== Setting latest tag for @sharpee packages ===${NC}"
echo "Version: $VERSION"
[ -n "$DRY_RUN" ] && echo -e "${YELLOW}DRY RUN MODE${NC}"
echo ""

for pkg in "${PACKAGES[@]}"; do
  if [ -n "$DRY_RUN" ]; then
    echo "  Would tag @sharpee/$pkg@$VERSION as latest"
  else
    echo -n "  @sharpee/$pkg@$VERSION ... "
    npm dist-tag add "@sharpee/$pkg@$VERSION" latest $OTP_FLAG && echo -e "${GREEN}ok${NC}" || echo -e "${RED}failed${NC}"
  fi
done

echo ""
echo -e "${GREEN}Done.${NC}"
