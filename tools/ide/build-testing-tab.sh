#!/bin/bash
# build-testing-tab.sh
# Bundles the Testing tab's TypeScript into SharpeeIDE/Resources/testing-tab/
# (ADR-301 D1). Run as an Xcode pre-build step so the app never ships a bundle
# older than the source next to it, and runnable by hand during design work:
#
#   tools/ide/build-testing-tab.sh
#   node tools/ide/web/testing-tab/build.mjs --watch   # live rebuild
#
# Node resolution mirrors the app's own tiers (ADR-279 D4): the vendored
# runtime first, then whatever is on PATH, then a login shell's PATH — Xcode
# runs build phases with a minimal environment that usually lacks nvm/homebrew
# node. A miss is a WARNING, not an error: the committed bundle is still valid,
# and failing the build of a Swift app because a JavaScript toolchain is absent
# would be a poor trade.
# Owner context: tools/ide — Test.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_SCRIPT="$HERE/web/testing-tab/build.mjs"

if [ ! -f "$BUILD_SCRIPT" ]; then
  echo "warning: $BUILD_SCRIPT is missing — Testing tab bundle not rebuilt"
  exit 0
fi

NODE=""
if [ -x "$HERE/vendor/node/bin/node" ]; then
  NODE="$HERE/vendor/node/bin/node"
elif command -v node >/dev/null 2>&1; then
  NODE="$(command -v node)"
else
  # Xcode strips the interactive PATH; ask a login shell for the real one.
  CANDIDATE="$(/bin/bash -lc 'command -v node' 2>/dev/null || true)"
  if [ -n "$CANDIDATE" ] && [ -x "$CANDIDATE" ]; then
    NODE="$CANDIDATE"
  fi
fi

if [ -z "$NODE" ]; then
  echo "warning: node not found — Testing tab bundle not rebuilt (using the committed copy)"
  exit 0
fi

if ! "$NODE" "$BUILD_SCRIPT"; then
  echo "warning: Testing tab bundle failed to build — using the committed copy"
  exit 0
fi
