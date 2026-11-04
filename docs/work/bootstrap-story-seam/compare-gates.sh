#!/bin/bash
# compare-gates.sh — byte-compare two run-gates.sh capture directories.
#
# Usage: bash docs/work/bootstrap-story-seam/compare-gates.sh <baseline-dir> <phase-dir>
# Transcript and tree captures are diffed after stripping wall-clock noise:
# per-block "(NNNms)" suffixes, "Duration" lines, and "Seed: ... (clock)"
# lines on transcripts that pin no seed. Vitest captures are compared on
# their summary lines only ("Test Files" and "Tests"). Prints IDENTICAL or
# DIFFERS per gate and exits 1 if any differs.
set -u
A="$1"; B="$2"
rc=0
ansi() { sed -E $'s/\x1b\\[[0-9;]*m//g' "$1"; }
strip() { ansi "$1" | sed -E 's/ \([0-9]+ms\)//g; /^ *Duration/d; /Seed: .*\(clock\)/d; /^ *Start at/d; /[0-9]+\.[0-9]s,/d; /[0-9]+\.[0-9]+s in all/d'; }
for f in "$A"/*.txt; do
  name=$(basename "$f" .txt)
  g="$B/$name.txt"
  if [ ! -f "$g" ]; then echo "MISSING   $name"; rc=1; continue; fi
  case "$name" in
    dungeo-unit)
      # The unit transcripts are not all seed-pinned: brick-explosion and
      # wave-rainbow run on a clock seed and flip an NPC-movement claim run to
      # run (shown 4× on one build, 2026-11-04), so the capture is compared on
      # its totals line, as the suites are. The chain stays a byte compare.
      sa=$(ansi "$f" | grep -E '[0-9]+ passed.*(failed|expected failures|skipped)' | tail -1)
      sb=$(ansi "$g" | grep -E '[0-9]+ passed.*(failed|expected failures|skipped)' | tail -1)
      if [ "$sa" = "$sb" ]; then echo "IDENTICAL $name  [$sb] (totals)"; else echo "DIFFERS   $name"; echo "  baseline: $sa"; echo "  phase:    $sb"; rc=1; fi ;;
    suite-*)
      sa=$(ansi "$f" | grep -E '^\s*(Test Files|Tests) '); sb=$(ansi "$g" | grep -E '^\s*(Test Files|Tests) ')
      if [ "$sa" = "$sb" ]; then echo "IDENTICAL $name  [$(echo "$sb" | tr -s ' \n' ' ')]"; else echo "DIFFERS   $name"; echo "  baseline: $sa"; echo "  phase:    $sb"; rc=1; fi ;;
    *)
      if diff -q <(strip "$f") <(strip "$g") > /dev/null; then echo "IDENTICAL $name"; else echo "DIFFERS   $name"; diff <(strip "$f") <(strip "$g") | head -20; rc=1; fi ;;
  esac
  ea=$(cat "$A/$name.exit"); eb=$(cat "$B/$name.exit" 2>/dev/null || echo "?")
  [ "$ea" != "$eb" ] && { echo "  exit code: baseline $ea, phase $eb"; rc=1; }
done
exit $rc
