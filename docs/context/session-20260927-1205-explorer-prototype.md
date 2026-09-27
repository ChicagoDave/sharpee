# Session Summary: 2026-09-27 - explorer-prototype

## Goals
- GH #525 Phase 2: the arrange floor learns timer phase (ADR-356 D2 amendment) — timer-phase read in transcript-tester's assertion core, timer-phase write in story-loader's arrange(), branch-tester's derived runner stops SKIPping it, dated ADR-356 D2/Q-2 amendment note.
- Author narrative refresh at David's request (a secondary, non-code goal raised mid-session).

## Phase Context
- **Plan**: docs/work/testing-explorer-525/plan-20260927-525-arrange-shapes.md — "teach the ADR-356 derived rule-test runner the next arrange shapes, ranked by secret-letter's SKIPPED count" (GH #525).
- **Phase executed**: Phase 2 — "the arrange floor learns timer phase (ADR-356 D2 amendment)" (Large)
- **Tool calls used**: 150 / 400
- **Phase outcome**: Completed under budget

## Completed

### ADR-356 D2 arrange floor gains a timer-phase read and write
- `packages/story-loader/src/state-keys.ts`: `IDLE_TIMER_RECORD`; `evaluator.ts` uses it.
- `packages/story-loader/src/arrange.ts`: `ArrangeContext { turn? }`; new `timer-phase` case — `started` writes `{phase:'running', index:0, startedTurn:<turn>}` on an idle timer and no-ops if already started; `expired` keeps the record and flips phase; a `started` write with no `turn` supplied is refused as `unrecognized`, never guessed. Header list of non-floor shapes shrinks from four to three (`occurrence`, `topic-history`, `timer-position`).
- `packages/story-loader/src/{pin-grammar,index}.ts`: header updated; barrel exports `CHORD_TIMER_PREFIX`, `timerKey`, `TimerRecord`, `ArrangeContext`.
- `packages/transcript-tester/src/types.ts`: `StoryStateKeys.timerPrefix`. `assertion-core.ts`: `evaluateStateExpression` reads `<timer> has started|expired` (absent = idle; started = phase != idle; expired = phase == expired), landed in the shared evaluator per ADR-340 D3, not duplicated in the runner.
- `packages/branch-tester/src/runner.ts`: `keys.timerPrefix`. `derived-runner.ts`: `readPin` no longer names timer-phase unreadable; `arrange()` is now called with `{ turn: game.engine?.getContext?.().currentTurn }`. First attempt called `game.getContext()`, which does not exist on the bootstrap `LoadedGame` wrapper — caused 17 failures, fixed after David's "go" to `game.engine?.getContext?.()`.
- ADR-356: dated amendment note appended to D2/Q-2 recording that the floor now includes timer phase, the optional `{ turn }` context, `StoryStateKeys.timerPrefix`, and the undeclared-timer-vs-idle limit (below).

### Tests
- `story-loader/tests/arrange.test.ts` +6 (fixture gains `define timer bell for the player`).
- `transcript-tester/tests/claim-kinds.test.ts` +4.
- `branch-tester/tests/derived-runner.test.ts` +1 — AC-4 now pins `predicate-is` on a new `flicker is turning` smelling clause in `tests/fixtures/derived/skip.story` (kept SKIPPED on purpose, so the fixture still exercises one SKIP path); `derived-plan.test.ts` renamed; `derived-coverage.test.ts`/`derived-stream.test.ts` pins moved (3→4 declared, 2→3 exercised; gap `on smelling`/`predicate-is`, detail "a predicate over something other than a named entity").
- `packages/devkit/tests/fixtures/derived-pass/derived-skip.story` mirrored; `packages/devkit/tests/test-derived.test.ts` 4 pins.
- `scripts/__tests__/narrative-what-runs-when.test.ts` shape → `predicate-is`.

### Verification run (2026-09-27, ~12:35 CDT, fresh dist via `npx tsf build --packageList story-loader,transcript-tester,branch-tester`)
- Suites: story-loader `test:ci` 1160 passing (127 files); transcript-tester 355 passing (28 files); branch-tester 215 passing (13 files; was 214); devkit `test:ci` 189 passing (1 pre-existing unrelated skip); scripts suite 53 passing.
- `./sharpee test branch-stories/secret-letter`: 392/721 exercised (was 367). Timer-phase SKIPs 0 (was 26): 24 pass, 1 SKIPPED `negation` (banana's second guard `story.state = calm` already holds), 1 failed — `kello fruit · on taking · refused escape-no-time`, a disambiguation prompt because the display of kello fruit's `aka kello fruit` collides with the item's own name, same root cause as GH #522's pre-existing `kello fruit · after taking` failure. Derived failures 7 (was 6). Exit 1 (pre-existing GH #523 tree failure + derived failures).
- `./sharpee test branch-stories/fernhill`: 34/63, exit 0, unchanged.
- Remaining secret-letter SKIPPED shapes: command-none 90, no-claims 74, command-shape 53, subject-unreachable 51, subject-offstage 16, command-timer-expires 14, command-lifecycle 12, negation 7, condition-chance 5, occurrence 4, three singletons.
- Re-estimate before coding (2026-09-27 ~12:08 CDT): 26 timer-phase SKIPs, all `player.market-escape has started` on `refused escape-no-time` rows — the plan's re-estimate held.

### Plan and narrative
- Plan Phase 2 marked DONE with the measured outcome above; **Plan Status: DONE** (both phases). Plan directory not yet archived — `plan-archive.sh` requires a literal `plan.md`, and this repo's convention names plans `plan-YYYYMMDD-{name}.md` (this plan: `plan-20260927-525-arrange-shapes.md`), so the script would refuse with "plan.md not found." Filed as a DevArch issue (see Open Items) rather than silently renamed — renaming the plan file to force the script was not this session's call to make.
- `docs/work/archive/testing-explorer/narrative-20260926-author-testing.md` refreshed at David's request: header correction line, negation-skip wording ("arranged world") and count 3→2, fernhill 34/63, closing table updated (Testing-tab derived tier + span links shipped 2026-09-27 GH #524 Phases 2–3; arrange shapes two of four done).
- `mutation-verification` (rule 15): clean — the one new mutation (`arrangeTimerPhase`) has state-asserting tests in all three touched packages.

## Key Decisions

### 1. The caller supplies the turn; `arrange()` never guesses it
A timer start needs the current turn, which is the one fact the world itself does not hold. `arrange(world, expression, { turn })` takes it from the caller; a start that must write with no `turn` supplied is refused by name (`unrecognized`) rather than defaulted to 0 or inferred.

### 2. An undeclared timer is indistinguishable from an idle one
From the world state alone there is no way to tell "this timer was never declared" from "this timer is declared and idle." Recorded as a limit in the ADR-356 amendment note, not solved this session.

### 3. Expired-on-idle still writes
Arranging `<timer> has expired` on an idle timer writes the record straight to `expired` rather than refusing or simulating the intermediate `running` state — because arranging means making the target state hold, not replaying the interrupt that would normally produce it.

## Next Phase
Plan complete — all phases done. GH #525's own follow-ups list (`subject-unreachable` 51 rows — GH #242's scoping bug, fix that first and re-measure; `command-shape`, `subject-offstage`, `command-timer-expires`, `command-lifecycle`, `condition-chance`, `occurrence`, `negation`, three singletons — unranked; `command-none`/`no-claims` explicitly out of scope for any arrange-shape plan) is unclaimed by any current plan.

## Open Items

### Short Term
- 539: `plan-archive.sh` hardcodes `plan.md`; this repo's plans are named `plan-YYYYMMDD-{name}.md`, so every DONE/ABANDONED plan here hits the same refusal and needs a hand archive until the script or the convention changes.

### Long Term
- None filed this session.

## Files Modified

**story-loader** (6 files): `src/state-keys.ts`, `src/evaluator.ts`, `src/arrange.ts`, `src/pin-grammar.ts`, `src/index.ts`, `tests/arrange.test.ts`

**transcript-tester** (3 files): `src/types.ts`, `src/assertion-core.ts`, `tests/claim-kinds.test.ts`

**branch-tester** (7 files): `src/runner.ts`, `src/derived-runner.ts`, `tests/derived-runner.test.ts`, `tests/derived-plan.test.ts`, `tests/derived-coverage.test.ts`, `tests/derived-stream.test.ts`, `tests/fixtures/derived/skip.story`

**devkit** (2 files): `tests/test-derived.test.ts`, `tests/fixtures/derived-pass/derived-skip.story`

**scripts** (1 file): `__tests__/narrative-what-runs-when.test.ts`

**Docs** (3 files): `docs/architecture/adrs/adr-356-the-story-is-the-test-suite.md` (amendment note), `docs/work/archive/testing-explorer/narrative-20260926-author-testing.md`, `docs/work/testing-explorer-525/plan-20260927-525-arrange-shapes.md` (Phase 2 DONE, Plan Status DONE)

## Notes

**Session duration**: ~2 hours (12:06–14:15 CDT)

**Approach**: Re-estimated the expected gain before writing any code (26 rows, not the plan's original ~65 — Phase 1's measurement had already corrected this), implemented the read (transcript-tester) and write (story-loader) sides of the timer-phase floor per ADR-340 D3's shared-evaluator rule, wired the runner, then fixed a bootstrap-API mismatch (`game.getContext()` doesn't exist; `game.engine?.getContext?.()` does) found only by running the story after the first "go".

**Awaiting David, not filed anywhere else**: (1) a GH #522 comment noting that the kello-fruit `aka` alias collision now also causes the newly-exercised `refused escape-no-time` failure, same root cause as #522's existing `kello fruit · after taking` failure — not yet posted; (2) a GH #525 completion comment for Phase 2 — not yet posted; (3) hand-archiving `docs/work/testing-explorer-525/` now that Plan Status is DONE (blocked on the `plan-archive.sh` mismatch above, tracked as issue 539). None of these three are devarch-store items — #522/#525 are this project's plain GitHub issue tracker (outside the ADR-0042 ledger's scope), and the archive is blocked on tooling, not a decision.

---

## Session Metadata

- **Session**: 24d359
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 1 DONE and measured (2026-09-27); `pin-grammar.ts` already parsed `<timer> has started|expired` into `{kind:'timer-phase', timer, what}`; `conditionTerms`'s `timer-has` case already emitted that exact pin text from the IR condition's `timer` field (the same string as the pin's timer text, no name-mapping needed); `state-keys.ts` already defined `TimerRecord {phase, index, startedTurn}` at `chord.timer.<qualified>`. David's go-ahead for Phase 2 implementation obtained before coding.
- **Prerequisites discovered**: `LoadedGame`'s bootstrap wrapper exposes `game.engine?.getContext?.()`, not `game.getContext()` — discovered only via the first real run (17 failures), not documented anywhere beforehand.

## Architectural Decisions

- ADR-356 D2/Q-2: dated amendment note appended (2026-09-27, GH #525 Phase 2) — the arrange floor now includes timer phase; records the optional `{ turn }` context and the undeclared-timer-vs-idle limit as a recorded gap, not a fix. No new ADR written.
- Pattern applied: shared-evaluator rule (ADR-340 D3) — the timer-phase read lives once in `transcript-tester`'s `assertion-core.ts` and is imported by `branch-tester`, never duplicated in the runner.

## Mutation Audit

- Files with state-changing logic modified: `packages/story-loader/src/arrange.ts` (`arrangeTimerPhase`, new).
- Tests verify actual state mutations (not just events): YES (evidence: `mutation-verification` agent run this session reported clean — the new mutation has state-asserting tests in story-loader, transcript-tester, and branch-tester; corroborated further by the story-loader `arrange.test.ts` +6 assertions reading `TimerRecord` back after arrange, per the Completed section above).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — searched `issues.sh list-open` for prior mentions of `plan-archive.sh`, `plan.md` naming, or this plan's slug; none found. Filed fresh as issue 539 so a future recurrence has something to match against.

## Test Coverage Delta

- Tests added: +6 (story-loader `arrange.test.ts`), +4 (transcript-tester `claim-kinds.test.ts`), +1 (branch-tester `derived-runner.test.ts`), plus fixture/pin updates in `derived-plan.test.ts`, `derived-coverage.test.ts`, `derived-stream.test.ts`, devkit's `test-derived.test.ts` (4 pins), and `scripts/__tests__/narrative-what-runs-when.test.ts`.
- Tests passing before → after (evidence: `./sharpee` and `pnpm test:ci` runs, 2026-09-27 ~12:35 CDT, quoted above): branch-tester 214 → 215 passing (13 files); story-loader → 1160 passing (127 files); transcript-tester → 355 passing (28 files); devkit → 189 passing (1 pre-existing unrelated skip); scripts suite → 53 passing. Secret-letter derived-branch exercise count: 367/721 → 392/721; timer-phase SKIPs: 26 → 0.
- Known untested areas: the undeclared-timer-vs-idle ambiguity (Key Decision 2) has no test — it's recorded as a limit, not a gap to close.

---

**Progressive update**: session completed 2026-09-27 14:15 — revised in place for the terminal write: full-form template applied, Status stamped COMPLETE, Session Metadata / Dependency / Architectural Decisions / Mutation Audit / Recurrence Check / Test Coverage Delta sections added, Open Items ledger reconciled through `issues.sh` (filed issue 539 for the `plan-archive.sh` filename mismatch; #522/#525 follow-ups kept in Notes as plain-GitHub-tracker items outside the devarch ledger's scope).
