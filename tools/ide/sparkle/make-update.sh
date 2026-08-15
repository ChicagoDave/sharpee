#!/bin/bash
# make-update.sh — turn a stapled Chord Writer.app into a Sparkle update:
# a zipped archive, an EdDSA signature, and an appcast entry (ADR-279 D7).
#
# Public interface:
#   make-update.sh <stapled-app> <version> <arch-slug> <release-dir>
# Writes into <release-dir>/sparkle/<arch-slug>/:
#   ChordWriter-<version>-<arch>.zip         the update payload
#   ChordWriter-<version>-<arch>.zip.sha256  its checksum
#   appcast-<arch>.xml                       the feed, signed, with this release appended
# Owner context: tools/ide — release tooling.
#
# WHY THIS IS NOT INLINE IN package.sh. Same reason assemble-dmg.sh is not:
# everything around it there needs credentials and a ten-minute build, which
# would leave this logic testable only by shipping. Driven directly against an
# already-stapled app, it is exercisable in seconds against the real tools and
# the real signing key — which is what rule 13a asks of an owned dependency.
#
# WHY A ZIP AND NOT THE DMG. The DMG is the website's front door: a human
# double-clicks it and drags an icon. Sparkle's payload has a different consumer
# — the updater unpacks it unattended — and a zipped .app is what its delta path
# is built around. Routing the DMG through Sparkle would make the updater mount
# and copy out of a disk image for no gain.
#
# ONE FEED PER ARCHITECTURE. Sparkle's appcast has no architecture filter (see
# SUFeedURL in project.yml), and each slice bakes in its own feed URL, so this
# writes an arch-suffixed appcast into an arch-specific directory rather than
# one shared file. The directory IS the release history for that architecture:
# generate_appcast reads it whole and appends to the feed beside it.

set -euo pipefail

readonly IDE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
readonly SPARKLE_TOOLS="$IDE_DIR/.sparkle-tools"
readonly GENERATE_APPCAST="$SPARKLE_TOOLS/generate_appcast"
# Update archives are served from sharpee.net, beside the DMGs.
#
# ADR-279 D6 says the opposite — artifacts on GitHub Releases under a
# chord-writer-v<version> tag, with the site as a front door pointing at them.
# That is not what got built. sharpee.net serves the bytes itself
# (/downloads/ChordWriter-1.0.1-arm64.dmg returns 200 today) and the files exist
# only on that server: they are not in the repo, and no GitHub release carries
# them. An appcast pointing at a release asset would 404 for every author.
# The ADR needs amending to match; the code follows what ships.
readonly DOWNLOAD_BASE="https://sharpee.net/downloads"

die() { printf 'error: %s\n' "$1" >&2; exit 1; }
note() { printf '  %s\n' "$1"; }

[ $# -eq 4 ] || die "usage: make-update.sh <stapled-app> <version> <arch-slug> <release-dir>"
readonly APP="$1"
readonly VERSION="$2"
readonly ARCH_SLUG="$3"
readonly RELEASE_DIR="$4"

[ -d "$APP" ] || die "no app bundle at $APP"
[ -x "$GENERATE_APPCAST" ] || die "Sparkle's generate_appcast is missing from $SPARKLE_TOOLS.
  Run: ./tools/ide/fetch-sparkle-tools.sh"

case "$ARCH_SLUG" in
  arm64|x86_64) ;;
  *) die "unknown architecture slug '$ARCH_SLUG' — expected arm64 or x86_64." ;;
esac

# The app must ALREADY be stapled. Sparkle hands the author a bundle that
# replaces the one they are running, so an update carrying no ticket produces an
# app that depends on a network check at first launch — strictly worse than the
# DMG install it replaced. Refusing here rather than warning: this is the only
# point where the property is cheap to check.
xcrun stapler validate "$APP" >/dev/null 2>&1 \
  || die "$APP is not stapled. Sparkle payloads must carry their own notarization
  ticket — build the update from the stapled app, not the pre-notarization one."

readonly SPARKLE_DIR="$RELEASE_DIR/sparkle/$ARCH_SLUG"
mkdir -p "$SPARKLE_DIR"

readonly ZIP_NAME="ChordWriter-$VERSION-$ARCH_SLUG.zip"
readonly ZIP_PATH="$SPARKLE_DIR/$ZIP_NAME"

# ditto, not `zip`: it is the only one that preserves the signed bundle's
# extended attributes and symlinks intact. --keepParent so the archive contains
# "Chord Writer.app" rather than its contents loose at the root.
rm -f "$ZIP_PATH"
ditto -c -k --keepParent "$APP" "$ZIP_PATH" || die "failed to build the update archive."

# Assert the round trip rather than trusting ditto's exit code. A signature
# damaged in archiving is invisible until an author's update fails verification,
# where it reads to them as a corrupt download rather than a broken release.
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
ditto -x -k "$ZIP_PATH" "$work" || die "the update archive does not unpack."
codesign --verify --deep --strict "$work/Chord Writer.app" \
  || die "the app's signature did not survive archiving — Sparkle would reject this update."
xcrun stapler validate "$work/Chord Writer.app" >/dev/null \
  || die "the archived app lost its notarization ticket."
note "archive verifies after a round trip ($ZIP_NAME, $(du -h "$ZIP_PATH" | cut -f1))"

( cd "$SPARKLE_DIR" && shasum -a 256 "$ZIP_NAME" > "$ZIP_NAME.sha256" ) \
  || die "failed to checksum the update archive."

# generate_appcast does the signing, the feed and the binary deltas in one pass,
# rather than this script hand-writing XML. Worth deferring to: it reads the
# private key from the keychain itself (never on a command line), infers minimum
# system version and hardware requirements from the bundle, and appends to an
# existing feed rather than rewriting it — so earlier releases keep the download
# URLs they shipped with.
#
# The prefix is version-independent because every archive sits in the same
# /downloads directory on the server, distinguished by its filename. Entries
# already in the feed keep the URLs they shipped with regardless.
readonly APPCAST_NAME="appcast-$ARCH_SLUG.xml"
readonly APPCAST_PATH="$SPARKLE_DIR/$APPCAST_NAME"
"$GENERATE_APPCAST" \
  -o "$APPCAST_PATH" \
  --download-url-prefix "$DOWNLOAD_BASE/" \
  "$SPARKLE_DIR" \
  || die "generate_appcast failed — is the Sparkle private key in this machine's keychain?
  Check with: $SPARKLE_TOOLS/generate_keys -p"

# Assert the feed, not the exit code. A malformed or entry-less appcast fails
# nowhere else in this pipeline — it becomes a feed every installed app silently
# fails to read, which is the quietest possible way for updates to stop working.
[ -f "$APPCAST_PATH" ] || die "generate_appcast reported success but wrote no $APPCAST_NAME."
xmllint --noout "$APPCAST_PATH" \
  || die "the generated appcast is not well-formed XML: $APPCAST_PATH"
grep -q "sparkle:edSignature" "$APPCAST_PATH" \
  || die "the appcast carries no EdDSA signature — authors' apps would reject every update in it."
grep -q "$ZIP_NAME" "$APPCAST_PATH" \
  || die "the appcast does not reference $ZIP_NAME — this release is not actually in the feed."
note "appcast written, signed, and references this release ($APPCAST_NAME)"

echo "$APPCAST_PATH"
