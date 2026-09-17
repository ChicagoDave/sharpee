#!/usr/bin/env bash
# presign-payload.sh <app-bundle> <identity> <entitlements>
#
# Re-signs every Mach-O in the bundle's payload with our Developer ID, the
# hardened runtime, a secure timestamp, and the given entitlements — leaving
# Contents/Resources/toolchain alone.
#
# Public interface: three positional arguments. Modifies <app-bundle> in place.
# Owner context: tools/ide — macOS release tooling for the Avalonia desktop head.
#
# WHY THIS EXISTS. `vpk pack --signAppIdentity` runs `codesign --deep`, which
# signs the bundle and the executables in Contents/MacOS but leaves the payload
# in Contents/Resources as it found it. Measured on the first production arm64
# pack, 2026-09-16: of 20 Mach-O files, only 4 carried our Developer ID —
# 16 .NET native libraries were still ad-hoc signed (flags=0x2) and
# libSkiaSharp/libHarfBuzzSharp still carried Microsoft's signature with
# flags=0x0, no hardened runtime. Apple's notary service rejects all of that, so
# without this pass the bundle packs and seals cleanly and then fails at the one
# step that costs a round trip to Apple to discover.
#
# THE TOOLCHAIN IS DELIBERATELY SKIPPED. vendor-toolchain.sh already signed node
# and esbuild with their own entitlement set (bundled-node.entitlements), and
# re-signing them here would replace that set with this one. They are a
# different binary with a different reason for each key.
set -euo pipefail

usage() { echo "usage: presign-payload.sh <app-bundle> <identity> <entitlements>" >&2; exit 2; }
[ $# -eq 3 ] || usage

APP="$1"
IDENTITY="$2"
ENTITLEMENTS="$3"

[ -d "$APP" ] || { echo "presign-payload: no bundle at $APP" >&2; exit 1; }
[ -f "$ENTITLEMENTS" ] || { echo "presign-payload: no entitlements at $ENTITLEMENTS" >&2; exit 1; }

readonly TOOLCHAIN="$APP/Contents/Resources/toolchain"

signed=0
skipped=0
while IFS= read -r -d '' file; do
  case "$file" in "$TOOLCHAIN"/*) skipped=$((skipped + 1)); continue ;; esac
  case "$(file -b "$file")" in Mach-O*) ;; *) continue ;; esac
  # --force because the file already carries a signature (ad-hoc from `dotnet
  # publish`, or the vendor's own); without it codesign leaves it as found,
  # which is the defect this script exists to correct.
  codesign --force --sign "$IDENTITY" --options runtime --timestamp \
    --entitlements "$ENTITLEMENTS" "$file" \
    || { echo "presign-payload: codesign failed on $file" >&2; exit 1; }
  signed=$((signed + 1))
done < <(find "$APP" -type f -print0)

echo "presign-payload: $signed payload Mach-O signed, $skipped toolchain file(s) left as vendored"
