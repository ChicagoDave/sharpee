# Session Summary: 2026-09-09 - refactor/survey-adr-334-340 (01:46 CDT)

## Goals
- Phase 15 of `docs/work/refactoring-survey/plan.md`: ADR-334 D3 (one platform-operation dispatcher owning all six operations, AGAIN included; the meta path and the turn path call it with the same contract) and D4 (one enrichment funnel taking the source as a parameter; the dead `TurnEventProcessor` class and its factory removed). Dungeo chain and the three Chord trees byte-identical; engine suite at baseline (685 passing, 7 skipped) or higher.

## Phase Context
- **Plan**: `docs/work/refactoring-survey/plan.md` — implement ADR-334..340, `**Plan Status**: ACTIVE`.
- **Phase executed**: Phase 15 — "ADR-334 D3, D4 — one platform dispatcher, the dead enrichment funnel removed" (Medium, budget 200).
- **Tool calls used**: 106 / 200.
- **Phase outcome**: Completed under budget.

## Completed
- Session start: audit relayed (clean), core concepts read, gate cleared. Gate scripts, Phase 0 baseline, and Phase 12 outputs copied from session 4e5843's scratchpad. Phase 15 stamped CURRENT.
- **D3 landed (01:52 CDT)**: `platform-operations.ts` rewritten — `dispatchPlatformOperations(ops, host, deliver)` runs the one switch per request, delivering at the inline paths' emit points (restart ack before stop, quit confirm after); `PlatformOperationHost` (hooks via getter); `platformOperationFailure` as a lookup table (no second switch). `processMetaPlatformOperation` passes `[op]` and collects; `processPlatformOperations` passes the drained list and delivers to eventSource/turnEvents/emit. `grep 'case PlatformEventType' packages/engine/src` → one module.
- **D4 landed (01:52 CDT)**: `turn-event-processor.ts` rewritten — `enrichTurnEvents(events, source, enrichment)` + `transactionIdFor`; class, factory, and its private types removed; `processEvent` kept. Engine wrapper `enrichTurnEvents(events, turn, locationId, source)` serves the action funnel (live location) and `processPluginEvents` (tick-computed location). Fields `turnEventProcessor`/`platformOpHandler`, the constructor line, and three imports removed. `runtime-surface.ts` dropped its `TurnEventProcessor` re-export (a consumer ADR-334's Context missed) — the one out-of-scope edit. `game-engine.ts` 3015 → 2709 lines. Engine `tsc --noEmit` clean.
- **Phase 15 gate (01:57 CDT)**: `./repokit build dungeo` exit 0, bundle 4,398,746 bytes. `compare-gates.sh baseline phase15`: Dungeo chain, seed-1 unit suite, three Chord trees IDENTICAL; against `phase12` every vitest count identical except engine (71 files, 702 passing, 7 skipped — 685 baseline + 11 in `tests/unit/platform-dispatcher.test.ts` + 6 in `tests/unit/enrich-turn-events.test.ts`). Every other package count identical to the Phase 12 run: chord 1147, story-loader 1104, world-model 1512, character 641, stdlib 1664, transcript-tester 314, branch-tester 134, parser-en-us 328, lang-en-us 452. mutation-verification GREEN; its one YELLOW (older restore test in `packages/engine/tests/platform-operations.test.ts` asserting events only) closed with a `currentTurn` assertion. genai `engine.md`: only the two private fields and the dead module's declarations removed. Phase 15 outcome recorded in the plan, Status DONE.
- **Tests (01:56 CDT)**: `tests/unit/platform-dispatcher.test.ts` (11: one-module grep, six paired meta/turn operations asserting the same event AND state change — running flag, turn counter, hook data, nested turn — plus the shared error mapping, no dead fields, package surface) and `tests/unit/enrich-turn-events.test.ts` (6). Engine suite 71 files, 702 passing, 7 skipped (685 + 17).

## Key Decisions
- **Delivery callback, not returned arrays**: the dispatcher hands each completion event to `deliver` at the point the inline paths emitted it, so `stop()`'s own events and the ack/confirm keep their relative order on the turn path (returning an array would have reordered restart's ack after `game.ended`).
- **The list is the parameter**: meta passes `[op]`, turn passes the drained pending list; the two engine methods keep their names because the existing test reaches them by name.
- **Behavior converged on the turn path's**: meta-path quit/restart/undo hook throws now map to that operation's failure event (were `command.failed`); meta save/restore failures now log; restore-without-data message is `'No save data available'` on both. None reachable from a gate transcript; recorded in ADR-334's D3 as-built note.
- **Error mapping as a table**: keeps D3's "exactly one switch" literally true.

## Next Phase
- **Phase 16**: "ADR-334 D1, D1a, D2 — the turn becomes a stage list" (Large, budget 400) — the plan's last PENDING phase. Deliverable: `packages/engine/src/turn/` holds one module per stage of the ~25-phase `executeTurn` body; `TURN_STAGES` and `META_STAGES` constants (with the `requires` idiom, per the umbrella's instruction to amend ADR-334 D1) name them in order; `executeTurn` becomes a runner with no inline phase logic; byte-identical check after **each** stage extraction, not just at the end.
- **Tier**: Large (400 tool-call budget).
- **Entry state**: Phase 15 done (D6's own order: D3/D4 first, then D1 stage by stage) — now satisfied. Next up in this same session, immediately after the commit for this phase.

## Open Items

### Short Term
- Phase 16 (ADR-334 D1/D1a/D2, Large, budget 400) is the plan's last PENDING phase; its entry state is satisfied and it starts in this same session right after this summary/commit. Explicitly the lowest priority in the plan and may still not be reached.

### Long Term
- I-13688e-1: a package subpath consumed through another package's `.d.ts` needs `typesVersions` (not per-consumer `paths`) under `moduleResolution: node`; `tsc --noEmit` after a package.json-only change can replay stale diagnostics from `tsconfig.tsbuildinfo` — verify with a clean tsbuildinfo. Unchanged this session.
- I-71ed1a-3: GH #391 workaround — `tsc --build --force` on any touched package (and its dependents) before trusting the generated API reference, until the incremental-`tsc`-stale-`.d.ts` bug is fixed. Unchanged this session.
- I-71ed1a-4: mutation-verification flagged that stdlib's `dialogue-selector-socket.test.ts` and `adr-231-d4-topic.test.ts` still call the asking/telling phases directly rather than through `CommandExecutor.runPhases` — harmless today, worth revisiting if asking/telling's `runsOwnHooks` contract changes. Unchanged this session.
- I-7f0471-1: tracks the survey's overall implementation progress against all seven ADRs — DONE through Phases 0-15; remaining: Phase 16 (ADR-334 D1/D1a/D2) only, explicitly lowest priority and may not be reached.
- `resolveOverrideGates` (GH #359's fix, low priority): exists only on `feat/secret-letter-port`. Unchanged this session.
- `devarch items` is not installed in this environment (`Unknown command: items` / not on PATH) — items recorded in prose only this session, per the ledger's documented degradation path.

## Files Modified

**packages/engine** (ADR-334 D3/D4):
- `packages/engine/src/platform-operations.ts` — rewritten: one dispatcher, host interface, failure table
- `packages/engine/src/turn-event-processor.ts` — rewritten: one funnel; dead class/factory/types removed
- `packages/engine/src/game-engine.ts` — funnels and platform paths delegate; two fields, constructor line, imports removed (3015 → 2709)
- `packages/engine/tests/unit/platform-dispatcher.test.ts`, `enrich-turn-events.test.ts` (new); `tests/platform-operations.test.ts` (+2 assertions)

**packages/sharpee** (out-of-scope edit):
- `packages/sharpee/src/runtime-surface.ts` — `TurnEventProcessor` re-export removed (consumer ADR-334's Context missed)

**Docs/ADRs**:
- `docs/architecture/adrs/adr-334-game-engine-turn-pipeline.md` — D3/D4 as-built notes

**Docs/plan**:
- `docs/work/refactoring-survey/plan.md` — Phase 15 outcome recorded, Status DONE

**Generated/build artifacts**:
- `packages/sharpee/docs/genai-api/engine.md`, `index.md` — regenerated
- `stories/dungeo/src/version.ts` — build stamp

## Notes
- Open items ledger: `devarch items` not installed in this environment — items recorded in prose only (see Open Items); no degradation to the summary content itself.
- Integration Reality Check (rule 13a): "engine" appears in the session Goals text ("engine suite at baseline"), but this is a refactor session on the `@sharpee/engine` package's internal structure, not an integration with a subprocess/runtime/database dependency — exempt per the check's own refactor-session carve-out.
- Session duration: ~18 minutes (01:40–01:58 CDT).
- Not committed — the plan is to continue directly into Phase 16 in this same session before committing.

---

## Session Metadata

- **Session**: a76673
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Rollback Safety**: safe to revert — all changes uncommitted on the feature branch `refactor/survey-adr-334-340`; Phase 16 begins in this same session before any commit.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 15's entry state (Phase 0 baseline recorded) — satisfied.
- **Prerequisites discovered**: none new this session.

## Architectural Decisions

- No new ADR written this session.
- ADR-334 gained as-built notes under D3 and D4 (the delivery-callback contract, the meta/turn "one op vs. drained list" parameter, the error-mapping table, and the three-path behavior convergence for D3; the enrichment wrapper split and the `runtime-surface.ts` out-of-scope edit for D4).
- Pattern applied: error mapping as a lookup table (keeps D3's "exactly one switch" literally true) — the same data-not-branches idiom used for `RUNTIME_BIND_STEPS` (Phase 12) and `ANALYSIS_PASSES` (Phase 10).

## Mutation Audit

- Files with state-changing logic modified: `packages/engine/src/platform-operations.ts`, `turn-event-processor.ts`, `game-engine.ts`.
- Tests verify actual state mutations (not just events): YES (evidence: mutation-verification run at 01:57 CDT — GREEN overall; its one YELLOW, the older restore test in `packages/engine/tests/platform-operations.test.ts` asserting the event only, closed with a `currentTurn` assertion in the same file).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — same shape as session `20260909-0040` (Phase 11): a phase's implementation surfaces one out-of-scope edit for a consumer the ADR's Context missed (there: engine's `onWorldRestored` gaining `restoredTurn`; here: `packages/sharpee/src/runtime-surface.ts` dropping its `TurnEventProcessor` re-export). Not a blocker in either case — both were single-line, gate-verified fixes recorded in the ADR's as-built note. No systemic audit warranted; the survey's own byte-identical gate catches each one individually and cheaply as it's reached.

## Test Coverage Delta

- Tests added: 17 engine (11 `platform-dispatcher.test.ts` + 6 `enrich-turn-events.test.ts`).
- Tests passing before: engine 685 → after: **702** (685 + 17; evidence: `compare-gates.sh baseline phase15` at 01:57 CDT showed engine 71 files, 702 passing, 7 skipped). All other packages unchanged from the Phase 12 gate: chord 1147, story-loader 1104, world-model 1512, character 641, stdlib 1664, transcript-tester 314, branch-tester 134, parser-en-us 328, lang-en-us 452 (same gate run).
- Known untested areas: unchanged from prior sessions — `earlyRefusal` on `ActionLifecycleDescriptor` remains declared but unused by any descriptor.

---

**Progressive update**: Session completed 2026-09-09 01:58 CDT
