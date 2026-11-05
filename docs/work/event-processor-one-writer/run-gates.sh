#!/bin/bash
# run-gates.sh — capture every event-processor-one-writer gate's raw output into one directory.
#
# Usage: bash docs/work/event-processor-one-writer/run-gates.sh <out-dir>
# Run from the repo root after `./repokit build dungeo`. Each gate writes
# <out-dir>/<gate>.txt plus <out-dir>/<gate>.exit holding its exit code.
# compare-gates.sh diffs two such directories. Nothing here retries.
set -u
OUT="$1"
mkdir -p "$OUT"
cd "$(dirname "$0")/../../.."

run() {
  name="$1"; shift
  echo "== $name: $*"
  "$@" > "$OUT/$name.txt"
  echo $? > "$OUT/$name.exit"
}

run dungeo-chain node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
run dungeo-unit  node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript
run tree-secret-letter ./sharpee test branch-stories/secret-letter
run tree-fernhill      ./sharpee test branch-stories/fernhill
run tree-ides-of-march ./sharpee test branch-stories/ides-of-march

for pkg in core engine stdlib world-model story-loader chord character parser-en-us lang-en-us \
           transcript-tester devkit branch-tester event-processor channel-service if-domain media \
           helpers queries plugins bootstrap world-index; do
  run "suite-$pkg" pnpm --filter "@sharpee/$pkg" test:ci
done
# The test-file typecheck legs for the packages whose tests this plan edits:
# vitest and the root tsc do not type-check test files, so a new test-file type
# error would pass every other gate. Each leg is held to its baseline capture,
# not to zero.
for pkg in event-processor stdlib world-model; do
  run "typecheck-tests-$pkg" pnpm --filter "@sharpee/$pkg" typecheck:tests
done
echo "done: $OUT"
