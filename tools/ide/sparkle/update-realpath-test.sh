#!/bin/bash
# update-realpath-test.sh — drive sparkle/make-update.sh against a real stapled
# app, the real Sparkle tools and the real signing key (ADR-279 D7, rule 13a).
#
# Public interface:
#   update-realpath-test.sh [<stapled-app>]
# With no argument, uses release/Chord Writer.app. Writes into a scratch
# directory, never into release/, so running it cannot disturb a real release.
# Owner context: tools/ide — release tooling.
#
# WHAT THIS IS AND IS NOT. This is the real path: real ditto, real
# generate_appcast, real keychain key, real signature — no stub standing in for
# an owned dependency. It proves the payload is BUILDABLE and WELL-FORMED.
#
# It is NOT proof that an installed app updates itself. That is Acceptance 7 and
# needs two published versions and a served feed; see Phase 5 of
# docs/work/sparkle-auto-update/plan.md. Do not let a pass here be read as
# closing that.

set -euo pipefail

readonly IDE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly APP="${1:-$IDE_DIR/release/Chord Writer.app}"

die() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }
pass() { printf '  ok — %s\n' "$1"; }

[ -d "$APP" ] || die "no app bundle at $APP (pass one as the first argument)"

# Refuse a pre-Sparkle bundle up front. generate_appcast declines to EdDSA-sign
# an update for an app that declares no public key — correctly, since the
# recipient could not verify it — so testing against one dies three steps later
# on a confusing "the appcast carries no signature" error that reads as a
# pipeline defect rather than a wrong input. (Observed 2026-08-15 against the
# shipped 1.0.1, which predates Sparkle.)
/usr/libexec/PlistBuddy -c 'Print :SUPublicEDKey' "$APP/Contents/Info.plist" >/dev/null 2>&1 \
  || die "$APP declares no SUPublicEDKey — it predates Sparkle and cannot exercise
  the update path. Point this at a Sparkle-carrying build."

version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP/Contents/Info.plist")"
case "$(file -b "$APP/Contents/MacOS/Chord Writer")" in
  *arm64*)  arch_slug="arm64" ;;
  *x86_64*) arch_slug="x86_64" ;;
  *) die "cannot determine the app's architecture" ;;
esac

scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT

echo "Real-path test: Chord Writer $version ($arch_slug)"
echo "  app:     $APP"
echo "  scratch: $scratch"
echo ""

appcast="$("$IDE_DIR/sparkle/make-update.sh" "$APP" "$version" "$arch_slug" "$scratch" | tail -1)"
[ -f "$appcast" ] || die "make-update.sh did not report a readable appcast path"

echo ""
echo "Assertions against the generated feed:"

# The signature must verify against the archive's ACTUAL BYTES, using Sparkle's
# own verifier. Everything upstream asserts a signature is present; this is the
# only check that it is the right one for this file.
zip="$scratch/sparkle/$arch_slug/ChordWriter-$version-$arch_slug.zip"
[ -f "$zip" ] || die "no update archive at $zip"
signature="$(sed -n 's/.*sparkle:edSignature="\([^"]*\)".*/\1/p' "$appcast" | head -1)"
[ -n "$signature" ] || die "no EdDSA signature found in the appcast"
# The signature is POSITIONAL. `-s` is the PRIVATE key argument — passing the
# signature there hands a public value to the flag expecting a secret, and the
# verification fails for a reason that has nothing to do with the release.
verify_out="$("$IDE_DIR/.sparkle-tools/sign_update" --verify "$zip" "$signature" 2>&1)" \
  || die "the appcast's signature does not verify against the archive's bytes:
  $verify_out"
pass "the appcast signature verifies against the real archive bytes"

# The enclosure must point at sharpee.net/downloads, where the archives actually
# live — not a local path, not a bare filename, and not the GitHub Release URL
# ADR-279 D6 describes but this project never adopted. A wrong host yields an
# appcast that parses, verifies, and then 404s for every author.
grep -q "url=\"https://sharpee.net/downloads/" "$appcast" \
  || die "the enclosure URL does not point at https://sharpee.net/downloads/ —
  authors would be offered a download that does not resolve."
pass "the enclosure points at sharpee.net/downloads"

# The feed a build produces must be the one that build's binary polls. These are
# set in two different places (project.yml's SUFeedURL and this script's arch
# slug), so nothing else catches a disagreement.
feed_in_app="$(/usr/libexec/PlistBuddy -c 'Print :SUFeedURL' "$APP/Contents/Info.plist" 2>/dev/null || echo "")"
if [ -n "$feed_in_app" ]; then
  case "$feed_in_app" in
    *"appcast-$arch_slug.xml") pass "the app polls appcast-$arch_slug.xml, which is what was generated" ;;
    *) die "the app polls '$feed_in_app' but this build generated appcast-$arch_slug.xml —
  the author would be offered the other architecture's update" ;;
  esac
else
  printf '  note — this app predates Sparkle (no SUFeedURL); feed-agreement check skipped\n'
fi

echo ""
echo "PASS — payload builds, signs, and verifies on the real path."
echo "  Still open (Phase 5 / Acceptance 7): an installed app actually downloading,"
echo "  verifying and relaunching from a served feed."
