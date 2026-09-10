# Session Summary: 2026-09-09 - refactor/survey-adr-334-340 (04:30 CDT)

## Goals
- Close Phase 0 of `docs/work/game-engine-residue/plan.md`: write ADR-334 Amendment A1 and the storyInfo finding into the ADR, confirm the gate scripts, capture the residue baseline and compare it to the survey's Phase 16 capture.
- Phase 1 of the same plan: move the seventeen turn-helper bodies out of `game-engine.ts` into the stage modules that call them, one gated cluster per step, then re-judge every collection getter on `TurnEngine`.
- Phase 2: one module owning the `storyInfo` precedence rule, called from both writers, with a test pinning each field class at load and at start.
- Phase 3: `introspect()` and its five summary types into their own module; the facade delegates; the reference regenerated.

## Phase Context
- **Plan**: `docs/work/game-engine-residue/plan.md` — continue ADR-334's decomposition of `packages/engine/src/game-engine.ts` beyond the turn (survey Phases 15-16, now archived); each phase lands byte-identical on the survey's gate.
- **Phase executed**: Phase 0 — "ADR-334 Amendment A1 and the storyInfo precedence finding" (Small, budget 100); Phase 1 — "Turn helper bodies into their stages" (Large, budget 400); Phase 2 — "Story info projection" (Medium, budget 250); Phase 3 — "Extract `introspect()`" (Small, budget 100). All four closed this session.
- **Tool calls used**: 192 / 850 combined (Phase 0: 100, Phase 1: 400, Phase 2: 250, Phase 3: 100)
- **Phase outcome**: All four phases completed under budget; every gate byte-identical.

## Completed

### Phase 0 — ADR-334 Amendment A1 and the storyInfo precedence finding
- Session start: recap presented; `pre-session-audit` relayed (type check clean, no stale artifacts, Phase 0 CURRENT); profile fresh; core concepts read in full; gate cleared.
- Gate scripts copied from session f9374d's scratchpad into this session's (`gates/`), `gate-stage.sh` repointed; survey `baseline/` and `phase16/` captures carried across.
- ADR-334 amended (`docs/architecture/adrs/adr-334-game-engine-turn-pipeline.md`): new `## Amendments` section with **A1** (departures (i)-(iv): `setStory`/`introspect()` decomposed, the storyInfo projection shared between `setStory` and `start()`, the three getters tightened from `T | undefined`, the conditional `installStory` rename; Phases 7/8 excluded from A1's scope) and **F1** (the two-writer storyInfo precedence defect — `setStory`'s config-wins-with-trait-fill vs. `refreshStoryInfoCapability`'s unconditional trait-wins for `description`/`buildDate`, latent in Dungeo only because `dungeo/src/index.ts:217` fills the trait from config; the three-way rule and gate-exposure argument). Scope line narrowed; D5 carries a pointer to A1. Every line reference read against `game-engine.ts` at `e1ae93ee1`.
- Baseline captured (`./repokit build dungeo` at 04:20 CDT, then `run-gates.sh` → `gates/residue-baseline/`). `compare-gates.sh phase16 residue-baseline`: **IDENTICAL** on the Dungeo transcript chain, the Dungeo unit-transcript run, and the three Chord trees (Secret Letter, Fernhill, Ides of March); same counts on 9 of 10 vitest suites; engine differs only because `tests/unit/turn-stages.test.ts` (13 tests, landed in `716fb45da`) postdates the survey's Phase 16 capture — counts rose, nothing fell. Full table recorded inline in the plan under Phase 0's progress note (reproduced in Test Coverage Delta below).
- Phase 0 marked DONE (2026-09-09).

### Phase 1 — Turn helper bodies into their stages
- Six gated steps (04:45-04:56 CDT), each verified with `gate-stage.sh <tag>` against the survey baseline — Dungeo chain and the three Chord trees byte-identical after timing-suffix strip, engine suite at 723 passed / 7 skipped throughout:
  1. **death-cluster** — `playerDeathCauseThisTurn` → `turn/detect-death.ts`; `isPlayerDead`/`isGameOver` → `turn/ending.ts`; `story` added to `TurnEngine` as a readonly getter. Facade 2120 → 2070.
  2. **platform-pair** — `processPlatformOperations` → `turn/platform-operations.ts` (exported), `processMetaPlatformOperation` → `turn/meta-command.ts` (exported); `TurnEngine` gains `platformOperationHost()`, `queuePlatformOperation()`, `drainPendingPlatformOperations()`; `pendingPlatformOps` becomes a readonly view. `tests/platform-operations.test.ts` and `tests/unit/platform-dispatcher.test.ts` re-pointed to the module functions. Facade → 2034.
  3. **input-output-helpers** — `spliceHeldCommand`, `offerToOpenExchange`, `createUndoSnapshot`, `appendPromptBlock` (exported), `emitChannelPacket` (exported) → their stages; `TurnEngine` gains `takeHeldCommand()` and readonly `languageProvider`/`saveRestoreService`/`channelService`. Facade → 1935.
  4. **history-enrichment** — `updateCommandHistory`, `registerBlockedReferent` → `turn/command-history.ts`; the private `enrichTurnEvents` wrapper and `presenceResolver` → `turn/enrich-events.ts` as `enrichWithEngineContext` (exported); `processPluginEvents` → `turn/plugin-tick.ts`. Facade → 1750.
  5. **context-cluster** — `updateContext` → `turn/advance-turn.ts`, `drainPlayerSwitch` → `turn/player-switch.ts`. All seventeen bodies now out of the facade. Facade → 1691.
  6. **turn-event-operations** (the getter re-judgment): `turnEvents` (a live `Map<number, ISemanticEvent[]>`) **replaced by operations** — `turnEventsOf(turn)`, `storeTurnEvents(turn, events)`, `clearTurnEvents(turn)`; `pendingPlatformOps` **read-only view plus operations** (from step 2); `soundBuffer` **kept as a raw handle, reason recorded on the surface** — the command executor's signature takes the array and fills it in place, the plugin tick pushes into the same one, and `executeAsActor` hands it out, so the collection's identity is the contract; `inputModeHandlers` already a `ReadonlyMap`, unchanged. Facade → 1707.
- `TurnEngine` (`turn/context.ts`) reshaped into getters over services/state plus operations on cross-turn state; header rewritten. ADR-334 D1/D3 as-built notes revised to reflect the removal.
- `mutation-verification` run at Phase 1 close: **clean, no gaps** — every moved mutation has a test asserting on state (held-command splice, turn-event store, platform drain, player switch, command history, undo snapshot, turn counter, ending stop, plugin events). Corroborated: devarch event log, agent completion at `2026-09-09T09:55:58Z`, followed by two passing test-file runs it triggered directly (`2026-09-09T09:57:18Z` — `pnpm --filter '@sharpee/engine' test tests/unit/turn-stages.test.ts tests/unit/t...`, passed; `2026-09-09T09:57:22Z` — `...tests/unit/enrich-turn-events.test.ts tests...`, passed), both timestamped after every Phase 1 edit.
- Phase 1 marked DONE (2026-09-09).

### Phase 2 — Story info projection
- `packages/engine/src/story-info-projection.ts` (new): `STORY_INFO_SCHEMA`, `projectStoryInfo`, `findStoryInfoTrait` — the three-way precedence rule (authored fields config-wins/trait-fills-gaps; build-pipeline fields `engineVersion`/`clientVersion`/`buildDate` trait-wins; `prologue` resolved separately, stays in the facade). `setStory` and `refreshStoryInfoCapability` both rewired to it.
- Behavior Statement given before the tests. `tests/unit/story-info-projection.test.ts` (6 tests, GREEN) pins the three classes at load time and at start time through a story whose trait disagrees with its config — the F1 defect is the first engine test case for it. Corroborated: devarch event log, `2026-09-09T10:06:34Z` — "Tests passed", "1 passed 6 passed" (05:06 CDT, matching the plan's recorded Phase 2 gate close at 05:07 CDT; timestamped after the file's last edit).
- One load-time behavior difference from before, recorded on ADR-334 F1: `buildDate` is now the trait's value at load, as it already was at start (previously config-wins at load, trait-clobbers at start — the contradiction F1 describes).
- Gate `story-info-projection` (05:07 CDT): IDENTICAL on all five transcript/tree outputs; engine 74 files / 729 passed / 7 skipped. Facade → 1660 lines.
- Phase 2 marked DONE (2026-09-09).

### Phase 3 — Extract `introspect()`
- `packages/engine/src/introspection.ts` (new): the five summary types (`ActionSummary`, `TraitSummary`, `BehaviorBindingSummary`, `MessageSummary`, `EngineIntrospection`) plus `introspect(world, actionRegistry, languageProvider)`; `GameEngine.introspect()` becomes a one-line delegate (public signature unchanged, D5/AC-5 held). `types.ts` trimmed (376 → 287 lines, no introspection type remains). `index.ts` re-exports the five type names so no consumer notices. The twice-declared `PLATFORM_PREFIXES` disambiguated into `PLATFORM_TRAIT_TYPES` and `PLATFORM_MESSAGE_PREFIXES`.
- Gate `introspect` (05:26 CDT): IDENTICAL; engine 74 files / 729 passed / 7 skipped. Reference regenerated: `tsc --build packages/engine/tsconfig.json --force` then `node scripts/generate-genai-api.js` (per I-71ed1a-3, GH #391's incremental-tsc workaround) — `engine.md` shows the five types and the `introspect` function; a sorted-name diff of `GameEngine`'s 45 public members against HEAD is empty, holding AC-5. Facade → 1532 lines.
- Phase 3 marked DONE (2026-09-09).

### Session-end state
- `game-engine.ts`: 2120 → 1532 lines across the four phases. Nothing committed yet as of this write; finalize (commit + push) runs immediately after this summary.
- Plan's next phase, Phase 4, is PENDING and carries one open decision for David (A1(iv), the conditional `installStory` rename) at its start.

## Key Decisions

### 1. A1 and F1 are David's prior rulings, now written into ADR-334
No new decisions from David this session beyond "continue" per phase; Amendment A1 (the complete departure list from D5/AC-5/Scope) and finding F1 (the storyInfo precedence defect and its three-way fix) were decided by David in session f9374d and are recorded verbatim in ADR-334 this session.

### 2. Per-getter judgments on `TurnEngine`'s three collection accessors (Phase 1, step 6)
`turnEvents` → replaced by operations (`turnEventsOf`/`storeTurnEvents`/`clearTurnEvents`) because nine call sites did direct `get`/`set`/`has`/`push` against a live map handle. `pendingPlatformOps` → read-only view plus `queuePlatformOperation`/`drainPendingPlatformOperations`. `soundBuffer` → kept as a raw handle deliberately: the executor's signature, the plugin tick, and `executeAsActor` all depend on shared array identity, so wrapping it in an operation would only add a layer with no isolation benefit. Each judgment and its reason is recorded on the surface (code comment) and in the plan's Phase 1 progress note.

### 3. `platformOperationHost()` stays a private builder, not a moved body
It closes over save data, the restart acknowledgment, `undo`, and `stop` with every reason — none of which is turn state — so it was judged correctly scoped to the facade rather than a candidate for the `turn/` stages.

## Next Phase
- **Phase 4**: "`setStory` into named ordered installation steps" — `setStory`'s ~20-step pipeline becomes an ordered data list (`STORY_INSTALL_STEPS`) under `packages/engine/src/install/`, following the `RUNTIME_BIND_STEPS`/`ANALYSIS_PASSES` idiom from ADR-335/ADR-336; the two validators (`snippet-validation.ts`, `combatant-health-validation.ts`) move as files into `install/`; an idempotency/post-`start()` guard is added (a genuine behavior change, to be pinned with a new test); an order test fails by name on a misordered dependency.
- **Tier**: Large (400 tool-call budget)
- **Entry state**: Phase 3 done. Two things need David's call at phase start: (1) whether `setStory` is renamed `installStory` across the five construction sites and `bootstrap` (A1(iv) — if yes, ADR-334 AC-5 is amended in the same phase); (2) how `configureLanguageProviderNarrative` and `story.onEngineReady(this)` (the two install steps that read engine state mid-sequence) fit the load-result-adoption design constraint from `ddd-assessment-2.md`.

## Open Items
None opened, amended, or resolved this session. `devarch items list --json` returned ten open items across seven prior sessions (none from `bc5973`, none about the residue plan, `storyInfo`, `turnEvents`, or the getter judgments above) — checked and nothing overlaps this session's work, so nothing was carried forward.

## Files Modified

**ADR & plan** (2 files):
- `docs/architecture/adrs/adr-334-game-engine-turn-pipeline.md` — new `## Amendments` section (A1, F1), Scope line narrowed, D5 pointer added, D1/D3/D5 as-built notes revised
- `docs/work/game-engine-residue/plan.md` — Phase 0-3 progress notes with gate tables; all four phases marked DONE

**Generated API reference** (2 files):
- `packages/sharpee/docs/genai-api/engine.md`, `index.md` — regenerated after Phase 3's `tsc --build --force`

**Engine package — facade and new modules** (5 files):
- `packages/engine/src/game-engine.ts` — seventeen helper bodies removed, `introspect()`/storyInfo writers delegate; imports trimmed (2120 → 1532 lines)
- `packages/engine/src/story-info-projection.ts` — new; the storyInfo precedence rule
- `packages/engine/src/introspection.ts` — new; the read-model and its five types
- `packages/engine/src/types.ts` — introspection section removed (376 → 287 lines)
- `packages/engine/src/index.ts` — re-exports the five introspection type names

**Engine package — turn stage modules** (18 files):
- `packages/engine/src/turn/context.ts` — `TurnEngine` reshaped into getters + operations, header rewritten
- `packages/engine/src/turn/{detect-death,ending,platform-operations,meta-command,held-command,exchange-offer,undo-snapshot,render-prose,channel-packet,input-mode,meta-render,enrich-events,plugin-tick,command-history,advance-turn,player-switch,clear-turn-events,sound-dispatch}.ts` — bodies moved in; three functions exported for cross-stage callers

**Engine package — tests** (3 files):
- `packages/engine/tests/platform-operations.test.ts`, `packages/engine/tests/unit/platform-dispatcher.test.ts` — re-pointed to the module functions
- `packages/engine/tests/unit/story-info-projection.test.ts` — new; 6 tests

**Build artifact** (1 file):
- `stories/dungeo/src/version.ts` — `BUILD_DATE` stamp only, auto-generated by the gate builds

**Session record** (1 file):
- `docs/context/session-20260909-0442-refactor-survey-adr-334-340.md` — this file

## Notes

**Session duration**: ~1h (04:30-05:30 CDT), continuing directly from session f9374d's pause.

**Approach**: Gated, one cluster per step — every step ends with `gate-stage.sh` against the survey's baseline (Dungeo transcript chain, Dungeo unit transcripts, three Chord trees, engine suite) before the next step starts, per ADR-334 D6. Raw gate captures live only in the session scratchpad (`gates/`), never the repo, per the plan review's ruling.

**Evidence accounting**: the devarch event log for this session (`docs/context/.devarch-events-bc5973.jsonl`, 11 rows) directly captured two of this session's many test/build runs — the `mutation-verification` agent's own test invocations (`2026-09-09T09:57:18Z`, `09:57:22Z`, both passed) and the Phase 2 `story-info-projection` test run (`2026-09-09T10:06:34Z`, "1 passed 6 passed"). The fuller per-phase gate tables (Dungeo chain/tree byte-identical results, engine suite counts at 723/7 and 729/7) were not separately captured by the hook — they are quoted above from `docs/work/game-engine-residue/plan.md`'s own progress notes, which record command, result, and timestamp inline for each gated step as the work happened, in the same style session f9374d's summary used when quoting a build log's content directly.

---

## Session Metadata

- **Session**: bc5973
- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (session's scope — Phases 0-3 — fully closed; Phases 4-8 remain on the plan, ~5 more sessions at Large/Medium/Small tiers)
- **Rollback Safety**: safe to revert — nothing committed yet as of this write; all changes are uncommitted working-tree edits on `refactor/survey-adr-334-340` (unmerged, survey's own branch)

## Dependency/Prerequisite Check
- **Prerequisites met**: Phase 0's own prerequisites from session f9374d (prior survey plan closed and archived, ADR-334 ACCEPTED, gate scripts and survey baseline/phase16 captures recovered) — confirmed present at this session's start. Each later phase's entry state (prior phase DONE) was met in turn.
- **Prerequisites discovered**: none new. Phase 4 opens with one decision already flagged in the plan (the conditional `installStory` rename, A1(iv)) — not a newly discovered prerequisite, a known open point David takes at that phase's start.

## Architectural Decisions
- ADR-334 amended this session: `## Amendments` section added with A1 (complete list of this plan's departures from D5/AC-5/Scope) and F1 (the storyInfo precedence defect and its three-way resolution rule). D1, D3, and D5 as-built notes revised to describe the post-Phase-1/3 state.
- Pattern applied: `TURN_STAGES`/`RUNTIME_BIND_STEPS`/`ANALYSIS_PASSES` idiom (ordered data list, module-per-step) is the template Phase 4 will follow for `STORY_INSTALL_STEPS`.
- Finding resolved: the storyInfo two-writer contradiction (F1) — `setStory` and `refreshStoryInfoCapability` no longer duplicate the precedence rule; both call `story-info-projection.ts`.

## Mutation Audit
- Files with state-changing logic modified: the seventeen `turn/*.ts` stage modules (Phase 1), `story-info-projection.ts` (Phase 2), `game-engine.ts` (delegation only, no new mutation logic).
- Tests verify actual state mutations (not just events): **YES** (evidence: `mutation-verification` agent run at Phase 1 close reported clean with no gaps — every moved mutation has a test asserting on state; devarch event log corroborates with the agent's completion at `2026-09-09T09:55:58Z` and two passing test-file runs it triggered directly afterward, both after every Phase 1 edit. Phase 2's `story-info-projection.test.ts` asserts on the capability's stored data at load and at start, not just on the pure function's return value — devarch event log `2026-09-09T10:06:34Z`, "Tests passed", 6 of 6.)
- If NO: N/A.

## Recurrence Check
- Similar to past issue? **NO** — this is the residue plan's planned continuation (Phases 0-3 of 9), not a recurrence of a prior blocker. No blockers were hit this session.

## Test Coverage Delta
- Tests added: 6 (`packages/engine/tests/unit/story-info-projection.test.ts`)
- Tests passing before: 73 files / 723 passed / 7 skipped (Phase 0 baseline, `pnpm --filter @sharpee/engine test`, per the plan's Phase 0 table) → after: 74 files / 729 passed / 7 skipped (Phase 3 close, 05:26 CDT). Evidence: quoted inline from `docs/work/game-engine-residue/plan.md`'s Phase 0/2/3 progress notes (command, count, timestamp recorded at each gated step); the Phase 2 test-file run additionally corroborated by the devarch event log at `2026-09-09T10:06:34Z`.
- Gate byte-identical throughout: Dungeo transcript chain (35 transcripts, 952 assertions), Dungeo unit transcripts (1693 passed / 32 failed / 10 expected-failed / 2 skipped / 3 transcript errors — the known set), Secret Letter tree (566 cards, 965 assertions), Fernhill tree (86 cards, 104 assertions), Ides of March tree (39 cards, 49 assertions) — all IDENTICAL across Phases 0 through 3 per the plan's per-phase gate runs.
- Known untested areas: Phase 4's idempotency/post-`start()` guard does not exist yet (PENDING); Phase 6 (parser-adapter normalization) is explicitly discuss-first and untouched.

---

**Progressive update**: Session completed 2026-09-09 05:30 CDT
