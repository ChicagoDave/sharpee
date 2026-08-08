#!/usr/bin/env bash
# -------------------------------------------------------------------
# make-app-icon.sh — render the Chord Writer app icon set from the master art.
#
# Owner context: tools/ide — app art. Writes the PNGs that
# SharpeeIDE/Resources/Assets.xcassets/AppIcon.appiconset ships, from
# chord-book.png (1024x1024, transparent).
#
# Public interface:
#   make-app-icon.sh          regenerate every size in the appiconset
#
# Run it only when the master art changes, then commit the result. The Xcode
# build reads the committed PNGs; it never runs this script.
#
# The master is the leather-book artwork with its rendered white backdrop and
# drop shadow removed. That knockout is baked into the committed master rather
# than redone here, because it needed a hand-checked fuzz threshold: too low
# leaves a light halo that shows on dark backgrounds, and too high floods
# through the artwork itself (at 42% it punched a hole clean through the
# Applications folder). Do not re-derive it from the original screenshot
# without looking at the result on a dark background.
# -------------------------------------------------------------------
set -euo pipefail

readonly ART_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly MASTER="$ART_DIR/chord-book.png"
readonly ICONSET="$ART_DIR/../SharpeeIDE/Resources/Assets.xcassets/AppIcon.appiconset"

die() { echo "make-app-icon: $*" >&2; exit 1; }

command -v sips >/dev/null || die "'sips' is required (ships with macOS)."
[ -f "$MASTER" ] || die "missing master art at $MASTER."
[ -d "$ICONSET" ] || die "no appiconset at $ICONSET."

# name:pixels — the ten slots Contents.json declares, as (1x,2x) pairs of the
# five macOS icon sizes.
SLOTS="icon_16x16:16 icon_16x16@2x:32 icon_32x32:32 icon_32x32@2x:64
       icon_128x128:128 icon_128x128@2x:256 icon_256x256:256 icon_256x256@2x:512
       icon_512x512:512 icon_512x512@2x:1024"

for slot in $SLOTS; do
  name="${slot%%:*}"
  px="${slot##*:}"
  sips -s format png -Z "$px" "$MASTER" --out "$ICONSET/$name.png" >/dev/null \
    || die "failed to render $name at ${px}px."
  echo "  ✓ $name.png (${px}x${px})"
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
