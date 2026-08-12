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
#   package.sh --dmg-from <app>   [--keep-work] [--no-toolchain]
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
#     --dmg-from <app>       skip the build entirely and package an app that is
#                            ALREADY signed, notarized and stapled by another
#                            route — Xcode's Distribute App, or an earlier run of
#                            this script. Steps 2-7 are replaced by step 2', which
#                            re-asserts every gate they enforce against the
#                            supplied bundle and refuses it on any failure.
#                            Mutually exclusive with the three flags above.
#     --no-toolchain         (--dmg-from only) package an app that deliberately
#                            ships WITHOUT Contents/Resources/toolchain. Authors
#                            supply the CLI themselves with
#                            `npm install -g @sharpee/devkit`; resolution tier 2
#                            (login-shell PATH) sits above the bundled tier, so
#                            the app finds it. See INTERIM below. Refuses a
#                            bundle that does carry a toolchain — the flag skips
#                            the seal scan and the node entitlement checks, and
#                            must never become a way around them.
#
# WHY --dmg-from EXISTS. Xcode can archive, sign and notarize an app; it cannot
# build a DMG, and it cannot notarize one. So the last mile has no home in the
# Xcode flow, and reaching it through this script's front door means paying for
# a platform build, an archive and a second notarization that are already done.
#
# WHY IT VERIFIES INSTEAD OF TRUSTING. An Xcode-produced Chord Writer is not
# interchangeable with one from step 5, and the difference is invisible from the
# outside — the bundle is signed, notarized and stapled either way. Two gaps,
# both real and both observed (2026-08-11):
#
#   1. NO TOOLCHAIN. Vendoring is gated on SHARPEE_VENDOR_TOOLCHAIN=1 in the
#      post-build script (project.yml). Xcode's UI does not set it, so an
#      archive made from the Organizer silently ships without
#      Contents/Resources/toolchain — an app that launches, passes Gatekeeper,
#      and cannot build a story on any machine lacking a global `sharpee`.
#   2. NO INSIDE-OUT SIGNING. Even with the vendoring on, nothing in the Xcode
#      target signs the Mach-O binaries the post-build script drops into
#      Resources, and the vendored node needs its own entitlement set. See
#      step 5.
#
# Neither gap fails a `codesign --verify` of the outer bundle, which is exactly
# why this mode re-runs the seal scan, the entitlement assertions and the team
# check rather than accepting a stapled ticket as proof of anything.
#
# INTERIM: --no-toolchain and why it exists. Toolchain-bearing bundles do not
# clear notarization. As of 2026-08-12, seven submissions containing the real
# vendored devkit closure have returned no verdict at all — no Accepted, no
# Invalid, no log — while the same app with the toolchain removed clears in 31
# seconds, and nine control fixtures cleared in under two minutes. The evidence,
# the fixture ids and what has been falsified are written up in
# docs/work/adr-279-chord-writer-packaging/notarization-bisection.md.
#
# So --no-toolchain ships the app under the ORIGINAL ADR-279 D4 contract ("no
# silent bundling; first run says install the CLI"), which the 2026-07-27
# amendment superseded for good first-run reasons that still stand. This is a
# release-unblocking interim, not a reversal: the bundled toolchain remains the
# target, and the flag should stop being used the day a toolchain-bearing bundle
# gets a verdict. It is deliberately narrow — it skips exactly three toolchain
# gates and nothing else, and refuses any bundle that actually has a toolchain.
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
# warn: the run continues, but the artifact it produces is not the standard one.
# Loud on purpose — a degraded release that scrolls past unnoticed is the failure
# mode this script is built to avoid.
warn() { echo "  ⚠ $*"; }

readonly USAGE="usage: package.sh [--skip-platform-build] [--keep-work] [--no-notarize] [--rebuild]
       package.sh --dmg-from <app> [--keep-work] [--no-toolchain]"

SKIP_PLATFORM_BUILD=0
KEEP_WORK=0
NO_NOTARIZE=0
REBUILD=0
DMG_FROM=""
NO_TOOLCHAIN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --skip-platform-build) SKIP_PLATFORM_BUILD=1 ;;
    --keep-work) KEEP_WORK=1 ;;
    --no-notarize) NO_NOTARIZE=1 ;;
    --rebuild) REBUILD=1 ;;
    --no-toolchain) NO_TOOLCHAIN=1 ;;
    --dmg-from)
      [ $# -ge 2 ] || die "--dmg-from needs the path to an already-notarized .app.
$USAGE"
      DMG_FROM="$2"
      shift ;;
    --dmg-from=*) DMG_FROM="${1#--dmg-from=}" ;;
    *) die "unknown flag '$1'
$USAGE" ;;
  esac
  shift
done

# --dmg-from replaces the build; the three flags below only modify a build. Each
# combination is a contradiction rather than a no-op, so say so instead of
# silently ignoring one — a user who passed --no-notarize expecting a rehearsal
# would otherwise get a real submission.
if [ -n "$DMG_FROM" ]; then
  [ "$REBUILD" -eq 0 ] || die "--dmg-from and --rebuild contradict: one packages an
  existing app, the other exists to discard one and build again."
  [ "$SKIP_PLATFORM_BUILD" -eq 0 ] || die "--dmg-from and --skip-platform-build
  contradict: --dmg-from runs no platform build to skip."
  [ "$NO_NOTARIZE" -eq 0 ] || die "--dmg-from and --no-notarize contradict: the DMG
  is the only artifact this mode produces, and an un-notarized DMG is not one."
fi

# --no-toolchain only means something for an app this script did not build. The
# build path hardcodes SHARPEE_VENDOR_TOOLCHAIN=1 (step 4), so honouring the flag
# there would mean either lying about what was built or quietly changing what the
# release IS — both worse than refusing.
if [ "$NO_TOOLCHAIN" -eq 1 ] && [ -z "$DMG_FROM" ]; then
  die "--no-toolchain applies to --dmg-from only. This script's own build always
  vendors the toolchain (SHARPEE_VENDOR_TOOLCHAIN=1 is set at the xcodebuild call),
  so there is nothing for the flag to switch off on the build path."
fi

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

# ---------------------------------------------------------------------
# Bundle assertions — shared by the build path and --dmg-from
# ---------------------------------------------------------------------
# These are the properties that make a Chord Writer bundle shippable. The build
# path asserts them on what it just produced; --dmg-from asserts the same set on
# a bundle someone else produced. Defined once so the two paths cannot drift —
# a gate that exists on only one of them is a gate that does not exist.

# assert_sealed_toolchain <toolchain-dir> — the bundled toolchain is present and
# reaches nothing outside itself. Escape is a function of depth, so this is
# checked at the depth the bundle will actually occupy, not at assembly time.
assert_sealed_toolchain() {
  local tc="$1" residue
  [ -d "$tc" ] || die "the bundle has no toolchain at Contents/Resources/toolchain.
  Vendoring is gated on SHARPEE_VENDOR_TOOLCHAIN=1 in project.yml's post-build
  script, which Xcode's UI does not set — an app archived from the Organizer
  ships without its third tier and cannot build a story on a machine that has no
  global \`sharpee\`. Build with this script, or set the variable and re-archive."
  [ -x "$tc/bin/sharpee" ] || die "the bundled toolchain has no executable shim at
  bin/sharpee — the toolchain is present but half-assembled."

  residue="$(SEAL_ROOT="$tc" node <<'JS'
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
  [ -z "$residue" ] || die "the bundled toolchain is not sealed — refusing to ship a
  bundle that reaches outside itself:
$residue"
}

# assert_hardened <path> <label> — fail unless <path>'s code directory carries
# the hardened-runtime flag. codesign accepts a missing runtime flag happily;
# only the notary service rejects it, so catching it locally saves a round trip.
#
# NOTE ON `grep -q` — do not reintroduce it in a pipeline here. Under
# `set -o pipefail`, `grep -q` exits at the first match, SIGPIPEs the codesign
# feeding it, and the pipeline reports FAILURE precisely when the match
# SUCCEEDS. That inverts every assertion in this section: the hardened-runtime
# check fired on a correctly-signed app, and the get-task-allow check would have
# stayed silent in exactly the case it exists to catch. Capture first, then
# match against the captured string.
assert_hardened() {
  local target="$1" label="$2" cd_line
  cd_line="$(codesign -dvv "$target" 2>&1 | grep '^CodeDirectory' || true)"
  case "$cd_line" in
    *runtime*) ;;
    *) die "$label is signed WITHOUT the hardened runtime — notarization would
  reject it. Code directory reported: ${cd_line:-<none>}" ;;
  esac
}

# assert_node_entitlements <node-path> — the vendored runtime carries exactly the
# entitlements it needs and none that disqualify it. Asserted rather than
# assumed: a future entitlements edit could quietly reintroduce the debug one and
# the failure would surface only at Apple, hours later.
assert_node_entitlements() {
  local ents
  ents="$(codesign -d --entitlements - --xml "$1" 2>/dev/null || true)"
  case "$ents" in
    *get-task-allow*)
      die "the vendored node still carries com.apple.security.get-task-allow.
  Notarization rejects it. Check $NODE_ENTITLEMENTS." ;;
  esac
  # An empty entitlement set means the signature did not take the file at all.
  case "$ents" in
    *allow-jit*) ;;
    *) die "the vendored node has no com.apple.security.cs.allow-jit entitlement.
  V8 cannot compile without it and every author's first build would crash.
  Check that $NODE_ENTITLEMENTS was applied." ;;
  esac
}

# assert_bundle_version <app> — the bundle's own version agrees with project.yml.
# project.yml is the source of truth for the DMG name, but the bundle carries its
# own copy. If they disagree the DMG is mislabeled, and a mislabeled release is
# unrecallable once downloaded.
assert_bundle_version() {
  local bundled
  bundled="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$1/Contents/Info.plist" 2>/dev/null || true)"
  [ "$bundled" = "$VERSION" ] \
    || die "version mismatch: project.yml says '$VERSION', the bundle says '$bundled'."
}

# assert_signing_team <path> <label> — the signature carries EXPECTED_TEAM. The
# preflight checks the CERTIFICATE's team; this checks the ARTIFACT's, which is
# the one Gatekeeper shows the user and the only one that means anything for a
# bundle this script did not sign itself.
assert_signing_team() {
  local target="$1" label="$2" team
  team="$(codesign -dv "$target" 2>&1 | sed -n 's/^TeamIdentifier=//p' | head -1)"
  [ -n "$team" ] && [ "$team" != "not set" ] || die "$label carries no TeamIdentifier —
  it is ad-hoc or unsigned, not Developer-ID-signed."
  [ "$team" = "$EXPECTED_TEAM" ] || die "$label is signed by team '$team', but this
  product ships under '$EXPECTED_TEAM'. See EXPECTED_TEAM above for why that
  matters more than it looks."
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

# `node` is in the always-required set because the toolchain seal scan runs in
# both modes; xcodebuild/xcodegen/pnpm are demanded only by the path that builds.
for tool in node hdiutil codesign xcrun shasum osascript; do
  command -v "$tool" >/dev/null || die "'$tool' is not on PATH but is required."
done
if [ -z "$DMG_FROM" ]; then
  for tool in xcodebuild xcodegen pnpm; do
    command -v "$tool" >/dev/null || die "'$tool' is not on PATH but is required to build."
  done
fi
ok "toolchain present"

# Only the signing path consumes the entitlements file; --dmg-from asserts the
# entitlements are already correct in the supplied bundle instead.
if [ -z "$DMG_FROM" ]; then
  [ -f "$NODE_ENTITLEMENTS" ] || die "missing $NODE_ENTITLEMENTS — the vendored Node
  runtime cannot be signed without it (see the file's own header for why)."
fi

# Checked here rather than at step 8, which sits 10+ minutes into a cold run.
[ -f "$DMG_BACKGROUND" ] || die "missing $DMG_BACKGROUND — the DMG window background.
  Regenerate it with tools/ide/dmg/make-background.swift and commit the result."

# --- Credential 1: the Developer ID Application certificate ---------
# cert_team <identity-name> — the team on that certificate, read from the
# subject's OU. The display name also carries a team in parentheses, but that is
# a label; the OU is the fact, and only one of the two is signed by Apple.
cert_team() {
  security find-certificate -c "$1" -p 2>/dev/null \
    | openssl x509 -noout -subject 2>/dev/null \
    | sed -E 's/.*OU *= *([A-Z0-9]+).*/\1/'
}

if [ -z "$SIGN_IDENTITY" ]; then
  identity_lines="$(security find-identity -v -p codesigning | grep 'Developer ID Application' || true)"
  [ -n "$identity_lines" ] || die "MISSING CREDENTIAL: no 'Developer ID Application' certificate
  in the keychain. Install your Developer ID Application certificate from
  developer.apple.com, or set SIGN_IDENTITY to an identity that is present.
  Ad-hoc signing is NOT an acceptable substitute — notarization rejects it."

  # Narrow to EXPECTED_TEAM BEFORE deciding anything is ambiguous. Two Developer
  # ID certificates from different teams is not an ambiguous situation: the
  # product declares the team it ships under at the top of this file, and exactly
  # one certificate can satisfy it. Refusing to choose would demand SIGN_IDENTITY
  # on every run to re-answer a question already answered.
  #
  # This is the shape the 2026-08-11 incident actually leaves behind. The old
  # business-team certificate does not disappear when a new one is issued — both
  # sit in the keychain until the old one expires (2027-02-01 here) — so
  # "exactly one Developer ID cert" is the transient state, not the steady one.
  candidates=""
  candidate_count=0
  while IFS= read -r line; do
    [ -n "$line" ] || continue
    name="$(printf '%s' "$line" | sed -E 's/.*"(.*)".*/\1/')"
    if [ "$(cert_team "$name")" = "$EXPECTED_TEAM" ]; then
      candidates="${candidates}  ${name}
"
      candidate_count=$((candidate_count + 1))
      SIGN_IDENTITY="$name"
    fi
  done <<EOF
$identity_lines
EOF

  [ "$candidate_count" -gt 0 ] || die "MISSING CREDENTIAL: no 'Developer ID Application'
  certificate for team '$EXPECTED_TEAM' is installed. What IS installed:
$identity_lines
  Install the Developer ID Application certificate for $EXPECTED_TEAM from
  developer.apple.com, or set SIGN_IDENTITY explicitly."

  [ "$candidate_count" -eq 1 ] || die "MISSING CREDENTIAL: $candidate_count 'Developer ID
  Application' certificates are installed for team '$EXPECTED_TEAM', so the correct
  one cannot be inferred. Set SIGN_IDENTITY explicitly:
$candidates"
fi

# The identity above was RESOLVED (from the keychain or the environment); it has
# not yet been CHECKED. The keychain path narrowed by team already, but
# SIGN_IDENTITY may equally have come from the environment, where nothing has
# looked at it at all — so the check runs on both paths, not just that one.
signing_team="$(cert_team "$SIGN_IDENTITY")"
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

# =====================================================================
# 2'. --dmg-from — adopt an app built and notarized elsewhere
# =====================================================================
# Replaces steps 2-7. Everything here is an assertion: the mode's whole value is
# that it does NOT trust the bundle it is handed. See the header for the two ways
# an Xcode-produced Chord Writer differs from one this script built, neither of
# which is visible in a signature or a stapled ticket.
if [ -n "$DMG_FROM" ]; then
  step "Adopting a pre-built app"

  [ -d "$DMG_FROM" ] || die "--dmg-from: no bundle at '$DMG_FROM'."
  case "$DMG_FROM" in
    *.app) ;;
    *) die "--dmg-from expects a .app bundle, got '$DMG_FROM'." ;;
  esac
  adopted="$(cd -- "$DMG_FROM" && pwd)"
  note "source: $adopted"

  assert_bundle_version "$adopted"
  ok "bundle version agrees with project.yml ($VERSION)"

  # --no-toolchain ships the app WITHOUT its third resolution tier, on the
  # understanding that the author installs `@sharpee/devkit` globally instead —
  # the original ADR-279 D4 contract, which works because PATH resolution sits
  # ABOVE the bundled tier (ComposeRunner.resolveSharpee, tiers 2 and 3). It is
  # an interim: bundled remains the target the moment a toolchain-bearing bundle
  # can clear notarization.
  #
  # The flag skips gates, so it must not be usable as a way AROUND them. A bundle
  # that actually carries a toolchain is refused rather than waved through: doing
  # otherwise would drop the seal scan and the node entitlement checks on a real
  # toolchain, which is precisely the "looks like a release, fails on the author's
  # machine" outcome this script refuses everywhere else.
  if [ "$NO_TOOLCHAIN" -eq 1 ]; then
    [ ! -e "$adopted/Contents/Resources/toolchain" ] || die "--no-toolchain was passed
  but '$adopted' HAS a toolchain at Contents/Resources/toolchain. The flag skips the
  seal scan and the node entitlement checks; running it against a real toolchain would
  ship one that nothing verified. Drop the flag to package this bundle properly."
    warn "shipping WITHOUT the bundled toolchain — authors must \`npm install -g @sharpee/devkit\`"
  else
    assert_sealed_toolchain "$adopted/Contents/Resources/toolchain"
    ok "toolchain present and sealed"
  fi

  codesign --verify --deep --strict --verbose=2 "$adopted" 2>&1 | sed 's/^/  /' \
    || die "codesign verification failed for '$adopted'."
  assert_signing_team "$adopted" "the supplied app"
  ok "signature verifies (deep, strict), team $EXPECTED_TEAM"

  assert_hardened "$adopted" "the supplied app"
  if [ "$NO_TOOLCHAIN" -eq 0 ]; then
    assert_hardened "$adopted/Contents/Resources/toolchain/node/bin/node" "the vendored node"
    assert_node_entitlements "$adopted/Contents/Resources/toolchain/node/bin/node"
    ok "hardened runtime and node entitlements correct"
  else
    ok "hardened runtime correct (no vendored node to check)"
  fi

  # The premise of the mode. Without a stapled ticket there is nothing to adopt —
  # and adopting an un-notarized app would produce a DMG whose notarization says
  # nothing about the app a user drags out of it.
  xcrun stapler validate "$adopted" >/dev/null 2>&1 \
    || die "'$adopted' has no notarization ticket stapled to it. --dmg-from packages an
  app that is ALREADY through the notary; it does not submit one. Either notarize
  and staple it first (Xcode: Distribute App → Direct Distribution → Export), or
  run this script without --dmg-from and let it build and submit."
  ok "notarization ticket stapled"

  # --- Stage it, unless it is already the staged copy -----------------
  # ditto onto itself would destroy the source: STAGED_APP is removed first.
  # Compare resolved paths, not the strings the user typed.
  staged_resolved=""
  [ -d "$STAGED_APP" ] && staged_resolved="$(cd -- "$STAGED_APP" && pwd)"
  if [ "$adopted" = "$staged_resolved" ]; then
    ok "already staged at $STAGED_APP"
  else
    mkdir -p "$RELEASE_DIR"
    rm -rf "$STAGED_APP"
    ditto "$adopted" "$STAGED_APP" || die "failed to stage the supplied app into $RELEASE_DIR."
    codesign --verify --deep --strict "$STAGED_APP" \
      || die "the staged copy does not verify — the copy damaged the signature."
    xcrun stapler validate "$STAGED_APP" >/dev/null 2>&1 \
      || die "the staged copy has no stapled ticket — the copy dropped it."
    ok "staged at $STAGED_APP (signature and ticket re-verified after the copy)"
  fi

  # The app half of the ledger describes a submission this mode did not make and
  # will never staple. Leaving it would make step 7 poll a submission belonging to
  # different bytes — which is how a run ends up waiting forever on an id that can
  # never apply to the app on disk. The DMG half, if present, is still ours.
  if [ -n "$(state_get APP_SUBMISSION)" ]; then
    note "dropping APP_SUBMISSION from the ledger — the supplied app is already notarized"
    note "  (was: $(state_get APP_SUBMISSION))"
    sed -i '' '/^APP_SUBMISSION=/d' "$STATE_FILE" 2>/dev/null || true
  fi
fi

# --- Resume, or build from scratch? ---------------------------------
# A staged app plus a state file means a previous run submitted and left. Rebuilding
# then would be worse than useless: it would produce a different binary and orphan
# the submission that is already in the queue. So the default is to resume, and a
# fresh build is the thing you ask for.
RESUME=0
if [ -n "$DMG_FROM" ]; then
  : # step 2' already staged the app; there is no build to resume or repeat
elif [ "$REBUILD" -eq 1 ]; then
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

if [ "$RESUME" -eq 0 ] && [ -z "$DMG_FROM" ]; then
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

assert_bundle_version "$APP"
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
assert_sealed_toolchain "$BUNDLED_TC"
ok "toolchain present; every symlink under it resolves inside it"

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

assert_hardened "$APP" "the app"
assert_hardened "$BUNDLED_TC/node/bin/node" "the vendored node"
ok "hardened runtime present on app and vendored node"

assert_node_entitlements "$BUNDLED_TC/node/bin/node"
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
