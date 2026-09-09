# Session Summary: 2026-09-09 - refactor/survey-adr-334-340 (00:34 CDT)

## Goals
- Phase 11 of `docs/work/refactoring-survey/plan.md`: ADR-335 D4 (`./repokit aliases` derives chord's alias catalog from story-loader's curated map, `--check` joins `verify`), then D3 (`installFromIR` slot on `ExtensionRegistration`; loader drops its `@sharpee/ext-*`/`plugin-state-machine` imports), then D2 (runtime header states the real mutable-field split; guards asserted empty per turn; `resetAfterRestore`). Three Chord trees byte-identical after each step.
- Phase 12 (started 01:05 CDT, after Phase 11 closed in this session): ADR-335 D1 — thirteen runtime-section modules under `packages/story-loader/src/runtime/`, `RuntimeCore` with the shared helpers and state, `ChordRuntime` as the delegating facade, the bind order pinned by a `requires` list and a test; three Chord trees byte-identical after each section move.

## Phase Context
- **Plan**: `docs/work/refactoring-survey/plan.md` — implement ADR-334..340, `**Plan Status**: ACTIVE`.
- **Phase executed**: Phase 11 — "ADR-335 D4, D2, D3 — the alias table, the core's mutable fields, the extension registry" (Medium, budget 220), then Phase 12 — "ADR-335 D1 — thirteen runtime-section modules" (Large, budget 400).
- **Tool calls used**: 209 (session state total across both phases).
- **Phase outcome**: Both phases completed under budget.

## Completed
- Session start: audit relayed (clean), core concepts read, gate cleared. Gate scripts and Phase 0 baseline copied from session 56bc75's scratchpad. Phase 11 stamped CURRENT.
- **D4 landed (00:45 CDT)**: `tools/repokit/src/commands/aliases.ts` — `readAliasMap` parses the map's SOURCE rows (regex, ≥500-row floor, duplicate refusal), `generateAliasCatalogModule` emits the names-only set in table order with one `// if.action.<action>` comment per run, `checkAliasCatalogModule` is the byte gate; `AliasesCommand` registered in `cli.ts`; `verify.ts` runs the check after the manifest gate. `./repokit aliases` regenerated the catalog: header rewritten to the convention shape (generated-artifact banner, purpose without citations, References block), 742 rows both before and after (the old header's "752 across 56" was a stale hand count; the real figure is 742 across 58). Evidence: `./repokit aliases --check` exit 0 at HEAD; a probe row added to the map → `aliases --check: STALE — packages/chord/src/message-alias-catalog.ts does not match …` exit 1 (00:45 CDT), reverted, exit 0 again. Tests: `aliases.test.ts` 7 passing; story-loader `message-alias-map` 8 passing against the rebuilt chord dist; chord `message-override` 8 passing. ADR-255 D2 gained the amendment note; ADR-335 D4 gained an as-built note.
- **D3 landed (00:53 CDT)**: `ExtensionRegistration` gained `gatedConstruct(ir)`, `seedWorldFromIR(ir, world)`, and `installFromIR(ir, engine, context)`; five entry modules under `packages/story-loader/src/extensions/` (combat, scoring, state-machines, hunger, chapters); the registry map composes them and iterates in its own order (the scoring-before-hunger tie-break the inline blocks had). `loader.ts`: the opener seed became a seed loop at the same point in `initializeWorld`; the state-machine block, `registerPlugin` loop, promotion narrator, hunger block, and chapters block became one gate loop plus one install loop in `onEngineReady`; `buildPromotionNarrator`, `buildHungerDaemon`, `buildMachineDefinition` deleted (moved verbatim); imports of `@sharpee/ext-hunger`, `@sharpee/ext-chapters`, `@sharpee/plugin-state-machine` gone (2759 lines, from 3029). `applyNpcAdjective`/`applyCombatAdjective` stayed (composition-time, trait-only, no extension import). Test `tests/extension-install.test.ts` (5 cases: no ext import in loader.ts, one module per registry key, `define machine` without `use` → the named LoadError, the machine lowers with the `use`, hunger-first header still registers scoring's plugins first with equal priorities). story-loader `tsc --noEmit` clean; suite 119 files, 1088 passing (1083 + 5). Trees after dist rebuild: secret-letter, fernhill, ides-of-march IDENTICAL to baseline (00:53 CDT).
- **D2 landed (00:57 CDT)**: `runtime.ts` header rewritten in the convention shape stating the real split (five guards asserted, two buffers drained, two cross-turn counters reset); `resetAfterRestore(turn)` and private `assertBetweenTurns(entry)` added, called at the top of `runStartBlock`, `stepTimers`, `drainActEvents`; `ChordStory.onWorldRestored(world, restoredTurn)` calls the reset. Engine: `Story.onWorldRestored?(world, restoredTurn)` and the save-restore service passes `saveData.metadata.turnCount` — the one out-of-scope edit (the engine sets `currentTurn` after the hook returns, so nothing in scope carried the restored turn). Test `tests/runtime-guards.test.ts` (9 cases: each of the five guards refused at the act flush naming the field; `inStartBlock` at `runStartBlock`; `actDepth` at `stepTimers`; a clear runtime passes all three; on a live engine, event ids `chord-estate-clock-0..n` then a save, a turn, a restore → `eventSeq` 0, `lastTickTurn` = the save's `turnCount`, next id `-0`). Engine dist rebuilt so story-loader sees the new signature; story-loader and engine `tsc --noEmit` clean; engine 685 passing, 7 skipped (baseline); story-loader 120 files, 1097 passing (1088 + 9). Trees IDENTICAL to baseline (00:57 CDT). ADR-335 D2 and D3 gained as-built notes.
- **Phase 11 gate (01:00 CDT)**: `./repokit build dungeo` exit 0, bundle 4,398,070 bytes. `compare-gates.sh baseline phase11`: Dungeo chain, seed-1 unit suite, three Chord trees IDENTICAL; story-loader 1097; every other suite at its recorded post-phase count. mutation-verification: two YELLOW gaps (hunger `fatal` asserted events only; engine restore test ignored `restoredTurn`) closed with state assertions; both files green. Phase 11 outcome recorded in the plan; Status DONE.
- **Phase 12, moves (01:05–01:21 CDT)**: step 0 — `runtime/core.ts` (`RuntimeCore`: shared state, guards, buffers, counters, the five helpers, the module-level declarations sections share; `ChordRuntime extends RuntimeCore`) and `bind` partitioned into `bindOnClauses`/`bindMoveClauses`/`bindTraitClauses` + `RUNTIME_BIND_STEPS` (six steps, `requires` empty); then thirteen scripted moves (scratchpad `move.py` over `rt.py`: member parser, import map, `this.`/`runtime.` alias re-targeting by ownership, facade delegations generated from signatures, snapshots per move) in the order conversation-threads, dispatch-verbs, dialogue, topic-tables, bind, event-clauses, move-clauses, on-clauses, scheduler-constructs, timers, derived, statements, phrases — the three Chord trees IDENTICAL after step 0 and after every one of the thirteen (gate-move.sh: tsc + dist + trees; timestamps 01:11–01:19). Script defects found and fixed along the way: the `runtime = this` alias in six closures (fix-forward on threads, then handled by the script), section fields as core-owned targets (dialogue), the class end found by the file's last `}` after step 0 appended the steps interface (statements restored from its snapshot and redone). Finalization: sections typed `core: RuntimeCore` (tsc clean proves no section reaches a facade-only member); facade rewritten (pruned imports, convention header, thirteen constructions in ADR order, rulers gone); trees IDENTICAL again (01:21). `tests/runtime-sections.test.ts` (7 cases) and `runtime-guards.test.ts` follows `stepTimers` into the timers section. ADR-335 D1 gained the as-built note (including the `requires` amendment).
- **Phase 12 gate (01:25 CDT)**: `./repokit build dungeo` exit 0, bundle 4,417,719 bytes; `compare-gates.sh baseline phase12`: Dungeo chain, seed-1 unit suite, three trees IDENTICAL; story-loader 1104 (1097 + 7); all other suites at recorded counts. mutation-verification: GREEN overall; its one YELLOW (call-order-only assertion in `runtime-sections.test.ts`) closed with a world-state assertion on the on-clauses step; the agent's claim that sections hold no fields is wrong (`books`, `phraseClaims`, `irEntityIndex`, `assignedPlayerId`) and does not affect the verdict. Phase 12 outcome recorded, Status DONE.

## Key Decisions
- **Catalog derived from the map's source text, not a built module**: the `readStdlibActionIds` precedent — no dist needed, the table and its derivation ship in one commit; curator comment notes on the map's group lines do not survive derivation (the map keeps them).
- **Registry order, not `use` order, for the install loop**: scoring's and hunger's narrators (and watchers) share a priority; the registry order is the tie-break the inline blocks had, and an author's header order must not change run order.
- **Two IR-shaped slots, not one**: the chapter opener seed runs at world build (before the first turn), so it got `seedWorldFromIR` beside the engine-ready `installFromIR`, keeping its timing exactly; `gatedConstruct` made the two rogue-IR backstops one generic loop.
- **`applyNpcAdjective`/`applyCombatAdjective` stay in the loader**: composition-time, trait-only, no extension package import; NPC adjectives are core vocabulary with no `use` entry to move into.
- **Guards asserted at three between-turns entry points; buffers drained, not asserted**: `fireEventClauses`/`fireMoveClauses` nest inside acts and cannot assert; the buffers legitimately hold events between an action and its flush.
- **Sections are classes over one core, not free functions**: a section's fields need an instance; `ChordRuntime extends RuntimeCore` so the facade is the core and sections reach each other through `core.<section>`, never by import.
- **Guards and buffers live on the core**: D2's assertion is the core's, so the fields it checks stayed with it rather than travelling with their sections as D1's text said.
- **Bind partitioned into six steps, `requires` all empty**: honest — no step reads another's registrations; the list makes the order data and the test pins it.
- **Engine hook gains `restoredTurn`**: the engine sets `currentTurn` only after `onWorldRestored` returns, so nothing in ADR-335's scope carried the restored turn; an additive parameter at the one call site was the honest implementation of D2 as ruled — flagged as the phase's one out-of-scope edit.

## Next Phase
- **Phase 15**: "ADR-334 D3, D4 — one platform dispatcher, the dead enrichment funnel removed" (Medium, budget 200) — PENDING. Deliverable: (a) D3 — the three inline `PlatformEventType` switches and the dead `PlatformOperationHandler` collapse into one dispatcher module covering all six operations including `AGAIN`; the meta-command path and the turn path call it with a parameter distinguishing "one operation" from "drain the pending list." (b) D4 — the two `processEvent` funnels become one stage-level function; the unused `TurnEventProcessor` class and its factory are removed (a class deletion from a file that stays, not a file deletion — runs without a separate confirmation gate).
- **Entry state**: Phase 0 baseline recorded — satisfied.
- **Phase 16** ("ADR-334 D1, D1a, D2 — the turn becomes a stage list", Large, budget 400) depends on Phase 15. Phases 15-16 are explicitly the lowest priority in the plan and may not be reached.

## Open Items

### Short Term
- I-13688e-1: a package subpath consumed through another package's `.d.ts` needs `typesVersions` (not per-consumer `paths`) under `moduleResolution: node`; `tsc --noEmit` after a package.json-only change can replay stale diagnostics from `tsconfig.tsbuildinfo` — verify with a clean tsbuildinfo. Unchanged this session.
- I-71ed1a-3: GH #391 workaround — `tsc --build --force` on any touched package (and its dependents) before trusting the generated API reference, until the incremental-`tsc`-stale-`.d.ts` bug is fixed. Unchanged this session.

### Long Term
- I-71ed1a-4: mutation-verification flagged that stdlib's `dialogue-selector-socket.test.ts` and `adr-231-d4-topic.test.ts` still call the asking/telling phases directly rather than through `CommandExecutor.runPhases` — harmless today, worth revisiting if asking/telling's `runsOwnHooks` contract changes. Unchanged this session.
- I-7f0471-1 (amended this session): tracks the survey's overall implementation progress against all seven ADRs — DONE through Phases 0-14; remaining: Phases 15-16 (ADR-334), explicitly lowest priority and may not be reached.
- `resolveOverrideGates` (GH #359's fix, low priority): exists only on `feat/secret-letter-port`. Unchanged this session.
- `devarch items` is not installed in this environment (`Unknown command: items` / not on PATH) — items recorded in prose only this session, per the ledger's documented degradation path.

## Files Modified

**tools/repokit** (Phase 11 D4):
- `tools/repokit/src/commands/aliases.ts`, `aliases.test.ts` (new) - alias catalog derivation and byte gate
- `tools/repokit/src/commands/cli.ts`, `verify.ts` - registration + `--check` gate

**packages/chord**:
- `packages/chord/src/message-alias-catalog.ts` - regenerated (742 rows, convention-shape header)

**packages/story-loader** (Phase 11 D3/D2, Phase 12 D1):
- `packages/story-loader/src/extension-registry.ts` - rewritten to compose per-extension modules
- `packages/story-loader/src/extensions/{combat,scoring,state-machines,hunger,chapters}.ts` - new
- `packages/story-loader/src/loader.ts` - extension install/seed loops replace inline blocks (−270 lines)
- `packages/story-loader/src/runtime.ts` - Phase 11: header rewrite, `resetAfterRestore`, `assertBetweenTurns`; Phase 12: reduced to the facade (244 lines, from 5,032)
- `packages/story-loader/src/runtime/core.ts` + thirteen section modules (new)
- `packages/story-loader/tests/extension-install.test.ts`, `runtime-guards.test.ts`, `runtime-sections.test.ts` (new); `hunger-loader.test.ts` (+1 assertion)

**packages/engine**:
- `packages/engine/src/story.ts`, `save-restore-service.ts` - `onWorldRestored` gains `restoredTurn`
- `packages/engine/tests/on-world-restored.test.ts` (+1 assertion)

**Docs/ADRs**:
- `docs/architecture/adrs/adr-255-message-override-acl.md` - D2 amendment note
- `docs/architecture/adrs/adr-335-story-loader-decomposition.md` - D2/D3/D4/D1 as-built notes

**Docs/plan**:
- `docs/work/refactoring-survey/plan.md` - Phase 11 and Phase 12 outcomes recorded, both Status DONE

**Generated/build artifacts**:
- `packages/sharpee/docs/genai-api/engine.md`, `index.md` - regenerated
- `stories/dungeo/src/version.ts` - build stamp

## Notes
- Open items ledger: `devarch items` not installed in this environment — items recorded in prose only (see Open Items); no degradation to the summary content itself.

---

## Session Metadata

- **Session**: 4e5843
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Rollback Safety**: safe to revert — all changes uncommitted on the feature branch `refactor/survey-adr-334-340`; commit happens via `/devarch:finalize` immediately after this summary.

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 11's entry state (Phase 0 baseline recorded) — satisfied. Phase 12's entry state (Phase 1 done, Phase 10 done, Phase 11 done — D4/D3 predecessors and D2's guard assertion in place before a section move could leak a guard) — all satisfied once Phase 11 landed in this session.
- **Prerequisites discovered**: none new this session.

## Architectural Decisions

- No new ADR written this session.
- ADR-255 D2 gained an amendment note (the catalog is now derived, not hand-maintained).
- ADR-335 gained as-built notes under D4, D3, D2, and D1 (the last recording the `requires` amendment to the bind-order list).
- Pattern applied: the `requires` idiom (ADR-336's precedent, `packages/chord/src/analyzer/requires.ts`) reused for `RUNTIME_BIND_STEPS` in `packages/story-loader/src/runtime/core.ts` — all six steps carry an empty `requires` (no step reads another's registrations), honestly recorded rather than padded.

## Mutation Audit

- Files with state-changing logic modified: `packages/story-loader/src/extension-registry.ts`, `src/extensions/{combat,scoring,state-machines,hunger,chapters}.ts`, `src/loader.ts`, `src/runtime.ts`, `src/runtime/core.ts` + thirteen section modules; `packages/engine/src/story.ts`, `save-restore-service.ts`.
- Tests verify actual state mutations (not just events): YES (evidence: two mutation-verification runs this session. Phase 11: two YELLOW gaps closed — hunger's fatal path now asserts `HealthTrait.dead` rather than just the emitted event; the engine restore test now asserts `restoredTurn` rather than ignoring it. Phase 12: GREEN overall; its one YELLOW — `runtime-sections.test.ts` asserting call order only — closed with a world-state assertion on the on-clauses step, asserting the clause owner carries the behavior trait while a clause-less entity does not).
- If NO: N/A.

## Recurrence Check

- Similar to past issue? NO — no blocker this session.

## Test Coverage Delta

- Tests added: 21 story-loader (5 `extension-install.test.ts` + 9 `runtime-guards.test.ts` + 7 `runtime-sections.test.ts`) + 7 repokit (`aliases.test.ts`).
- Tests passing before: story-loader 1083 → after: **1104** (+5 extension-install, +9 runtime-guards, +7 runtime-sections; evidence: `compare-gates.sh baseline phase11` at 01:00 CDT showed 1097 [1083+5+9], `compare-gates.sh baseline phase12` at 01:25 CDT showed 1104 [1097+7]). repokit: **+7** (`aliases.test.ts`, evidence: same gate runs). engine: unchanged at **685** passing (one assertion added to `on-world-restored.test.ts`, no new test file). chord: unchanged at **1147** (catalog regenerated, no new test file; evidence: recorded post-Phase-14 count held through both gate runs).
- Known untested areas: unchanged from prior sessions — `earlyRefusal` on `ActionLifecycleDescriptor` remains declared but unused by any descriptor.

---

**Progressive update**: Session completed 2026-09-09 01:25
