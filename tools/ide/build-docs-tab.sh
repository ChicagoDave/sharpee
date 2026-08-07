#!/bin/bash
# build-docs-tab.sh
# Bundles the author documentation into SharpeeIDE/Resources/docs-tab/ — the
# corpus go-live Phase 2 chose (website/src/app/chord + learn), reduced from MDX,
# rendered to HTML fragments, with the tab's own script esbuilt beside it. Run as
# an Xcode pre-build step so the app never ships documentation older than the
# source next to it, and runnable by hand:
#
#   tools/ide/build-docs-tab.sh
#
# Deliberately NOT the website's own Next build: that would put `npm install` +
# `next build` in a pre-build phase. project.yml already draws that line — the
# web-bundle passes are unconditional BECAUSE they are cheap, while the
# toolchain vendoring is opt-in BECAUSE it is not.
#
# Node resolution mirrors build-testing-tab.sh and the app's own tiers
# (ADR-279 D4): the vendored runtime first, then PATH, then a login shell's
# PATH. A miss is a WARNING, not an error, for the same reason: the committed
# bundle is still valid, and failing a Swift build because a JavaScript
# toolchain is absent would be a poor trade.
# Owner context: tools/ide — Docs.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_SCRIPT="$HERE/web/docs-tab/build.mjs"

if [ ! -f "$BUILD_SCRIPT" ]; then
  echo "warning: $BUILD_SCRIPT is missing — Documentation tab bundle not rebuilt"
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
  echo "warning: node not found — Documentation tab bundle not rebuilt (using the committed copy)"
  exit 0
fi

if ! "$NODE" "$BUILD_SCRIPT"; then
  echo "warning: Documentation tab bundle failed to build — using the committed copy"
  exit 0
fi
