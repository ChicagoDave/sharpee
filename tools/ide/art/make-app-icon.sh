#!/usr/bin/env bash
# -------------------------------------------------------------------
# make-app-icon.sh — render the Chord Writer app icon set from the master art.
#
# Owner context: tools/ide — app art. Writes the PNGs that
# SharpeeIDE/Resources/Assets.xcassets/AppIcon.appiconset ships.
#
# Public interface:
#   make-app-icon.sh          regenerate every size in the appiconset
#
# Run it only when the master art changes, then commit the result. The Xcode
# build reads the committed PNGs; it never runs this script.
#
# TWO designs, not one downscaled — Apple's own convention for macOS icons:
#
#   128pt and up   chord-diagram.png — the guitar chord diagram on parchment.
#                  Reads down to about 64px; below that the fret grid's thin
#                  lines merge into a brown smudge.
#   16pt and 32pt  note/note-<px>.png — a bold eighth note on the same
#                  parchment. These slots are Finder list and column view, the
#                  sidebar, and Spotlight. They are COPIED, not rendered: each
#                  was drawn geometrically at its exact pixel size
#                  (note/make-note-tiles.py), which holds an edge where a
#                  downscale goes soft. Do not "simplify" this script by
#                  sips-ing them out of a single master — the mush that
#                  produces is the whole reason the split exists.
#
# Masters are committed already-derived, as chord-book.png was before them:
#
#   chord-diagram.png  the render cropped square around its ink and masked into
#                      the macOS rounded-rect at Apple's corner ratio, plus a
#                      faint rim shade so light parchment keeps an edge on a
#                      light wallpaper. Re-deriving it from a fresh render
#                      means redoing that crop-and-mask; check the result on
#                      BOTH a light and a dark background before committing.
#   note/note-*.png    regenerate with: python3 note/make-note-tiles.py
#                      (needs Pillow). Its PAPER colour is sampled from
#                      chord-diagram.png so the two designs are one parchment
#                      rather than two; re-sample it if the diagram changes.
#   chord-book.png     the retired leather-book icon, kept for history.
#                      Nothing references it.
# -------------------------------------------------------------------
set -euo pipefail

readonly ART_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly MASTER="$ART_DIR/chord-diagram.png"
readonly NOTE_DIR="$ART_DIR/note"
readonly ICONSET="$ART_DIR/../SharpeeIDE/Resources/Assets.xcassets/AppIcon.appiconset"

die() { echo "make-app-icon: $*" >&2; exit 1; }

command -v sips >/dev/null || die "'sips' is required (ships with macOS)."
[ -f "$MASTER" ] || die "missing master art at $MASTER."
[ -d "$ICONSET" ] || die "no appiconset at $ICONSET."

# Checked up front: a missing note tile would otherwise leave the previous
# file in place, and the set would ship half-updated with nothing to say so.
for px in 16 32 64; do
  [ -f "$NOTE_DIR/note-$px.png" ] || die "missing note tile at $NOTE_DIR/note-$px.png
  Regenerate with: python3 $NOTE_DIR/make-note-tiles.py"
done

# slot:pixels:source — the ten slots Contents.json declares.
SLOTS="icon_16x16:16:note icon_16x16@2x:32:note icon_32x32:32:note icon_32x32@2x:64:note
       icon_128x128:128:master icon_128x128@2x:256:master icon_256x256:256:master
       icon_256x256@2x:512:master icon_512x512:512:master icon_512x512@2x:1024:master"

for slot in $SLOTS; do
  name="${slot%%:*}"
  rest="${slot#*:}"
  px="${rest%%:*}"
  src="${rest##*:}"

  if [ "$src" = "note" ]; then
    cp "$NOTE_DIR/note-$px.png" "$ICONSET/$name.png" || die "failed to copy $name."
    echo "  ✓ $name.png (${px}x${px}, note tile)"
  else
    sips -s format png -Z "$px" "$MASTER" --out "$ICONSET/$name.png" >/dev/null \
      || die "failed to render $name at ${px}px."
    echo "  ✓ $name.png (${px}x${px}, chord diagram)"
  fi
done

# Contents.json is rewritten rather than hand-edited so the filenames can never
# drift from what was just written above.
cat > "$ICONSET/Contents.json" <<'JSON'
{
  "images" : [
    { "idiom" : "mac", "scale" : "1x", "size" : "16x16",   "filename" : "icon_16x16.png" },
    { "idiom" : "mac", "scale" : "2x", "size" : "16x16",   "filename" : "icon_16x16@2x.png" },
    { "idiom" : "mac", "scale" : "1x", "size" : "32x32",   "filename" : "icon_32x32.png" },
    { "idiom" : "mac", "scale" : "2x", "size" : "32x32",   "filename" : "icon_32x32@2x.png" },
    { "idiom" : "mac", "scale" : "1x", "size" : "128x128", "filename" : "icon_128x128.png" },
    { "idiom" : "mac", "scale" : "2x", "size" : "128x128", "filename" : "icon_128x128@2x.png" },
    { "idiom" : "mac", "scale" : "1x", "size" : "256x256", "filename" : "icon_256x256.png" },
    { "idiom" : "mac", "scale" : "2x", "size" : "256x256", "filename" : "icon_256x256@2x.png" },
    { "idiom" : "mac", "scale" : "1x", "size" : "512x512", "filename" : "icon_512x512.png" },
    { "idiom" : "mac", "scale" : "2x", "size" : "512x512", "filename" : "icon_512x512@2x.png" }
  ],
  "info" : { "author" : "xcode", "version" : 1 }
}
JSON
echo "  ✓ Contents.json"
