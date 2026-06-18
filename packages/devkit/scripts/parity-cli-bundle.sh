#!/usr/bin/env bash
# -------------------------------------------------------------------
# ADR-180 Phase 3 parity gate — CLI bundle target.
#
# Proves `devkit build` produces byte-identical artifacts to build.sh for the
# CLI platform bundle, with version + build-date frozen so the comparison is
# deterministic (AC-5). Run this BEFORE deleting build.sh (Phase 3d).
#
# Compares, after each builder runs with the same frozen stamps:
#   - dist/cli/sharpee.js        (esbuild output)
#   - dist/cli/sharpee.d.ts      (hand-written declarations)
#   - stories/dungeo/src/version.ts   (version stamp)
#   - packages/sharpee/package.json   (version field)
#
# Usage: packages/devkit/scripts/parity-cli-bundle.sh
# -------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

FROZEN_VERSION="9.9.9-parity"
FROZEN_DATE="2026-01-01T00:00:00Z"
ARTIFACTS=(dist/cli/sharpee.js dist/cli/sharpee.d.ts stories/dungeo/src/version.ts packages/sharpee/package.json)
SNAP="$(mktemp -d)"
trap 'rm -rf "$SNAP"; git checkout -q -- stories/dungeo/src/version.ts packages/sharpee/package.json 2>/dev/null || true' EXIT

snapshot() {
  local tag="$1"
  for a in "${ARTIFACTS[@]}"; do
    shasum -a 256 "$a" | awk '{print $1}' > "$SNAP/$tag-$(echo "$a" | tr / _).sha"
  done
}

echo "=== [1/3] build.sh reference build (frozen stamps) ==="
BUILD_DATE_OVERRIDE="$FROZEN_DATE" ./build.sh -s dungeo --version "$FROZEN_VERSION"
snapshot buildsh

echo "=== [2/3] devkit build (frozen stamps) ==="
node packages/devkit/dist/cli.js build dungeo --version "$FROZEN_VERSION" --build-date "$FROZEN_DATE"
snapshot devkit

echo "=== [3/3] diff ==="
FAIL=0
for a in "${ARTIFACTS[@]}"; do
  key=$(echo "$a" | tr / _)
  if diff -q "$SNAP/buildsh-$key.sha" "$SNAP/devkit-$key.sha" > /dev/null; then
    echo "  OK   $a"
  else
    echo "  DIFF $a  (build.sh=$(cat "$SNAP/buildsh-$key.sha")  devkit=$(cat "$SNAP/devkit-$key.sha"))"
    FAIL=1
  fi
done

if [ "$FAIL" -eq 0 ]; then
  echo "PARITY PASS — devkit build matches build.sh byte-for-byte (CLI bundle target)."
else
  echo "PARITY FAIL — see DIFF lines above."
  exit 1
fi
