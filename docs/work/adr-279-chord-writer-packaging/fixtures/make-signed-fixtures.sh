#!/usr/bin/env bash
#
# make-signed-fixtures.sh — Round 4, correcting the Round 2/3 confound.
#
# Rounds 2 and 3 were void. Every fixture was rejected at an early validation
# gate with "has no signed executables or bundles. No tickets can be
# generated." — a different code path from the one that stalls. The
# 2026-08-12 bisection's stub fixtures were ACCEPTED (107-110s), so they
# contained signable code and reached the full pipeline; ours did not.
#
# The fix: every fixture carries a validly signed executable, so it clears the
# gate and reaches the stage under test. No signing identity is needed — the
# vendored `node` is Developer ID signed with a timestamp by the Node project,
# and node.zip alone was Accepted in 44 seconds on 2026-08-12.
#
# Each fixture is therefore:  payload/node  +  the one variable under test.
#
#   N-control    ordinary stub dir names        expect Accepted (validates design)
#   N-dotdir     .store/ dot-prefixed dir
#   N-plusname   @scope+name@1.2.3/ '+' encoding
#   N-both       both
#   N-devkit     the real devkit closure, Mach-O stripped
#                expect HUNG -- positive control. If this is Accepted, the
#                design does not reproduce the bug and nothing else here counts.
#
# Public interface:
#   make-signed-fixtures.sh <staged-toolchain-dir>
# Writes ./out-signed/. Does NOT submit.
#
# Owner context: docs/work/adr-279-chord-writer-packaging.

set -euo pipefail

[ $# -ge 1 ] || { echo "usage: make-signed-fixtures.sh <staged-toolchain-dir>" >&2; exit 2; }
STAGE="$1"
NODE_BIN="$STAGE/node/bin/node"
[ -f "$NODE_BIN" ] || { echo "no node/bin/node under $STAGE" >&2; exit 2; }
[ -d "$STAGE/devkit" ] || { echo "no devkit/ under $STAGE" >&2; exit 2; }

codesign -v "$NODE_BIN" 2>/dev/null || { echo "node binary fails codesign -v; aborting" >&2; exit 1; }

OUT="$(cd "$(dirname "$0")" && pwd)/out-signed"
WORK="$OUT/.work"
STUB_COUNT=2000
DIR_COUNT=40
STUB_BODY='// inert fixture stub.'

rm -rf "$OUT"
mkdir -p "$WORK"

report() {
  printf '%-14s %7s  %s\n' "$2" "$(du -h "$1" | cut -f1)" \
    "$(shasum -a 256 "$1" | cut -d' ' -f1)"
}

# stub_tree <dest-root> <container-or-empty> <pkg-pattern>
stub_tree() {
  local root="$1" container="$2" pattern="$3"
  local base="$root/node_modules"
  [ -n "$container" ] && base="$base/$container"
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
      i=$(( i + 1 )); written=$(( written + 1 ))
    done
    d=$(( d + 1 ))
  done
}

# build <name> <container-or-empty> <pattern>
build() {
  local name="$1"
  local p="$WORK/$name/payload"
  mkdir -p "$p"
  cp "$NODE_BIN" "$p/node"
  stub_tree "$p" "$2" "$3"
  ( cd "$WORK/$name" && ditto -c -k --keepParent payload "$OUT/$name.zip" )
  rm -rf "$WORK/$name"
  report "$OUT/$name.zip" "$name"
}

echo "Building signed fixtures (node + $STUB_COUNT stubs each)..."
build "N-control"   ""        "pkg-%d"
build "N-dotdir"    ".store"  "pkg-%d"
build "N-plusname"  ""        "@scope+name%d@1.2.3"
build "N-both"      ".store"  "@scope+name%d@1.2.3"

# Positive control: node + the real devkit closure, Mach-O stripped.
echo "Building N-devkit (node + real devkit closure)..."
p="$WORK/N-devkit/payload"
mkdir -p "$p"
cp "$NODE_BIN" "$p/node"
cp -R "$STAGE/devkit" "$p/devkit"
removed=0
while IFS= read -r f; do
  if file "$f" | grep -q "Mach-O"; then rm -f "$f"; removed=$(( removed + 1 )); fi
done < <(find "$p/devkit" -type f -perm +111)
echo "  stripped $removed Mach-O from devkit copy"
( cd "$WORK/N-devkit" && ditto -c -k --keepParent payload "$OUT/N-devkit.zip" )
rm -rf "$WORK"
report "$OUT/N-devkit.zip" "N-devkit"

cat <<'INSTRUCTIONS'

Submit N-devkit and N-control FIRST. They validate the design:

  N-devkit hung + N-control Accepted  -> design is sound, read the other three
  N-devkit Accepted                   -> design does not reproduce the bug;
                                         adding signed node changed the outcome,
                                         which is itself a major finding
  N-control hung                      -> everything hangs today; stop and
                                         re-test tomorrow

Then the three naming variants tell you which property, if any, matters.

Every fixture now contains a signed executable, so "Invalid: no signed
executables" cannot recur. The measure is Accepted vs HUNG.

INSTRUCTIONS
