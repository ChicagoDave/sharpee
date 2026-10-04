# Objective: Author narrative testing holds at story scale

**Status**: ACTIVE
**Origin**: internal initiative — the author testing narrative David had written on 2026-09-26 (session e9f1df), set as an objective on 2026-09-29 because sessions kept drifting off it
**Date**: 2026-09-29
**Session**: e31b07

The narrative (`docs/work/testing-narrative/narrative-20260926-author-testing.md`) tells one author's afternoon writing and testing a Chord story: the first rooms, pinning the prose, writing a rule and watching it test itself, playing through and branching, endings, reading the three coverage numbers with every gap listed by span, the conversations never played answered by the derived tier, one gesture running everything (Testing tab and `sharpee test` alike, failures exit non-zero, skips and unreached endings never do), and never transcribing a rule, committing a generated test, maintaining a walkthrough for the tool, or wondering whether a test is silently missing. It was written against fernhill, which is small enough to hide scale problems. This objective holds the whole experience to a story large enough to expose them.

## Outcomes

### O-1: The afternoon holds at story scale
- **Becomes true**: A story David invents and writes himself, with 60 rooms, 5 or more open spaces with transitions between them, 30 objects and 10 puzzles, is tested end to end in Chord Writer and the CLI, and every beat of the narrative holds on it as written — pinned prose, rules that test themselves, forking and replay, endings, the three coverage numbers with every gap listed, the unplayed conversations, and a test tree whose diffs are reviewable — without David hand-writing a test file or working around the tester. The story is written and tested one room at a time, as if it were being written for real: each room is added and then tested in Chord Writer and the CLI before the next room is started, so the 60-room end state is what that loop arrives at, not a finished story tested afterward (David, 2026-10-03).
- **By when**: 2026-10-15
- **Because**: it decides whether Chord Writer's testing is ready to put in front of outside authors.
- **Falsified when**: any narrative beat, not ruled out of scope by David, fails or cannot be exercised on the new story — for example the tester reports a failure that is its own fault (as the Tobias rows once did), the test tree is not reviewable as a diff, a coverage gap goes unlisted, or David must write or fix a test by hand. It is also falsified when a room cannot be tested at the point it is added, or testing it means going back to rework the tests of rooms already written. The story not being written by 2026-10-15 also counts as a miss.
- **Baseline**: (captured 2026-09-29) no story of this size exists or is being written; 10 of the 15 rows in the narrative's closing table are shipped (walked by `scripts/__tests__/narrative-*.test.ts` or IDE-only), with the other five partial (arranging beyond the floor), unplanned (effect-less bodies), accepted with no code (segmented test tree, ADR-355), not an author surface (the explorer lenses), or a cursory draft (testing navigation, ADR-308); scale has been exercised only on secret-letter, at 392 of 721 branches, whose test tree is a single 783,119-byte, 1,470-card file rewritten whole on every edit.
- **Evidence source**: (1) the CLI — `sharpee test <new story>`'s report (exit code, the three coverage ratios, gaps listed) and the `narrative-*.test.ts` suites re-pointed at the new story alongside fernhill; (2) David playing the afternoon in Chord Writer for the IDE-only beats (World tab, fork outline, derived rows in the Testing tab, span links); (3) the story's history, which shows room-sized steps, each with its tests passing at that step, not a single test pass at the end.
- **Cadence**: checkpoints on 2026-10-06 and 2026-10-13 — whatever of the story exists is run through both sources and the closing table is re-counted against the 10-of-15 baseline.
- **Progress**: (2026-10-02) 11 of 15 — the segmented test tree shipped and merged to main (`43e851807`); arranging beyond the floor still partial (occurrence ordinals unbuilt), effect-less bodies unplanned, the explorer lenses still developer CLIs, testing navigation still a cursory draft (ADR-308). No story of the objective's size exists yet.
- **Scope rulings**: (2026-10-03, David, session 4d81b6; plan Phase 2, gate G1) each of the four open rows is IN or OUT for O-1. A DEFERRED row is out of scope for O-1 and stays on the roadmap after it.
  - Explorer lenses: DEFERRED. They stay developer tools (`tools/explorer-probe/lens-examinable.js`, `lens-declared-state.js`); no author surface before 2026-10-15.
  - Effect-less bodies and command-none conversation rows: DEFERRED. They stay listed by name as SKIPPED (`packages/branch-tester/src/derived-runner.ts`), which already satisfies the "no coverage gap goes unlisted" falsifier; the new tier or mapping and its ADR-356 amendment come after O-1.
  - Occurrence ordinals: IN. The derived tier tests only a rule's first firing today (`derived-runner.ts`, the `ordinal` case returns the `occurrence` SKIPPED shape for any later firing); arranging later firings closes the "arranging beyond the floor" row (plan Phase 7, a `packages/branch-tester` change).
  - Testing navigation: IN. The open-questions interview (ADR-357, which superseded ADR-308 on 2026-10-03) by about 2026-10-07, then one navigation aid in the Testing surface before 2026-10-15 (plan Phases 5 and 6).
  - Rows counted for O-1 after these rulings: 13 (15 less the two deferred). 11 shipped, 2 to build (occurrence ordinals, testing navigation).
- **Grade**: GREEN
- **Status**: ACTIVE

## Spawned work
- docs/work/archive/segmented-test-tree/plan-20260929-adr-355.md (DONE 2026-09-30)
- docs/work/author-narrative-testing/plan-20261002-remaining-rows.md (ACTIVE 2026-10-02)
