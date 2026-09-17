#!/usr/bin/env bash
# package-avalonia.sh — build a shippable macOS .app for the Avalonia desktop
# head (PaneHost), one architecture slice per run.
#
# Public interface:
#   package-avalonia.sh [--arch arm64|x86_64] [--version X.Y.Z] [--out DIR] [--no-sign]
# Owner context: tools/ide — macOS release tooling for the Avalonia desktop head.
#
# NOT package.sh's sibling pipeline. package.sh ships the SWIFT Chord Writer and
# is xcodebuild/xcodegen shaped; this ships the .NET/Avalonia head and is
# dotnet-publish/vpk shaped. They produce different apps from different sources
# and deliberately share no code — only the signing identity and the vendored
# toolchain script, both of which have one owner each.
#
# THE RECIPE (docs/work/velopack-macos-bundle-layout/decision.md, ADR-351 Q-5):
#
#   publish -> vendor toolchain -> relocate -> vpk pack --signAppIdentity
#
# Two constraints, both load-bearing and both measured rather than assumed:
#
#   1. RELOCATE BEFORE PACK. `vpk pack` accepts a pre-built .app as --packDir and
#      passes its Contents/ tree through unchanged, so the .nupkg carries the
#      relocated layout natively and survives Velopack's update-apply path with
#      no post-apply hook. Relocating vpk's own output instead collides on
#      sq.version in OsxPackCommandRunner.PreprocessPackDir (overwrite:false).
#
#   2. SIGN AT PACK TIME, NOT AFTER. Packing an unsigned app destroys the bundle
#      seal on update-apply; --signAppIdentity puts _CodeSignature inside the
#      .nupkg and the installed bundle stays sealed.
#
# NO --signEntitlements, DELIBERATELY. vpk's .NET default entitlement set is
# byte-identical to the five keys in bundled-node.entitlements — allow-jit
# present, get-task-allow absent — verified against the signed spike bundle
# (evidence/phase3-signing-pre-notarization.txt:36-39). Passing our own set would
# be a second copy of a list that already agrees, and the vendored node would be
# signed twice for no gain.
#
# Notarization is NOT this script's job, exactly as package.sh never waits on
# Apple: it produces the signed artifact and the submission zip, and stops.
# notary-submit.py takes it from there (notarytool crashes on upload here).
set -euo pipefail

readonly IDE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd -- "$IDE_DIR/../.." && pwd)"

# vpk is a global dotnet tool and is not on PATH; its AppHost cannot find the
# Homebrew .NET without DOTNET_ROOT.
readonly VPK="${VPK:-/Users/david/.dotnet/tools/vpk}"
readonly DOTNET_ROOT_FOR_VPK="${DOTNET_ROOT:-/opt/homebrew/opt/dotnet/libexec}"

# Same identity and team as package.sh and vendor-toolchain.sh. The three sign
# one product and must not be able to disagree about who signed it.
SIGN_IDENTITY="${SIGN_IDENTITY:-Developer ID Application: David Cornelson (RSNGKW5LNH)}"

# PROVISIONAL IDENTITY — David's to rule on. Deliberately distinct from the
# shipping "Chord Writer.app" so both can sit in /Applications during the port
# without one shadowing the other, and so no artifact claims to be the shipping
# app before David says it is.
PACK_ID="${PACK_ID:-ChordWriterAvalonia}"
PACK_TITLE="${PACK_TITLE:-Chord Writer (Avalonia)}"
BUNDLE_ID="${BUNDLE_ID:-com.The_Sharpee_Project.ChordWriterAvalonia}"
readonly MAIN_EXE="PaneHost"
readonly ICONSET_SRC="$IDE_DIR/SharpeeIDE/Resources/Assets.xcassets/AppIcon.appiconset"

die() { echo "package-avalonia: $*" >&2; exit 1; }
step() { printf '\n  → %s\n' "$*"; }

# --- Arguments -----------------------------------------------------
readonly USAGE="usage: package-avalonia.sh [--arch arm64|x86_64] [--version X.Y.Z] [--out DIR] [--no-sign]"
ARCH=""
VERSION=""
OUT=""
DO_SIGN=1
expect=""
for arg in "$@"; do
  if [ -n "$expect" ]; then
    case "$expect" in arch) ARCH="$arg" ;; version) VERSION="$arg" ;; out) OUT="$arg" ;; esac
    expect=""; continue
  fi
  case "$arg" in
    --arch) expect=arch ;;   --arch=*) ARCH="${arg#--arch=}" ;;
    --version) expect=version ;; --version=*) VERSION="${arg#--version=}" ;;
    --out) expect=out ;;     --out=*) OUT="${arg#--out=}" ;;
    --no-sign) DO_SIGN=0 ;;
    *) die "unknown argument '$arg' ($USAGE)" ;;
  esac
done
[ -z "$expect" ] || die "--$expect needs a value ($USAGE)"

[ "$(uname -s)" = "Darwin" ] || die "macOS only (found $(uname -s))."
[ -n "$ARCH" ] || ARCH="$(uname -m)"
case "$ARCH" in
  arm64)  RID="osx-arm64" ;;
  x86_64) RID="osx-x64" ;;
  *) die "unknown --arch '$ARCH' (expected arm64 or x86_64)" ;;
esac

# Version tracks Chord Writer's own line (ADR-279 D1) until the Avalonia head
# earns a version line of its own — which is David's call, not this script's.
[ -n "$VERSION" ] || VERSION="$(sed -n 's/^ *CFBundleShortVersionString: *"\{0,1\}\([0-9][0-9.]*\)"\{0,1\} *$/\1/p' "$IDE_DIR/project.yml" | head -1)"
[ -n "$VERSION" ] || die "could not read CFBundleShortVersionString from project.yml; pass --version."

[ -n "$OUT" ] || OUT="$IDE_DIR/release-avalonia/$ARCH"

# --- Preconditions -------------------------------------------------
command -v dotnet >/dev/null || die "dotnet is not on PATH."
[ -x "$VPK" ] || die "vpk not found at $VPK (dotnet tool install -g vpk)."
[ -d "$ICONSET_SRC" ] || die "no app icon source at $ICONSET_SRC."
command -v iconutil >/dev/null || die "iconutil is not available (Xcode command line tools)."
if [ "$DO_SIGN" = 1 ]; then
  security find-identity -v -p codesigning 2>/dev/null | grep -Fq "$SIGN_IDENTITY" \
    || die "signing identity not in the keychain: $SIGN_IDENTITY
  Pass --no-sign to build an unsigned bundle for inspection — but note that an
  unsigned pack destroys the seal on update-apply, so it is never shippable."
fi

echo "=== Packaging the Avalonia desktop head ==="
echo "    $PACK_TITLE $VERSION · $RID · packId $PACK_ID"
echo "    → $OUT"

readonly WORK="$OUT/work"
readonly PUBLISH="$WORK/publish"
readonly APP="$WORK/$PACK_TITLE.app"

# Both cleared per run. Releases/ is not merely tidiness: vpk refuses to emit a
# version equal to or below one already in its output directory ("There is a
# release in channel osx which is equal or greater to the current version"), so
# a second run at the same version aborts AFTER publishing, vendoring and
# signing — the expensive steps — and leaves the previous run's packages sitting
# there looking current. Delta generation against release history is the release
# driver's job, not this script's; this builds one slice, reproducibly.
rm -rf "$WORK" "$OUT/Releases"
mkdir -p "$PUBLISH"

# --- 1. Publish ----------------------------------------------------
step "Publishing $MAIN_EXE for $RID"
dotnet publish "$IDE_DIR/PaneHost/PaneHost.csproj" \
  -c Release -r "$RID" --self-contained true \
  -o "$PUBLISH" --nologo -v quiet
[ -f "$PUBLISH/$MAIN_EXE" ] || die "publish produced no AppHost at $PUBLISH/$MAIN_EXE."

# --- 2. Vendor the toolchain ---------------------------------------
# Into the publish directory, so step 3 relocates it to Contents/Resources along
# with everything else. The exit state requires the bundled toolchain to answer
# from inside the notarized bundle, so it is part of the app, not an extra.
step "Vendoring the Sharpee toolchain ($ARCH)"
bash "$IDE_DIR/vendor-toolchain.sh" "$PUBLISH" --arch "$ARCH"

# --- 2a. Product assets --------------------------------------------
# The web panes and the editor's lexer bridge ship inside the bundle, and
# RepoPaths resolves them at Contents/Resources/<name> when bundled (GH #474).
# Staged into the publish directory so step 5 relocates them with everything else.
#
# fernhill is deliberately NOT here. It is a development story; RepoPaths returns
# null for it in a bundle and the shell opens empty. A shipped app must not carry
# someone else's test story.
step "Staging product assets"
readonly SWIFT_RESOURCES="$IDE_DIR/SharpeeIDE/Resources"
for asset in testing-surface docs-tab; do
  [ -d "$SWIFT_RESOURCES/$asset" ] || die "missing product asset: $SWIFT_RESOURCES/$asset"
  cp -a "$SWIFT_RESOURCES/$asset" "$PUBLISH/$asset"
done

readonly LEXER_SRC="$IDE_DIR/editor-bridge/dist/lexer-server.js"
[ -f "$LEXER_SRC" ] || die "the editor's lexer bridge is not built.
  Run: node $IDE_DIR/editor-bridge/build.mjs
  Shipping without it would give the editor no syntax highlighting."
mkdir -p "$PUBLISH/editor-bridge"
cp "$LEXER_SRC" "$PUBLISH/editor-bridge/lexer-server.js"
echo "    testing-surface, docs-tab, editor-bridge/lexer-server.js"

# --- 3. Icon -------------------------------------------------------
# Built from the asset catalog at package time rather than committed as a
# derived .icns, so the two cannot drift. The appiconset's filenames already
# follow iconutil's .iconset convention.
step "Building $PACK_ID.icns from the asset catalog"
readonly ICONSET="$WORK/$PACK_ID.iconset"
mkdir -p "$ICONSET"
cp "$ICONSET_SRC"/icon_*.png "$ICONSET/"
iconutil -c icns "$ICONSET" -o "$WORK/$PACK_ID.icns"

# --- 4. Info.plist -------------------------------------------------
step "Writing Info.plist"
cat > "$WORK/Info.plist" <<PLIST
<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>CFBundleName</key>
    <string>$PACK_TITLE</string>
    <key>CFBundleIdentifier</key>
    <string>$BUNDLE_ID</string>
    <key>CFBundleVersion</key>
    <string>$VERSION</string>
    <key>CFBundleShortVersionString</key>
    <string>$VERSION</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleExecutable</key>
    <string>$MAIN_EXE</string>
    <key>CFBundleIconFile</key>
    <string>$PACK_ID.icns</string>
    <key>NSPrincipalClass</key>
    <string>NSApplication</string>
    <key>NSHighResolutionCapable</key>
    <true />
  </dict>
</plist>
PLIST

# --- 5. Relocate ---------------------------------------------------
step "Arranging the Apple-conformant bundle"
bash "$IDE_DIR/build-relocated-app.sh" \
  "$PUBLISH" "$APP" "$MAIN_EXE" "$WORK/Info.plist" "$WORK/$PACK_ID.icns"

# --- 5a. Pre-sign the payload --------------------------------------
# vpk's --deep pass signs the bundle and Contents/MacOS but leaves the payload
# in Contents/Resources as it found it — ad-hoc from `dotnet publish`, or
# Microsoft-signed with no hardened runtime. Both are notarization failures.
# See presign-payload.sh's header for the measured census that found this.
if [ "$DO_SIGN" = 1 ]; then
  step "Signing the .NET payload"
  bash "$IDE_DIR/presign-payload.sh" "$APP" "$SIGN_IDENTITY" "$IDE_DIR/dotnet-payload.entitlements"
fi

# --- 6. Pack and sign ----------------------------------------------
step "Packing with vpk$([ "$DO_SIGN" = 1 ] && echo ' (signed)' || echo ' (UNSIGNED)')"
VPK_ARGS=(
  pack
  --packId "$PACK_ID"
  --packVersion "$VERSION"
  --packDir "$APP"
  --packTitle "$PACK_TITLE"
  --mainExe "$MAIN_EXE"
  --icon "$WORK/$PACK_ID.icns"
  --bundleId "$BUNDLE_ID"
  --runtime "$RID"
  --outputDir "$OUT/Releases"
)
[ "$DO_SIGN" = 1 ] && VPK_ARGS+=(--signAppIdentity "$SIGN_IDENTITY")
DOTNET_ROOT="$DOTNET_ROOT_FOR_VPK" "$VPK" "${VPK_ARGS[@]}"

echo
echo "package-avalonia: OK ($ARCH) — $OUT/Releases"
ls -la "$OUT/Releases"
