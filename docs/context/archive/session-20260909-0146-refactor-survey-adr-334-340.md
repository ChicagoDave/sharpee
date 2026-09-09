# Session Summary: 2026-09-09 - refactor/survey-adr-334-340 (01:46 CDT)

## Goals
- Phase 15 of `docs/work/refactoring-survey/plan.md`: ADR-334 D3 (one platform-operation dispatcher owning all six operations, AGAIN included; the meta path and the turn path call it with the same contract) and D4 (one enrichment funnel taking the source as a parameter; the dead `TurnEventProcessor` class and its factory removed). Dungeo chain and the three Chord trees byte-identical; engine suite at baseline (685 passing, 7 skipped) or higher.
- Phase 16 (same session, immediately after Phase 15's commit): ADR-334 D1/D1a/D2 — decompose `executeTurn`'s ~25-phase body into one module per stage under `packages/engine/src/turn/`, with `TURN_STAGES`/`META_STAGES` constants naming them in order and a runner with no inline phase logic; byte-identical after each extraction step. This was the survey plan's last PENDING phase — closing it closes the plan.

## Phase Context
- **Plan**: `docs/work/refactoring-survey/plan.md` — implement ADR-334..340. Both phases executed this session; the plan is now **archived** at `docs/work/archive/refactoring-survey/plan.md` with `**Plan Status**: DONE` and Phases 0–16 all DONE.
- **Phases executed**: Phase 15 — "ADR-334 D3, D4 — one platform dispatcher, the dead enrichment funnel removed" (Medium, budget 200), committed as `de26ce2d7`; Phase 16 — "ADR-334 D1, D1a, D2 — the turn becomes a stage list" (Large, budget 400), uncommitted (this finalize's commit lands it). Phase 16's outcome is recorded in the archived plan's Phase 16 entry.
- **Tool calls used**: 106 / 200 (Phase 15); Phase 16 ran to completion in the same session (see Completed for the twenty-two gated extraction steps).
- **Phase outcome**: Phase 15 completed under budget; Phase 16 completed on the same session with all twenty-two extraction-step gates and the final gate IDENTICAL. `plan-archive.sh refactoring-survey` moved the plan directory to `docs/work/archive/refactoring-survey/` and released `.current-plan` — there is no active plan.

## Completed
- Session start: audit relayed (clean), core concepts read, gate cleared. Gate scripts, Phase 0 baseline, and Phase 12 outputs copied from session 4e5843's scratchpad. Phase 15 stamped CURRENT.
- **D3 landed (01:52 CDT)**: `platform-operations.ts` rewritten — `dispatchPlatformOperations(ops, host, deliver)` runs the one switch per request, delivering at the inline paths' emit points (restart ack before stop, quit confirm after); `PlatformOperationHost` (hooks via getter); `platformOperationFailure` as a lookup table (no second switch). `processMetaPlatformOperation` passes `[op]` and collects; `processPlatformOperations` passes the drained list and delivers to eventSource/turnEvents/emit. `grep 'case PlatformEventType' packages/engine/src` → one module.
- **D4 landed (01:52 CDT)**: `turn-event-processor.ts` rewritten — `enrichTurnEvents(events, source, enrichment)` + `transactionIdFor`; class, factory, and its private types removed; `processEvent` kept. Engine wrapper `enrichTurnEvents(events, turn, locationId, source)` serves the action funnel (live location) and `processPluginEvents` (tick-computed location). Fields `turnEventProcessor`/`platformOpHandler`, the constructor line, and three imports removed. `runtime-surface.ts` dropped its `TurnEventProcessor` re-export (a consumer ADR-334's Context missed) — the one out-of-scope edit. `game-engine.ts` 3015 → 2709 lines. Engine `tsc --noEmit` clean.
- **Phase 15 gate (01:57 CDT)**: `./repokit build dungeo` exit 0, bundle 4,398,746 bytes. `compare-gates.sh baseline phase15`: Dungeo chain, seed-1 unit suite, three Chord trees IDENTICAL; against `phase12` every vitest count identical except engine (71 files, 702 passing, 7 skipped — 685 baseline + 11 in `tests/unit/platform-dispatcher.test.ts` + 6 in `tests/unit/enrich-turn-events.test.ts`). Every other package count identical to the Phase 12 run: chord 1147, story-loader 1104, world-model 1512, character 641, stdlib 1664, transcript-tester 314, branch-tester 134, parser-en-us 328, lang-en-us 452. mutation-verification GREEN; its one YELLOW (older restore test in `packages/engine/tests/platform-operations.test.ts` asserting events only) closed with a `currentTurn` assertion. genai `engine.md`: only the two private fields and the dead module's declarations removed. Phase 15 outcome recorded in the plan, Status DONE.
- **Tests (01:56 CDT)**: `tests/unit/platform-dispatcher.test.ts` (11: one-module grep, six paired meta/turn operations asserting the same event AND state change — running flag, turn counter, hook data, nested turn — plus the shared error mapping, no dead fields, package surface) and `tests/unit/enrich-turn-events.test.ts` (6). Engine suite 71 files, 702 passing, 7 skipped (685 + 17).

- **Phase 16 (02:10–02:40 CDT)**: `packages/engine/src/turn/` — `context.ts` (`TurnStage`/`TurnStageContext`/`TurnEngine`), `runner.ts` (`runTurnStages`, `requiresOrderViolations`), `stages.ts` (`TURN_STAGES` 23, `META_STAGES` 10, `SHARED_STAGES` 8), 25 stage modules. `executeTurn` = guards + context + one runner call; `turnEngine()` builds the surface; `executeMetaCommand`/`processMetaEvents`/`executeInputMode` moved into stages. Twenty-two gated extraction steps (chain, ending, held-command, turn-complete, exchange-offer, clear-turn-events, undo-snapshot, detect-death, validate-input, channel-packet, turn-start, render-prose, input-mode, platform-operations, parse+meta, player-switch, execute-command, advance-turn, enrich-events, sound-dispatch, command-history, plugin-tick, emit-events), each byte-identical on the Dungeo chain + three trees with engine at 702 (`gate-stage.sh`, 02:15–02:40). `tests/unit/turn-stage-order.test.ts` (8). Chaining test import moved to `turn/chain`. ADR-334 D1/D1a/D2/D6 as-built notes (D1a's four "shared after parse" stages are not shared as built — recorded with reasons).

- **Phase 16 gate (02:45 CDT)**: `./repokit build dungeo` exit 0, bundle 4,419,349 bytes; `compare-gates.sh baseline phase16`: Dungeo chain, seed-1 unit suite, three Chord trees IDENTICAL; vs `phase15` only engine moved: 72 files, 710 passing, 7 skipped (702 + 8). genai `engine.md`: three private members removed, `splitChainedInput` relocated, 45 public `GameEngine` members unchanged. Phase 16 outcome recorded, Status DONE — the survey plan's last phase.

- **Survey plan closed (02:50 CDT)**: Phases 0–16 all DONE → `**Plan Status**: DONE`; `plan-archive.sh refactoring-survey` moved `docs/work/refactoring-survey/` to `docs/work/archive/refactoring-survey/` and released `.current-plan`. Live references repointed to the archive path: `docs/proposals/code-documentation-sweep.md` (origin), `docs/work/adr-341-spike/plan.md` (its `Superseded by` stamp — the sweep's pointer), `packages/world-model/src/world/AuthorModel.ts` (References block; genai `world-model.md` regenerated by a `--skip world-model` build). ADR-337 A3 and ADR-340 A1 amendment lines cite the old path as dated history and were left.

- **Phase 16 mutation-verification (02:55 CDT)**: no regression; pre-existing RED/YELLOW gaps in undo-snapshot, validate-input, input-mode, player-switch, the runner's failure branches, ending's victory branch, meta-command's error branches, and the regular turn's platform stage — closed with `tests/unit/turn-stages.test.ts` (13 cases asserting engine/world state through real turns). Finding: the null-input guard is unreachable through `executeTurn` (undo-snapshot trims first, as the original did) — pinned in isolation, recorded in ADR-334 D1's note, not changed. Engine final: 73 files, 723 passing, 7 skipped.

## Key Decisions
- **Stages reach the engine through `TurnEngine`, a private-built surface**: getters over live fields plus closures over the private helpers; the facade's public surface is unchanged (D5) and `private` stays private. The three helpers only the turn used moved into their stages.
- **D1a's shared-after-parse stages are not shared as built**: platform ops, render, and packet differ by path in delivery, source, and the empty case; sharing would need a stage reading `route`. Meta gets `meta-command` + `meta-render`; the absence property is asserted by the order test.
- **Order test landed with the final lists, not the first stage**: a list holding the transitional remainder had no stable order to pin (recorded in ADR-334 D6's as-built note).
- **Delivery callback, not returned arrays**: the dispatcher hands each completion event to `deliver` at the point the inline paths emitted it, so `stop()`'s own events and the ack/confirm keep their relative order on the turn path (returning an array would have reordered restart's ack after `game.ended`).
- **The list is the parameter**: meta passes `[op]`, turn passes the drained pending list; the two engine methods keep their names because the existing test reaches them by name.
- **Behavior converged on the turn path's**: meta-path quit/restart/undo hook throws now map to that operation's failure event (were `command.failed`); meta save/restore failures now log; restore-without-data message is `'No save data available'` on both. None reachable from a gate transcript; recorded in ADR-334's D3 as-built note.
- **Error mapping as a table**: keeps D3's "exactly one switch" literally true.

## Next Phase
- **None — the survey is complete.** Phase 16 was the plan's last PENDING phase; with it DONE, `**Plan Status**: DONE` and the plan is archived. No phase to resume.
- Two follow-ons surfaced during Phase 16 but were not planned work:
  - The null-input guard in `validate-input` is unreachable through `executeTurn` (undo-snapshot trims first, as the original did) — dead code, pinned in isolation and recorded in ADR-334 D1's note; leaving it is David's call.
  - ADR-334 D1a's "shared after parse" stages (platform ops, render, packet) were **not** shared as built — they differ by path in delivery, source, and the empty case; recorded as an as-built note in the ADR rather than a deviation to fix.

## Open Items

### Short Term
- None. Phase 16 (the plan's last PENDING phase) landed this session; the survey plan is DONE and archived. The two follow-ons it surfaced (unreachable null-input guard; D1a stages not shared as built) are recorded above under Next Phase and in ADR-334, not carried as action items.

### Long Term
- I-13688e-1: a package subpath consumed through another package's `.d.ts` needs `typesVersions` (not per-consumer `paths`) under `moduleResolution: node`; `tsc --noEmit` after a package.json-only change can replay stale diagnostics from `tsconfig.tsbuildinfo` — verify with a clean tsbuildinfo. Unchanged this session.
- I-71ed1a-3: GH #391 workaround — `tsc --build --force` on any touched package (and its dependents) before trusting the generated API reference, until the incremental-`tsc`-stale-`.d.ts` bug is fixed. Unchanged this session.
- I-71ed1a-4: mutation-verification flagged that stdlib's `dialogue-selector-socket.test.ts` and `adr-231-d4-topic.test.ts` still call the asking/telling phases directly rather than through `CommandExecutor.runPhases` — harmless today, worth revisiting if asking/telling's `runsOwnHooks` contract changes. Unchanged this session.
- I-7f0471-1: tracked the survey's overall implementation progress against all seven ADRs — **now closed**: all sixteen phases (0–16) DONE, plan archived to `docs/work/archive/refactoring-survey/`.
- `resolveOverrideGates` (GH #359's fix, low priority): exists only on `feat/secret-letter-port`. Unchanged this session.
- `devarch items` is not installed in this environment (`Unknown command: items` / not on PATH) — items recorded in prose only this session, per the ledger's documented degradation path.

## Files Modified

**packages/engine** (ADR-334 D3/D4, Phase 15):
- `packages/engine/src/platform-operations.ts` — rewritten: one dispatcher, host interface, failure table
- `packages/engine/src/turn-event-processor.ts` — rewritten: one funnel; dead class/factory/types removed
- `packages/engine/src/game-engine.ts` — funnels and platform paths delegate; two fields, constructor line, imports removed (3015 → 2709)
- `packages/engine/tests/unit/platform-dispatcher.test.ts` (new, 11), `enrich-turn-events.test.ts` (new, 6); `tests/platform-operations.test.ts` (+2 assertions)

**packages/engine** (ADR-334 D1/D1a/D2, Phase 16 — turn decomposition):
- `packages/engine/src/turn/` — new: `context.ts` (`TurnStage`/`TurnStageContext`/`TurnEngine`), `runner.ts` (`runTurnStages`, `requiresOrderViolations`), `stages.ts` (`TURN_STAGES` 23, `META_STAGES` 10, `SHARED_STAGES` 8), `index.ts`, 25 stage modules
- `packages/engine/src/game-engine.ts` — `executeTurn` is the runner call plus guards/context; `turnEngine()` builds the surface; `executeMetaCommand`/`processMetaEvents`/`executeInputMode` removed (2709 → 2120; 3015 → 2120 across both phases)
- `packages/engine/src/index.ts` — exports `turn/`
- `packages/engine/tests/unit/turn-stage-order.test.ts` (new, 8), `tests/unit/turn-stages.test.ts` (new, 13); `tests/command-chaining.test.ts` (import path moved to `turn/chain`)

**packages/sharpee** (out-of-scope edit, Phase 15):
- `packages/sharpee/src/runtime-surface.ts` — `TurnEventProcessor` re-export removed (consumer ADR-334's Context missed)

**Docs/ADRs**:
- `docs/architecture/adrs/adr-334-game-engine-turn-pipeline.md` — D3/D4 as-built notes (Phase 15) plus D1/D1a/D2/D6 as-built notes (Phase 16)

**Plan lifecycle (Phase 16 close)**:
- `docs/work/refactoring-survey/plan.md` → moved to `docs/work/archive/refactoring-survey/plan.md` by `plan-archive.sh`; Phases 0–16 all DONE, `**Plan Status**: DONE`
- `docs/context/.current-plan` — deleted (released by the archive)
- `packages/world-model/src/world/AuthorModel.ts`, `docs/proposals/code-documentation-sweep.md`, `docs/work/adr-341-spike/plan.md` — references repointed to the archived plan path (ADR-337 A3 and ADR-340 A1's own amendment lines cite the old path as dated history and were left)

**Generated/build artifacts**:
- `packages/sharpee/docs/genai-api/engine.md`, `world-model.md`, `index.md` — regenerated
- `stories/dungeo/src/version.ts` — build stamp

## Notes
- Open items ledger: `devarch items` not installed in this environment — items recorded in prose only (see Open Items); no degradation to the summary content itself.
- Integration Reality Check (rule 13a): "engine" and "runtime" both appear in this session's text (`@sharpee/engine`, `TurnEngine`, "engine suite at baseline"), but this is a refactor session on the `@sharpee/engine` package's internal structure — decomposing one function into stage modules with byte-identical output — not an integration with a subprocess/runtime/database dependency this repo owns and spawns. Exempt per the check's own refactor-session carve-out; no Integration Reality Statement required.
- Session duration: ~75 minutes (01:40–02:55 CDT), covering Phase 15, Phase 16, and the plan's closure/archival.
- Phase 15 is committed (`de26ce2d7`). Phase 16 — the turn decomposition, its tests, the ADR as-built notes, and the plan's archival — is uncommitted; this finalize's commit lands it.

---

## Session Metadata

- **Session**: a76673
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Rollback Safety**: Phase 15 is committed (`de26ce2d7`), safe to revert independently. Phase 16 — turn decomposition, its tests, ADR as-built notes, and the plan's archival — is uncommitted on the feature branch `refactor/survey-adr-334-340`; this finalize's commit lands it. No merge to main.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 15's entry state (Phase 0 baseline recorded) — satisfied. Phase 16's entry state (Phase 15 done, per D6's own ordering: D3/D4 first, then D1 stage by stage) — satisfied.
- **Prerequisites discovered**: none new this session.

## Architectural Decisions

- No new ADR written this session.
- ADR-334 gained as-built notes under D3 and D4 (the delivery-callback contract, the meta/turn "one op vs. drained list" parameter, the error-mapping table, and the three-path behavior convergence for D3; the enrichment wrapper split and the `runtime-surface.ts` out-of-scope edit for D4).
- ADR-334 gained as-built notes under D1, D1a, D2, and D6 (Phase 16): stages reach the engine through the private-built `TurnEngine` surface (D5's public surface unchanged); D1a's "shared after parse" stages (platform ops, render, packet) are not shared as built, with the reasons recorded; D6's order test landed with the final stage lists rather than the first, since a transitional list had no stable order to pin; the null-input guard in `validate-input` is noted as unreachable through `executeTurn`.
- Pattern applied: error mapping as a lookup table (keeps D3's "exactly one switch" literally true) — the same data-not-branches idiom used for `RUNTIME_BIND_STEPS` (Phase 12) and `ANALYSIS_PASSES` (Phase 10); `TURN_STAGES`/`META_STAGES`/`SHARED_STAGES` (Phase 16) is the same idiom applied to the turn's own stage ordering.

## Mutation Audit

- Files with state-changing logic modified: `packages/engine/src/platform-operations.ts`, `turn-event-processor.ts`, `game-engine.ts` (Phase 15); `packages/engine/src/turn/` (context.ts, runner.ts, stages.ts, 25 stage modules) and `game-engine.ts` again (Phase 16).
- Tests verify actual state mutations (not just events): YES (evidence: Phase 15 mutation-verification at 01:57 CDT — GREEN overall; its one YELLOW, the older restore test in `packages/engine/tests/platform-operations.test.ts` asserting the event only, closed with a `currentTurn` assertion in the same file. Phase 16 mutation-verification at 02:55 CDT — GREEN on the decomposition itself, no regression; four pre-existing RED gaps carried in from before the decomposition — undo-snapshot, validate-input, input-mode, player-switch — plus the runner's failure branches, ending's victory branch, meta-command's error branches, and the regular turn's platform stage, all closed by `tests/unit/turn-stages.test.ts` (13 cases) asserting engine/world state through real `executeTurn` calls).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? YES — same shape as session `20260909-0040` (Phase 11): a phase's implementation surfaces one out-of-scope edit for a consumer the ADR's Context missed (there: engine's `onWorldRestored` gaining `restoredTurn`; here: `packages/sharpee/src/runtime-surface.ts` dropping its `TurnEventProcessor` re-export). Not a blocker in either case — both were single-line, gate-verified fixes recorded in the ADR's as-built note. No systemic audit warranted; the survey's own byte-identical gate catches each one individually and cheaply as it's reached.

## Test Coverage Delta

- Tests added: 38 engine total — Phase 15: 17 (11 `platform-dispatcher.test.ts` + 6 `enrich-turn-events.test.ts`); Phase 16: 21 (8 `turn-stage-order.test.ts` + 13 `turn-stages.test.ts`).
- Tests passing before (session baseline): engine 685 → after Phase 15: 702 (685 + 17; evidence: `compare-gates.sh baseline phase15` at 01:57 CDT, engine 71 files, 702 passing, 7 skipped) → after Phase 16: **723** (702 + 21; evidence: `compare-gates.sh baseline phase16` at 02:45 CDT, engine 72 files, 710 passing, 7 skipped, then the Phase 16 mutation-verification pass at 02:55 CDT brought the final count to 73 files, 723 passing, 7 skipped). All other packages unchanged from the Phase 12 gate across both phases: chord 1147, story-loader 1104, world-model 1512, character 641, stdlib 1664, transcript-tester 314, branch-tester 134, parser-en-us 328, lang-en-us 452.
- Known untested areas: unchanged from prior sessions — `earlyRefusal` on `ActionLifecycleDescriptor` remains declared but unused by any descriptor; the null-input guard in `validate-input` is unreachable through `executeTurn` (dead code, David's call — see Next Phase).

---

**Progressive update**: Session completed 2026-09-09 02:55 CDT
