#!/usr/bin/env bash
# build-relocated-app.sh <publish-dir> <output.app> <main-exe> <info-plist> <icns>
#
# Arranges a `dotnet publish` output into an Apple-conformant .app: only the
# native AppHost lands in Contents/MacOS, the entire managed payload lands in
# Contents/Resources, and the AppHost's embedded app-path is repointed so
# hostfxr follows it there.
#
# THE ORDERING CONSTRAINT IS LOAD-BEARING. This produces the PRE-PACK shape.
# `vpk pack` accepts an already-built .app as --packDir and passes its Contents/
# tree through unchanged, so packing this produces a .nupkg carrying the
# relocated layout natively -- which is what makes the layout survive Velopack's
# update-apply path with no post-apply hook. Relocating vpk's own finished output
# instead collides on sq.version inside OsxPackCommandRunner.PreprocessPackDir,
# which creates that symlink with overwrite:false. Evidence:
# docs/work/velopack-macos-bundle-layout/decision.md section 1.
#
# Public interface: five positional arguments. Writes only to <output.app>.
# Owner context: tools/ide -- macOS release tooling for the Avalonia desktop
# head. Ported from the ADR-351 Q-5 spike 2026-09-16.
set -euo pipefail

readonly HERE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  echo "usage: build-relocated-app.sh <publish-dir> <output.app> <main-exe> <info-plist> <icns>" >&2
  exit 2
}
[ $# -eq 5 ] || usage

PUBLISH="$1"
APP="$2"
MAIN="$3"
PLIST="$4"
ICNS="$5"

[ -d "$PUBLISH" ] || { echo "build-relocated-app: no publish directory at $PUBLISH" >&2; exit 1; }
[ -f "$PUBLISH/$MAIN" ] || { echo "build-relocated-app: no AppHost at $PUBLISH/$MAIN" >&2; exit 1; }
[ -f "$PLIST" ] || { echo "build-relocated-app: no Info.plist at $PLIST" >&2; exit 1; }
[ -f "$ICNS" ] || { echo "build-relocated-app: no icon at $ICNS" >&2; exit 1; }

# vpk's own default excludes, applied here because this script builds the bundle
# vpk would otherwise have built.
EXCLUDE=" createdump ${MAIN}.pdb "

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$PLIST" "$APP/Contents/Info.plist"
cp "$ICNS" "$APP/Contents/Resources/"

cp -a "$PUBLISH/$MAIN" "$APP/Contents/MacOS/$MAIN"

moved=0
skipped=0
for entry in "$PUBLISH"/*; do
  name="${entry##*/}"
  [ "$name" = "$MAIN" ] && continue
  case "$EXCLUDE" in *" $name "*) skipped=$((skipped + 1)); continue ;; esac
  cp -a "$entry" "$APP/Contents/Resources/$name"
  moved=$((moved + 1))
done

python3 "$HERE/patch-apphost.py" "$APP/Contents/MacOS/$MAIN" "../Resources/${MAIN}.dll"

# The whole point of the exercise: Contents/MacOS must be native-only. Assert it
# rather than trusting the loop above, so a new non-Mach-O file in a future
# publish output fails here instead of at codesign or at Gatekeeper.
for entry in "$APP/Contents/MacOS"/*; do
  [ -e "$entry" ] || continue
  case "$(file -b "$entry")" in
    Mach-O*) ;;
    *) echo "build-relocated-app: $entry is not Mach-O; Contents/MacOS must be native-only" >&2
       exit 1 ;;
  esac
done

echo "build-relocated-app: $moved entr(ies) into Contents/Resources, $skipped excluded"
echo "build-relocated-app: Contents/MacOS holds:"
ls "$APP/Contents/MacOS"
