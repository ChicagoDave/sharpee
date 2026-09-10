# Session Summary: 2026-09-09 - refactor/survey-adr-334-340 (12:39 CDT)

## Goals
- Phase 5 of `docs/work/game-engine-residue/plan.md`: the "Small-stuff batch" — seven residual cleanups in `packages/engine/src/game-engine.ts` (a)-(g), each gate byte-identical or (e) explicitly deferred with a reason.

## Phase Context
- **Plan**: `docs/work/game-engine-residue/plan.md` — continue ADR-334's decomposition of `packages/engine/src/game-engine.ts` beyond the turn (survey Phases 15-16, archived).
- **Phase executed**: Phase 5 — "Small-stuff batch" (Medium, budget 250).
- **Tool calls used**: 95 / 250 (session-state snapshot at last read; this write continues the same phase's session).
- **Phase outcome**: Completed under budget; gate byte-identical throughout both gated steps.

## Completed
- Phase 5 landed as two gated steps, each `gate-stage.sh <tag>` against the survey baseline:
  - **small-stuff-1** (12:43 CDT) — items (a) fields `parser`/`languageProvider`/`textService`/`commandExecutor` non-optional, the four `start()` guards removed (`running` kept), the three getters tightened to `T`, dead `this.parser &&` / `this.textService?.` accesses in the facade dropped and two "No-op if not yet constructed" doc lines removed; (b) `stop()` one `session` object, one `Date.now()`; (d) `get<ActorTrait>(TraitType.ACTOR)` at both sites (the file's majority idiom, 10 of 12 sites); (f) `vocabularyRegistry` import removed; (g) five history comments ("Phase 4 remediation" ×2, "Phase 5" ×3) replaced by the invariant they were guarding or removed. Gate IDENTICAL ×4; engine 75 files / 741 passed / 7 skipped.
  - **small-stuff-2** (12:48 CDT) — items (c) the three `console.error` calls routed through `systemEventSource` as `system.save_failed` / `system.restore_failed` / `system.listener_error` (subsystem `engine`, severity `error`, data `{ error: { message, stack } }`), with a re-entrancy flag so a listener that throws on its own report is dropped rather than recursed into; (e) `emitPlatformEvent` id is `platform_<clock>_<n>` from a per-engine counter, one clock read shared by id and timestamp — no gate capture contains a `platform_` id (grep of the baseline, 12:40 CDT), so the scheme change was safe. New `tests/unit/engine-failure-reports.test.ts` (7 tests). Gate IDENTICAL ×4; engine 76 / 748 / 7.
- `mutation-verification` at phase close: three paths GREEN, one gap (`stop()`'s session record asserted nowhere) closed by `tests/unit/engine-stop-session.test.ts` (2 tests). Engine suite after: 77 files / 750 passed / 7 skipped (12:51 CDT).
- Phase 5 marked DONE on the plan (12:52 CDT) with the full progress note, four findings not acted on, and the line-count reason.
- ADR-334 D5 gains the A1(iii) as-built note; reference regenerated after `tsc --build --force` (I-71ed1a-3): `engine.md` shows the three getters at `T`, nothing else public moved.
- GH #395 filed: `packages/engine/tests/setup.ts` is never loaded (no `setupFiles`), found when the new test's `console.error` assertion met the real console.
- Session start: recap presented; `pre-session-audit` relayed (type check clean, Phase 5 CURRENT and unstarted, no blockers); profile fresh (2026-09-04); core concepts read in full; gate scripts and baseline captures copied from session 9277dc's scratchpad into this session's (`gates/`), `gate-stage.sh` repointed (`p5-` prefix); gate cleared.

## Key Decisions
- `ENGINE_SUBSYSTEM = 'engine'` is a file-local const, not an addition to core's `Subsystems` table — that table is outside ADR-334's Scope line; promoting it is a one-line follow-on if a second reporter appears.
- Platform event ids use a counter, not `randomService`: a draw would move every stream behind it under a pinned seed, and ids are never rendered.
- `TurnEngine` (`turn/context.ts`) still declares `parser`/`textService`/`languageProvider` as `T | undefined`, and eight stage guards test them. Left as found: tightening them is turn-package work beyond (a)'s stated scope; noted on the plan for David.
- `game-engine.ts` 1394 → 1429 lines: step 1 removed 23, step 2 added 58 (two documented helpers, two documented fields, the subsystem const and `describeError`). The plan's expected end state named the number as the consequence, not the goal; recorded on the plan.

## Next Phase
- **Phase 6**: "Parser adapter normalization" (Medium, budget 250) — PENDING, discuss-first (CLAUDE.md "Platform changes require discussion first"). The plan already carries the discussion opened 2026-09-09 (`ddd-assessment-3.md` point 6): the seven guard call sites enumerated, the one `Parser` implementation (`EnglishParser`) confirmed to implement all five methods, and a proposed `EngineParser`-adapter shape — awaiting David's decision on where the adapter lives (`packages/engine`, recommended, vs. widening `if-domain`'s `Parser` contract) before the phase can start.
- **Phase 7**: "Package shape — the root modules move into named directories" (Medium, budget 250) — PENDING, entry state "Phase 5 done" met; independent of Phase 6 and may land before or after it.
- **Tier**: Medium (250) for either.
- **Entry state**: Both phases' stated entry states are met by this session's close. Neither is marked CURRENT — the choice between advancing the Phase 6 discussion or proceeding to Phase 7 first is David's.

## Open Items
- I-d99d6d-1: GH #395 — `packages/engine/tests/setup.ts` never loaded; wire in or delete (David's call).
- I-d99d6d-2: `TurnEngine`'s optional field types and the eight dead stage guards (rider for Phase 7).
- I-d99d6d-3: core's won/lost/quit events overwrite `session.endTime`.
- I-d99d6d-4: the same `Math.random().substr` id idiom in `turn-event-processor.ts` and `action-context-factory.ts`.

## Files Modified
- `packages/engine/src/game-engine.ts`; `packages/engine/tests/unit/engine-failure-reports.test.ts`, `tests/unit/engine-stop-session.test.ts` (new)
- `docs/architecture/adrs/adr-334-game-engine-turn-pipeline.md` (D5 as-built note), `docs/work/game-engine-residue/plan.md` (Phase 5)
- `packages/sharpee/docs/genai-api/{engine,index}.md` regenerated

## Notes
- Session started: 2026-09-09 12:39 CDT (session d99d6d). Roughly six and a half hours after session 9277dc closed at 06:10 CDT.
- **Evidence accounting**: the devarch event log for this session (`docs/context/.devarch-events-d99d6d.jsonl`) directly captured the `mutation-verification` agent's completion at `2026-09-09T17:48:50Z` (12:48:50 CDT) and the final test count at `2026-09-09T17:51:10Z` ("Tests passed", "77 passed 750 passed") — after the last edit (`17:50:41Z`) to `engine-stop-session.test.ts`. The two gated steps' IDENTICAL ×4 gate tables were not separately captured by the hook; they are quoted above from `docs/work/game-engine-residue/plan.md`'s own Phase 5 progress note, which records command, result, and timestamp inline for each gated step, in the style used by prior sessions on this plan.
- Rule 13a's Integration Reality Statement does not apply here: the phase name and goals match the keyword "engine" only via the package/plan name (`packages/engine`, `game-engine-residue`), and this is a refactor session — no owned dependency (subprocess, runtime spawn, migration) is being integrated. The exemption for refactor sessions applies.
- Nothing committed yet as of this write; finalize (commit + push) runs immediately after this summary.

---

## Session Metadata

- **Session**: d99d6d
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (this session's scope — Phase 5 — fully closed; Phases 6-8 remain on the plan, Phase 6 discuss-first, Phase 7 independent and ready)
- **Rollback Safety**: safe to revert — nothing committed yet as of this write; all changes are uncommitted working-tree edits on `refactor/survey-adr-334-340` (unmerged, survey's own branch)

## Dependency/Prerequisite Check
- **Prerequisites met**: Phase 5's entry state (Phase 4 done) — confirmed present at phase start. Gate scripts and baseline captures carried across from session 9277dc's scratchpad, as in prior sessions on this plan.
- **Prerequisites discovered**: none newly discovered.

## Architectural Decisions
- ADR-334 D5 gains the A1(iii) as-built note this session — the three getters (`getParser`, `getLanguageProvider`, `getTextService`) tighten from `T | undefined` to `T`, per Amendment A1(iii) recorded at Phase 0; the reference regenerated after `tsc --build --force` confirms the public member count unchanged.
- Pattern applied: routed the three `console.error` calls through `systemEventSource` (subsystem `engine`, a file-local const rather than a core `Subsystems` addition — that table is outside ADR-334's Scope line) with a re-entrancy flag guarding against a listener that throws on its own report, matching the existing reporting pattern elsewhere in the file.
- GH #395 filed as a build/test-infrastructure gap discovered incidentally (`packages/engine/tests/setup.ts` never loaded, no `setupFiles` in the vitest config).

## Mutation Audit
- Files with state-changing logic modified: `packages/engine/src/game-engine.ts` (`stop()`'s session record, the save/restore/listener-error reporting path, `emitPlatformEvent`'s id scheme).
- Tests verify actual state mutations (not just events): **YES** (evidence: `mutation-verification` agent run at phase close, completed `2026-09-09T17:48:50Z` per the devarch event log, reported three paths GREEN — save/restore reporting, the listener report and its re-entrancy guard, the platform id scheme — and one gap: `stop()`'s session record was asserted by no test, old or new. The gap was closed by `tests/unit/engine-stop-session.test.ts` (2 tests) asserting on the ending and won events' `{ startTime, endTime, turns, moves }` under a mocked clock, not on return values or mocks. Final engine suite 77 files / 750 passed / 7 skipped, corroborated by the event log at `2026-09-09T17:51:10Z`, timestamped after the last edit to the covered files.)
- If NO: N/A.

## Recurrence Check
- Similar to past issue? **NO** — this is the residue plan's planned Phase 5, a routine cleanup batch. No blockers were hit this session.

## Test Coverage Delta
- Tests added: 9 (`packages/engine/tests/unit/engine-failure-reports.test.ts` — 7, closing the mutation-verification gaps for save/restore/listener reporting and the id scheme; `tests/unit/engine-stop-session.test.ts` — 2, closing the `stop()` session-record gap).
- Tests passing before: 75 files / 741 passed / 7 skipped (Phase 4 close) → after: 77 files / 750 passed / 7 skipped (Phase 5 close, 12:51 CDT). Evidence: devarch event log `2026-09-09T17:51:10Z` ("Tests passed", "77 passed 750 passed"), corroborated by `docs/work/game-engine-residue/plan.md`'s Phase 5 progress note, which records the count inline at each gated step (75/741/7 after step 1, 76/748/7 after step 2, 77/750/7 after the mutation-verification gap closure).
- Gate byte-identical throughout: small-stuff-1 (12:43 CDT) and small-stuff-2 (12:48 CDT) both report IDENTICAL ×4 (Dungeo transcript chain, Dungeo unit-transcript run, three Chord trees) per the plan's progress note.
- Known untested areas: Phase 6 (parser-adapter normalization) remains explicitly discuss-first and untouched; Phase 7/8 not started.

---

**Progressive update**: Session completed 2026-09-09 12:52 CDT
