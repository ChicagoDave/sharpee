# Objective: Author narrative testing holds at story scale

**Status**: ACTIVE
**Origin**: internal initiative — the author testing narrative David had written on 2026-09-26 (session e9f1df), set as an objective on 2026-09-29 because sessions kept drifting off it
**Date**: 2026-09-29
**Session**: e31b07

The narrative (`docs/work/testing-narrative/narrative-20260926-author-testing.md`) tells one author's afternoon writing and testing a Chord story: the first rooms, pinning the prose, writing a rule and watching it test itself, playing through and branching, endings, reading the three coverage numbers with every gap listed by span, the conversations never played answered by the derived tier, one gesture running everything (Testing tab and `sharpee test` alike, failures exit non-zero, skips and unreached endings never do), and never transcribing a rule, committing a generated test, maintaining a walkthrough for the tool, or wondering whether a test is silently missing. It was written against fernhill, which is small enough to hide scale problems. This objective holds the whole experience to a story large enough to expose them.

## Outcomes

### O-1: The afternoon holds at story scale
- **Becomes true**: A story David invents and writes himself, with 60 rooms, 5 or more open spaces with transitions between them, 30 objects and 10 puzzles, is tested end to end in Chord Writer and the CLI, and every beat of the narrative holds on it as written — pinned prose, rules that test themselves, forking and replay, endings, the three coverage numbers with every gap listed, the unplayed conversations, and a test tree whose diffs are reviewable — without David hand-writing a test file or working around the tester.
- **By when**: 2026-10-15
- **Because**: it decides whether Chord Writer's testing is ready to put in front of outside authors.
- **Falsified when**: any narrative beat, not ruled out of scope by David, fails or cannot be exercised on the new story — for example the tester reports a failure that is its own fault (as the Tobias rows once did), the test tree is not reviewable as a diff, a coverage gap goes unlisted, or David must write or fix a test by hand. The story not being written by 2026-10-15 also counts as a miss.
- **Baseline**: (captured 2026-09-29) no story of this size exists or is being written; 10 of the 15 rows in the narrative's closing table are shipped (walked by `scripts/__tests__/narrative-*.test.ts` or IDE-only), with the other five partial (arranging beyond the floor), unplanned (effect-less bodies), accepted with no code (segmented test tree, ADR-355), not an author surface (the explorer lenses), or a cursory draft (testing navigation, ADR-308); scale has been exercised only on secret-letter, at 392 of 721 branches, whose test tree is a single 783,119-byte, 1,470-card file rewritten whole on every edit.
- **Evidence source**: (1) the CLI — `sharpee test <new story>`'s report (exit code, the three coverage ratios, gaps listed) and the `narrative-*.test.ts` suites re-pointed at the new story alongside fernhill; (2) David playing the afternoon in Chord Writer for the IDE-only beats (World tab, fork outline, derived rows in the Testing tab, span links).
- **Cadence**: checkpoints on 2026-10-06 and 2026-10-13 — whatever of the story exists is run through both sources and the closing table is re-counted against the 10-of-15 baseline.
- **Grade**: GREEN
- **Status**: ACTIVE

## Spawned work
- docs/work/archive/segmented-test-tree/plan-20260929-adr-355.md (DONE 2026-09-30)
