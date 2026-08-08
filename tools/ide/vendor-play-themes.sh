#!/usr/bin/env bash
# -------------------------------------------------------------------
# vendor-play-themes.sh — mirror the platform-browser built-in theme set into
# Chord Writer's own resources (go-live Phase 6b, proposal phase-6-fallout P-2).
#
# Owner context: tools/ide — packaging.
#
# Public interface:
#   vendor-play-themes.sh        # no arguments
#
# Mirrors packages/platform-browser/styles/themes/ (manifest.json, every
# theme's CSS, every theme's asset directory) into
# SharpeeIDE/Resources/play-themes/, which project.yml registers as a folder
# resource — so the Play pane can offer EVERY built-in theme as IDE chrome,
# whatever subset the open story actually ships (its `themes:` header line).
#
# The mirror is committed, for the same reason Resources/docs-tab is: XcodeGen
# resolves folder resources at generate time, so a gitignored mirror would make
# a fresh clone silently produce an app with no play themes. This script runs
# as a preBuild phase (cheap — one directory copy) so the mirror can never go
# stale against the package; run it by hand after editing a theme to see the
# change without a build.
#
# INVARIANT — this is a MIRROR, not a source: never edit files under
# SharpeeIDE/Resources/play-themes/ directly. The platform-browser package
# owns the themes; this script owns the copy.
# -------------------------------------------------------------------
set -euo pipefail

readonly IDE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly REPO_ROOT="$(cd -- "$IDE_DIR/../.." && pwd)"
readonly SOURCE_DIR="$REPO_ROOT/packages/platform-browser/styles/themes"
readonly TARGET_DIR="$IDE_DIR/SharpeeIDE/Resources/play-themes"

die() { echo "vendor-play-themes: $*" >&2; exit 1; }

[ -f "$SOURCE_DIR/manifest.json" ] \
  || die "no manifest at $SOURCE_DIR — platform-browser's theme set moved?"

rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"
cp -R "$SOURCE_DIR/." "$TARGET_DIR/"

[ -f "$TARGET_DIR/manifest.json" ] || die "mirror has no manifest.json"
echo "vendor-play-themes: mirrored $(find "$TARGET_DIR" -type f | wc -l | tr -d ' ') files into SharpeeIDE/Resources/play-themes"
