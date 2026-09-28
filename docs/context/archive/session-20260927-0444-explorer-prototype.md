# Session Summary: 2026-09-27 - explorer-prototype

## Goals
- Talk through GH #532 and GH #530 against the author-perspective narrative (`docs/work/testing-explorer/narrative-20260926-author-testing.md`) and fix what turns out to be the tester's to fix.
- Carry forward whatever David rules on in the discussion.

## Phase Context
- **Plan**: `docs/work/testing-explorer/plan-20260926-524-derived-wire.md` (GH #524) — already **DONE** as of session af676c (2026-09-27), all three phases closed; this session did not touch it.
- **Phase executed**: none — no plan phase was CURRENT this session. The work was a targeted defect review (GH #530, GH #532) against the narrative doc, not plan-tracked.
- **Tool calls used**: 69 / no budget set (tier unassigned this session).
- **Phase outcome**: N/A — no phase in play.

## Completed

### GH #530 resolved as a tester defect, and closed
David's ruling in conversation: the test's job is to set up everything the rule needs; if the tester didn't fully arrange state, that's the tester's defect, not a question for him. The derived runner placed the player beside Tobias but left the boiler in its shed and the locket nowhere — the parser resolves an entity topic against what the player can see, so both rows read the generic shrug and were misread as a platform defect (GH #242).

- `packages/branch-tester/src/derived-runner.ts` (`planBranch`): a fourth implicit arrange term. For an `ask` branch whose topic filter is an entity, a `with-player` term for that entity is appended after `player-to-subject`, unless an explicit precondition already places it or puts it in the player's inventory. Header paragraph updated ("Three implicit arrange terms" → "Four").
- `packages/branch-tester/tests/fixtures/derived/reach.story`: the cook gains `about the rope: phrase rope-talk` (rope starts in the Hall, cook in the Pantry); header comment updated; `define phrase rope-talk` added.
- `packages/branch-tester/tests/derived-plan.test.ts` +2: an entity-topic branch brings the topic entity to the player's room after placing the player; a text-topic branch places only the player.
- `packages/branch-tester/tests/derived-runner.test.ts` +1 outcome row ('cook · topic rope': passed) with assertions that `arranged = [player.location = X, rope.location = X]` (same X) and the emitted `rope-talk` claim passed.
- Closed GH #530 via `issues.sh close 530 "done — packages/branch-tester/src/derived-runner.ts ..." completed`, citing the fix file and the fernhill re-run (exit 0, 33/63 exercised, 0 failed). GH #242 commented (2026-09-27), narrowed to the remaining question of whether the story syntax should surface entity-topic scope visibly — that question stays open on #242, unresolved by this fix.

### Narrative doc and suites flipped to fernhill's green state
- `docs/work/testing-explorer/narrative-20260926-author-testing.md`: the Tobias beat rewritten as "The conversation you never played"; a now-false sentence removed; closing table updated; header notes a third correction dated 2026-09-27.
- `scripts/__tests__/narrative-unexpected-failure.test.ts`: rows now read passed, `arranged` includes `<entity>.location = <player's room>`, no failure line, exit 0; header rewritten with the correction history.
- `scripts/__tests__/narrative-coverage-numbers.test.ts`: 33 passed / 0 failed.
- `scripts/__tests__/narrative-what-runs-when.test.ts`: fernhill is now the exit-0 case; devkit's `fixtures/derived-fail` is the exit-1 case, asserting `Derived failures: 1`.
- `scripts/__tests__/narrative-rule-tests-itself.test.ts`: real story exit 0, mutated (deleted-effect) copy still exit 1.

### GH #532 discussed, one proposal already shipped, two await go
Proposal 2 (fighting-rule beat illustrating the detection gap) had already landed in commit `557727068` last session. Proposals 1 and 3 (an ADR-356 note beside the End-to-End Scenario and AC-2; no stored baseline for the deleted-effect case) were discussed but not acted on — David has not said go.

## Key Decisions

### 1. Entity-topic scope is arranged state, not a platform gap
Whether a topic's entity is in the player's sight is part of the rule's precondition surface, same as any other reachability term the runner already arranges (`reach-subject`, `player-to-subject`, `action-preconditions`). The runner now owns arranging it. Whether the *story syntax* should make that requirement visible to an author is a separate, narrower question and stays open on GH #242.

### 2. No acknowledgement mechanism built for GH #530's general question
GH #530 also asked a broader question: is there any way to acknowledge a derived failure that genuinely traces to a platform defect, short of silencing the whole tier? Nothing was built — there's no live instance of that case right now, and ADR-356 D5a already rejected "report only" and "opt-in flag" as tier-wide escape hatches. If it's ever wanted, the tree document (with xfail semantics) is the natural home, per the ADR-321 D22 pattern. Left as a decision for David to raise if it recurs, not something this session resolved.

## Next Phase
No active plan. The natural next-session focus is GH #525 (arrange shapes to build next, ranked by SKIPPED count) — fernhill sits at 33/63 branches exercised, and its SKIPPED list (see `Not exercised` in `./sharpee test branch-stories/fernhill` output) is the ranked backlog.

## Open Items

### Short Term
- 242: Entity topics silently fall through to the generic ask reply when the topic entity is out of scope — narrowed 2026-09-27; the derived tier no longer misreports this as red, but whether story syntax should surface entity-topic scope remains open.
- 525: Next arrange shapes to build, ranked by secret-letter's SKIPPED count.

### Long Term
- 532: ADR-356's "delete the move line and exactly that test fails" scenario isn't reproducible through `sharpee test` — the derived tier can't detect a deleted effect by construction. Proposal 2 shipped (557727068); proposals 1 and 3 await go.
- 531: ADR-321 D6a (suppression is source, not sidecar) is contradicted by its own D22 (world-ignore.json), with no note beside D6a — awaiting go.
- 533: State-pin failure messages name engine ids, not entity names — awaiting go (platform change).

## Files Modified

**Fix + tests** (4 files):
- `packages/branch-tester/src/derived-runner.ts` - fourth implicit arrange term (`with-player` for an ask branch's entity topic)
- `packages/branch-tester/tests/fixtures/derived/reach.story` - cook/rope topic fixture
- `packages/branch-tester/tests/derived-plan.test.ts` - +2 tests
- `packages/branch-tester/tests/derived-runner.test.ts` - +1 outcome row

**Narrative suite flips to fernhill's green state** (4 files):
- `scripts/__tests__/narrative-unexpected-failure.test.ts`
- `scripts/__tests__/narrative-coverage-numbers.test.ts`
- `scripts/__tests__/narrative-what-runs-when.test.ts`
- `scripts/__tests__/narrative-rule-tests-itself.test.ts`

**Narrative doc** (1 file):
- `docs/work/testing-explorer/narrative-20260926-author-testing.md` - Tobias beat rewritten, closing table updated

**Pre-existing dirt, not this session's work** (1 file):
- `docs/context/session-20260927-0304-explorer-prototype.md` - hook-appended activity log from the prior session, present in the session's dirty baseline

## Notes

**Session duration**: ~1.5 hours (04:44–06:10 CDT).

**Approach**: Discussion-first — walked GH #532 and #530 against the narrative doc, got David's ruling that a tester setup gap is the tester's defect, then fixed the one mechanism (the missing implicit arrange term) rather than treating it as two separate problems.

---

## Session Metadata

- **Session**: 9a49c3
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (source + test changes only, no schema/migration, nothing merged to main)

## Dependency/Prerequisite Check

None — this session diagnosed and fixed a defect already surfaced by prior sessions' fixtures; no new prerequisite was needed or discovered.

## Architectural Decisions

None this session. ADR-356 D5a (derived-tier failure semantics) and ADR-321 D6a/D22 (suppression pattern) were referenced in discussion but neither was written nor amended.

## Mutation Audit

- Files with state-changing logic modified: `packages/branch-tester/src/derived-runner.ts` (`planBranch` — builds the arrange-term list the tree-walker uses to mutate world state before a derived branch runs).
- Tests verify actual state mutations (not just events): YES (evidence: `pnpm --filter '@sharpee/branch-tester' exec vitest run tests/derived-plan.test.ts tests/derived-runner.test.ts` → 25 passing, run fresh 2026-09-27 06:08 CDT, after the last edit to these files 2026-09-27 10:26 UTC; `derived-runner.test.ts`'s new row asserts `arranged = [player.location = X, rope.location = X]` on the same X, not just that the claim event fired).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES (partial) — GH #530 already appears as a cited occurrence in the open "Recurrence: Architecture" issue (#425), which several prior sessions (through e9f1df) have been filing into. Recurrence itself is computed and filed mechanically by `recurrence-count.sh` at `/devarch:finalize`, not by this agent (ADR-0042 Decision 9) — noted here for visibility, not asserted as a fresh finding.
- Subsystem: `packages/branch-tester` derived-tier arrange logic (GH #242, #530, #532 all trace to gaps in what the runner arranges or can detect before a derived branch runs).

## Test Coverage Delta

- Tests added: 3 (2 in `derived-plan.test.ts`, 1 outcome row in `derived-runner.test.ts`); the 4 narrative-suite files had existing assertions flipped to match fernhill's green state rather than net-new tests added.
- Tests passing: `@sharpee/branch-tester` full suite — 13 files, 196 passing (evidence: `pnpm --filter '@sharpee/branch-tester' test:ci`, run fresh 2026-09-27 06:08 CDT); scripts suite — 13 files, 53 passing (evidence: `npx vitest run --config scripts/vitest.config.ts`, run fresh 2026-09-27 06:08 CDT); `@sharpee/branch-tester` build exit 0 (`pnpm --filter '@sharpee/branch-tester' build`, run fresh 2026-09-27 06:09 CDT); `./sharpee test branch-stories/fernhill` → 86 cards passing, 106 assertions, 33/63 branches exercised, 0 failed, `Tobias · topic boiler` and `Tobias · topic silver-locket` both ✓, endings 2/3, rooms 13/13, exit 0 (run fresh 2026-09-27 06:1x CDT). One transient failure during the session (a new narrative test asserted a `claims` field the derived-branch wire event doesn't carry) was reported to David per CLAUDE.md's no-auto-retry rule, he said go, the assertion was replaced with `failure === undefined`, and the suite re-ran green.
- Known untested areas: GH #525's remaining 30 unexercised branch shapes in fernhill (command-lifecycle, condition-chance, machine-state, predicate-has, and others listed in the SKIPPED output) — ranked backlog for the next session, not a gap introduced this session.

---

**Progressive update**: session completed 2026-09-27 06:10 — full-form rewrite on terminal write: GH #530 fixed (fourth implicit arrange term in derived-runner.ts) and closed via issues.sh; narrative suites and doc flipped to fernhill's green state; all test/build claims corroborated fresh (branch-tester 196 passing, scripts suite 53 passing, fernhill exit 0 86/106); GH #242 narrowed, #532/#531/#533/#525 carried forward open.

## Activity Log (auto-captured)
```
[09:45:24] BUILD: Build passed — npx tsc --noEmit; echo "EXIT: $?"
[10:26:31] EDIT: File changed via Bash — packages/branch-tester/src/derived-runner.ts
[10:26:31] EDIT: File changed via Bash — packages/branch-tester/tests/fixtures/derived/reach.story
[10:26:54] EDIT: File changed via Bash — packages/branch-tester/tests/derived-plan.test.ts
[10:26:54] EDIT: File changed via Bash — packages/branch-tester/tests/derived-runner.test.ts
[10:28:40] EDIT: File changed via Bash — docs/work/testing-explorer/narrative-20260926-author-testing.md
[10:28:40] EDIT: File changed via Bash — scripts/__tests__/narrative-coverage-numbers.test.ts
[10:28:40] EDIT: File changed via Bash — scripts/__tests__/narrative-rule-tests-itself.test.ts
[10:28:40] EDIT: File changed via Bash — scripts/__tests__/narrative-unexpected-failure.test.ts
[10:28:40] EDIT: File changed via Bash — scripts/__tests__/narrative-what-runs-when.test.ts
[10:28:48] TEST: Tests ran (status unverified) — npx vitest run --config vitest.scripts.config.ts scripts/__tests__/narrative-une
[10:28:58] TEST: Tests failed — 1 failed 1 failed 3 passed 1 failed 17 passed
[10:55:51] TEST: Tests passed — 4 passed 18 passed
[10:56:13] TEST: Tests passed — 13 passed 53 passed
[10:56:46] EDIT: File written — docs/context/session-20260927-0444-explorer-prototype.md
[11:06:07] EDIT: File changed via Bash — docs/context/session-20260927-0444-explorer-prototype.md
[11:08:47] TEST: Tests passed — 13 passed 53 passed
[11:11:17] EDIT: File written — docs/context/session-20260927-0444-explorer-prototype.md
[11:12:59] EDIT: File written — .commit-files
[11:12:59] EDIT: File written — .commit-msg
[11:13:04] GIT: Git operation — bash /Users/david/.claude/scripts/git-commit.sh --push
```
