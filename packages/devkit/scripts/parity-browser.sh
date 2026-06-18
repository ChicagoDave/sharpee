#!/usr/bin/env bash
# -------------------------------------------------------------------
# ADR-180 Phase 3b parity gate — browser client target.
#
# Proves `devkit build <story> --browser` produces a byte-identical
# dist/web/<story>/ tree (and website mirror) to build.sh's
# `-s <story> -c browser`, with version + build-date frozen (AC-5 / AC-9).
# Run before deleting build.sh (Phase 3d).
#
# Usage: packages/devkit/scripts/parity-browser.sh [story]   (default: dungeo)
# -------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

# build.sh's ESM pass calls a bare `tsf`; ensure the workspace bin resolves even in a
# non-interactive shell where `tsf` is only an alias. (devkit resolves it itself.)
export PATH="$ROOT/node_modules/.bin:$PATH"

STORY="${1:-dungeo}"
FROZEN_VERSION="9.9.9-parity"
FROZEN_DATE="2026-01-01T00:00:00Z"
TREES=("dist/web/${STORY}" "website/public/web/${STORY}")
SNAP="$(mktemp -d)"
trap 'rm -rf "$SNAP"; git checkout -q -- "stories/${STORY}/src/version.ts" packages/sharpee/package.json 2>/dev/null || true' EXIT

# Write a sorted "relpath  sha256" manifest for a tree (skips if absent).
manifest() {
  local tree="$1" out="$2"
  if [ -d "$tree" ]; then
    ( cd "$tree" && find . -type f -print0 | sort -z | xargs -0 shasum -a 256 ) > "$out"
  else
    : > "$out"
  fi
}

snapshot() {
  local tag="$1"
  for t in "${TREES[@]}"; do
    manifest "$t" "$SNAP/$tag-$(echo "$t" | tr / _).manifest"
  done
}

# Wipe the output trees before each builder so a stale artifact can't mask a diff.
clean_trees() { for t in "${TREES[@]}"; do rm -rf "$t"; done; }

echo "=== [1/3] build.sh -s ${STORY} -c browser (frozen) ==="
clean_trees
BUILD_DATE_OVERRIDE="$FROZEN_DATE" ./build.sh -s "$STORY" -c browser --version "$FROZEN_VERSION"
snapshot buildsh

echo "=== [2/3] devkit build ${STORY} --browser (frozen) ==="
clean_trees
node packages/devkit/dist/cli.js build "$STORY" --browser --version "$FROZEN_VERSION" --build-date "$FROZEN_DATE"
snapshot devkit

echo "=== [3/3] diff ==="
FAIL=0
for t in "${TREES[@]}"; do
  key=$(echo "$t" | tr / _)
  if diff -u "$SNAP/buildsh-$key.manifest" "$SNAP/devkit-$key.manifest"; then
    echo "  OK   $t"
  else
    echo "  DIFF $t"
    FAIL=1
  fi
done

if [ "$FAIL" -eq 0 ]; then
  echo "PARITY PASS — devkit browser build matches build.sh byte-for-byte (${STORY})."
else
  echo "PARITY FAIL — see diff above."
  exit 1
fi
