#!/usr/bin/env bash
#
# make-archive-fixtures.sh — the encrypted-archive experiment (forum thread
# 710738, "Notarisation Fundamentals").
#
# Thread 710738 describes two relevant packaging facts:
#   - zip archives are NOTARY-TRANSPARENT: the service unpacks them and checks
#     the executable code inside.
#   - non-executable code may be sealed in an ENCRYPTED zip, which the service
#     treats as opaque. The thread's example is IDE templates, and it warns the
#     technique is not for "code meant to run on macOS."
#
# The 2026-08-12 bisection tested a PLAIN inner zip (`zipped2.zip`) and it hung.
# Per the thread that archive was transparent, so the service unpacked it. An
# ENCRYPTED archive has never been tested. That is the experiment.
#
# It also closes a second gap: no bisection fixture ever removed the ONE Mach-O
# in the devkit closure (an ad-hoc-signed esbuild at
# node_modules/.pnpm/@esbuild+darwin-arm64@<v>/...). "esbuild is the trigger"
# is untested.
#
# Public interface:
#   make-archive-fixtures.sh <staged-toolchain-dir>
#     <staged-toolchain-dir>  output of vendor-toolchain.sh, i.e. the directory
#                             CONTAINING bin/ devkit/ node/
#
# Produces three fixtures in ./out-archive/, none containing any Mach-O, so no
# signing identity is required and no unsigned-binary Invalid can confound the
# result. It does NOT submit anything.
#
# Owner context: docs/work/adr-279-chord-writer-packaging — evidence for the
# Developer ID notary investigation.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "usage: make-archive-fixtures.sh <staged-toolchain-dir>" >&2
  echo "  stage one first:  tools/ide/vendor-toolchain.sh <some-dir>" >&2
  exit 2
fi

STAGE="$1"
[ -d "$STAGE/devkit" ] || { echo "no devkit/ under $STAGE" >&2; exit 2; }

OUT="$(cd "$(dirname "$0")" && pwd)/out-archive"
WORK="$OUT/.work"
ZIP_PASSWORD="notary-fixture"

rm -rf "$OUT"
mkdir -p "$WORK"

echo "Staging devkit closure without its Mach-O..."
cp -R "$STAGE/devkit" "$WORK/devkit"

# Remove every Mach-O. In practice this is the single ad-hoc-signed esbuild,
# but detect rather than hard-code the path, since the version is in it.
removed=0
while IFS= read -r f; do
  if file "$f" | grep -q "Mach-O"; then
    rm -f "$f"
    removed=$(( removed + 1 ))
  fi
done < <(find "$WORK/devkit" -type f -perm +111)
echo "  removed $removed Mach-O file(s)"
echo "  $(find "$WORK/devkit" -type f | wc -l | tr -d ' ') files remain"
echo

report() {
  local path="$1" label="$2"
  printf '%-14s %7s  %s\n' "$label" \
    "$(du -h "$path" | cut -f1)" \
    "$(shasum -a 256 "$path" | cut -d' ' -f1)"
}

# E-tree — the closure as an ordinary directory tree, no inner archive.
# POSITIVE CONTROL and esbuild test in one:
#   hangs  -> setup reproduces the bug; esbuild is exonerated; F vs G is live
#   clears -> the Mach-O (or its ad-hoc signature) was the trigger all along
( cd "$WORK" && ditto -c -k --keepParent devkit "$OUT/E-tree.zip" )
report "$OUT/E-tree.zip" "E-tree"

# F-plain — closure sealed in a PLAIN inner zip, which thread 710738 says the
# notary will unpack. Reproduces `zipped2.zip` minus the Mach-O.
mkdir -p "$WORK/plain"
( cd "$WORK" && zip -q -r "plain/devkit-inner.zip" devkit )
( cd "$WORK" && ditto -c -k --keepParent plain "$OUT/F-plain.zip" )
report "$OUT/F-plain.zip" "F-plain"

# G-encrypted — the candidate REMEDY. Same bytes, encrypted inner zip, which
# the service cannot unpack. Info-ZIP's -e is ZipCrypto, not AES; opacity to
# the scanner is the property under test, not cryptographic strength.
mkdir -p "$WORK/enc"
( cd "$WORK" && zip -q -r -P "$ZIP_PASSWORD" "enc/devkit-inner.zip" devkit )
( cd "$WORK" && ditto -c -k --keepParent enc "$OUT/G-encrypted.zip" )
report "$OUT/G-encrypted.zip" "G-encrypted"

rm -rf "$WORK"

cat <<INSTRUCTIONS

Fixtures in $OUT
Inner-zip password: $ZIP_PASSWORD

Submit one at a time, recording id and createdDate immediately. Do NOT use
--wait. Decision rule, same as the 2026-08-12 bisection: still In Progress at
10 minutes counts as hung. WWDC21 session 10261 states Apple is "committed to
completing this process within 15 minutes for 98 percent" of submissions.

  xcrun notarytool submit out-archive/E-tree.zip     --keychain-profile dc-notary
  xcrun notarytool submit out-archive/F-plain.zip    --keychain-profile dc-notary
  xcrun notarytool submit out-archive/G-encrypted.zip --keychain-profile dc-notary

Re-query daily; the 2026-08-12 hung ids were deleted at 21-26 hours, so record
the date each stops resolving:

  xcrun notarytool info <id> --keychain-profile dc-notary

How to read the outcome:

  E hangs, F hangs, G CLEARS   the encrypted archive is opaque and is a
                               candidate remedy. Do NOT ship on this alone --
                               thread 710738 excludes "code meant to run on
                               macOS", and whether interpreted script read by a
                               bundled interpreter is inside that exclusion is
                               the DTS question. A clear is evidence, not
                               permission.

  E hangs, F hangs, G hangs    opacity is not the variable. The trigger is not
                               the service reading the script content.

  E CLEARS                     the Mach-O was the trigger. Everything about
                               script content is a red herring, and the remedy
                               is re-signing or replacing esbuild. Note this
                               sits in tension with the bisection's esb.zip
                               (esbuild alone, Accepted in 19s) -- so if E
                               clears, submit esbuild alone again to see
                               whether that result still reproduces.

INSTRUCTIONS
