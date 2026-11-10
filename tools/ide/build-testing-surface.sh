#!/bin/bash
# build-testing-surface.sh
# Bundles the testing play surface's TypeScript into SharpeeIDE/Resources/testing-surface/
# (ADR-306 Phase 3). Run as an Xcode pre-build step so the app never ships a bundle
# older than the source next to it, and runnable by hand during design work:
#
#   tools/ide/build-testing-surface.sh
#   node tools/ide/web/testing-surface/build.mjs --watch   # live rebuild
#
# Node resolution mirrors the app's own tiers (ADR-279 D4): the vendored
# runtime first, then whatever is on PATH, then a login shell's PATH — Xcode
# runs build phases with a minimal environment that usually lacks nvm/homebrew
# node. A miss is a WARNING, not an error: the committed bundle is still valid,
# and failing the build of a Swift app because a JavaScript toolchain is absent
# would be a poor trade. A build that ran and failed is an ERROR and fails the
# Xcode build; TESTING_SURFACE_OPTIONAL=1 downgrades it on purpose.
# Owner context: tools/ide — TestingSurface.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_SCRIPT="$HERE/web/testing-surface/build.mjs"

if [ ! -f "$BUILD_SCRIPT" ]; then
  echo "warning: $BUILD_SCRIPT is missing — testing play surface bundle not rebuilt"
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
  echo "warning: node not found — testing play surface bundle not rebuilt (using the committed copy)"
  exit 0
fi

if ! "$NODE" "$BUILD_SCRIPT"; then
  # A missing node is a warning (above). A build script that RAN and FAILED is a
  # different thing: the source no longer produces the committed bundle — a
  # compile error, or the bundle-inputs guard refusing a non-source input — and
  # the error above says how. As a warning, the app would ship the stale copy
  # and nobody would read the line that said so. Same ruling as
  # build-docs-tab.sh. (GH #670)
  echo "error: testing play surface bundle failed to build (see the error above)."
  echo "       The previously committed bundle is intact and was NOT overwritten."
  echo "       Fix the cause, or pass TESTING_SURFACE_OPTIONAL=1 to build against"
  echo "       the committed copy deliberately rather than by accident."
  [ "${TESTING_SURFACE_OPTIONAL:-0}" = "1" ] || exit 1
  echo "warning: TESTING_SURFACE_OPTIONAL=1 — continuing with the committed copy"
fi
