#!/usr/bin/env bash
#
# make-discriminator-fixtures.sh — resolve the Round 1 contradiction.
#
# Round 1 (2026-08-13): E-tree, F-plain and G-encrypted all hung, while the
# A-control health check returned Invalid in ~79 seconds in the same window.
# G-encrypted is the problem: the notary cannot unpack an encrypted archive, so
# it cannot have been reacting to the JavaScript inside it, yet it hung.
#
# Two candidate explanations survive, and these two fixtures separate them.
#
#   H-enc-stub  trivial stubs in an ENCRYPTED inner zip, ~3MB.
#               Same content as A-control (Invalid in 79s), same encryption as
#               G-encrypted (hung). Isolates the encrypted-archive FORMAT.
#
#   I-big-stub  ~60MB of high-entropy files, plain zip, no encryption.
#               Matches G-encrypted's size and incompressibility without its
#               format. Isolates SIZE AND ENTROPY.
#
# NOTE ON THE MEASURE: none of these fixtures contains a signed executable, so
# the *correct* verdict for all of them is Invalid ("no signed executables or
# bundles"), which is what A-control received. The variable under test is
# TERMINAL vs HUNG, not Accepted vs Invalid. An Invalid in ~80 seconds is a
# passing result here.
#
# Public interface: run with no arguments. Writes to ./out-discriminator/.
# Does NOT submit anything.
#
# Owner context: docs/work/adr-279-chord-writer-packaging.

set -euo pipefail

OUT="$(cd "$(dirname "$0")" && pwd)/out-discriminator"
WORK="$OUT/.work"
ZIP_PASSWORD="notary-fixture"
STUB_COUNT=11001
DIR_COUNT=113
BIG_MB=60

rm -rf "$OUT"
mkdir -p "$WORK"

report() {
  printf '%-14s %7s  %s\n' "$2" \
    "$(du -h "$1" | cut -f1)" \
    "$(shasum -a 256 "$1" | cut -d' ' -f1)"
}

# ---- H-enc-stub -----------------------------------------------------------
# Byte-identical content to A-control, which was answered in ~79 seconds.
echo "Building H-enc-stub (stubs, encrypted inner zip)..."
STUB_BODY='// inert fixture stub. no code, no executable bit, no Mach-O.'
base="$WORK/h/node_modules"
per_dir=$(( (STUB_COUNT + DIR_COUNT - 1) / DIR_COUNT ))
written=0; d=0
while [ "$written" -lt "$STUB_COUNT" ]; do
  pkgdir="$base/pkg-$d/dist"
  mkdir -p "$pkgdir"
  i=0
  while [ "$i" -lt "$per_dir" ] && [ "$written" -lt "$STUB_COUNT" ]; do
    printf '%s\n' "$STUB_BODY" > "$pkgdir/mod-$i.js"
    i=$(( i + 1 )); written=$(( written + 1 ))
  done
  d=$(( d + 1 ))
done
mkdir -p "$WORK/h-enc"
( cd "$WORK/h" && zip -q -r -P "$ZIP_PASSWORD" "$WORK/h-enc/stubs-inner.zip" node_modules )
( cd "$WORK" && ditto -c -k --keepParent h-enc "$OUT/H-enc-stub.zip" )
report "$OUT/H-enc-stub.zip" "H-enc-stub"

# ---- I-big-stub -----------------------------------------------------------
# High-entropy payload so the archive does not compress, matching
# G-encrypted's ~60MB on the wire without using encryption to get there.
echo "Building I-big-stub (${BIG_MB}MB high-entropy, plain)..."
bigdir="$WORK/i/payload"
mkdir -p "$bigdir"
n=0
while [ "$n" -lt "$BIG_MB" ]; do
  dd if=/dev/urandom of="$bigdir/blob-$n.bin" bs=1048576 count=1 status=none
  n=$(( n + 1 ))
done
( cd "$WORK/i" && ditto -c -k --keepParent payload "$OUT/I-big-stub.zip" )
report "$OUT/I-big-stub.zip" "I-big-stub"

rm -rf "$WORK"

cat <<INSTRUCTIONS

Fixtures in $OUT
Inner-zip password: $ZIP_PASSWORD

  xcrun notarytool submit out-discriminator/H-enc-stub.zip --keychain-profile dc-notary
  xcrun notarytool submit out-discriminator/I-big-stub.zip --keychain-profile dc-notary

Reading the outcome (terminal vs hung; Invalid IS terminal):

  H hangs                the encrypted-archive FORMAT is itself a trigger.
                         G-encrypted then says nothing about devkit, and the
                         thread-710738 technique is unusable here for a reason
                         unrelated to our content.

  H terminal, I hangs    size and/or incompressibility at ~60MB is the trigger.
                         Note this sits against node.zip (108MB, Accepted in
                         44s, 2026-08-12) -- so if I hangs, resubmit a large
                         COMPRESSIBLE fixture to separate size from entropy.

  H terminal, I terminal both explanations die. The trigger is specific to the
                         devkit bytes and survives encryption, which no simple
                         model accounts for. That result would be the most
                         important one of the whole investigation.

INSTRUCTIONS
