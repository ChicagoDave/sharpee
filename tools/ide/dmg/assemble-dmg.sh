#!/usr/bin/env bash
# -------------------------------------------------------------------
# assemble-dmg.sh — stage an app into a laid-out, compressed DMG.
#
# Owner context: tools/ide — packaging. Split out of package.sh so the window
# layout can be exercised on its own: package.sh's own path runs through
# signing and notarization, which needs credentials and ~10 minutes, so the
# layout could otherwise only ever be tested by shipping. dmg-layout-test.sh
# drives THIS script — the production one — with a stand-in app.
#
# Public interface:
#   assemble-dmg.sh <app-bundle> <volume-name> <output.dmg>
#
# Produces an UNSIGNED, UNNOTARIZED disk image. Signing, notarization and
# stapling stay in package.sh, which owns the credentials.
#
# NO SILENT FALLTHROUGH, inherited from package.sh: every step that could
# produce a DMG which opens as a plain file list hard-fails instead. An
# unstyled DMG is not a broken build — it looks fine to the script and wrong
# to the author — so each stage asserts its own result.
# -------------------------------------------------------------------
set -euo pipefail

readonly DMG_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly BACKGROUND="$DMG_DIR/background.tiff"

die()  { echo "" >&2; echo "assemble-dmg: $*" >&2; exit 1; }
note() { echo "  → $*"; }

[ "$#" -eq 3 ] || die "usage: assemble-dmg.sh <app-bundle> <volume-name> <output.dmg>"
readonly APP="$1" VOLNAME="$2" OUT="$3"

[ -d "$APP" ] || die "no app bundle at '$APP'."
[ -f "$BACKGROUND" ] || die "missing $BACKGROUND — regenerate it with
  make-background.swift and commit the result."

# Window layout. These are the contract with make-background.swift, which paints
# the arrow to match: the background is drawn at the window's content origin, so
# the icon centres here have to be the ones it assumed. Change them in one place
# only and the arrow points at nothing.
#
# The two icons are deliberately NOT level, and the rise is a design call, not
# a number derived from the art. It began as a fix — the sheet is rotated, its
# lower edge climbs to the right, and a level pair put the right-hand label off
# the parchment and onto the desk where Finder's dark label text does not read
# — but the rise used here is steeper than the sheet's own few degrees, so the
# pair reads as a diagonal rather than a near-level row that looks crooked.
#
# Both Y values sit well inside the band where Finder leaves icons alone:
# measured on macOS 26, y=120 was thrown out of the window entirely, y=150 came
# back as 195, and only y>=170 reopened where it was put.
readonly W=640 H=420
readonly APP_X=215 APP_Y=302
readonly DROP_X=460 DROP_Y=268
readonly ICON_SIZE=96

# How many close/reopen cycles to spend getting the layout to stick. Finder
# writes .DS_Store asynchronously and re-flows on reopen, so a single set is
# not reliably the layout an author will see — see the convergence loop below.
readonly LAYOUT_ATTEMPTS=4

readonly APP_NAME="$(basename "$APP")"

WORK="$(mktemp -d)"
MOUNT_POINT=""
# Detach on ANY exit. A failed run that leaves the volume mounted makes the
# next run hit the name-collision case handled below.
cleanup() {
  [ -n "$MOUNT_POINT" ] && hdiutil detach "$MOUNT_POINT" -force >/dev/null 2>&1
  rm -rf "$WORK"
  return 0
}
trap cleanup EXIT

# --- Stage -----------------------------------------------------------
readonly STAGE="$WORK/stage"
mkdir -p "$STAGE/.background"
cp -R "$APP" "$STAGE/" || die "failed to stage the app."
cp "$BACKGROUND" "$STAGE/.background/background.tiff" || die "failed to stage the background."

# The drop target is a Finder ALIAS, not a symlink, so it can carry the Chord
# Writer folder art. A symlink cannot: writing com.apple.ResourceFork onto one
# returns EPERM even with XATTR_NOFOLLOW, and setting the icon without NOFOLLOW
# writes through to the real /Applications. Both were measured; see the header
# of make-applications-shortcut.swift.
"$DMG_DIR/make-applications-shortcut.swift" \
  "$DMG_DIR/../art/applications-folder.png" \
  "$STAGE/Applications" \
  || die "failed to create the Applications shortcut."

# --- Read-write image ------------------------------------------------
# A compressed image is read-only and Finder cannot write a .DS_Store into one,
# so the layout has to be applied to a READ-WRITE image and the result
# compressed afterwards. Creating UDZO directly is why an un-styled DMG happens.
#
# Sized from the staged content plus slack: hdiutil's own estimate leaves no
# room for the .DS_Store, and that shortfall surfaces as a layout which
# silently does not stick rather than as a write error.
stage_mb="$(du -sm "$STAGE" | cut -f1)"
readonly RW="$WORK/rw.dmg"
hdiutil create \
  -volname "$VOLNAME" \
  -srcfolder "$STAGE" \
  -ov -format UDRW \
  -size "$((stage_mb + 60))m" \
  "$RW" >/dev/null \
  || die "hdiutil failed to create the read-write image."

# --- Mount -----------------------------------------------------------
# Read the mount point back rather than assuming /Volumes/<volname>: if a
# volume of that name is already mounted, macOS silently appends a suffix and
# the styling below would be applied to whatever else answers to the name we
# guessed. The sed takes everything from /Volumes to end-of-line, because the
# volume name contains spaces and would defeat field splitting.
MOUNT_POINT="$(
  hdiutil attach "$RW" -readwrite -noverify -noautoopen \
    | sed -n 's#.*\(/Volumes/.*\)$#\1#p' | head -1
)"
[ -n "$MOUNT_POINT" ] && [ -d "$MOUNT_POINT" ] \
  || die "could not determine where the read-write image mounted."
readonly MOUNTED_NAME="$(basename "$MOUNT_POINT")"
note "mounted as '$MOUNTED_NAME'"

# hdiutil returning a mount point does not mean Finder has noticed the volume.
# Addressing it too early fails with -1728 ("Can't get disk ..."), which was
# observed intermittently. Wait for Finder to admit the disk exists rather than
# sleeping a guessed interval and hoping.
finder_ready=0
for _ in $(seq 1 20); do
  if [ "$(osascript -e "tell application \"Finder\" to return (exists disk \"$MOUNTED_NAME\")" 2>/dev/null)" = "true" ]; then
    finder_ready=1
    break
  fi
  osascript -e 'delay 0.5' >/dev/null 2>&1
done
[ "$finder_ready" -eq 1 ] || die "Finder never registered the mounted volume
  '$MOUNTED_NAME'. Nothing can be laid out on a disk Finder cannot see."

# --- Lay out the window ----------------------------------------------
# Finder owns .DS_Store, so the layout is set by driving Finder. This needs
# Automation permission for whatever runs the script; without it osascript
# fails and the die below reports that rather than shipping an unstyled DMG.
#
# Applied in a CONVERGENCE LOOP rather than once, because Finder is not a
# transactional API here: it writes .DS_Store asynchronously and re-flows icon
# positions when the volume is reopened. Setting the layout and trusting it was
# measured producing an image whose icons had moved by the time an author saw
# it. So each attempt sets the layout, closes, reopens, and reads the positions
# back; the loop exits only once the reopened window agrees with what was asked
# for, which is the same thing the author will get.
apply_layout() {
  osascript <<APPLESCRIPT 2>&1
tell application "Finder"
  tell disk "$MOUNTED_NAME"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    -- bounds is {left, top, right, bottom} of the CONTENT area, so the width
    -- and height here are exactly the point size of the background art.
    -- (No apostrophes in this heredoc: it sits inside a command substitution,
    -- where a lone quote character breaks the surrounding shell parse.)
    set the bounds of container window to {200, 120, $((200 + W)), $((120 + H))}
    set opts to the icon view options of container window
    set arrangement of opts to not arranged
    set icon size of opts to $ICON_SIZE
    set text size of opts to 12
    set background picture of opts to file ".background:background.tiff"
    -- Finder positions an icon by its CENTRE, which is what the background art
    -- assumes when it places the arrow between these two points.
    set position of item "$APP_NAME" of container window to {$APP_X, $APP_Y}
    set position of item "Applications" of container window to {$DROP_X, $DROP_Y}
    update without registering applications
    close
  end tell
end tell
APPLESCRIPT
}

# read_positions — reopen the volume and report both icon centres, as
# "<x>, <y>|<x>, <y>". Reopening is the point: it is the state an author meets.
read_positions() {
  osascript <<APPLESCRIPT 2>/dev/null
tell application "Finder"
  tell disk "$MOUNTED_NAME"
    open
    set a to position of item "$APP_NAME" of container window
    set b to position of item "Applications" of container window
    close
    return ((item 1 of a as text) & ", " & (item 2 of a as text) & "|" & ¬
            (item 1 of b as text) & ", " & (item 2 of b as text))
  end tell
end tell
APPLESCRIPT
}

readonly WANT_POSITIONS="$APP_X, $APP_Y|$DROP_X, $DROP_Y"
settled=0
for attempt in $(seq 1 "$LAYOUT_ATTEMPTS"); do
  layout_out="$(apply_layout)" || die "Finder refused to lay out the DMG window:
$layout_out
  If this mentions '-1743' or 'not authorized', grant Automation -> Finder to
  the app running this script in System Settings > Privacy & Security."

  # Finder writes .DS_Store lazily; reading before it lands measures nothing.
  sync
  osascript -e 'delay 2' >/dev/null

  got="$(read_positions)"
  if [ "$got" = "$WANT_POSITIONS" ]; then
    note "layout settled on attempt $attempt"
    settled=1
    break
  fi
  note "attempt $attempt: icons reopened at '$got', wanted '$WANT_POSITIONS' — retrying"
done

[ "$settled" -eq 1 ] || die "the window layout did not survive a close/reopen after
  $LAYOUT_ATTEMPTS attempts. The last reading was '$got', wanted '$WANT_POSITIONS'.
  Refusing to ship a DMG whose icons sit off the background art."

sync
[ -f "$MOUNT_POINT/.DS_Store" ] || die "Finder wrote no .DS_Store, so the layout would
  not have persisted. Refusing to produce an unstyled DMG."
note "layout applied (${W}x${H}, ${ICON_SIZE}pt icons, background set)"

hdiutil detach "$MOUNT_POINT" >/dev/null || die "failed to detach the read-write image."
MOUNT_POINT=""

# --- Compress --------------------------------------------------------
rm -f "$OUT"
mkdir -p "$(dirname "$OUT")"
hdiutil convert "$RW" -format UDZO -imagekey zlib-level=9 -o "$OUT" >/dev/null \
  || die "hdiutil failed to compress the DMG."
note "wrote $OUT ($(du -h "$OUT" | cut -f1))"
