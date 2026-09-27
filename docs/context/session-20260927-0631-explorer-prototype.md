# Session Summary: 2026-09-27 - explorer-prototype

## Goals
- Archive the DONE GH #524 plan (and the rest of the all-DONE `docs/work/testing-explorer/` directory) and release the plan pointer.
- Scope GH #525 (next arrange shapes for the ADR-356 derived runner) from a fresh measurement, then plan it.
- Implement Phase 1 of the resulting plan (branch-tester's derived-runner arrange composition).

## Phase Context
- **Plan**: `docs/work/testing-explorer-525/plan-20260927-525-arrange-shapes.md` (GH #525) — teach the ADR-356 derived rule-test runner the next arrange shapes, ranked by secret-letter's SKIPPED count.
- **Phase executed**: Phase 1 — "branch-tester's derived runner learns named-condition expansion, the or-must-hold witness, and the and-must-fail two-pass check" (Medium)
- **Tool calls used**: 160 / 250
- **Phase outcome**: Completed under budget, plus two pre-existing ordering defects fixed as a byproduct.

## Completed

### Archive and re-point
- Archived `docs/work/testing-explorer/` → `docs/work/archive/testing-explorer/` (git mv; all eight plans there were DONE; only prose citations reference the old path). `plan-archive.sh` refused because it expects `plan.md` and this repo names plans by date, so the move and pointer release were done by hand; `.current-plan` was then re-pointed by `session-planner` to the new plan.
- Re-measured both stories (2026-09-27 ~06:30 CDT): secret-letter 358/721 exercised, 12 failed, 363 SKIPPED; fernhill 33/63 — unchanged from the first-cut plan's numbers, confirming GH #525's ranking was still current before scoping.

### GH #525 scoping and planning
- Read `packages/branch-tester/src/derived-runner.ts`, `packages/story-loader/src/arrange.ts`, the pin grammar, the assertion core, and the IR condition types to size each SKIPPED shape.
- David said "go" on a two-phase plan; `session-planner` wrote `docs/work/testing-explorer-525/plan-20260927-525-arrange-shapes.md`.

### Phase 1 implementation
- `packages/branch-tester/src/derived-runner.ts`: `conditionTerms` now takes a `ConditionScope` (`ir`, `subject`, `reading`, `expanding`); named conditions expand from `ir.conditions` with `it` bound to the subject (unknown name / self-reference → SKIP `condition-condition`); an `or` that must hold is arranged by its leftmost floor-mappable operand; an `and` that must fail is a new `some-fails` `ArrangeTerm`, read after every write. `runDerivedBranch`'s arrange is now two passes: writes in plan order (with `with-player` must-hold writes last), then checks resolved against the settled world (`readPin`, `termHolds`, `describeTerms`). The negation detail line now reads "already holds in the arranged world".
- The two-pass restructure exposed and fixed two pre-existing ordering defects: a `here` write resolved against the boot room before the player moved to the subject, and a `here` must-not-hold check resolved before the player moved. These cleared 7 of GH #522's 12 secret-letter failures (five cable `refused merc-held` rows and both `cable-taut-monkey` rows).
- New fixture `packages/branch-tester/tests/fixtures/derived/compose.story` (bell/lamp/gong/cat). Two fixture defects surfaced while writing it — a declared state named `dark` shadowed by the room-darkness built-in, and `lit`/`unlit` rejected by the analyzer — each reported to David per CLAUDE.md's no-auto-retry rule before fixing; final state names are `cold`/`warm`.
- Filed GH #537 (Chord: a declared state named `dark` on a non-room compiles, but `is dark` reads room darkness, never the declared state) and GH #538 (derived runner: `the player is in <region>` is read as `player.location = <region>`, which never matches a room — the last remaining secret-letter derived failure).
- `scripts/__tests__/narrative-rule-tests-itself.test.ts` regex updated to match "arranged world". `scripts/__tests__/narrative-coverage-numbers.test.ts` pin moved from 33/63 to 34/63.

## Key Decisions

### 1. `or`-must-hold witness: leftmost floor-mappable operand
Chosen as a stated rule, not a guess, and documented as a header comment on `conditionTerms`. Rejected alternative: one enumerated leaf per operand, which would change ADR-356 D1's one-test-per-clause-branch denominator — out of this plan's scope to reopen.

### 2. `and`-must-fail writes nothing, checks after
Matches the runner's existing never-write-a-negation policy, extended from a single term to a conjunction: prove at least one operand already fails in the arranged world rather than writing a failing state. This forced the write/check split into two passes, which is what exposed the two ordering defects above.

### 3. Named-condition expansion binds `it` to the existing subject
`condition-condition` recurses into the named condition's body with `it` bound to the caller's subject, unchanged — no new binding concept introduced.

### 4. Phase 2 (timer-phase floor amendment) re-estimated down
The plan's Phase 1 exit-state prediction was that ~40 `wary`-trait rows would relabel from `condition-not-and` to `timer-phase` even though Phase 1 touches no timer code (raising `timer-phase` from 25 toward ~65). That did not happen: planning names claims and command shape *before* any run-time read, so those rows stop at `command-shape` instead (`talking` has no one-object pattern). Phase 2's honest expected gain is now ~26 rows (the `market-escape` timer rows), not ~65 — recorded in the plan and posted as a comment on GH #525 so the next session doesn't re-plan against the stale estimate.

## Next Phase
- **Phase 2**: "the arrange floor learns timer phase (ADR-356 D2 amendment)" — cross-package floor amendment (`@sharpee/transcript-tester`'s assertion core gains a timer-phase read, `@sharpee/story-loader`'s `arrange()` gains a timer-phase write, `@sharpee/branch-tester`'s runner stops SKIPping it), plus a dated ADR-356 D2/Q-2 amendment note.
- **Tier**: Large (400 tool-call budget)
- **Entry state**: David's go-ahead for Phase 2 implementation already obtained (recorded in the plan), but re-estimate the expected gain (~26 rows, not the plan's original ~65) before starting. GH #538 (region-containment) is now the larger single lever on secret-letter's remaining derived failure and is untouched by Phase 2.

## Open Items

### Short Term
- GH #538: Derived runner: `the player is in <region>` is read as `player.location = <region>`, which never matches a room — region guards are mis-checked and mis-arranged; blocks the one remaining secret-letter derived failure (`Grubber's Market · refused merc-held`).

### Long Term
- GH #525: Next arrange shapes to build, ranked by secret-letter's SKIPPED count — Phase 2 (timer-phase floor amendment) PENDING, re-estimated at ~26 rows (comment posted 2026-09-27).
- GH #537: Chord: a declared state named `dark` on a non-room compiles, but `is dark` reads room darkness, never the declared state.

## Files Modified

**Plan archival and re-pointing** (10 files, rename):
- `docs/work/testing-explorer/*` → `docs/work/archive/testing-explorer/*` (8 plans/spikes/narratives, all DONE)
- `docs/context/.current-plan` — now names the 525 plan
- `docs/work/testing-explorer-525/plan-20260927-525-arrange-shapes.md` — new, by `session-planner`

**branch-tester** (4 files):
- `packages/branch-tester/src/derived-runner.ts` — named-condition expansion, `or`-must-hold witness, `and`-must-fail two-pass arrange/check
- `packages/branch-tester/tests/fixtures/derived/compose.story` — new fixture (bell/lamp/gong/cat)
- `packages/branch-tester/tests/derived-plan.test.ts` — +12 tests (26 total)
- `packages/branch-tester/tests/derived-runner.test.ts` — +6 tests (17 total)

**scripts** (2 files):
- `scripts/__tests__/narrative-rule-tests-itself.test.ts` — regex updated to "arranged world"
- `scripts/__tests__/narrative-coverage-numbers.test.ts` — fernhill pin moved 33→34

## Notes

**Session duration**: ~06:31–08:10 CDT (session 814e84)

**Approach**: Measure both stories first to confirm GH #525's ranking was still current, read the runner/floor/pin-grammar/IR before writing any code, get explicit go-ahead per phase (CLAUDE.md's platform-change discussion rule), then implement Phase 1 and re-measure with the exact commands reported below rather than trusting the plan's predicted deltas.

---

## Session Metadata

- **Session**: 814e84
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — `branch-tester` source and tests, two `scripts/__tests__` files, and the plan/archive/pointer docs; nothing merged to `main`.

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-356's first-cut plan was DONE and merged before this session started; `conditionTerms`/`runDerivedBranch`'s existing single-pass shape and the pin grammar were already in place for Phase 1 to extend; David's go-ahead for Phase 1 implementation was obtained before any `packages/` edit (CLAUDE.md platform-change rule).
- **Prerequisites discovered**: none beyond what the plan's Entry State already named.

## Architectural Decisions

- No ADR written or amended this session (Phase 2's ADR-356 D2/Q-2 amendment note is explicitly deferred to Phase 2, per the plan).
- Pattern applied: ADR-356 D1 (one test per clause branch — preserved by choosing a witness rather than enumerating leaves) and D2/Q-2 (arrange floor SKIPs unreadable shapes by design — extended compositionally in Phase 1, not by widening the floor itself).
- Insight worth preserving: the plan's own predicted post-Phase-1 shape shift (condition-not-and rows relabeling to timer-phase) was wrong in a specific, informative way — planning-time shape assignment happens before any run-time arrange/check, so a row that would fail two guards in sequence is always labeled by the first guard it fails at plan time, not the guard closest to what a human would call "the real blocker." Worth remembering when predicting shape shifts for future arrange-shape work.

## Mutation Audit

- Files with state-changing logic modified: `packages/branch-tester/src/derived-runner.ts` (arrange writes route through `@sharpee/story-loader`'s `arrange()`; no direct world mutation in this file).
- Tests verify actual state mutations (not just events): YES (evidence: `pnpm --filter '@sharpee/branch-tester' test:ci` run live 2026-09-27 08:08 CDT — 13 files, 214 passed, including `derived-plan.test.ts` (26 tests) and `derived-runner.test.ts` (17 tests)). Assertions check arranged-world state directly: e.g. the cat's room equals the player's room after a `with-player` write, and a `through` leaf's `bell is rung` claim passes only once the arranged world actually holds it — not on return values or mock calls.
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — no prior session summary in `docs/context/` was found describing an ordering defect between a `here`/location write and a subject-move step in the arrange loop. This session's two ordering fixes appear to be new findings, not a repeat.

## Test Coverage Delta

- Tests added: 18 (`derived-plan.test.ts` +12 → 26 total; `derived-runner.test.ts` +6 → 17 total).
- Tests passing before: not measured at session start → after: branch-tester 214/214 passing across 13 files (evidence: `pnpm --filter '@sharpee/branch-tester' test:ci`, run live 2026-09-27 08:08 CDT, fresh relative to the last source edit at 07:48:59 CDT); scripts suite 53/53 passing across 13 files (evidence: `npx vitest run --config scripts/vitest.config.ts`, run live 2026-09-27 08:09 CDT). Live re-runs also corroborated the story-level headline numbers: `./sharpee test branch-stories/secret-letter` → 367/721 exercised, exit 1 (one pre-existing GH #523 tree failure plus 6 derived failures, including the GH #538 region-containment row at `grubbers-market.chord` "refused merc-held"); `./sharpee test branch-stories/fernhill` → 34/63 exercised, exit 0.
- Known untested areas: GH #538 (region-containment reading) has no fix or test yet — it is a known, filed, unfixed bug, deliberately out of Phase 1's scope.

---

**Progressive update**: session completed 2026-09-27 08:11 — wrote the full-form summary for the session (archive, GH #525 scoping, Phase 1 implementation), re-verified all headline test/build numbers live (branch-tester 214/214, scripts 53/53, secret-letter 367/721 exit 1, fernhill 34/63 exit 0), posted Phase 1 completion and Phase 2 re-estimate as a comment on GH #525; Status COMPLETE.
