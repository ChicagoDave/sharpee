#!/usr/bin/env bash
# -------------------------------------------------------------------
# dmg-layout-test.sh — real-path acceptance test for the DMG window layout.
#
# Owner context: tools/ide — packaging tests.
#
# Public interface:
#   dmg-layout-test.sh          run the suite; exits 0 only if every case passes
#
# REAL PATH, not a stand-in: this drives the production assemble-dmg.sh, the
# same script package.sh calls, and then asserts against the DMG it actually
# produced — mounted, read back through Finder. The only thing faked is the app
# bundle, because a real Chord Writer.app costs a ten-minute signed build and
# the layout does not depend on what is inside the bundle.
#
# Assertions read the layout back out of the SHIPPED (compressed, read-only)
# image rather than the read-write one, because the question that matters is
# whether the layout survived conversion — which is exactly where it is lost.
# -------------------------------------------------------------------
set -uo pipefail   # deliberately no -e: a failing case must report, not abort

readonly DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly ASSEMBLE="$DIR/assemble-dmg.sh"

PASS=0
FAIL=0

ok()   { echo "  ✓ $*"; PASS=$((PASS + 1)); }
bad()  { echo "  ✗ $*"; FAIL=$((FAIL + 1)); }
step() { echo ""; echo "── $* ─────────────────────────────────"; }

# expect <label> <expected> <actual>
expect() {
  if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 — expected '$2', got '$3'"; fi
}

WORK="$(mktemp -d)"
MOUNT=""
cleanup() {
  [ -n "$MOUNT" ] && hdiutil detach "$MOUNT" -force >/dev/null 2>&1
  rm -rf "$WORK"
  return 0
}
trap cleanup EXIT

# A minimal but genuine app bundle: Finder must recognise it as an application,
# or `set position of item` addresses something that is not there.
readonly FAKE_APP="$WORK/Chord Writer.app"
mkdir -p "$FAKE_APP/Contents/MacOS"
cat > "$FAKE_APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Chord Writer</string>
  <key>CFBundleIdentifier</key><string>test.chordwriter.layout</string>
  <key>CFBundleExecutable</key><string>ChordWriter</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.0.0</string>
</dict>
</plist>
PLIST
printf '#!/bin/sh\nexit 0\n' > "$FAKE_APP/Contents/MacOS/ChordWriter"
chmod +x "$FAKE_APP/Contents/MacOS/ChordWriter"

# A version-shaped name, matching what package.sh passes, so the spaces in the
# volume name are exercised rather than assumed harmless.
readonly VOLNAME="Chord Writer 0.0.0-test"
readonly OUT="$WORK/out.dmg"

step "Assemble (production assemble-dmg.sh)"
if ! "$ASSEMBLE" "$FAKE_APP" "$VOLNAME" "$OUT"; then
  bad "assemble-dmg.sh exited nonzero"
  echo ""; echo "$PASS passing, $FAIL failures"; exit 1
fi
ok "assemble-dmg.sh exited 0"

[ -f "$OUT" ] && ok "produced $OUT" || bad "no DMG at $OUT"

step "The shipped image is compressed and read-only"
fmt="$(hdiutil imageinfo "$OUT" | sed -n 's/^Format: *//p')"
expect "format is UDZO" "UDZO" "$fmt"

step "Mount the shipped image and read the layout back"
MOUNT="$(hdiutil attach "$OUT" -readonly -noautoopen | sed -n 's#.*\(/Volumes/.*\)$#\1#p' | head -1)"
if [ -z "$MOUNT" ] || [ ! -d "$MOUNT" ]; then
  bad "the produced DMG did not mount"
  echo ""; echo "$PASS passing, $FAIL failures"; exit 1
fi
ok "mounted at $MOUNT"
MOUNTED_NAME="$(basename "$MOUNT")"

# Contents, before appearance: a beautiful window over the wrong files is worse
# than an ugly one over the right ones.
[ -d "$MOUNT/Chord Writer.app" ] && ok "the app bundle is on the image" \
  || bad "no 'Chord Writer.app' at the image root"
# The drop target is an ALIAS, not a symlink — a symlink cannot carry a custom
# icon (com.apple.ResourceFork on one returns EPERM). These three assertions
# cover what that swap has to preserve: it is a real file, it still resolves to
# /Applications, and it kept its icon through the conversion to UDZO.
[ -f "$MOUNT/Applications" ] && [ ! -L "$MOUNT/Applications" ] \
  && ok "the Applications shortcut is an alias file, not a symlink" \
  || bad "the Applications entry is missing or is still a symlink"

# Resolved with Foundation's alias resolver, deliberately not AppleScript.
# Two AppleScript spellings were tried and both mislead: `POSIX file X as alias`
# merely coerces a path and reports the alias's OWN path, and Finder's
# `original item` resolves correctly but then refuses `POSIX path of` the
# result ("Can't get POSIX path of folder Applications of startup disk"),
# returning empty. Both failed against a perfectly good image.
resolved="$(swift - "$MOUNT/Applications" <<'SWIFT' 2>/dev/null
import Foundation
let u = URL(fileURLWithPath: CommandLine.arguments[1])
if let r = try? URL(resolvingAliasFileAt: u, options: []) { print(r.path) }
SWIFT
)"
case "$resolved" in
  /Applications/*|/Applications) ok "the alias resolves to /Applications" ;;
  *) bad "the alias resolves to '$resolved', not /Applications" ;;
esac

if xattr "$MOUNT/Applications" 2>/dev/null | grep -q "com.apple.ResourceFork"; then
  ok "the alias kept its custom icon through UDZO conversion"
else
  bad "the alias has no resource fork on the shipped image — the custom folder
      icon was lost in conversion"
fi

# The whole point of the alias: the build machine's own /Applications must not
# have been written through.
[ ! -e "/Applications/Icon"$'\r' ] \
  && ok "the real /Applications was not modified" \
  || bad "/Applications gained an Icon file — the icon was written through the shortcut"
[ -f "$MOUNT/.background/background.tiff" ] && ok "the background art is on the image" \
  || bad "no .background/background.tiff on the image"
[ -f "$MOUNT/.DS_Store" ] && ok ".DS_Store survived conversion to UDZO" \
  || bad "no .DS_Store on the shipped image — the layout was lost in conversion"

# ask <applescript-body> — evaluate inside `tell disk <mounted volume>`.
ask() {
  osascript <<APPLESCRIPT 2>/dev/null
tell application "Finder"
  tell disk "$MOUNTED_NAME"
    open
    $1
  end tell
end tell
APPLESCRIPT
}

step "Finder reports the layout this suite's Behavior Statement claims"

expect "view is icon view" "icon view" \
  "$(ask 'get current view of container window as text')"

# bounds is {left, top, right, bottom}; the content area must be exactly the
# background's point size or the art sits off-register.
bounds="$(ask 'get bounds of container window')"
if [ -n "$bounds" ]; then
  w=$(( $(echo "$bounds" | cut -d, -f3) - $(echo "$bounds" | cut -d, -f1) ))
  h=$(( $(echo "$bounds" | cut -d, -f4) - $(echo "$bounds" | cut -d, -f2) ))
  expect "content window is 640 wide" "640" "$w"
  expect "content window is 420 tall" "420" "$h"
else
  bad "Finder returned no window bounds"
fi

expect "icon size is 96" "96" \
  "$(ask 'get icon size of the icon view options of container window')"
expect "icons are not auto-arranged" "not arranged" \
  "$(ask 'get arrangement of the icon view options of container window as text')"
expect "toolbar is hidden" "false" \
  "$(ask 'get toolbar visible of container window as text')"

# The background is asserted against the shipped .DS_Store, NOT via Finder:
# `background picture` is write-only in practice — Finder errors on the getter
# ("Can't get name of background picture...") even immediately after a
# successful set, so an assertion through that property would report a failure
# on a correct image. The .DS_Store carries the alias, filename included, and
# that is what Finder itself reads when an author opens the DMG.
if strings -a "$MOUNT/.DS_Store" | grep -q "background.tiff"; then
  ok "the shipped .DS_Store references background.tiff"
else
  bad "the shipped .DS_Store has no reference to background.tiff — the window
      would open with no background"
fi

# Positions are read from the REOPENED volume, which is the state an author
# meets. Finder re-flows icons set too near the top of the window, so this is
# the assertion that catches a layout which looked right when it was written
# and had moved by the time anyone saw it.
expect "the app sits at the left icon slot" "215, 302" \
  "$(ask 'get position of item "Chord Writer.app" of container window')"
expect "Applications sits at the right icon slot" "460, 268" \
  "$(ask 'get position of item "Applications" of container window')"

ask 'close' >/dev/null

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "$PASS passing, 0 failures"
else
  echo "$PASS passing, $FAIL failures"
fi
[ "$FAIL" -eq 0 ]
