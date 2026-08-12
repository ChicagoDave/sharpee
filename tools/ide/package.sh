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
#   package.sh [--skip-platform-build] [--keep-work] [--no-notarize] [--rebuild]
#
# THE SCRIPT NEVER WAITS ON APPLE. It submits, records the submission id in
# release/.notarize-state, and exits 0 with "still in the queue". Run it again to
# resume: it re-reads the id, and staples and continues the moment Apple accepts.
# A run therefore takes three passes at most — build+submit app, staple+submit
# DMG, staple DMG and finish — and each one is cheap after the first.
#
# Two reasons, and the first is not a preference. `notarytool submit --wait`
# crashes with `Bus error` on this machine, 4 of 4 attempts (2026-08-10/11),
# always inside the wait and never the submit — so the blocking form loses the
# terminal but keeps the ticket. And a first-time bundle can sit in Apple's queue
# for hours; holding a shell open for that was never the right shape. The design
# is lifted from Ledga's mac-release-1/2/3 split, which exists for the same bug.
#
#     --skip-platform-build  reuse the existing packages/*/dist (iteration only —
#                            NOT safe for a release; see step 2)
#     --rebuild              ignore a resumable state and build from scratch.
#                            Orphans any submission already in the queue, which
#                            is correct when the binary needs to change.
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
#                      "Developer ID Application" in the keychain, and its
#                      team must match EXPECTED_TEAM either way)
#     EXPECTED_TEAM    Apple Developer team the signature must carry
#                      (default: RSNGKW5LNH — see the constant below)
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

# The Apple Developer team Chord Writer ships under. DECLARED, not inferred —
# this is the identity Gatekeeper shows users, so it is a property of the
# product, not of whatever happens to be in the build machine's keychain.
#
# Why this exists (2026-08-11): the identity resolution below used to treat
# "there is exactly one Developer ID cert" as "it is the right one." The only
# cert on this machine belonged to an unrelated business team, so every build
# was signed by one team and submitted with another team's notary credentials.
# Apple accepted the uploads and never processed them — two submissions sat In
# Progress for ten hours with no error, because nothing in the pipeline ever
# compared the two halves. This check is that comparison.
readonly EXPECTED_TEAM="${EXPECTED_TEAM:-RSNGKW5LNH}"

die()  { echo "" >&2; echo "package: $*" >&2; exit 1; }
step() { echo ""; echo "── $* ─────────────────────────────────"; }
note() { echo "  → $*"; }
ok()   { echo "  ✓ $*"; }

SKIP_PLATFORM_BUILD=0
KEEP_WORK=0
NO_NOTARIZE=0
REBUILD=0
for arg in "$@"; do
  case "$arg" in
    --skip-platform-build) SKIP_PLATFORM_BUILD=1 ;;
    --keep-work) KEEP_WORK=1 ;;
    --no-notarize) NO_NOTARIZE=1 ;;
    --rebuild) REBUILD=1 ;;
    *) die "unknown flag '$arg' (usage: package.sh [--skip-platform-build] [--keep-work] [--no-notarize] [--rebuild])" ;;
  esac
done

# ---------------------------------------------------------------------
# Notarization state — the resume ledger
# ---------------------------------------------------------------------
# Apple's queue is measured in hours and `notarytool submit --wait` crashes with
# `Bus error` on this machine (4 of 4 attempts, 2026-08-10/11), always inside the
# wait and never the submit. So this script never waits: it submits, records the
# submission id here, and exits. Re-running resumes from whatever is recorded.
#
# The pattern is lifted from Ledga's mac-release-2.sh / mac-release-3.sh, which
# were split into numbered scripts for exactly this reason. Here it is one script
# that is idempotent instead of three that run in order.
readonly STATE_FILE="$RELEASE_DIR/.notarize-state"
readonly STAGED_APP="$RELEASE_DIR/Chord Writer.app"

state_get() { [ -f "$STATE_FILE" ] && sed -n "s/^$1=//p" "$STATE_FILE" | head -1 || true; }

state_set() {  # state_set <key> <value>
  mkdir -p "$RELEASE_DIR"
  [ -f "$STATE_FILE" ] && sed -i '' "/^$1=/d" "$STATE_FILE" 2>/dev/null || true
  echo "$1=$2" >> "$STATE_FILE"
}

state_clear() { rm -f "$STATE_FILE"; }

# Submit an artifact and record its id, or check the id already recorded.
# Echoes nothing; sets NOTARY_RESULT to accepted|pending and returns 0, or dies.
notarize_artifact() {  # notarize_artifact <path> <state-key> <label>
  local artifact="$1" key="$2" label="$3" id status
  id="$(state_get "$key")"

  if [ -z "$id" ]; then
    note "submitting $(du -h "$artifact" | cut -f1) $label to Apple (not waiting)"
    local out
    out="$(xcrun notarytool submit "$artifact" --keychain-profile "$NOTARY_PROFILE" 2>&1 | tee "$WORK/notary-$key.log")"
    id="$(printf '%s\n' "$out" | sed -n 's/^ *id: *//p' | head -1)"
    [ -n "$id" ] || die "submit returned no submission id for the $label.
  Full output: $WORK/notary-$key.log"
    state_set "$key" "$id"
    ok "$label submitted — id $id (recorded in $STATE_FILE)"
    NOTARY_RESULT=pending
    return 0
  fi

  note "checking recorded $label submission $id"
  status="$(xcrun notarytool info "$id" --keychain-profile "$NOTARY_PROFILE" 2>&1 | sed -n 's/^ *status: *//p' | head -1)"
  case "$status" in
    Accepted)
      ok "$label notarization accepted"
      NOTARY_RESULT=accepted
      ;;
    "In Progress"|"")
      NOTARY_RESULT=pending
      ;;
    *)
      echo "" >&2
      xcrun notarytool log "$id" --keychain-profile "$NOTARY_PROFILE" 2>&1 | sed 's/^/  /' >&2 || true
      state_set "${key}_FAILED" "$id"
      die "$label notarization returned '$status' (submission $id).
  The notary log is above. Fix the cause, then run with --rebuild — the recorded
  id has been kept as ${key}_FAILED for reference but will not be reused."
      ;;
  esac
  return 0
}

# Print how to come back, then leave. Exit 0: pending is not a failure.
pending_exit() {  # pending_exit <label> <state-key>
  local id
  id="$(state_get "$2")"
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo " $1 is in Apple's queue — nothing more to do now"
  echo "═══════════════════════════════════════════════════"
  echo "  submission: $id"
  echo ""
  echo "  Check it:   xcrun notarytool info $id --keychain-profile \"$NOTARY_PROFILE\""
  echo "  Resume:     $0"
  echo ""
  echo "  Re-running picks up from here — it will not rebuild or resubmit."
  echo "  A first-time bundle can sit in the queue for hours."
  echo ""
  exit 0
}

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

# The identity above was RESOLVED (from the keychain or the environment); it has
# not yet been CHECKED. A Developer ID certificate carries its team in the
# subject's OU, so read it from the certificate rather than parsing the display
# name — the name is a label, the OU is the fact.
signing_team="$(security find-certificate -c "$SIGN_IDENTITY" -p 2>/dev/null \
  | openssl x509 -noout -subject 2>/dev/null \
  | sed -E 's/.*OU *= *([A-Z0-9]+).*/\1/')"
[ -n "$signing_team" ] || die "CREDENTIAL MISMATCH: could not read the team (OU) from
  the certificate for '$SIGN_IDENTITY'. Refusing to sign with an identity whose
  team cannot be established."
[ "$signing_team" = "$EXPECTED_TEAM" ] || die "CREDENTIAL MISMATCH: signing identity
  belongs to team '$signing_team', but this product ships under '$EXPECTED_TEAM'.

  '$SIGN_IDENTITY'

  Apple will ACCEPT a submission signed by one team and uploaded with another
  team's notary credentials, then never process it — no error, no log, just
  In Progress forever. That is what this check exists to prevent.

  Fix by one of:
    - install the Developer ID Application certificate for $EXPECTED_TEAM, or
    - set SIGN_IDENTITY to an identity from $EXPECTED_TEAM, or
    - if the product is deliberately changing teams, update EXPECTED_TEAM
      (and expect a different Team ID in every user's Gatekeeper prompt)."
ok "signing identity: $SIGN_IDENTITY"
ok "signing team matches EXPECTED_TEAM ($EXPECTED_TEAM)"

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

# --- Resume, or build from scratch? ---------------------------------
# A staged app plus a state file means a previous run submitted and left. Rebuilding
# then would be worse than useless: it would produce a different binary and orphan
# the submission that is already in the queue. So the default is to resume, and a
# fresh build is the thing you ask for.
RESUME=0
if [ "$REBUILD" -eq 1 ]; then
  # The ledger describes submissions of a binary that is about to stop existing.
  # Keeping it would make the next step check the OLD id and, on an Accepted,
  # try to staple a ticket issued for different bytes. --rebuild means start over.
  if [ -f "$STATE_FILE" ]; then
    note "--rebuild: discarding the submission ledger (those ids belong to the previous binary)"
    sed 's/^/    orphaned: /' "$STATE_FILE"
    state_clear
  fi
elif [ -d "$STAGED_APP" ] && [ -f "$STATE_FILE" ]; then
  RESUME=1
fi

if [ "$RESUME" -eq 1 ]; then
  step "Resuming"
  echo "  Found a staged app and a submission ledger, so steps 2-6 are skipped."
  echo "  The binary in the queue and the binary on disk must stay identical —"
  echo "  pass --rebuild to start over instead."
  sed 's/^/    /' "$STATE_FILE"
  ok "resuming from $STAGED_APP"
fi

if [ "$RESUME" -eq 0 ]; then
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

# --- Stage the signed app somewhere durable --------------------------
# The archive lives under /var/folders, which macOS purges without warning. A
# signed app was lost that way on 2026-08-10 while its notarization sat in the
# queue, leaving a ticket with nothing to staple. Everything downstream — the
# notarization, the staple, the DMG — reads the staged copy, so the artifact in
# the queue and the artifact on disk are the same bytes.
step "Staging the signed app"
mkdir -p "$RELEASE_DIR"
rm -rf "$STAGED_APP"
ditto "$APP" "$STAGED_APP" || die "failed to stage the signed app into $RELEASE_DIR."
codesign --verify --deep --strict "$STAGED_APP" \
  || die "the staged copy does not verify — the copy damaged the signature."
ok "staged at $STAGED_APP (signature re-verified after the copy)"

fi  # end: build-and-sign (skipped when resuming)

# From here on, one path: the staged app is what ships.
readonly SHIP_APP="$STAGED_APP"
[ -d "$SHIP_APP" ] || die "no staged app at $SHIP_APP — run with --rebuild."

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
if xcrun stapler validate "$SHIP_APP" >/dev/null 2>&1; then
  ok "app is already notarized and stapled — nothing to do"
else
  readonly APP_ZIP="$WORK/ChordWriter-app.zip"
  ditto -c -k --keepParent "$SHIP_APP" "$APP_ZIP" || die "failed to zip the app for notarization."
  notarize_artifact "$APP_ZIP" APP_SUBMISSION "app"
  [ "$NOTARY_RESULT" = accepted ] || pending_exit "The app" APP_SUBMISSION

  xcrun stapler staple "$SHIP_APP" >/dev/null || die "failed to staple the notarization ticket to the app."
  ok "ticket stapled to the app"
fi

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
# On a resume the DMG is already built and already submitted; rebuilding it would
# change its bytes and orphan that submission, exactly as a rebuilt app would.
if [ -f "$DMG_PATH" ] && [ -n "$(state_get DMG_SUBMISSION)" ]; then
  ok "reusing the DMG already in the queue ($DMG_NAME)"
else
  "$IDE_DIR/dmg/assemble-dmg.sh" "$SHIP_APP" "Chord Writer $VERSION" "$DMG_PATH" \
    || die "failed to assemble the DMG."
  ok "created $DMG_NAME ($(du -h "$DMG_PATH" | cut -f1))"

  # The DMG is itself a distributed artifact and is signed too — but NOT via
  # sign_macho: the hardened runtime is a Mach-O load-command concept and means
  # nothing on a disk image. A timestamped signature is the whole requirement.
  codesign --force --sign "$SIGN_IDENTITY" --timestamp "$DMG_PATH" \
    || die "codesign failed for $DMG_NAME"
  ok "DMG signed"
fi

step "Notarizing the DMG"
if xcrun stapler validate "$DMG_PATH" >/dev/null 2>&1; then
  ok "DMG is already notarized and stapled"
else
  notarize_artifact "$DMG_PATH" DMG_SUBMISSION "DMG"
  [ "$NOTARY_RESULT" = accepted ] || pending_exit "The DMG" DMG_SUBMISSION

  xcrun stapler staple "$DMG_PATH" >/dev/null || die "failed to staple the ticket to the DMG."
  ok "DMG notarized and stapled"
fi

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

# Both artifacts are stapled and the ledger has nothing left to resume. Clearing
# it is what makes the NEXT run a fresh build rather than a resume of a release
# that already shipped.
state_clear
ok "notarization ledger cleared — the next run builds fresh"

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
