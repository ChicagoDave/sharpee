#!/usr/bin/env bash
# release-all.sh — build BOTH architecture slices end to end, unattended, and
# collect everything that needs uploading into one folder (ADR-279 D2/D3/D7).
#
# Public interface:
#   release-all.sh [--arch-list "arm64 x86_64"]
# Produces release/<version>/ laid out exactly as the server expects, plus an
# UPLOAD.md naming where each file goes.
# Owner context: tools/ide — release tooling.
#
# WHY THIS EXISTS. package.sh deliberately never waits on Apple: it submits,
# records the id, and exits so a shell is not held open for a queue that can run
# to hours. That is right for the script and wrong for a release, where the
# operator wants both slices done and does not want to hand-babysit four
# notarization round-trips across two architectures. This drives package.sh the
# way a person would — run, poll, resume — without changing its contract.
#
# It is a DRIVER, not a second pipeline. Every gate, signature and assertion
# still belongs to package.sh; nothing here signs, notarizes or validates
# anything. If this script and package.sh ever disagree, package.sh is right.

set -euo pipefail

readonly IDE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly RELEASE_DIR="$IDE_DIR/release"
readonly NOTARY_PROFILE="${NOTARY_PROFILE:-dc-notary}"

# Apple has returned verdicts in 90 seconds and has also sat on a first-time
# bundle for hours. Poll patiently rather than guessing an upper bound: 30s
# between checks, up to 2 hours per submission.
readonly POLL_SECONDS=30
readonly MAX_POLLS=240
# Each package.sh run advances one stage (submit app, submit DMG, finish). Four
# is one more than the pipeline needs, so exhausting it means something is stuck
# rather than slow.
readonly MAX_PASSES=4

ARCH_LIST="arm64 x86_64"
COLLECT_ONLY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --arch-list) ARCH_LIST="$2"; shift 2 ;;
    # Both slices are already built, notarized and stapled — just re-assemble
    # release/<version>/. Exists because finishing a slice CLEARS its ledger, so a
    # plain re-run sees no pending work and starts a fresh build instead of
    # collecting: the collection step was unreachable once the builds succeeded.
    --collect-only) COLLECT_ONLY=1; shift ;;
    *) printf 'error: unknown flag %s\n' "$1" >&2; exit 1 ;;
  esac
done

die() { printf '\nerror: %s\n' "$1" >&2; exit 1; }
say() { printf '\n=== %s\n' "$1"; }

VERSION="$(sed -n 's/^ *CFBundleShortVersionString: *"\{0,1\}\([0-9][0-9.]*\)"\{0,1\} *$/\1/p' "$IDE_DIR/project.yml" | head -1)"
[ -n "$VERSION" ] || die "could not read CFBundleShortVersionString from project.yml."

# wait_for_submission — block until the id recorded in the ledger resolves.
# Reads the id from the ledger rather than taking it as an argument, so the
# thing being waited on is always the thing package.sh actually submitted.
wait_for_submission() {  # wait_for_submission <ledger>
  local ledger="$1" id status i
  id="$(sed -n 's/^[A-Z_]*SUBMISSION=//p' "$ledger" | tail -1)"
  [ -n "$id" ] || die "the ledger exists but carries no submission id."
  printf '    waiting on %s' "$id"
  for i in $(seq 1 "$MAX_POLLS"); do
    status="$(xcrun notarytool info "$id" --keychain-profile "$NOTARY_PROFILE" 2>&1 | sed -n 's/^ *status: *//p')"
    case "$status" in
      Accepted) printf ' -> Accepted\n'; return 0 ;;
      Invalid|Rejected)
        printf ' -> %s\n' "$status"
        xcrun notarytool log "$id" --keychain-profile "$NOTARY_PROFILE" 2>&1 | sed 's/^/      /' >&2 || true
        die "Apple rejected $id. The log is above; nothing was published." ;;
      "") printf '?' ;;
      *) printf '.' ;;
    esac
    sleep "$POLL_SECONDS"
  done
  die "submission $id did not resolve within $((MAX_POLLS * POLL_SECONDS / 60)) minutes."
}

build_arch() {
  local arch="$1" pass dmg slice ledger
  slice="$RELEASE_DIR/$arch"          # each slice owns its ledger, staging, DMG and sparkle payload
  ledger="$slice/.notarize-state"
  dmg="$slice/ChordWriter-$VERSION-$arch.dmg"
  say "$arch — building Chord Writer $VERSION"

  for pass in $(seq 1 "$MAX_PASSES"); do
    printf '  pass %d: package.sh --arch %s\n' "$pass" "$arch"
    "$IDE_DIR/package.sh" --arch "$arch" || die "package.sh failed on $arch (pass $pass)."

    # The ledger is the signal. package.sh clears it only when the release is
    # complete, so its presence means a submission is outstanding.
    if [ -f "$ledger" ]; then
      wait_for_submission "$ledger"
      continue
    fi

    # Ledger gone: assert the artifacts rather than trusting that.
    [ -f "$dmg" ] || die "the ledger is cleared but $dmg is missing."
    [ -f "$slice/sparkle/appcast-$arch.xml" ] \
      || die "no appcast was produced for $arch."
    printf '  %s complete\n' "$arch"
    return 0
  done
  die "$arch did not finish within $MAX_PASSES passes — something is stuck."
}

# --- Build every slice ------------------------------------------------
if [ "$COLLECT_ONLY" -eq 1 ]; then
  say "--collect-only: skipping the builds, assembling from the existing slices"
  for arch in $ARCH_LIST; do
    [ -f "$RELEASE_DIR/$arch/ChordWriter-$VERSION-$arch.dmg" ] \
      || die "--collect-only: release/$arch/ChordWriter-$VERSION-$arch.dmg is missing — that slice is not built."
    [ -f "$RELEASE_DIR/$arch/sparkle/appcast-$arch.xml" ] \
      || die "--collect-only: release/$arch/sparkle/appcast-$arch.xml is missing — that slice has no Sparkle payload."
  done
fi
for arch in $ARCH_LIST; do
  [ "$COLLECT_ONLY" -eq 1 ] && continue
  # A cross-arch ledger guard used to live here. It read the shared ledger at
  # release/.notarize-state, inspected the single staged app's real architecture
  # with `file -b`, and refused when the two disagreed — because one ledger and
  # one staging slot served both slices, so a ledger could belong to the wrong
  # one and make package.sh staple a ticket issued for different bytes.
  #
  # RETIRED 2026-08-18 because the condition it detected can no longer arise:
  # each slice now owns release/<arch>/ entirely — its own ledger, staged app,
  # DMG and Sparkle payload — so one slice's state is not reachable from the
  # other's paths. The guard is not merely redundant, it had nothing left to
  # read. Note it only ever protected release-all.sh; calling package.sh
  # directly bypassed it, which is how both 2026-08-18 incidents happened.
  # package.sh now derives architecture from the artifact itself, so the
  # protection lives with the thing being protected rather than in this driver.
  [ -f "$RELEASE_DIR/$arch/.notarize-state" ] \
    && printf '\n=== %s — resuming an unfinished run\n' "$arch"
  build_arch "$arch"
done

# --- Collect what has to be uploaded ----------------------------------
# The folder MIRRORS THE SERVER so uploading is a copy, not a mapping exercise.
# Every filename here is one an author's app will request by exact URL: the DMGs
# are what the download page links, the zips are what Sparkle fetches, and the
# appcasts are what every installed copy polls forever.
say "Collecting release/$VERSION/"
readonly OUT="$RELEASE_DIR/$VERSION"
rm -rf "$OUT"
mkdir -p "$OUT/downloads/chord-writer"

# downloads/ holds ONLY files that get served. Checksums are for verifying the
# transfer, not for publishing, so they go to a single CHECKSUMS.txt at the root
# — mixing them in made a 6-file upload look like a 10-file one.
for arch in $ARCH_LIST; do
  cp "$RELEASE_DIR/$arch/ChordWriter-$VERSION-$arch.dmg"          "$OUT/downloads/"
  cp "$RELEASE_DIR/$arch/sparkle/ChordWriter-$VERSION-$arch.zip"  "$OUT/downloads/"
  cp "$RELEASE_DIR/$arch/sparkle/appcast-$arch.xml"               "$OUT/downloads/chord-writer/"
done

( cd "$OUT/downloads" && shasum -a 256 ChordWriter-"$VERSION"-*.dmg ChordWriter-"$VERSION"-*.zip ) \
  > "$OUT/CHECKSUMS.txt" || die "failed to write CHECKSUMS.txt"

cat > "$OUT/UPLOAD.md" <<UPLOADMD
# Chord Writer $VERSION — upload

**Six files.** Everything in \`downloads/\` is signed, notarized, stapled and
verified locally, and the layout mirrors the server — copy the \`downloads/\`
folder into the site's \`downloads/\` directory and every path lines up. There is
nothing to rename and nothing to place by hand.

    cd tools/ide/release/$VERSION
    scp -r downloads/* dave@plover.net:~/repos/sharpee/website/public/downloads/

\`-r\` matters: it carries the \`chord-writer/\` subfolder with the appcasts.
\`CHECKSUMS.txt\` stays here — it verifies the transfer, it is not served.

**Then rebuild and restart, or nothing uploaded is visible.** This Next version
snapshots \`public/\` at build time, so a file scp'd in after the last build
returns 404 until:

    ./website/deploy.sh --no-pull

That step needs sudo and is the operator's to run.

## What lands where

| File | Served at |
|---|---|
$(for arch in $ARCH_LIST; do
  printf '| `downloads/ChordWriter-%s-%s.dmg` | https://sharpee.net/downloads/ChordWriter-%s-%s.dmg |\n' "$VERSION" "$arch" "$VERSION" "$arch"
  printf '| `downloads/ChordWriter-%s-%s.zip` | https://sharpee.net/downloads/ChordWriter-%s-%s.zip |\n' "$VERSION" "$arch" "$VERSION" "$arch"
  printf '| `downloads/chord-writer/appcast-%s.xml` | https://sharpee.net/downloads/chord-writer/appcast-%s.xml |\n' "$arch" "$arch"
done)

The DMGs are what the download page links. The zips are what Sparkle fetches.
The appcasts are what every installed copy polls, forever.

## Order matters

Upload the **zips before the appcasts**. An installed app polls its feed on a
schedule, so a published appcast naming an archive that is not there yet hands
a real author a failed update. The DMGs can go at any point — nothing polls
them.

## Two feeds, not one

\`appcast-arm64.xml\` and \`appcast-x86_64.xml\` are separate on purpose. Sparkle
cannot filter by architecture, and each build polls the feed compiled into it,
so crossing them offers an author the wrong slice — an app that launches and
then cannot build a story.

## After uploading

    curl -I https://sharpee.net/downloads/chord-writer/appcast-arm64.xml
    curl -I https://sharpee.net/downloads/ChordWriter-$VERSION-arm64.zip

Both must return 200. The website's download page also needs its version
strings updated ($VERSION) — see website/src/lib/nav.ts and
website/src/components/download-card.tsx.
UPLOADMD

say "Done — Chord Writer $VERSION"
printf '  %s\n' "$OUT"
ls -1 "$OUT/downloads" "$OUT/downloads/chord-writer" | sed 's/^/    /'
