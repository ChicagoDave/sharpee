#!/usr/bin/env bash
#
# make-fixtures.sh — notarization reproducer for DTS.
#
# Generates four zip fixtures that differ ONLY in directory naming. Every
# fixture holds byte-identical file content: 11,001 inert stub files, no
# Mach-O, no symlinks, no proprietary source. The only variable is how the
# directories containing them are named.
#
# This isolates the two properties confounded in the 2026-08-12 bisection,
# where one stub fixture (`shape.zip`, pnpm-style layout) hung while five
# other stub fixtures with identical content cleared in ~110 seconds.
#
#   A-control   node_modules/pkg-N/...              expect: Accepted (~110s)
#   B-dotdir    node_modules/.store/pkg-N/...       isolates the dot-prefix
#   C-plusname  node_modules/@scope+name@1.2.3/...  isolates the '+' encoding
#   D-both      node_modules/.store/@s+n@1.2.3/...  expect: hang (reproduces shape.zip)
#
# Public interface: run with no arguments. Writes to ./out/ and prints the
# notarytool commands to run. It does NOT submit anything.
#
# Owner context: docs/work/adr-279-chord-writer-packaging — evidence for the
# Developer ID notary investigation.

set -euo pipefail

OUT="$(cd "$(dirname "$0")" && pwd)/out"
STUB_COUNT=11001
DIR_COUNT=113

rm -rf "$OUT"
mkdir -p "$OUT"

# One stub file's content, identical everywhere. Inert text: no executable
# bit, no Mach-O header, nothing to sign.
STUB_BODY='// inert fixture stub. no code, no executable bit, no Mach-O.'

# build_fixture <name> <container-dir-name> <package-dir-pattern>
#   package-dir-pattern uses %d for the package index.
build_fixture() {
  local name="$1" container="$2" pattern="$3"
  local root="$OUT/$name"
  local base="$root/node_modules"

  if [ -n "$container" ]; then
    base="$base/$container"
  fi

  mkdir -p "$base"

  local per_dir=$(( (STUB_COUNT + DIR_COUNT - 1) / DIR_COUNT ))
  local written=0 d=0

  while [ "$written" -lt "$STUB_COUNT" ]; do
    local pkgdir
    pkgdir="$base/$(printf "$pattern" "$d")/dist"
    mkdir -p "$pkgdir"

    local i=0
    while [ "$i" -lt "$per_dir" ] && [ "$written" -lt "$STUB_COUNT" ]; do
      printf '%s\n' "$STUB_BODY" > "$pkgdir/mod-$i.js"
      i=$(( i + 1 ))
      written=$(( written + 1 ))
    done
    d=$(( d + 1 ))
  done

  # Same archiving path package.sh uses for the real app.
  ( cd "$root" && ditto -c -k --keepParent node_modules "$OUT/$name.zip" )
  rm -rf "$root"

  local files size digest
  files=$(unzip -l "$OUT/$name.zip" | tail -1 | awk '{print $2}')
  size=$(du -h "$OUT/$name.zip" | cut -f1)
  digest=$(shasum -a 256 "$OUT/$name.zip" | cut -d' ' -f1)
  printf '%-12s %6s  %6s files  %s\n' "$name" "$size" "$files" "$digest"
}

echo "Building fixtures ($STUB_COUNT stubs across $DIR_COUNT dirs each)..."
echo

build_fixture "A-control"   ""        "pkg-%d"
build_fixture "B-dotdir"    ".store"  "pkg-%d"
build_fixture "C-plusname"  ""        "@scope+name%d@1.2.3"
build_fixture "D-both"      ".store"  "@scope+name%d@1.2.3"

cat <<'INSTRUCTIONS'

Fixtures written to ./out/

Submit each one, recording the id and createdDate immediately. Do NOT use
--wait: the point is to observe which ones never reach a terminal state.

  for f in A-control B-dotdir C-plusname D-both; do
    echo "=== $f ==="
    xcrun notarytool submit "out/$f.zip" --keychain-profile dc-notary
  done

Decision rule, fixed before submitting (same rule as the 2026-08-12
bisection): still In Progress at 10 minutes counts as hung.

Then poll, and keep polling daily — the 2026-08-12 hung submissions were
deleted from history between 21 and 26 hours after submission, so record the
date each id stops resolving:

  xcrun notarytool info <id> --keychain-profile dc-notary

Expected, if the pnpm-naming hypothesis holds:
  A-control   Accepted in ~110s
  D-both      hangs (reproduces shape.zip)
  B and C     whichever hangs names the responsible property

If A, B, and C all clear and only D hangs, the trigger needs BOTH properties
together, which is a sharper finding than either alone.

INSTRUCTIONS
