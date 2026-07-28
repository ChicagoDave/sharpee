#!/usr/bin/env bash
# -------------------------------------------------------------------
# vendor-toolchain.sh — assemble the self-contained Sharpee toolchain that
# Chord Writer ships inside its own app bundle (ADR-279 D4).
#
# Owner context: tools/ide — packaging. Mac-only by nature, which is why it
# lives beside the Xcode project rather than in repokit (ADR-187/ADR-279 D3:
# repokit stays Node-only and IDE-ignorant).
#
# Public interface:
#   vendor-toolchain.sh <resources-dir> [--force]
#     <resources-dir>  the app bundle's Contents/Resources (or any staging dir)
#     --force          re-assemble even when the stamp says it is current
#
# Produces, under <resources-dir>/toolchain/:
#   bin/sharpee          POSIX shim — the executable the IDE resolves (tier 3)
#   node/bin/node        the vendored Node runtime (arm64, from tools/ide/vendor)
#   devkit/              @sharpee/devkit + its dependency closure, sealed
#   .stamp               fingerprint enabling the incremental skip
#
# INVARIANT — the toolchain is SEALED: once assembled it must resolve every
# module, binary, and asset from inside itself. It never consults the author's
# project, a global install, or the network. The shim enforces this with
# NODE_PATH; this script enforces it by shipping the full closure.
#
# Fails loudly at every step. A half-assembled toolchain must never look like
# success — the app would silently lose its bundled tier and authors would hit
# the "sharpee not found" wall D4 exists to remove.
# -------------------------------------------------------------------
set -euo pipefail

readonly IDE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd -- "$IDE_DIR/../.." && pwd)"
readonly VENDOR_DIR="$IDE_DIR/vendor/node"

# The vendored runtime. Committed as the official nodejs.org .tar.xz (~26MB)
# rather than an extracted binary: bin/node is 112.9MB, over GitHub's hard
# 100MB per-file limit. Bump both together, and refresh SHASUMS256.txt from
# nodejs.org — never hand-edit the checksum.
readonly NODE_VERSION="22.23.1"
readonly NODE_ARCH="darwin-arm64"
readonly NODE_DIST="node-v${NODE_VERSION}-${NODE_ARCH}"
readonly NODE_TARBALL="${VENDOR_DIR}/${NODE_DIST}.tar.xz"

die() { echo "vendor-toolchain: $*" >&2; exit 1; }
step() { echo "  → $*"; }

# --- Arguments -----------------------------------------------------
FORCE=0
RESOURCES=""
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    -*) die "unknown flag '$arg' (usage: vendor-toolchain.sh <resources-dir> [--force])" ;;
    *) [ -n "$RESOURCES" ] && die "unexpected extra argument '$arg'"; RESOURCES="$arg" ;;
  esac
done
[ -n "$RESOURCES" ] || die "missing <resources-dir> (usage: vendor-toolchain.sh <resources-dir> [--force])"

readonly TOOLCHAIN="${RESOURCES%/}/toolchain"
readonly STAMP="$TOOLCHAIN/.stamp"

# --- Preconditions -------------------------------------------------
# Every one of these is a hard stop. The alternative — proceeding and emitting
# a partial toolchain — is the failure mode this script exists to prevent.
[ -f "$NODE_TARBALL" ] || die "vendored Node runtime missing: $NODE_TARBALL
  Re-download it from https://nodejs.org/dist/v${NODE_VERSION}/${NODE_DIST}.tar.xz
  and verify it against tools/ide/vendor/node/SHASUMS256.txt."
command -v pnpm >/dev/null || die "pnpm is required to assemble the devkit closure."
[ -f "$REPO_ROOT/packages/devkit/dist/cli.js" ] || die "packages/devkit is not built.
  Run './repokit build' first — the bundled toolchain ships the LOCAL build
  (ADR-279 D4's exact app↔toolchain version pairing)."
[ -f "$REPO_ROOT/packages/platform-browser/dist/index.js" ] || die "packages/platform-browser is not built.
  Run './repokit build' first — the browser build path needs its dist + styles/."

DEVKIT_VERSION="$(node -p "require('$REPO_ROOT/packages/devkit/package.json').version")"

# --- Incremental skip ----------------------------------------------
# Fingerprint = the inputs that change what gets assembled. The mtime sweep
# below catches a platform rebuild that leaves versions untouched, which a
# version-only fingerprint would miss (and ship a stale toolchain for).
readonly FINGERPRINT="node=${NODE_VERSION}-${NODE_ARCH} devkit=${DEVKIT_VERSION}"
if [ "$FORCE" -eq 0 ] && [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$FINGERPRINT" ]; then
  if [ -z "$(find "$REPO_ROOT/packages" -path '*/dist/*' -newer "$STAMP" -print -quit 2>/dev/null)" ]; then
    echo "vendor-toolchain: up to date ($FINGERPRINT)"
    exit 0
  fi
fi

echo "=== Vendoring Chord Writer toolchain (ADR-279 D4) ==="
echo "    Node ${NODE_VERSION} ${NODE_ARCH} · devkit ${DEVKIT_VERSION}"
echo "    → $TOOLCHAIN"

STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

# --- 1. Node runtime ------------------------------------------------
# Verified against the official checksum on EVERY assembly, not just at
# vendoring time: the bytes that end up signed and notarized are the bytes
# nodejs.org published, and a corrupted or swapped tarball fails here rather
# than shipping.
step "Verifying ${NODE_DIST}.tar.xz against SHASUMS256.txt"
( cd "$VENDOR_DIR" && shasum -a 256 -c SHASUMS256.txt >/dev/null ) \
  || die "checksum mismatch for $NODE_TARBALL — refusing to bundle an unverified runtime."

step "Extracting bin/node"
# Only the executable: npm/npx/corepack are deliberately NOT shipped. The
# sealed toolchain resolves esbuild from its own node_modules and must never
# reach a package manager (which would mean the network).
tar -xf "$NODE_TARBALL" -C "$STAGING" "${NODE_DIST}/bin/node" \
  || die "failed to extract ${NODE_DIST}/bin/node from the vendored tarball."
[ -x "$STAGING/${NODE_DIST}/bin/node" ] || die "extracted node is missing or not executable."

# --- 2. devkit closure ----------------------------------------------
# `pnpm deploy` resolves the workspace closure into a self-contained directory
# (its .pnpm store lives inside the deploy root, and the symlinks into it are
# relative — so the tree survives being copied into the app bundle).
step "Deploying @sharpee/devkit closure"
pnpm --filter @sharpee/devkit deploy --prod --legacy "$STAGING/devkit" >/dev/null 2>&1 \
  || die "pnpm deploy of @sharpee/devkit failed."
[ -f "$STAGING/devkit/dist/cli.js" ] || die "deployed devkit has no dist/cli.js."
[ -d "$STAGING/devkit/templates/story-chord" ] || die "deployed devkit has no templates/story-chord."

# @sharpee/platform-browser is NOT in devkit's dependency closure, but the
# browser build path needs it at runtime: `resolveEngineStylesDir` resolves it
# for styles/engine.css, and esbuild resolves it (via NODE_PATH) when bundling
# the generated entry. Deployed separately and grafted in, so the sealed root
# can answer both lookups.
step "Deploying @sharpee/platform-browser into the sealed node_modules"
pnpm --filter @sharpee/platform-browser deploy --prod --legacy "$STAGING/platform-browser" >/dev/null 2>&1 \
  || die "pnpm deploy of @sharpee/platform-browser failed."
[ -f "$STAGING/platform-browser/styles/engine.css" ] \
  || die "deployed platform-browser has no styles/engine.css (resolveEngineStylesDir would throw)."

rm -rf "$STAGING/devkit/node_modules/@sharpee/platform-browser"
mkdir -p "$STAGING/devkit/node_modules/@sharpee"
cp -R "$STAGING/platform-browser" "$STAGING/devkit/node_modules/@sharpee/platform-browser"

# --- 3. The shim ----------------------------------------------------
# The IDE resolves THIS file, never the Node binary directly (see
# BundledToolchain.swift). It is where the seal is applied:
#   NODE_PATH  — devkit's own require() and esbuild's bundler both resolve
#                @sharpee/* out of the sealed node_modules (verified: Node 22
#                consults NODE_PATH even for require.resolve(x, {paths:[…]}),
#                and esbuild honours it for bundle resolution).
#   PATH       — the bundled node comes first, so esbuild's `#!/usr/bin/env
#                node` shim resolves to OUR runtime on a machine with none.
step "Writing bin/sharpee"
mkdir -p "$STAGING/bin"
cat > "$STAGING/bin/sharpee" <<'SHIM'
#!/bin/sh
# Chord Writer's bundled Sharpee toolchain (ADR-279 D4).
# Generated by tools/ide/vendor-toolchain.sh — do not edit inside the bundle.
#
# Seals the CLI to the toolchain shipped alongside it: no global install, no
# author-project node_modules, no network. Argument-transparent — everything
# after the program name is the ordinary `sharpee` command line.
set -e
bin_dir=$(cd -- "$(dirname -- "$0")" && pwd)
root=$(dirname "$bin_dir")
devkit="$root/devkit"

[ -x "$root/node/bin/node" ] || {
  echo "sharpee: bundled Node runtime missing from $root/node/bin/node" >&2
  exit 127
}

NODE_PATH="$devkit/node_modules${NODE_PATH:+:$NODE_PATH}"
PATH="$root/node/bin:$devkit/node_modules/.bin:$PATH"
export NODE_PATH PATH

exec "$root/node/bin/node" "$devkit/dist/cli.js" "$@"
SHIM
chmod +x "$STAGING/bin/sharpee"

# --- 4. Install atomically ------------------------------------------
# Assembled in staging and swapped in, so an interrupted run leaves the
# previous toolchain intact rather than a half-populated one.
step "Installing into $TOOLCHAIN"
mkdir -p "$(dirname "$TOOLCHAIN")"
rm -rf "$TOOLCHAIN.incoming" "$TOOLCHAIN.outgoing"
mkdir -p "$TOOLCHAIN.incoming/node"
cp -R "$STAGING/${NODE_DIST}/bin" "$TOOLCHAIN.incoming/node/bin"
cp -R "$STAGING/devkit" "$TOOLCHAIN.incoming/devkit"
cp -R "$STAGING/bin" "$TOOLCHAIN.incoming/bin"
echo "$FINGERPRINT" > "$TOOLCHAIN.incoming/.stamp"

[ -d "$TOOLCHAIN" ] && mv "$TOOLCHAIN" "$TOOLCHAIN.outgoing"
mv "$TOOLCHAIN.incoming" "$TOOLCHAIN"
rm -rf "$TOOLCHAIN.outgoing"

# --- 5. Post-conditions ---------------------------------------------
# The no-silent-✓ gate: assert the artifacts the app depends on are present
# and executable before reporting success.
[ -x "$TOOLCHAIN/bin/sharpee" ] || die "assembled toolchain has no executable bin/sharpee."
[ -x "$TOOLCHAIN/node/bin/node" ] || die "assembled toolchain has no executable node/bin/node."
[ -f "$TOOLCHAIN/devkit/dist/cli.js" ] || die "assembled toolchain has no devkit/dist/cli.js."
[ -f "$TOOLCHAIN/devkit/node_modules/@sharpee/platform-browser/styles/engine.css" ] \
  || die "assembled toolchain has no platform-browser styles."

echo "vendor-toolchain: OK — $(du -sh "$TOOLCHAIN" | cut -f1) at $TOOLCHAIN"
