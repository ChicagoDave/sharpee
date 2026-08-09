#!/usr/bin/env bash
# -------------------------------------------------------------------
# package.sh — build, sign, notarize and package Chord Writer as a
# distributable DMG (ADR-279 D2/D3).
#
# Owner context: tools/ide — packaging. Mac-only by nature, which is why it
# lives beside the Xcode project rather than in repokit (ADR-187/ADR-279 D3:
# repokit stays Node-only and IDE-ignorant).
#
# Public interface:
#   package.sh [--skip-platform-build] [--keep-work] [--no-notarize]
#     --skip-platform-build  reuse the existing packages/*/dist (iteration only —
#                            NOT safe for a release; see step 2)
#     --keep-work            leave the work directory for inspection
#     --no-notarize          stop after local signature verification. Everything
#                            through step 6 runs for real — including signing
#                            with the Developer ID — but nothing is submitted to
#                            Apple and no DMG is produced. Use it to rehearse a
#                            release, or to exercise the credential preflight,
#                            without spending a notarization round-trip.
#
#   Environment:
#     NOTARY_PROFILE   notarytool keychain profile name  (default: dc-notary)
#     SIGN_IDENTITY    codesign identity                 (default: the sole
#                      "Developer ID Application" in the keychain)
#
# Produces, under tools/ide/release/:
#   ChordWriter-<version>.dmg          signed, notarized, stapled
#   ChordWriter-<version>.dmg.sha256   checksum of the above
#
# SECRETS: the signing identity comes from the keychain and the notary
# credential from a notarytool keychain profile. Neither is read from, written
# to, or defaulted into the repo.
#
# NO SILENT FALLTHROUGH. Every step that can produce an unsigned, unnotarized
# or half-built artifact hard-fails instead. An ad-hoc-signed DMG that looks
# like a release is the single worst outcome this script can have, because it
# fails on the author's machine rather than on this one.
# -------------------------------------------------------------------
set -euo pipefail

readonly IDE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd -- "$IDE_DIR/../.." && pwd)"
readonly RELEASE_DIR="$IDE_DIR/release"
readonly NODE_ENTITLEMENTS="$IDE_DIR/bundled-node.entitlements"
# Window geometry and the layout itself belong to dmg/assemble-dmg.sh. Only the
# background's PRESENCE is checked here, at preflight, because discovering it
# missing at step 8 costs the whole build.
readonly DMG_BACKGROUND="$IDE_DIR/dmg/background.tiff"

NOTARY_PROFILE="${NOTARY_PROFILE:-dc-notary}"
SIGN_IDENTITY="${SIGN_IDENTITY:-}"

die()  { echo "" >&2; echo "package: $*" >&2; exit 1; }
step() { echo ""; echo "── $* ─────────────────────────────────"; }
note() { echo "  → $*"; }
ok()   { echo "  ✓ $*"; }

SKIP_PLATFORM_BUILD=0
KEEP_WORK=0
NO_NOTARIZE=0
for arg in "$@"; do
  case "$arg" in
    --skip-platform-build) SKIP_PLATFORM_BUILD=1 ;;
    --keep-work) KEEP_WORK=1 ;;
    --no-notarize) NO_NOTARIZE=1 ;;
    *) die "unknown flag '$arg' (usage: package.sh [--skip-platform-build] [--keep-work] [--no-notarize])" ;;
  esac
done

# =====================================================================
# 1. Preflight — tools, then credentials
# =====================================================================
# Credentials are checked HERE rather than at the codesign/notarytool steps
# they serve. Those steps sit 10+ minutes into a cold run, and discovering a
# missing certificate then means paying the whole build again (AC2 asks that
# the failure name the missing credential — it does not ask that it arrive
# late). Each check below names exactly what is absent and how to supply it.
step "Preflight"

[ "$(uname -s)" = "Darwin" ] || die "packaging is macOS-only (uname: $(uname -s))."

for tool in xcodebuild xcodegen pnpm node hdiutil codesign xcrun shasum osascript; do
  command -v "$tool" >/dev/null || die "'$tool' is not on PATH but is required."
done
ok "toolchain present"

[ -f "$NODE_ENTITLEMENTS" ] || die "missing $NODE_ENTITLEMENTS — the vendored Node
  runtime cannot be signed without it (see the file's own header for why)."

# Checked here rather than at step 8, which sits 10+ minutes into a cold run.
[ -f "$DMG_BACKGROUND" ] || die "missing $DMG_BACKGROUND — the DMG window background.
  Regenerate it with tools/ide/dmg/make-background.swift and commit the result."

# --- Credential 1: the Developer ID Application certificate ---------
if [ -z "$SIGN_IDENTITY" ]; then
  identity_lines="$(security find-identity -v -p codesigning | grep 'Developer ID Application' || true)"
  [ -n "$identity_lines" ] || die "MISSING CREDENTIAL: no 'Developer ID Application' certificate
  in the keychain. Install your Developer ID Application certificate from
  developer.apple.com, or set SIGN_IDENTITY to an identity that is present.
  Ad-hoc signing is NOT an acceptable substitute — notarization rejects it."
  if [ "$(printf '%s\n' "$identity_lines" | wc -l | tr -d ' ')" -gt 1 ]; then
    die "MISSING CREDENTIAL: more than one 'Developer ID Application' identity is
  installed, so the correct one cannot be inferred. Set SIGN_IDENTITY explicitly:
$identity_lines"
  fi
  SIGN_IDENTITY="$(printf '%s' "$identity_lines" | sed -E 's/.*"(.*)".*/\1/')"
fi
ok "signing identity: $SIGN_IDENTITY"

# --- Credential 2: the notarytool keychain profile ------------------
# `history` is the cheapest call that actually authenticates against Apple. A
# profile can exist in the keychain with a revoked or mistyped key, and that
# must fail here rather than after the archive.
xcrun notarytool history --keychain-profile "$NOTARY_PROFILE" >/dev/null 2>&1 \
  || die "MISSING CREDENTIAL: notarytool profile '$NOTARY_PROFILE' is absent or does
  not authenticate. Create it with:
    xcrun notarytool store-credentials \"$NOTARY_PROFILE\" \\
      --key <AuthKey_XXXXXXXXXX.p8> --key-id <KEY_ID> --issuer <ISSUER_UUID>
  Override the profile name with NOTARY_PROFILE=<name> if yours differs."
ok "notary profile '$NOTARY_PROFILE' authenticates"

# --- Version, from project.yml (ADR-279 D1: Chord Writer versions on its own line)
VERSION="$(sed -n 's/^ *CFBundleShortVersionString: *"\{0,1\}\([0-9][0-9.]*\)"\{0,1\} *$/\1/p' "$IDE_DIR/project.yml" | head -1)"
[ -n "$VERSION" ] || die "could not read CFBundleShortVersionString from $IDE_DIR/project.yml."
ok "version: $VERSION"

readonly DMG_NAME="ChordWriter-${VERSION}.dmg"
WORK="$(mktemp -d)"
if [ "$KEEP_WORK" -eq 1 ]; then
  trap 'echo ""; echo "work directory kept: $WORK"' EXIT
else
  trap 'rm -rf "$WORK"' EXIT
fi

# =====================================================================
# 2. Platform build — before vendoring, always
# =====================================================================
# vendor-toolchain.sh's preconditions only assert that packages/devkit/dist
# EXISTS, not that it is CURRENT. A stale dist/ therefore sails through and
# gets sealed into the bundle, producing an app whose Build button runs code
# that predates the release. This ordering is the fix, and it is why
# --skip-platform-build is documented as iteration-only.
step "Platform build"
if [ "$SKIP_PLATFORM_BUILD" -eq 1 ]; then
  echo "  !! SKIPPED — packages/*/dist is reused as-is."
  echo "  !! Iteration only. A release built this way may seal a stale CLI."
else
  ( cd "$REPO_ROOT" && ./repokit build ) || die "platform build failed."
  ok "platform packages built"
fi

# =====================================================================
# 3. Generate the Xcode project + archive
# =====================================================================
step "Archive"
( cd "$IDE_DIR" && xcodegen generate ) >/dev/null || die "xcodegen generate failed."
ok "SharpeeIDE.xcodeproj regenerated from project.yml"

readonly ARCHIVE="$WORK/ChordWriter.xcarchive"
# SHARPEE_VENDOR_TOOLCHAIN=1 opts the post-build script into assembling the
# bundled toolchain (ADR-279 D4; off by default so dev-loop builds stay fast
# per AC5). Signing is deliberately left ad-hoc here and redone in step 5 —
# see that step for why Xcode cannot do it.
SHARPEE_VENDOR_TOOLCHAIN=1 xcodebuild archive \
  -project "$IDE_DIR/SharpeeIDE.xcodeproj" \
  -scheme SharpeeIDE \
  -configuration Release \
  -archivePath "$ARCHIVE" \
  CODE_SIGN_IDENTITY="-" \
  CODE_SIGNING_ALLOWED=YES \
  > "$WORK/xcodebuild.log" 2>&1 \
  || die "xcodebuild archive failed. Log: $WORK/xcodebuild.log
$(tail -30 "$WORK/xcodebuild.log")"

readonly APP="$ARCHIVE/Products/Applications/Chord Writer.app"
[ -d "$APP" ] || die "archive produced no 'Chord Writer.app'. Log: $WORK/xcodebuild.log"
ok "archived $(basename "$APP")"

# Version agreement: project.yml is the source of truth for the DMG name, but
# the bundle carries its own copy. If they disagree the DMG is mislabeled, and
# a mislabeled release is unrecallable once downloaded.
bundle_version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP/Contents/Info.plist" 2>/dev/null || true)"
[ "$bundle_version" = "$VERSION" ] \
  || die "version mismatch: project.yml says '$VERSION', the built bundle says '$bundle_version'."
ok "bundle version agrees with project.yml"

# =====================================================================
# 4. Verify the bundled toolchain arrived, and is sealed
# =====================================================================
# vendor-toolchain.sh enforces the seal at assembly time; this re-checks it in
# the ARCHIVED bundle, at the depth the app will actually occupy. Escape is a
# function of depth, so a link that resolved inside the toolchain during
# assembly can still escape from here.
step "Toolchain seal"
readonly BUNDLED_TC="$APP/Contents/Resources/toolchain"
[ -x "$BUNDLED_TC/bin/sharpee" ] || die "the archive has no bundled toolchain at
  Contents/Resources/toolchain. The post-build script did not run — confirm
  SHARPEE_VENDOR_TOOLCHAIN reached xcodebuild."

seal_residue="$(SEAL_ROOT="$BUNDLED_TC" node <<'JS'
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
)" || die "seal scan failed to run."
[ -z "$seal_residue" ] || die "the bundled toolchain is not sealed — refusing to ship a
  bundle that reaches outside itself:
$seal_residue"
ok "every symlink under the bundled toolchain resolves inside it"

# =====================================================================
# 5. Sign, inside out
# =====================================================================
# Xcode cannot do this part. Two independent reasons:
#
#   1. The toolchain lands in Contents/Resources via a post-build script, so
#      the Mach-O binaries inside it are RESOURCES to Xcode, not build
#      products. Nothing in the target signs them.
#   2. The vendored node needs its own entitlement set (see
#      bundled-node.entitlements), which differs from the app's.
#
# Order matters absolutely: signing the app seals its resources by hash, so
# every nested binary must be final BEFORE the outer signature is applied.
# Sign the app first and the nested signatures invalidate it.
#
# --deep is deliberately not used. Apple deprecated it precisely because it
# applies one identity and one entitlement set to everything it finds, which is
# the opposite of what this bundle needs.
step "Signing"

# sign_macho <path> [entitlements] — Developer-ID-sign one Mach-O with the
# hardened runtime and a secure timestamp (both are notarization requirements).
sign_macho() {
  local target="$1" ents="${2:-}"
  if [ -n "$ents" ]; then
    codesign --force --sign "$SIGN_IDENTITY" --options runtime --timestamp \
      --entitlements "$ents" "$target" 2>&1 \
      || die "codesign failed for $target"
  else
    codesign --force --sign "$SIGN_IDENTITY" --options runtime --timestamp \
      "$target" 2>&1 \
      || die "codesign failed for $target"
  fi
}

# Discover rather than hardcode: the closure's native binaries change with the
# dependency graph (esbuild is here today; a future native addon would not
# announce itself), and an unsigned straggler is a notarization rejection.
# Read into an array the bash-3.2 way. macOS still ships bash 3.2 as /bin/bash,
# where `mapfile` does not exist — and because it is a builtin, its absence is a
# RUNTIME failure that `bash -n` happily accepts.
machos=()
while IFS= read -r found; do
  [ -n "$found" ] && machos+=("$found")
done < <(
  find "$BUNDLED_TC" -type f -perm -u+x -exec sh -c \
    'for f; do case "$(file -b "$f")" in *Mach-O*) echo "$f";; esac; done' _ {} +
)
[ "${#machos[@]}" -gt 0 ] || die "found no Mach-O binaries under the bundled toolchain —
  the vendored Node runtime should be there at minimum. Refusing to continue."

for macho in "${machos[@]}"; do
  rel="${macho#"$BUNDLED_TC"/}"
  case "$rel" in
    node/bin/node)
      # Re-signed, not left as shipped: nodejs.org's signature carries
      # com.apple.security.get-task-allow, which Apple's notary service
      # rejects. See bundled-node.entitlements.
      sign_macho "$macho" "$NODE_ENTITLEMENTS"
      note "signed $rel (with V8 entitlements)" ;;
    *)
      # esbuild and friends arrive ad-hoc/linker-signed, which never notarizes.
      sign_macho "$macho"
      note "signed $rel" ;;
  esac
done
ok "${#machos[@]} nested binaries signed"

sign_macho "$APP"
ok "app bundle signed"

# =====================================================================
# 6. Verify the signature locally, before spending a notarization round-trip
# =====================================================================
step "Signature verification"
codesign --verify --deep --strict --verbose=2 "$APP" 2>&1 | sed 's/^/  /' \
  || die "codesign verification failed for the app bundle."
ok "signature verifies (deep, strict)"

# NOTE ON `grep -q` — do not reintroduce it in a pipeline here. Under
# `set -o pipefail`, `grep -q` exits at the first match, SIGPIPEs the codesign
# feeding it, and the pipeline reports FAILURE precisely when the match
# SUCCEEDS. That inverts every assertion below: the hardened-runtime check
# fired on a correctly-signed app, and the get-task-allow check would have
# stayed silent in exactly the case it exists to catch. Capture first, then
# match against the captured string.

# assert_hardened <path> <label> — fail unless <path>'s code directory carries
# the hardened-runtime flag. codesign accepts a missing runtime flag happily;
# only the notary service rejects it, so catching it locally saves a round trip.
assert_hardened() {
  local target="$1" label="$2" cd_line
  cd_line="$(codesign -dvv "$target" 2>&1 | grep '^CodeDirectory' || true)"
  case "$cd_line" in
    *runtime*) ;;
    *) die "$label is signed WITHOUT the hardened runtime — notarization would
  reject it. Code directory reported: ${cd_line:-<none>}" ;;
  esac
}
assert_hardened "$APP" "the app"
assert_hardened "$BUNDLED_TC/node/bin/node" "the vendored node"
ok "hardened runtime present on app and vendored node"

# The debug entitlement that made re-signing necessary in the first place.
# Asserted rather than assumed, because a future entitlements edit could
# quietly reintroduce it and the failure would surface only at Apple.
node_entitlements="$(codesign -d --entitlements - --xml "$BUNDLED_TC/node/bin/node" 2>/dev/null || true)"
case "$node_entitlements" in
  *get-task-allow*)
    die "the vendored node still carries com.apple.security.get-task-allow.
  Notarization rejects it. Check $NODE_ENTITLEMENTS." ;;
esac
# An empty entitlement set means the signature did not take the file at all.
case "$node_entitlements" in
  *allow-jit*) ;;
  *) die "the vendored node has no com.apple.security.cs.allow-jit entitlement.
  V8 cannot compile without it and every author's first build would crash.
  Check that $NODE_ENTITLEMENTS was applied." ;;
esac
ok "vendored node entitlements correct (allow-jit present, get-task-allow absent)"

if [ "$NO_NOTARIZE" -eq 1 ]; then
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo " REHEARSAL ONLY — nothing was submitted to Apple"
  echo "═══════════════════════════════════════════════════"
  echo "  Built, sealed, and Developer-ID-signed: $VERSION"
  echo "  No notarization, no staple, NO DMG. The artifact below is not"
  echo "  distributable — Gatekeeper blocks an un-notarized app on any machine"
  echo "  but this one."
  echo "    $APP"
  if [ "$KEEP_WORK" -eq 0 ]; then
    echo "  (removed on exit — pass --keep-work to inspect it)"
  fi
  echo ""
  echo "  Re-run without --no-notarize to produce the real DMG."
  echo ""
  exit 0
fi

# =====================================================================
# 7. Notarize the app
# =====================================================================
# The app is notarized and stapled BEFORE the DMG is built, so the copy a user
# drags to /Applications carries its own ticket. Notarizing only the DMG leaves
# the installed app dependent on a network check.
step "Notarizing the app"
readonly APP_ZIP="$WORK/ChordWriter-app.zip"
ditto -c -k --keepParent "$APP" "$APP_ZIP" || die "failed to zip the app for notarization."
note "submitting $(du -h "$APP_ZIP" | cut -f1) to Apple (this waits for the verdict)"
xcrun notarytool submit "$APP_ZIP" \
  --keychain-profile "$NOTARY_PROFILE" --wait 2>&1 | tee "$WORK/notary-app.log" | sed 's/^/  /'
grep -q 'status: Accepted' "$WORK/notary-app.log" || die "app notarization did not return Accepted.
  Fetch the detail with:
    xcrun notarytool log <submission-id> --keychain-profile \"$NOTARY_PROFILE\"
  Full output: $WORK/notary-app.log"
ok "app notarized"

xcrun stapler staple "$APP" >/dev/null || die "failed to staple the notarization ticket to the app."
ok "ticket stapled to the app"

# =====================================================================
# 8. Assemble the DMG
# =====================================================================
# Staging, the Finder window layout and compression live in assemble-dmg.sh.
# They are split out because everything around them here needs credentials and
# a ten-minute build, which would leave the layout testable only by shipping;
# dmg-layout-test.sh drives that script directly. This step owns WHAT goes in
# and where the result lands — the script owns how the image is built.
step "DMG"
mkdir -p "$RELEASE_DIR"
readonly DMG_PATH="$RELEASE_DIR/$DMG_NAME"
"$IDE_DIR/dmg/assemble-dmg.sh" "$APP" "Chord Writer $VERSION" "$DMG_PATH" \
  || die "failed to assemble the DMG."
ok "created $DMG_NAME ($(du -h "$DMG_PATH" | cut -f1))"

# The DMG is itself a distributed artifact and is signed too — but NOT via
# sign_macho: the hardened runtime is a Mach-O load-command concept and means
# nothing on a disk image. A timestamped signature is the whole requirement.
codesign --force --sign "$SIGN_IDENTITY" --timestamp "$DMG_PATH" \
  || die "codesign failed for $DMG_NAME"
ok "DMG signed"

step "Notarizing the DMG"
xcrun notarytool submit "$DMG_PATH" \
  --keychain-profile "$NOTARY_PROFILE" --wait 2>&1 | tee "$WORK/notary-dmg.log" | sed 's/^/  /'
grep -q 'status: Accepted' "$WORK/notary-dmg.log" || die "DMG notarization did not return Accepted.
  Full output: $WORK/notary-dmg.log"
xcrun stapler staple "$DMG_PATH" >/dev/null || die "failed to staple the ticket to the DMG."
ok "DMG notarized and stapled"

# =====================================================================
# 9. Final gate — assess as Gatekeeper will, then checksum
# =====================================================================
# This runs on the machine that BUILT the artifact, so it is necessary but not
# sufficient: AC3 requires the same assessment on a machine that never built
# it. See the plan's Phase 3 real-path test.
step "Gatekeeper assessment"
spctl --assess --type open --context context:primary-signature -vv "$DMG_PATH" 2>&1 | sed 's/^/  /' \
  || die "Gatekeeper rejected the DMG on the build machine. It will not open elsewhere."
ok "Gatekeeper accepts the DMG"

( cd "$RELEASE_DIR" && shasum -a 256 "$DMG_NAME" > "$DMG_NAME.sha256" ) \
  || die "failed to write the checksum."

echo ""
echo "═══════════════════════════════════════════════════"
echo " Chord Writer $VERSION — signed, notarized, stapled"
echo "═══════════════════════════════════════════════════"
echo "  $DMG_PATH"
echo "  $DMG_PATH.sha256"
echo ""
echo "  NOT YET VERIFIED (AC3): Gatekeeper acceptance on a machine that never"
echo "  built this. Copy the DMG to a clean Mac or fresh user account and run:"
echo "    spctl --assess --type open --context context:primary-signature -vv $DMG_NAME"
echo "  While you are there, close AC6's deferred confirmation too: install from"
echo "  the DMG, create a story, and press Cmd-B."
echo ""
