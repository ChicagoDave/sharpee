#!/usr/bin/env bash
# -------------------------------------------------------------------
# ADR-180 Phase 3c parity gate — zifmia (multi-user server) target.
#
# Proves `devkit build --zifmia` produces a byte-identical tools/zifmia/dist
# tree and version stamp to build.sh's `-c zifmia`, with version frozen (AC-5).
# (zifmia's own build is deterministic — verified — so a full byte-diff is valid.)
# Per ADR-180 the .sharpee story bundle is deferred; neither path builds one.
# Run before deleting build.sh (Phase 3d).
#
# Usage: packages/devkit/scripts/parity-zifmia.sh
# -------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

# build.sh's ESM pass calls a bare `tsf`; ensure the workspace bin resolves.
export PATH="$ROOT/node_modules/.bin:$PATH"

FROZEN_VERSION="9.9.9-parity"
FROZEN_DATE="2026-01-01T00:00:00Z"
SNAP="$(mktemp -d)"
trap 'rm -rf "$SNAP"; git checkout -q -- tools/zifmia/package.json packages/sharpee/package.json 2>/dev/null || true' EXIT

dist_manifest() {
  ( cd tools/zifmia/dist && find . -type f -print0 | sort -z | xargs -0 shasum -a 256 ) > "$1"
}
pkg_version() {
  node -p "require('./tools/zifmia/package.json').version" > "$1"
}

echo "=== [1/3] build.sh -c zifmia (frozen) ==="
rm -rf tools/zifmia/dist
BUILD_DATE_OVERRIDE="$FROZEN_DATE" ./build.sh -c zifmia --version "$FROZEN_VERSION"
dist_manifest "$SNAP/buildsh-dist.manifest"
pkg_version "$SNAP/buildsh-pkg.version"

echo "=== [2/3] devkit build --zifmia (frozen) ==="
rm -rf tools/zifmia/dist
node packages/devkit/dist/cli.js build --zifmia --version "$FROZEN_VERSION" --build-date "$FROZEN_DATE"
dist_manifest "$SNAP/devkit-dist.manifest"
pkg_version "$SNAP/devkit-pkg.version"

echo "=== [3/3] diff ==="
FAIL=0
if diff -u "$SNAP/buildsh-dist.manifest" "$SNAP/devkit-dist.manifest"; then
  echo "  OK   tools/zifmia/dist"
else
  echo "  DIFF tools/zifmia/dist"
  FAIL=1
fi
if diff -q "$SNAP/buildsh-pkg.version" "$SNAP/devkit-pkg.version" > /dev/null; then
  echo "  OK   tools/zifmia/package.json version"
else
  echo "  DIFF tools/zifmia/package.json version"
  FAIL=1
fi

if [ "$FAIL" -eq 0 ]; then
  echo "PARITY PASS — devkit zifmia build matches build.sh byte-for-byte."
else
  echo "PARITY FAIL — see diff above."
  exit 1
fi
