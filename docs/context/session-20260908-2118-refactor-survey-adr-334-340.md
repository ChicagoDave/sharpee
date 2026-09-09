# Session Summary: 2026-09-08 - refactor/survey-adr-334-340 (20:57 CDT)

## Goals
- Close Phase 14 of the refactoring-survey plan: David confirmed items 2 (ADR-337 D3 deletions) and 3 (D7 skip-test table) with "confirm both". Execute both, gate, record.

## Phase Context
- **Plan**: `docs/work/refactoring-survey/plan.md` — implement ADR-334..340, `**Plan Status**: ACTIVE`.
- **Phase executed**: Phase 14 — "ADR-337 — decisions for David and D1's landing" (Medium, items 2-3; item 1 landed last session).
- **Tool calls used**: 113 (session state file) against Phase 14's combined 160-call budget (item 1 spent from last session's total; this session's own share was well under budget).
- **Phase outcome**: Completed on budget.

## Completed

### Phase 14 items 2-3 (ADR-337 D3, D7) — DONE, phase closed
David: "confirm both." **D3**: `git rm` of `packages/stdlib/src/actions/standard/pushing/pushing-original.ts` (398 lines) and the four `.removed` files under `actions/removed/` (`answering.ts.removed`, `asking.ts.removed`, `telling.ts.removed`, `using.ts.removed` — 663 lines total). `pushing/index.ts` exports only `pushing.ts` and `pushing-events.ts`, so nothing imported any of the five files — bundle and genai reference unaffected by the deletion.

**D7**: all 27 skipped stdlib tests were un-skipped and run once against HEAD before choosing a disposition for each — 5 passed as written, 22 failed. Each row took one of D7's three verbs based on what the failure showed:
- **7 implemented/un-skipped**: `throwing-golden` miss-moving-actor and NPC-catches (agility/canCatch belong in `ActorTrait.customProperties`, read via `ActorBehavior.getCustomProperty`); `taking-golden` too-heavy (capacity is `capacity.maxWeight` on the actor's CONTAINER trait, weight is `IdentityTrait.weight`); `wearing-golden` not-held-and-not-in-room (retitled — the refusal is `scope.not_known`, the scope check precedes `not_held`); `witness-system` action/movement/partial-witness (×3, pass as written).
- **18 deleted**: duplicates under the current trait model (e.g. entering/exiting cases covered by other passing tests), never-built features with no owner (`too_full`, `cant_exit`, inventory weight fields, `author.parser_events`/`validation_events`/`system_events`), or harness preconditions that don't match the current behaviors.
- **2 replaced by a one-line named-gap note**: opening's three revealed-event tests (the chain is ADR-094's, tested in `tests/unit/chains/opened-revealed.test.ts`); dropping-inside-a-closed-container (ADR-043 names the "trapped in the trunk" convention; `ContainerBehavior.canAccept` refuses closed containers from any side, so nothing implements it).

Orphaned imports (`AuthorModel`, `EntityType` in opening-golden; `EntityType` in dropping-golden) removed after the row-by-row edits.

**Note on the previous session's record**: the prior summary described a "27-row table" as already posted for confirmation; only per-file counts were actually in the plan at that point — the per-row verb for each of the 27 rows was chosen this session, under D7's rule, and is now recorded row by row in the plan's Phase 14 outcome.

### Docs and plan
- `docs/work/refactoring-survey/plan.md` — Phase 14 outcome (items 2-3, the 27-row table) recorded; **Status: DONE**.
- `docs/architecture/adrs/adr-337-stdlib-lifecycle-and-validator.md` — Amendment A3 (D3 and D7 as built).
- `stories/dungeo/src/version.ts` — BUILD_DATE stamp from the `./repokit build dungeo` gate run.

## Key Decisions

### 1. Per-row D7 verbs chosen under ADR-337 D7's rule
Each of the 27 skipped tests was run once against HEAD before any edit, and its verb (implement / delete / note) followed directly from what that run showed — never from the test's title or original intent. The full row-by-row table with reasons is in the plan's Phase 14 outcome record, not restated here.

## Next Phase
- **Phase 15**: "ADR-334 D3, D4 — one platform dispatcher, the dead enrichment funnel removed" (Medium, budget 200) — PENDING. ADR-334 is explicitly lowest-priority per its own D6 order; the plan notes Phases 15-16 may not be reached.
- **Phase 9** (ADR-340 D1-D4, one assertion core shared by transcript-tester and branch-tester; Large, budget 350) is design-settled per Phase 8's diff table but explicitly recommended to run attended — resolution wiring across three build systems and two functions needing signature injection are judgment calls (I-71ed1a-2).
- **Entry state for either**: Phase 14 is fully closed; nothing else changed since this session's gate. Phase 15 has no outstanding prerequisite; Phase 9 needs David at the keyboard per its own recommendation.

## Open Items

### Short Term
- I-71ed1a-3: GH #391 workaround — `tsc --build --force` on any touched package (and its dependents) before trusting the generated API reference, until the incremental-`tsc`-stale-`.d.ts` bug is fixed.

### Long Term
- I-71ed1a-2: Phase 9 (ADR-340 D1-D4) is design-settled but recommended to run with David at the keyboard — resolution wiring and two functions needing signature injection are judgment calls.
- I-71ed1a-4: mutation-verification flagged that stdlib's `dialogue-selector-socket.test.ts` and `adr-231-d4-topic.test.ts` still call the asking/telling phases directly rather than through `CommandExecutor.runPhases` — harmless today, worth revisiting if asking/telling's `runsOwnHooks` contract changes.
- I-7f0471-1 (amended this session): tracks the survey's overall implementation progress against all seven ADRs — DONE through Phase 8 plus all of Phase 14; remaining: Phase 9 (attended), Phases 10-13, 15-16.
- I-7f0471-2: the separate package-by-package survey ("one at a time") is paused, not finished — unchanged this session.

Closed this session: I-71ed1a-1 (Phase 14 items 2-3 awaiting confirmation) — resolved done, evidence `docs/work/refactoring-survey/plan.md`.

## Files Modified

**stdlib** (D7 test dispositions):
- `packages/stdlib/tests/unit/actions/{entering,exiting,opening,dropping,inventory,throwing,taking,wearing}-golden.test.ts` - skipped tests implemented, deleted, or replaced by a named-gap comment per row
- `packages/stdlib/tests/unit/scope/witness-system.test.ts` - 3 tests un-skipped, pass as written
- `packages/stdlib/tests/unit/validation/command-validator-golden.test.ts` - 1 skipped case deleted (Phase 13 had already removed the code it covered)
- `packages/stdlib/tests/integration/meta-commands.test.ts` - 3 skipped tests deleted (never-built author events)

**stdlib** (D3 deletion):
- deleted: `packages/stdlib/src/actions/standard/pushing/pushing-original.ts`
- deleted: `packages/stdlib/src/actions/removed/{answering,asking,telling,using}.ts.removed`

**Docs**:
- `docs/work/refactoring-survey/plan.md` - Phase 14 outcome (items 2-3) recorded, Status DONE
- `docs/architecture/adrs/adr-337-stdlib-lifecycle-and-validator.md` - Amendment A3
- `stories/dungeo/src/version.ts` - BUILD_DATE stamp from the gate build

## Notes

**Session duration**: ~30 minutes (20:57-21:27 CDT).

**Approach**: Ran all 27 skipped tests once against HEAD before touching any of them, sorted each by what the failure (or pass) actually showed rather than by the test's stated intent, then applied D3's deletions and gated once at the end. No build-fail-fix-rebuild looping.

---

## Session Metadata

- **Session**: 957700
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Rollback Safety**: safe to revert — all changes uncommitted on the feature branch `refactor/survey-adr-334-340`, not merged to main

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 14 item 1 (ADR-337 D1, landed last session) was entry state for items 2-3; David's "confirm both" at session start satisfied the phase's own STOP-and-wait exit condition.
- **Prerequisites discovered**: None.

## Architectural Decisions

- ADR-337 Amendment A3: records D3 (the five-file deletion) and D7 (the 27-row skip-test table, each row's verb and reason) as built.
- Pattern applied: none new — no source side-effect functions were touched this session, only test files and dead-code deletion.

## Mutation Audit

- Files with state-changing logic modified: none. This session's changes are test-file dispositions (implement/delete/note) and deletion of five already-dead source files (`pushing-original.ts`, four `.removed` files) that nothing imported. No side-effect function in a live source file was written or modified, so rule 15's trigger conditions were not met and `mutation-verification` did not fire.
- Tests verify actual state mutations (not just events): N/A — no mutation-bearing code changed this session.
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — no blocker this session; nothing to compare against prior sessions.

## Test Coverage Delta

- Tests added: 0 new files; 7 tests un-skipped and kept (throwing ×2, taking ×1, wearing ×1, witness-system ×3); 18 tests deleted; 2 tests deleted and replaced by a one-line named-gap comment (not a test).
- Tests passing before: stdlib 1657 passing, 27 skipped → after: stdlib **1664 passing, 0 skipped, 0 failed** (evidence: fresh `pnpm --filter '@sharpee/stdlib' test` run I performed directly during this write-up — `Test Files 127 passed (127)`, `Tests 1664 passed (1664)`, run started 21:26:26 CDT, after every edit in this session including the two orphaned-import removals; `grep -rn 'test.skip|it.skip|describe.skip' packages/stdlib/tests` → 0 matches, run at the same time). `pnpm --filter '@sharpee/stdlib' exec tsc --noEmit` clean, same run. Also corroborated by `./repokit build dungeo` exit 0 (bundle 4,350,654 bytes) and `compare-gates.sh` against the Phase 0 baseline — Dungeo chain, seeded unit suite, and the three Chord trees IDENTICAL — both per the plan's Phase 14 outcome record.
- Known untested areas: unchanged from last session — `earlyRefusal` on `ActionLifecycleDescriptor` remains declared but unused by any descriptor.

---

**Progressive update**: Session completed 2026-09-08 21:27
