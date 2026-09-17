#!/usr/bin/env bash
# -------------------------------------------------------------------
# vendor-toolchain.sh — assemble the self-contained Sharpee toolchain that
# Chord Writer ships inside its own app bundle (ADR-279 D4).
#
# Owner context: tools/ide — packaging. It RUNS on macOS only (it is bash, and
# the darwin targets codesign), which is why it lives beside the Xcode project
# rather than in repokit (ADR-187/ADR-279 D3: repokit stays Node-only and
# IDE-ignorant). It ASSEMBLES for macOS, Windows, and Linux alike: the Windows
# and Linux toolchains are cross-assembled here on the macOS build host, and
# Authenticode signing is deferred to the Windows box (David, 2026-09-16).
#
# Public interface:
#   vendor-toolchain.sh <resources-dir> [--target darwin|win32|linux]
#                                       [--arch arm64|x86_64] [--force]
#     <resources-dir>  the app bundle's Contents/Resources (or any staging dir)
#     --target         which platform the assembled toolchain is FOR (default:
#                      darwin — the in-repo dev loop is unchanged by this flag)
#     --arch           which arch, for targets that have more than one
#     --force          re-assemble even when the stamp says it is current
#
# Produces, under <resources-dir>/toolchain/:
#   bin/sharpee          POSIX shim — the executable the IDE resolves (tier 3)
#   bin/sharpee.cmd      its Windows peer, on --target win32 (instead of, not
#                        beside: one launcher per toolchain, never a choice)
#   node/bin/node        the vendored Node runtime (node.exe on win32)
#   devkit/              @sharpee/devkit + its dependency closure, sealed
#   .stamp               fingerprint enabling the incremental skip
#
# ONE LAYOUT, PLATFORM-SPECIFIC LEAF. node lands at node/bin/node.exe on Windows
# even though the official zip puts node.exe at the distribution root, so the
# launcher, the seal scan, and PaneHost's resolution each differ by a FILENAME
# rather than by a path shape.
#
# INVARIANT — the toolchain is SEALED: once assembled it must resolve every
# module, binary, and asset from inside itself. It never consults the author's
# project, a global install, or the network. The shim enforces this with
# NODE_PATH; this script enforces it by shipping the full closure AND by
# mechanically proving no symlink escapes the toolchain root (step 4.5).
#
# On --target win32 the seal is stronger and simpler: the closure is deployed
# with pnpm's hoisted node-linker, so it contains NO symlinks at all and the
# scan asserts exactly that. Windows cannot be relied on to materialise POSIX
# symlinks out of an installer payload, and dereferencing the ordinary
# symlinked closure is not the alternative it looks like — measured 2026-09-16,
# `cp -RL` turned 69 MB into 523 MB, because pnpm keeps one real copy per
# package and every consumer link duplicates it. The hoisted linker gives a
# flat, symlink-free closure at the SAME 69 MB.
#
# That proof is not ceremony. `pnpm deploy` leaves workspace-source symlinks
# behind, and grafting platform-browser in re-parents its nested ones to the
# wrong depth — five links pointed at /Users/<you>/repos/sharpee/packages/*
# before step 4.5 existed. They dangled in the app bundle only because the ../
# padding overshot; the seal held by accident of directory depth, not by
# construction. A machine where those paths did resolve would have silently
# built against a live checkout.
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
#
# ONE VERSION, TWO ARCHES. Chord Writer ships as separate per-arch installers
# (David 2026-08-13), never a universal binary: a universal app would carry one
# toolchain that is wrong for half the machines it runs on. Both runtimes are
# minos 11.0 — verified on the real tarballs 2026-08-13, arm64 and x64 alike —
# so the deployment target is 11.0 for both and the toolchain reaches as far as
# the app does on either.
readonly NODE_VERSION="22.23.1"

# Signing inputs for step 4.6. Same defaults and same overrides as package.sh —
# the two sign one bundle and must not be able to disagree about identity, team,
# or node's entitlement set.
readonly NODE_ENTITLEMENTS="$IDE_DIR/bundled-node.entitlements"
EXPECTED_TEAM="${EXPECTED_TEAM:-RSNGKW5LNH}"

die() { echo "vendor-toolchain: $*" >&2; exit 1; }
step() { echo "  → $*"; }

# --- Arguments -----------------------------------------------------
readonly USAGE="usage: vendor-toolchain.sh <resources-dir> [--target darwin|win32|linux] [--arch arm64|x86_64] [--force]"
FORCE=0
RESOURCES=""
ARCH=""
TARGET=""
expect=""
for arg in "$@"; do
  if [ -n "$expect" ]; then
    case "$expect" in arch) ARCH="$arg" ;; target) TARGET="$arg" ;; esac
    expect=""; continue
  fi
  case "$arg" in
    --force) FORCE=1 ;;
    --arch) expect=arch ;;
    --arch=*) ARCH="${arg#--arch=}" ;;
    --target) expect=target ;;
    --target=*) TARGET="${arg#--target=}" ;;
    -*) die "unknown flag '$arg' ($USAGE)" ;;
    *) [ -n "$RESOURCES" ] && die "unexpected extra argument '$arg'"; RESOURCES="$arg" ;;
  esac
done
[ -z "$expect" ] || die "--$expect needs a value ($USAGE)"
[ -n "$RESOURCES" ] || die "missing <resources-dir> ($USAGE)"

# Cross-assembly runs here, on macOS. Refusing elsewhere is not portability
# theatre: steps 4.6 (codesign) and the `file`-based arch assertions are macOS
# tools, and a half-assembled toolchain must never look like success.
[ "$(uname -s)" = "Darwin" ] || die "this assembler runs on macOS only (found $(uname -s)).
  Windows and Linux toolchains are CROSS-assembled here, on the macOS build host."

[ -n "$TARGET" ] || TARGET="darwin"

# Default to the build host's own arch so the in-repo dev loop is unchanged by
# the addition of per-arch builds. Release packaging always passes --arch
# explicitly (package.sh), because the host and the target are routinely
# different — an x86_64 installer is built on an Apple silicon Mac, and every
# non-darwin target is cross-assembled here by definition.
[ -n "$ARCH" ] || ARCH="$(uname -m)"
case "$ARCH" in aarch64) ARCH="arm64" ;; x64) ARCH="x86_64" ;; esac

# --- The target table ----------------------------------------------
# Everything that varies by platform is decided HERE, once, and read as a
# variable everywhere below. The alternative — a per-platform `if` at each of
# the eight sites that differ — is how the darwin assumptions got baked in the
# first place (the estimate found four of them, each one incidental-looking).
#
#   NODE_ARCHIVE    the vendored archive's basename
#   NODE_MEMBER     the runtime's path INSIDE the archive's dist directory
#   NODE_LEAF       what it is called once installed at node/bin/<leaf>
#   ESBUILD_MEMBER  the native binary's path inside the @esbuild/* package
#   ESBUILD_SIG     what `file -b` must say about it — the proof we grafted the
#                   TARGET's binary and not the host's
#   NODE_LINKER     pnpm deploy's node-linker; hoisted means symlink-free
#   DO_SIGN         codesign (step 4.6) applies only where Mach-O does
#   LAUNCHER        which shim shape step 3 writes
case "$TARGET" in
  darwin)
    case "$ARCH" in
      arm64)  NODE_ARCH="darwin-arm64" ESBUILD_PKG="@esbuild/darwin-arm64" ESBUILD_SIG="arm64" ;;
      x86_64) NODE_ARCH="darwin-x64"   ESBUILD_PKG="@esbuild/darwin-x64"   ESBUILD_SIG="x86_64" ;;
      *) die "unsupported --arch '$ARCH' for --target darwin — expected arm64 or x86_64." ;;
    esac
    NODE_ARCHIVE="node-v${NODE_VERSION}-${NODE_ARCH}.tar.xz"
    NODE_MEMBER="bin/node" NODE_LEAF="node"
    ESBUILD_MEMBER="bin/esbuild" NODE_LINKER="" DO_SIGN=1 LAUNCHER="sh" LAUNCHER_FILE="sharpee"
    ;;
  linux)
    [ "$ARCH" = "x86_64" ] || die "unsupported --arch '$ARCH' for --target linux — only
  x86_64 is vendored. linux-arm64 is deliberately out of scope (David, 2026-09-16);
  adding it means one more archive in tools/ide/vendor/node and one more case here."
    NODE_ARCH="linux-x64" NODE_ARCHIVE="node-v${NODE_VERSION}-linux-x64.tar.xz"
    NODE_MEMBER="bin/node" NODE_LEAF="node"
    ESBUILD_PKG="@esbuild/linux-x64" ESBUILD_MEMBER="bin/esbuild" ESBUILD_SIG="ELF 64-bit"
    NODE_LINKER="" DO_SIGN=0 LAUNCHER="sh" LAUNCHER_FILE="sharpee"
    ;;
  win32)
    [ "$ARCH" = "x86_64" ] || die "unsupported --arch '$ARCH' for --target win32 — only
  x86_64 is vendored."
    NODE_ARCH="win-x64" NODE_ARCHIVE="node-v${NODE_VERSION}-win-x64.zip"
    # node.exe sits at the dist ROOT in the official zip, not under bin/.
    NODE_MEMBER="node.exe" NODE_LEAF="node.exe"
    # @esbuild/win32-x64 ships esbuild.exe at the PACKAGE root, with no bin/ at
    # all — esbuild resolves it as require.resolve('@esbuild/win32-x64/esbuild.exe')
    # (its lib/main.js). The unixlike packages keep bin/esbuild.
    ESBUILD_PKG="@esbuild/win32-x64" ESBUILD_MEMBER="esbuild.exe" ESBUILD_SIG="PE32+"
    NODE_LINKER="hoisted" DO_SIGN=0 LAUNCHER="cmd" LAUNCHER_FILE="sharpee.cmd"
    ;;
  *) die "unsupported --target '$TARGET' — expected darwin, win32, or linux." ;;
esac
readonly TARGET ARCH NODE_ARCH NODE_ARCHIVE NODE_MEMBER NODE_LEAF
readonly ESBUILD_MEMBER ESBUILD_SIG NODE_LINKER DO_SIGN LAUNCHER LAUNCHER_FILE

readonly NODE_DIST="node-v${NODE_VERSION}-${NODE_ARCH}"
readonly NODE_TARBALL="${VENDOR_DIR}/${NODE_ARCHIVE}"

readonly TOOLCHAIN="${RESOURCES%/}/toolchain"
readonly STAMP="$TOOLCHAIN/.stamp"

# --- Preconditions -------------------------------------------------
# Every one of these is a hard stop. The alternative — proceeding and emitting
# a partial toolchain — is the failure mode this script exists to prevent.
[ -f "$NODE_TARBALL" ] || die "vendored Node runtime missing: $NODE_TARBALL
  Re-download it from https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ARCHIVE}
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
readonly FINGERPRINT="target=${TARGET} node=${NODE_VERSION}-${NODE_ARCH} devkit=${DEVKIT_VERSION}"
if [ "$FORCE" -eq 0 ] && [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$FINGERPRINT" ]; then
  if [ -z "$(find "$REPO_ROOT/packages" -path '*/dist/*' -newer "$STAMP" -print -quit 2>/dev/null)" ]; then
    echo "vendor-toolchain: up to date ($FINGERPRINT)"
    exit 0
  fi
fi

echo "=== Vendoring Chord Writer toolchain (ADR-279 D4) ==="
echo "    target ${TARGET} · Node ${NODE_VERSION} ${NODE_ARCH} · devkit ${DEVKIT_VERSION}"
echo "    → $TOOLCHAIN"

STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT

# --- 1. Node runtime ------------------------------------------------
# Verified against the official checksum on EVERY assembly, not just at
# vendoring time: the bytes that end up signed and notarized are the bytes
# nodejs.org published, and a corrupted or swapped tarball fails here rather
# than shipping.
# Only the target's own line is checked, not the whole file: SHASUMS256.txt
# carries a line per vendored platform, and `-c` over all of them would fail
# because a sibling archive is absent rather than because ours is wrong.
step "Verifying ${NODE_ARCHIVE} against SHASUMS256.txt"
grep -F " ${NODE_ARCHIVE}" "$VENDOR_DIR/SHASUMS256.txt" > "$STAGING/expected.sha256" \
  || die "SHASUMS256.txt has no line for ${NODE_ARCHIVE} — refusing to bundle an
  unverifiable runtime. Copy the line verbatim from nodejs.org."
( cd "$VENDOR_DIR" && shasum -a 256 -c "$STAGING/expected.sha256" >/dev/null ) \
  || die "checksum mismatch for $NODE_TARBALL — refusing to bundle an unverified runtime."

step "Extracting ${NODE_MEMBER}"
# Only the executable: npm/npx/corepack are deliberately NOT shipped. The
# sealed toolchain resolves esbuild from its own node_modules and must never
# reach a package manager (which would mean the network).
case "$NODE_ARCHIVE" in
  *.zip)
    # -j would flatten, but the member is already at the dist root on the one
    # target that ships a zip; keep the path so the assertion below is exact.
    unzip -q -o "$NODE_TARBALL" "${NODE_DIST}/${NODE_MEMBER}" -d "$STAGING" \
      || die "failed to extract ${NODE_DIST}/${NODE_MEMBER} from the vendored zip." ;;
  *)
    tar -xf "$NODE_TARBALL" -C "$STAGING" "${NODE_DIST}/${NODE_MEMBER}" \
      || die "failed to extract ${NODE_DIST}/${NODE_MEMBER} from the vendored tarball." ;;
esac
# Size, not the executable bit: a Windows zip records no POSIX mode, so the
# extracted node.exe is not -x and never will be on this host. chmod anyway so
# the shipped tree is uniform regardless of which target produced it.
[ -s "$STAGING/${NODE_DIST}/${NODE_MEMBER}" ] || die "extracted node is missing or empty."
chmod +x "$STAGING/${NODE_DIST}/${NODE_MEMBER}"

# --- 2. devkit closure ----------------------------------------------
# `pnpm deploy` resolves the workspace closure into a self-contained directory
# (its .pnpm store lives inside the deploy root, and the symlinks into it are
# relative — so the tree survives being copied into the app bundle).
# On win32 the closure is deployed HOISTED — flat, with no symlinks — because
# Windows cannot be relied on to materialise POSIX symlinks out of an installer
# payload. Deliberately unquoted: it word-splits to nothing on the targets that
# keep pnpm's default symlinked layout, and this host runs bash 3.2, where an
# empty array expansion under `set -u` is an unbound-variable error.
LINKER_FLAG=""
[ -n "$NODE_LINKER" ] && LINKER_FLAG="--config.node-linker=$NODE_LINKER"

step "Deploying @sharpee/devkit closure${NODE_LINKER:+ (${NODE_LINKER} linker)}"
pnpm --filter @sharpee/devkit deploy --prod --legacy $LINKER_FLAG "$STAGING/devkit" >/dev/null 2>&1 \
  || die "pnpm deploy of @sharpee/devkit failed."
[ -f "$STAGING/devkit/dist/cli.js" ] || die "deployed devkit has no dist/cli.js."
[ -d "$STAGING/devkit/templates/story-chord" ] || die "deployed devkit has no templates/story-chord."

# @sharpee/platform-browser is NOT in devkit's dependency closure, but the
# browser build path needs it at runtime: `resolveEngineStylesDir` resolves it
# for styles/engine.css, and esbuild resolves it (via NODE_PATH) when bundling
# the generated entry. Deployed separately and grafted in, so the sealed root
# can answer both lookups.
step "Deploying @sharpee/platform-browser into the sealed node_modules"
pnpm --filter @sharpee/platform-browser deploy --prod --legacy $LINKER_FLAG "$STAGING/platform-browser" >/dev/null 2>&1 \
  || die "pnpm deploy of @sharpee/platform-browser failed."
[ -f "$STAGING/platform-browser/styles/engine.css" ] \
  || die "deployed platform-browser has no styles/engine.css (resolveEngineStylesDir would throw)."

rm -rf "$STAGING/devkit/node_modules/@sharpee/platform-browser"
mkdir -p "$STAGING/devkit/node_modules/@sharpee"
cp -R "$STAGING/platform-browser" "$STAGING/devkit/node_modules/@sharpee/platform-browser"

# --- 2.5 esbuild for the TARGET arch --------------------------------
# esbuild ships its compiler as a per-platform optional dependency, and pnpm
# resolves optional deps for the BUILD HOST — so a deploy on an Apple silicon
# Mac yields @esbuild/darwin-arm64 no matter which arch we are assembling for.
# `--config.supportedArchitectures` does not change that on `deploy` (tried,
# 2026-08-13: still arm64-only), and the foreign-arch package is not in the
# local store at all, because pnpm skipped installing it for this platform.
#
# So when the target differs from the host, fetch that one package and graft it
# in. Verified against the integrity hash ALREADY IN pnpm-lock.yaml rather than
# trusted: the lockfile stays the single source of truth for the version, which
# is what keeps this from becoming a second thing to bump when devkit's esbuild
# moves. A committed tarball (as node's is) would need exactly that.
host_arch="$(uname -m)"
case "$host_arch" in aarch64) host_arch="arm64" ;; esac
host_esbuild="@esbuild/darwin-arm64"
[ "$host_arch" = "x86_64" ] && host_esbuild="@esbuild/darwin-x64"

if [ "$ESBUILD_PKG" != "$host_esbuild" ]; then
  step "Grafting $ESBUILD_PKG (target arch differs from build host)"

  esbuild_version="$(node -p "require('$REPO_ROOT/packages/devkit/package.json').dependencies.esbuild.replace(/^[^0-9]*/,'')")"
  [ -n "$esbuild_version" ] || die "could not read devkit's esbuild version."

  want="$(node -e "
    const fs=require('fs');
    const key=\"'${ESBUILD_PKG}@${esbuild_version}':\";
    const lines=fs.readFileSync('$REPO_ROOT/pnpm-lock.yaml','utf8').split('\n');
    const i=lines.findIndex(l=>l.trim()===key);
    if(i<0) process.exit(0);
    const m=(lines[i+1]||'').match(/integrity: (sha512-[A-Za-z0-9+/=]+)/);
    if(m) process.stdout.write(m[1]);
  ")"
  [ -n "$want" ] || die "pnpm-lock.yaml has no integrity entry for
  ${ESBUILD_PKG}@${esbuild_version}. Refusing to fetch an unverifiable binary —
  run 'pnpm install' so the lockfile records it, then re-run."

  fetch_dir="$STAGING/esbuild-fetch"
  mkdir -p "$fetch_dir"
  ( cd "$fetch_dir" && npm pack "${ESBUILD_PKG}@${esbuild_version}" --silent >/dev/null 2>&1 ) \
    || die "npm pack of ${ESBUILD_PKG}@${esbuild_version} failed (network?)."
  tgz="$(find "$fetch_dir" -maxdepth 1 -name '*.tgz' | head -1)"
  [ -n "$tgz" ] || die "npm pack produced no tarball for ${ESBUILD_PKG}."

  got="$(node -e "
    const c=require('crypto'),f=require('fs');
    process.stdout.write('sha512-'+c.createHash('sha512').update(f.readFileSync('$tgz')).digest('base64'));
  ")"
  [ "$got" = "$want" ] || die "integrity mismatch for ${ESBUILD_PKG}@${esbuild_version}
  expected (pnpm-lock.yaml): $want
  got (npm pack):            $got
  Refusing to bundle a binary that does not match the lockfile."

  tar -xzf "$tgz" -C "$fetch_dir" || die "failed to unpack ${ESBUILD_PKG}."
  # The member differs by platform: the unixlike packages ship bin/esbuild, and
  # @esbuild/win32-x64 ships esbuild.exe at the package ROOT with no bin/ at all.
  [ -s "$fetch_dir/package/${ESBUILD_MEMBER}" ] \
    || die "${ESBUILD_PKG} has no ${ESBUILD_MEMBER} — its package layout changed."
  chmod +x "$fetch_dir/package/${ESBUILD_MEMBER}"

  esb_root="$STAGING/devkit/node_modules"
  want_short="${ESBUILD_PKG#@esbuild/}"      # win32-x64 / linux-x64 / darwin-x64
  host_short="${host_esbuild#@esbuild/}"     # darwin-arm64 or darwin-x64

if [ "$NODE_LINKER" = "hoisted" ]; then
  # The hoisted closure is FLAT: @esbuild/<platform> is a real directory under
  # node_modules with no store entry and no consumer links pointing at it. So
  # the graft is a replace, and the elaborate re-pointing the symlinked layout
  # needs below has nothing to re-point.
  rm -rf "$esb_root/@esbuild/$host_short"
  mkdir -p "$esb_root/@esbuild/$want_short"
  cp -R "$fetch_dir/package/." "$esb_root/@esbuild/$want_short/"
  [ ! -d "$esb_root/@esbuild/$host_short" ] \
    || die "host-arch @esbuild/$host_short survived the graft — the sealed toolchain
  would carry two compilers and pick by accident."
  echo "    replaced @esbuild/${host_short} with @esbuild/${want_short} (flat layout)"
else
  # Mirror pnpm's own layout rather than dropping a directory in. The package
  # exists ONCE under .pnpm/<name>@<version>/node_modules/... and every consumer
  # reaches it by a RELATIVE symlink; replacing the real directory in place
  # leaves those links pointing at a name that no longer exists, which step 4.5
  # correctly refuses (measured 2026-08-13 — two dangling links).
  #
  # So: build the target's store entry, then re-point each consumer link by
  # rewriting its existing target string. Deriving the new link from the old one
  # preserves relativity for free, which hand-computing `../` depth would not.
  store_src="$(find "$esb_root/.pnpm" -maxdepth 4 -type d \
    -path "*/@esbuild+${host_short}@${esbuild_version}/node_modules/@esbuild/${host_short}" \
    2>/dev/null | head -1)"
  [ -n "$store_src" ] || die "no .pnpm store entry for ${host_esbuild}@${esbuild_version}
  in the deployed closure — the deploy layout changed and this graft is now wrong."

  store_dst="$(printf '%s' "$store_src" \
    | sed "s#@esbuild+${host_short}@#@esbuild+${want_short}@#; s#@esbuild/${host_short}\$#@esbuild/${want_short}#")"
  mkdir -p "$store_dst"
  cp -R "$fetch_dir/package/." "$store_dst/"

  # Re-point consumers, then drop the host-arch entries entirely. Shipping both
  # would leave a sealed toolchain carrying two compilers, picking by accident.
  relinked=0
  while IFS= read -r link; do
    [ -n "$link" ] || continue
    old_target="$(readlink "$link")"
    new_target="$(printf '%s' "$old_target" \
      | sed "s#@esbuild+${host_short}@#@esbuild+${want_short}@#; s#${host_short}\$#${want_short}#")"
    ln -s "$new_target" "$(dirname "$link")/${want_short}" \
      || die "failed to link $(dirname "$link")/${want_short}"
    rm -f "$link"
    relinked=$(( relinked + 1 ))
  done <<EOF
$(find "$esb_root" -type l -path "*/@esbuild/${host_short}" 2>/dev/null)
EOF

  rm -rf "$(printf '%s' "$store_src" | sed "s#\(/@esbuild+${host_short}@${esbuild_version}\)/.*#\1#")"
  echo "    store entry + $relinked consumer link(s) re-pointed to ${want_short}"
fi

  # Prove we grafted the TARGET's binary and not the host's. `file -b` names a
  # different thing on each platform — Mach-O says x86_64/arm64, PE32+ and ELF
  # say x86-64 with a hyphen — so the expected signature comes from the target
  # table rather than being spelled here.
  grafted="$(find "$esb_root" -type f -path "*/@esbuild/*/${ESBUILD_MEMBER}" | head -1)"
  [ -n "$grafted" ] || die "graft produced no @esbuild/*/${ESBUILD_MEMBER}."
  file -b "$grafted" | grep -q "$ESBUILD_SIG" \
    || die "grafted esbuild is not ${ESBUILD_SIG}: $(file -b "$grafted")"
  rm -rf "$fetch_dir"
  echo "    grafted $ESBUILD_PKG, integrity verified against pnpm-lock.yaml"
fi

# --- 3. The shim ----------------------------------------------------
# The IDE resolves THIS file, never the Node binary directly (see
# BundledToolchain.swift). It is where the seal is applied:
#   NODE_PATH  — devkit's own require() and esbuild's bundler both resolve
#                @sharpee/* out of the sealed node_modules (verified: Node 22
#                consults NODE_PATH even for require.resolve(x, {paths:[…]}),
#                and esbuild honours it for bundle resolution).
#   PATH       — the bundled node comes first, so esbuild's `#!/usr/bin/env
#                node` shim resolves to OUR runtime on a machine with none.
step "Writing bin/${LAUNCHER_FILE}"
mkdir -p "$STAGING/bin"

if [ "$LAUNCHER" = "cmd" ]; then
  # The Windows peer. Same three jobs as the POSIX shim — assert the runtime is
  # there, seal NODE_PATH and PATH to the toolchain, exec the CLI — spelled in
  # batch. `%~dp0` already ends in a backslash, so `%~dp0..` is the root.
  #
  # Written with CRLF deliberately: cmd.exe is unreliable on LF-only batch
  # files, and this one is generated on macOS where nothing would add them.
  cat > "$STAGING/bin/sharpee.cmd" <<'CMDSHIM'
@echo off
rem Chord Writer's bundled Sharpee toolchain (ADR-279 D4).
rem Generated by tools/ide/vendor-toolchain.sh — do not edit inside the bundle.
rem
rem Seals the CLI to the toolchain shipped alongside it: no global install, no
rem author-project node_modules, no network. Argument-transparent — everything
rem after the program name is the ordinary `sharpee` command line.
setlocal
set "root=%~dp0.."
set "devkit=%root%\devkit"

if not exist "%root%\node\bin\node.exe" (
  echo sharpee: bundled Node runtime missing from %root%\node\bin\node.exe 1>&2
  exit /b 127
)

if defined NODE_PATH (
  set "NODE_PATH=%devkit%\node_modules;%NODE_PATH%"
) else (
  set "NODE_PATH=%devkit%\node_modules"
)
set "PATH=%root%\node\bin;%devkit%\node_modules\.bin;%PATH%"

"%root%\node\bin\node.exe" "%devkit%\dist\cli.js" %*
exit /b %ERRORLEVEL%
CMDSHIM
  # LF -> CRLF, in place.
  perl -pi -e 's/\n/\r\n/' "$STAGING/bin/sharpee.cmd"
  chmod +x "$STAGING/bin/sharpee.cmd"
else
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
fi

# --- 4. Install atomically ------------------------------------------
# Assembled in staging and swapped in, so an interrupted run leaves the
# previous toolchain intact rather than a half-populated one.
step "Installing into $TOOLCHAIN"
mkdir -p "$(dirname "$TOOLCHAIN")"
rm -rf "$TOOLCHAIN.incoming" "$TOOLCHAIN.outgoing"
# ONE LAYOUT, PLATFORM-SPECIFIC LEAF: the runtime always lands at
# node/bin/<leaf>, whatever shape the official archive had. Copying the file
# rather than the archive's bin/ directory is what makes the win32 case — where
# node.exe sits at the dist root and there is no bin/ — the same line of code.
mkdir -p "$TOOLCHAIN.incoming/node/bin"
cp "$STAGING/${NODE_DIST}/${NODE_MEMBER}" "$TOOLCHAIN.incoming/node/bin/${NODE_LEAF}"
cp -R "$STAGING/devkit" "$TOOLCHAIN.incoming/devkit"
cp -R "$STAGING/bin" "$TOOLCHAIN.incoming/bin"
echo "$FINGERPRINT" > "$TOOLCHAIN.incoming/.stamp"

# --- 4.5 Enforce the seal -------------------------------------------
# Run against `.incoming` rather than staging deliberately: escape is a
# function of DEPTH, and `.incoming` is the only tree that sits at the exact
# path the toolchain will occupy. A link checked at staging depth can pass
# there and escape here.
#
# Resolution is lexical via path.resolve, which clamps `..` at `/` exactly as
# the kernel does — so a link is judged by where it would actually land, and
# dangling links are still classified rather than skipped.
step "Enforcing the seal (no symlink may escape the toolchain root)"
escaping="$(SEAL_ROOT="$TOOLCHAIN.incoming" node <<'JS'
const fs = require('fs'), path = require('path');
const root = path.resolve(process.env.SEAL_ROOT);
const out = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) {
      const target = path.resolve(path.dirname(p), fs.readlinkSync(p));
      if (target !== root && !target.startsWith(root + path.sep)) {
        out.push(p + '\t' + target);
      }
    } else if (e.isDirectory()) {
      walk(p);
    }
  }
})(root);
process.stdout.write(out.join('\n'));
JS
)" || die "seal scan failed to run."

if [ -n "$escaping" ]; then
  # Every escaping link observed so far is a redundant duplicate of a module
  # the .pnpm store already seals, so pruning it lets Node's ordinary upward
  # node_modules walk (plus the shim's NODE_PATH) find the sealed copy. Prune
  # only when that sealed copy is provably present — otherwise the closure is
  # genuinely incomplete and silently dropping the link would ship a toolchain
  # that fails at the author's first build.
  # Herestring, not a pipe: a piped `while` runs in a subshell, where `die`
  # would exit only that subshell and let the swap proceed with a leaky seal.
  while IFS=$'\t' read -r link target; do
    [ -n "$link" ] || continue
    spec="${link##*/node_modules/}"
    sealed="$TOOLCHAIN.incoming/devkit/node_modules/$spec"
    if [ "$link" != "$sealed" ] && [ -e "$sealed" ]; then
      rm -f "$link"
      echo "    pruned $spec (sealed copy at devkit/node_modules/$spec)"
    elif [ "$link" = "$TOOLCHAIN.incoming/devkit/node_modules/@sharpee/devkit" ]; then
      # The deploy root's link to itself. Nothing inside the seal resolves the
      # `@sharpee/devkit` specifier — the shim execs devkit/dist/cli.js by
      # absolute path — so this one is dropped outright rather than re-pointed
      # at ../.., which would introduce a symlink cycle for codesign to walk.
      rm -f "$link"
      echo "    pruned @sharpee/devkit (deploy root self-reference)"
    else
      die "symlink escapes the toolchain and has no sealed replacement:
    $link
      -> $target
  Pruning it would break resolution of '$spec'. The dependency closure is
  incomplete — deploy the missing package into the seal instead."
    fi
  done <<< "$escaping"
fi

# Re-scan: proves the prune actually closed the seal rather than assuming it,
# and catches any link left dangling INSIDE the toolchain (a dangling link is
# a codesign and notarization hazard even when it does not escape).
residue="$(SEAL_ROOT="$TOOLCHAIN.incoming" node <<'JS'
const fs = require('fs'), path = require('path');
const root = path.resolve(process.env.SEAL_ROOT);
const bad = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) {
      const target = path.resolve(path.dirname(p), fs.readlinkSync(p));
      if (target !== root && !target.startsWith(root + path.sep)) {
        bad.push('escapes:  ' + p + ' -> ' + target);
      } else if (!fs.existsSync(p)) {
        bad.push('dangling: ' + p + ' -> ' + target);
      }
    } else if (e.isDirectory()) {
      walk(p);
    }
  }
})(root);
process.stdout.write(bad.join('\n'));
JS
)" || die "seal re-scan failed to run."
[ -z "$residue" ] || die "the toolchain is not sealed:
$residue"
echo "    seal verified — every symlink resolves inside the toolchain"

if [ "$NODE_LINKER" = "hoisted" ]; then
  # Windows gets a STRONGER seal than "nothing escapes": nothing is a symlink
  # at all. A POSIX symlink cannot be relied on to survive an installer payload
  # onto Windows, so one left here is a file that silently goes missing on the
  # author's machine rather than a link that resolves somewhere wrong.
  #
  # The hoisted linker leaves only node_modules/.bin, and those are pruned
  # rather than materialised: they are PATH conveniences, and nothing on the
  # Chord build path spawns through them — resolveEsbuild() (devkit's
  # esbuild-bin.ts) resolves esbuild/package.json as a MODULE and spawns the
  # binary by absolute path. Copying them would ship LF shell scripts Windows
  # cannot run anyway; it needs .cmd shims, which nothing asks for.
  step "Removing POSIX .bin shims (win32 seal: no symlinks at all)"
  pruned_bin=0
  while IFS= read -r link; do
    [ -n "$link" ] || continue
    rm -f "$link"
    pruned_bin=$(( pruned_bin + 1 ))
  done <<EOF
$(find "$TOOLCHAIN.incoming" -type l 2>/dev/null)
EOF
  remaining="$(find "$TOOLCHAIN.incoming" -type l 2>/dev/null | head -5)"
  [ -z "$remaining" ] || die "symlinks survive in a win32 toolchain:
$remaining"
  echo "    $pruned_bin removed — zero symlinks remain"
fi

# --- 4.6 Sign the vendored Mach-O binaries --------------------------
# WHY HERE AND NOT ONLY IN package.sh. package.sh has its own nested-signing
# loop, but it runs only in package.sh's OWN build path. The recorded release
# workflow is Xcode → Distribute App → Direct Distribution, then
# `package.sh --dmg-from` — and Xcode does not sign payloads under
# Contents/Resources. So on that route nothing else ever signs these, and
# Distribute refuses the archive outright:
#
#   "esbuild" must be rebuilt with support for the Hardened Runtime.
#
# (Observed 2026-08-13. npm ships esbuild's darwin-arm64 binary ad-hoc
# `linker-signed`; nodejs.org ships node Developer-ID signed but carrying
# com.apple.security.get-task-allow, which the notary rejects.)
#
# Signing here also puts it in the right place structurally: this runs as an
# Xcode post-build phase (project.yml), so nested code is signed BEFORE the
# outer bundle, which is the only order that leaves the app's seal intact.
# package.sh re-signing later is idempotent and harmless.
# Darwin only, and that is a ruling rather than a limitation: Windows
# Authenticode signing is DEFERRED to the Windows box (David, 2026-09-16), which
# is where the Azure Trusted Signing identity lives and where Phase 6 does it.
# Linux ships unsigned by convention. Neither target has Mach-O to sign, so the
# loop below would find nothing and its own no-silent-✓ gate would then fail the
# build for the wrong reason — hence the gate, not an empty pass.
if [ "$DO_SIGN" -eq 1 ]; then
step "Signing vendored binaries"

if [ -z "${SIGN_IDENTITY:-}" ]; then
  SIGN_IDENTITY="$(security find-identity -v -p codesigning \
    | grep "Developer ID Application" | grep "$EXPECTED_TEAM" | head -1 \
    | sed -E 's/^ *[0-9]+\) [0-9A-F]+ "(.*)"$/\1/')"
fi
[ -n "$SIGN_IDENTITY" ] || die "no 'Developer ID Application' certificate for team
  $EXPECTED_TEAM in the keychain, and SIGN_IDENTITY is unset. The vendored
  binaries cannot be left unsigned — Xcode's Distribute App refuses the archive."
[ -f "$NODE_ENTITLEMENTS" ] || die "missing $NODE_ENTITLEMENTS — node must be
  re-signed WITH it (re-signing replaces an entitlement set wholesale, and V8
  dies without allow-jit)."

signed=0
while IFS= read -r macho; do
  [ -n "$macho" ] || continue
  rel="${macho#"$TOOLCHAIN.incoming"/}"
  case "$rel" in
    node/bin/node)
      codesign --force --sign "$SIGN_IDENTITY" --options runtime --timestamp \
        --entitlements "$NODE_ENTITLEMENTS" "$macho" 2>/dev/null \
        || die "failed to sign $rel with $NODE_ENTITLEMENTS" ;;
    *)
      codesign --force --sign "$SIGN_IDENTITY" --options runtime --timestamp \
        "$macho" 2>/dev/null || die "failed to sign $rel" ;;
  esac
  signed=$(( signed + 1 ))
done <<EOF
$(find "$TOOLCHAIN.incoming" -type f -perm -u+x -exec sh -c \
   'for f; do case "$(file -b "$f")" in *Mach-O*) echo "$f";; esac; done' _ {} +)
EOF

[ "$signed" -gt 0 ] || die "found no Mach-O under the assembled toolchain — the
  vendored node should be there at minimum. Refusing to continue."

# No-silent-✓ gate: prove it rather than trusting the loop.
unhardened="$(find "$TOOLCHAIN.incoming" -type f -perm -u+x -exec sh -c '
  case "$(file -b "$1")" in *Mach-O*) ;; *) exit 0;; esac
  d="$(codesign -dvv "$1" 2>&1 || true)"
  printf "%s" "$d" | grep -q "Authority=Developer ID Application" \
    && printf "%s" "$d" | grep -q "^Timestamp=" \
    && printf "%s" "$d" | grep -q "flags=.*runtime" || echo "$1"
' _ {} \;)"
[ -z "$unhardened" ] || die "these vendored binaries are not notarization-ready:
$unhardened"

echo "    $signed signed (Developer ID, hardened runtime, timestamped)"
else
  step "Skipping code signing (--target $TARGET)"
  echo "    no Mach-O in this toolchain; Windows Authenticode is deferred to the Windows box"
fi

[ -d "$TOOLCHAIN" ] && mv "$TOOLCHAIN" "$TOOLCHAIN.outgoing"
mv "$TOOLCHAIN.incoming" "$TOOLCHAIN"
rm -rf "$TOOLCHAIN.outgoing"

# --- 5. Post-conditions ---------------------------------------------
# The no-silent-✓ gate: assert the artifacts the app depends on are present
# and executable before reporting success.
[ -x "$TOOLCHAIN/bin/${LAUNCHER_FILE}" ] \
  || die "assembled toolchain has no executable bin/${LAUNCHER_FILE}."
[ -s "$TOOLCHAIN/node/bin/${NODE_LEAF}" ] \
  || die "assembled toolchain has no node/bin/${NODE_LEAF}."
[ -f "$TOOLCHAIN/devkit/dist/cli.js" ] || die "assembled toolchain has no devkit/dist/cli.js."
[ -f "$TOOLCHAIN/devkit/node_modules/@sharpee/platform-browser/styles/engine.css" ] \
  || die "assembled toolchain has no platform-browser styles."

echo "vendor-toolchain: OK ($TARGET/$ARCH) — $(du -sh "$TOOLCHAIN" | cut -f1) at $TOOLCHAIN"
