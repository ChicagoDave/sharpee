# Session Summary: 2026-09-26 - explorer-prototype

## Goals
- Recap and session start (audit relayed, gate cleared, core concepts read).
- Correct the stale Rollback Safety line in the previous session summary and commit it.
- Answer "where are we" on the Chord/IDE testing rebuild from the ADRs, plans, code, and open issues.
- Plan and land GH #524 Phase 1 (derived rule-test outcomes on the run-event wire), then, on David's ruling, build a CLI-spawning test suite that proves the author-perspective narrative.

## Phase Context
- **Plan**: `docs/work/testing-explorer/plan-20260926-narrative-walk.md` — "a CLI-spawning test suite that walks the author narrative." **Plan Status: DONE** (all four phases DONE, stamped 2026-09-26 in the plan itself; the plan records "the plan directory stays in place — archiving is a human decision," so this write does not run `plan-archive.sh`).
- **Phase executed**: all four phases of the narrative-walk plan, in one session (Phase 1: static beats; Phase 2: the fighting-rule beat; Phase 3: playing-through, endings, what-runs-when, rule-tests-itself; Phase 4: closing the open decisions).
- **Tool calls used**: 424 / 250 budget (session state, `.session-state-e9f1df.json`) — ran well over the Medium tier's budget; rule 17's 90% and 100% budget banners fired mid-Phase-1 of the earlier #524 plan and were acknowledged in-session (David said to keep going into the narrative-walk plan).
- **Phase outcome**: Ran over budget, completed all four phases.
- A second plan, `docs/work/testing-explorer/plan-20260926-524-derived-wire.md`, remains open with Phase 1 DONE this session and Phases 2-3 pending; it is stamped `**Superseded by**: plan-20260926-narrative-walk.md` per rule 18b ("still live" — David's ruling), not archived.
- No proposal item ids (`P-n`) were cited by either plan this session.

## Completed

### Previous session's Rollback Safety correction
- `docs/context/session-20260926-0235-explorer-prototype.md`'s Rollback Safety line corrected (the work had been pushed as 36b35cba8, not left uncommitted). Committed as `40f4db7d1` (not pushed).

### Testing-rebuild status assessment
- Delivered to David: ADR-340, ADR-307, ADR-353 D1-D3, and all of ADR-356 shipped on the CLI side; ADR-355 (segmentation) accepted with no code; the IDE Testing tab does not yet see derived outcomes or the three coverage ratios (GH #524, open); `arrange()` covers only the floor (GH #525, open).

### #524 plan and Phase 1 (uncommitted)
- Plan written by `session-planner`: `docs/work/testing-explorer/plan-20260926-524-derived-wire.md` (3 phases). Corrected the ask in-plan: the run-event stream has no native (Swift/C#) target — ADR-352 generates protocol types, not this event's decode path — so Phase 1 is TypeScript only.
- Testing-pane mock published for alignment ahead of Phase 2: https://claude.ai/artifact/FgCKuk41qBkFzUBkpiKiCQ (two artboards, built from a real `sharpee test branch-stories/fernhill` run on 2026-09-26).
- **Phase 1 DONE** (David's "go"): `derived-branch`/`derived-summary` run events added to `packages/ide-protocol/src/run-events.ts`; `RunEventStream.derivedBranch`/`derivedSummary` in `packages/transcript-tester/src/run-event-stream.ts`; `streamableDerivedOutcome`/`streamableDerivedSummary` mappers in `packages/branch-tester/src/coverage.ts` (amendment A1); devkit's derived tier (`test-derived.ts`, `test-tree-document.ts`) now emits through the tree command's stream.
- Suite counts, re-run fresh for this write (2026-09-26, after the session's last edit to each package): `pnpm --filter '@sharpee/branch-tester' test` → 13 files, **194 passed** (Start 18:52:50, Duration 2.47s); `npx vitest run --root packages/ide-protocol` → 5 files, **53 passed** (Start 18:53:30, Duration 429ms). `transcript-tester` 28 files/**351 passed** and `devkit` 30 files/**189 passed** (1 skipped) corroborated from the session event log, both timestamped after the last edit to their respective source: `docs/context/.devarch-events-e9f1df.jsonl` rows `{"ts":"2026-09-26T20:36:34Z",...,"detail":"28 passed 351 passed"}` and `{"ts":"2026-09-26T20:47:34Z",...,"detail":"30 passed 189 passed"}`.
- Mutation verification: clean (agent run logged at `2026-09-26T20:47:35Z`).
- Pre-existing, untouched: 13 tsc errors in `packages/transcript-tester/tests/run-observer.test.ts` (GH #401's class — "Test files are typechecked by nothing").

### Author-perspective narrative
- Written at David's request: `docs/work/testing-explorer/narrative-20260926-author-testing.md` (fernhill as the story; closes with a shipped/planned table per beat).
- Review surfaced seven findings; three filed as GitHub issues (confirmed open in the issue store as of this write): **#529** "Derived runner skips room entry/leave clauses as command-lifecycle, but a direction is a typed command"; **#530** "A derived failure caused by a platform defect fails the author's build with no way to acknowledge it"; **#531** "ADR-321 D6a (suppression is source, not sidecar) is contradicted by its own D22 (world-ignore.json), with no note beside D6a."
- #524 plan corrected: Phase 2 item 3 had assumed an existing jump-to-source click-through that does not exist (verified: the surface posts only `testingSurface`/`testingConsole`); the plan now adds an `openSource { file, line }` host message handled by both native heads (SharpeeIDE, PaneHost), widening Phase 3.

### David's ruling and the narrative-walk plan (all four phases DONE, uncommitted)
- David: "we need a valid suite of tests from the CLI that walks the narrative" — the narrative becomes the specification; a real-path suite under `scripts/__tests__/` spawning the built `packages/devkit/dist/cli.js` (via `./sharpee`) against real `branch-stories/fernhill` comes before further Testing-tab work.
- **Phase 1 DONE**: `scripts/__tests__/support/fernhill-run.ts` plus five test files (world tab, pinned prose, coverage numbers, unexpected failure, support) — 18 cases. Two narrative sentences corrected from what the suite proved (gatepost's actual source line; the Gravel Drive card pins the name only).
- **Phase 2 DONE**: the beat became a planted fighting rule (`on every turn while the vine is fruiting / move the silver locket to the Cellar`) on a scratch copy under the OS temp directory (real story read, never written). Exactly one derived row fails (`vine · on pruning · when flowering`) and the tree fails at the card that takes the locket. Second finding, **#533**, "State-pin failure messages name engine ids, not entity names" (open) — asserted as-is with a flip-rule comment.
- **Phase 3 DONE**: playing-through (11 lines, the Folly's three-way fork confirmed via `parent` fields on `transcript-start`, 86 commands total, two-spawn determinism) and endings (END STATE cards for `fernhill-saved` and `fuse-blast` read via `command-result.assertionResults`; a line that stops short fails naming the ending; a removed END STATE card produces a gap, not a failure — narrative corrected to match). `narrative-what-runs-when.test.ts` green (5 cases: exit 1 on fernhill, exit 0 on devkit's SKIPPED fixture, exit 2 for refused/malformed/missing tree documents). `narrative-rule-tests-itself.test.ts` documents a real divergence from ADR-356's own worked example rather than reproducing it: deleting the vine's `move the silver locket` line does **not** fail the flowering branch, because the derived tier derives its claim from the same compiled IR the deletion also changed — the claim vanishes with the line it would have tested. Filed as **#532**, "ADR-356's 'delete the move line and exactly that test fails' scenario is not reproducible through `sharpee test`" (open; the plan's own header comment records this as the *reason* Phase 2 uses a fighting rule instead of a deletion).
- **Phase 4 DONE; narrative-walk plan DONE.** Open decisions closed: the suite folds into the existing `pnpm test:scripts` glob (no config change needed); the narrative's shipped/planned table names each beat's test file and marks IDE-only surfaces.
- Final suite state, corroborated from the session event log: repo-level suite **13 files, 52 passed**, 2.7s (`2026-09-26T23:44:24Z`, after the session's last edit to any of those files at `23:43:37Z`); narrative files alone **9 files, 38 passed** (`2026-09-26T23:44:46Z`), 19 real `./sharpee` spawns across the suite (session narrative — process-count detail, not independently re-verified this write). Mutation verification clean (agent run logged `2026-09-26T23:44:25Z`, nine behaviors GREEN).

## Key Decisions

### 1. #524 (wire type + Testing tab rendering) chosen over #525 (next arrange shapes)
David's call, 2026-09-26 ("proceed") — the wire gap blocks the Testing tab from showing anything the derived tier already produces, which outranked expanding `arrange()`'s coverage further.

### 2. The narrative-walk plan supersedes #524's remaining phases, but does not replace it
After Phase 1 of #524 landed, David ruled that a real-path CLI suite proving the author narrative comes first — Testing-tab rendering work should build on proven CLI behavior, not on assumptions about it. Per rule 18b, the #524 plan is stamped `Superseded by` the narrative-walk plan and left live (not archived, not marked DONE/ABANDONED) so it resumes at Phase 2 once the narrative suite exists — which it now does.

### 3. A fighting rule, not a deleted line, is the correct test for "the derived tier catches contradictions"
GH #532 documents why ADR-356's own worked example (delete an effect line, watch its test fail) is not reproducible: the derived tier's claims are compiled from the same IR the deletion mutates, so the claim disappears rather than failing. The suite instead plants a second rule that contradicts the first — this is a genuine ADR-vs-implementation finding, not a suite defect, and is asserted as such rather than routed around.

## Next Phase
Plan complete — all phases done (narrative-walk plan). The next open plan is `docs/work/testing-explorer/plan-20260926-524-derived-wire.md`, Phase 2 ("Testing tab renders derived outcomes and the three ratios"), now unblocked by the narrative suite's proof of real CLI behavior. `.current-plan` still points at the narrative-walk plan; repointing it to resume #524 Phase 2 is the next session's first step, not something this write performs (rule 18b — a plan pointer change is the main session's call, and the narrative-walk plan's own "still live" disposition already covers #524, so no further disposition question is owed).

## Open Items

### Short Term
- #524: Derived rule-test outcomes have no run-event wire type — IDE Testing tab sees only exit code + stderr (Phase 1 landed this session, uncommitted; commented with status). Phases 2-3 pending, now unblocked.
- #532: ADR-356's "delete the move line and exactly that test fails" scenario is not reproducible through `sharpee test` — the derived tier cannot detect a deleted effect by construction.
- #533: State-pin failure messages name engine ids, not entity names.
- #529: Derived runner skips room entry/leave clauses as command-lifecycle, but a direction is a typed command.
- #530: A derived failure caused by a platform defect (#242) fails the author's build with no way to acknowledge it.

### Long Term
- #525: Next arrange shapes to build, ranked by secret-letter's SKIPPED count.
- #531: ADR-321 D6a (suppression is source, not sidecar) is contradicted by its own D22 (world-ignore.json), with no note beside D6a.
- #401: Test files are typechecked by nothing — 1,574 type errors across 260 test files, zero in src (pre-existing; 13 of these are in `run-observer.test.ts`, untouched this session).

## Files Modified

**Platform packages** (7 files):
- `packages/ide-protocol/src/run-events.ts` - `derived-branch`/`derived-summary` event types
- `packages/ide-protocol/src/index.ts` - export wiring
- `packages/transcript-tester/src/run-event-stream.ts` - `RunEventStream.derivedBranch`/`derivedSummary`
- `packages/transcript-tester/src/index.ts` - export wiring
- `packages/branch-tester/src/coverage.ts` - `streamableDerivedOutcome`/`streamableDerivedSummary` mappers
- `packages/branch-tester/src/index.ts` - export wiring
- `packages/devkit/src/commands/test-derived.ts`, `test-tree-document.ts` - emit through the tree's stream

**New platform tests** (4 files):
- `packages/ide-protocol/tests/run-events-derived.test.ts`
- `packages/transcript-tester/tests/run-event-stream.test.ts`
- `packages/branch-tester/tests/derived-stream.test.ts`
- `packages/devkit/tests/test-derived.test.ts` (modified)

**Narrative-walk suite** (11 new files under `scripts/__tests__/`):
- `support/fernhill-run.ts`, `support/scratch-story.ts` - real CLI-spawn and scratch-copy helpers
- `narrative-world-tab.test.ts`, `narrative-pinned-prose.test.ts`, `narrative-coverage-numbers.test.ts`, `narrative-unexpected-failure.test.ts`, `narrative-support.test.ts` - Phase 1 (static beats)
- `narrative-rule-tests-itself.test.ts` - Phase 2/3 (fighting rule; documents GH #532, #533)
- `narrative-playing-through.test.ts`, `narrative-endings.test.ts` - Phase 3
- `narrative-what-runs-when.test.ts` - Phase 3 (exit-code table)

**Docs/plans** (3 files):
- `docs/work/testing-explorer/plan-20260926-524-derived-wire.md` - 3-phase plan, Phase 1 DONE, superseded-but-live
- `docs/work/testing-explorer/plan-20260926-narrative-walk.md` - 4-phase plan, all DONE
- `docs/work/testing-explorer/narrative-20260926-author-testing.md` - the author-perspective narrative and spec

## Notes

**Session duration**: ~6 hours (12:41-18:53 CDT local; the state file's `started` timestamp is UTC).

**Approach**: Status assessment first, then a discussed-and-approved plan for #524, then a mock for stakeholder alignment, then a narrative written from the author's chair to pressure-test the plan against real CLI behavior before touching the IDE — David's ruling elevated that narrative into its own real-path CLI test suite ahead of the IDE work it was meant to inform.

**Everything in this session except `40f4db7d1` is uncommitted** — the commit that follows this write is what lands it.

`docs/work/testing/plan-20260809-testing-surface-revamp.md` still reads ACTIVE with Phase 7 pending, surfaced by the pre-session audit; not touched this session (consistent with prior sessions treating this specific stale-plan flag as noise pending David's own review).

---

## Session Metadata

- **Session**: e9f1df
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: has orphaned artifacts pending commit — everything since `40f4db7d1` is uncommitted on `explorer-prototype`; a revert to `40f4db7d1` loses no committed history but discards all of this session's platform and test work. Safe to revert once committed.

## Dependency/Prerequisite Check

- **Prerequisites met**: `sharpee test --json`'s existing `derived-branch`/`derived-summary` emission point (Phase 1 of #524, this session) was the prerequisite the narrative-walk plan needed to observe derived outcomes from the CLI at all — confirmed present before Phase 1 of that plan started.
- **Prerequisites discovered**: none blocking; the narrative-walk plan's own real-path verification (run before phasing) discovered that `world-index`'s `incomplete` bucket for `scrollwork`/`gatepost` is `noObject`, not `missingWord` as a first guess assumed — corrected in-plan before any test asserted against the wrong bucket.

## Architectural Decisions

- None this session. ADR-356, ADR-321, ADR-307, ADR-353, ADR-355 were read and cited as references (see the narrative-walk plan's "References consulted"), not amended.
- GH #532 identifies a live contradiction between ADR-356's own worked example and the derived tier's actual construction — flagged as an issue, not resolved as an ADR amendment this session; that decision belongs to David.

## Mutation Audit

- Files with state-changing logic modified: `packages/ide-protocol/src/run-events.ts`, `packages/transcript-tester/src/run-event-stream.ts`, `packages/branch-tester/src/coverage.ts`, `packages/devkit/src/commands/test-derived.ts`, `packages/devkit/src/commands/test-tree-document.ts`.
- Tests verify actual state mutations (not just events): YES (evidence: `mutation-verification` agent runs at `2026-09-26T20:47:35Z` — clean, Phase 1 of #524 — and `2026-09-26T23:44:25Z` — clean, nine behaviors GREEN, narrative-walk suite; both per `docs/context/.devarch-events-e9f1df.jsonl`). The narrative suite's own design principle is state-mutation assertion by construction: every test spawns the real CLI and asserts on its actual stdout JSON events or exit code, never a mock.

## Recurrence Check

- Similar to past issue? NO for the two new architectural findings (#524's wire gap, #532's ADR-vs-implementation contradiction) — first occurrence of each pattern in this repository's issue history, per the issue store search performed for this write.
- #401 (test files untypechecked) is a pre-existing, previously-filed class this session did not add to (the 13 `run-observer.test.ts` errors were noted, not touched).

## Test Coverage Delta

- Tests added: 4 new platform test files (ide-protocol, transcript-tester, branch-tester, plus 1 devkit file modified) + 11 new files under `scripts/__tests__/` (9 narrative test files, 2 support helpers) = approximately 91 new test cases (18 + 11 fighting-rule + 9 playing-through/endings + 5 what-runs-when across the narrative suite, plus platform-side derived-event tests folded into the 53/351/194/189 package totals below).
- Tests passing before this session: not independently re-baselined (session started mid-stream on an existing `explorer-prototype` branch). Tests passing after, corroborated fresh for this write (2026-09-26): `ide-protocol` 53/53, `branch-tester` 194/194 (both re-run directly, evidence above); `transcript-tester` 351/351, `devkit` 189/189+1 skipped, repo-level `scripts/__tests__` suite 52/52 across 13 files (all three from the session event log, timestamped after their respective last edits).
- Known untested areas: `packages/transcript-tester/tests/run-observer.test.ts`'s 13 pre-existing tsc errors mean that file is not typechecked (GH #401); the Testing tab's rendering of derived outcomes/ratios (Phase 2-3 of #524) has no test yet — it has no implementation yet either.

---

**Progressive update**: session completed 2026-09-26 18:56 — full-form rewrite for terminal write: both plans' phase evidence re-corroborated (branch-tester and ide-protocol suites re-run fresh; transcript-tester/devkit/repo-level suites verified against the event log), Status set to COMPLETE, Session Metadata/Dependency/Architectural Decisions/Mutation Audit/Recurrence/Test Coverage Delta sections added, #524 commented with Phase-1 status.
