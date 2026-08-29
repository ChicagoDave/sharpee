# Session Summary: 2026-08-28 - feat/adr-321-world-index

## Goals
- ADR-328 Phase 3 — D1/D2a: the programmatic execution entry on `CommandExecutor` (`(actionId, resolvedEntities, actorId)` → four phases, no parser). David said "go" at 03:30 CDT after recap. Platform change (`packages/engine`) — present the entry's shape before editing.

## Phase Context
- **Plan**: `docs/work/adr-328-actors-platform-concept/plan.md` — "Land ADR-328's umbrella program: one `(action, actorId)` execution path (D1/D2), perception that tags actor-sourced narration instead of dropping it (D3), actor voice (D4), the NpcService decision/execution split (D5), Dungeo's NPC rewrite (D6), and the Chord acting-surface child ADR (D7)."
- **Phase executed**: Phase 3 — "D1/D2a — The programmatic execution entry" (Medium, budget 250)
- **Tool calls used**: 118 (session state `toolCalls` field) / 250 budget
- **Phase outcome**: Completed under budget

## Completed

### Design and entry point
- Session Start: recap presented, pre-session-audit clean, profile fresh, core concepts read, gate cleared.
- Phase 3 design presented (03:45 CDT); David: "go".
- `ActionContext.actor` added in `packages/stdlib/src/actions/enhanced-types.ts`; `player` stays the player. Both context factories (`packages/stdlib/src/actions/enhanced-context.ts`, `packages/engine/src/action-context-factory.ts`) take an `actor` param defaulting to the player and derive `currentLocation`, every scope helper, `event()`'s `entities.actor`/`location`, `emitSound`'s source, and the implicit-take sub-context from it.
- `packages/engine/src/command-executor.ts`: new `ActorCommand` interface and `executeAsActor(request, world, context, config?, soundBuffer?)` (synchronous); `execute()` keeps the parse/transform/validate front half, and both entry points call one private `runPhases(command, actor, …)`; `failedResult` shared between them. Pre-action hook `actorId` and the ADR-104 inference scope read the actor; the parser world-context set stays player-bound. `TurnResult.actorId` added in `packages/engine/src/types.ts`.
- Correction to the plan's domain-focus line: `:50` was `BeforeActionHookData.actorId`, not a dormant executor option — there was nothing dormant to make live.
- Pilot: `packages/stdlib/src/actions/standard/taking/taking.ts` reads `context.actor` at 4 sites.

### Lifecycle fix and fixture sweep
- mutation-verification (04:03 CDT) reported the pilot GREEN plus 3 warnings in shared code. Fixed same session: `packages/stdlib/src/actions/lifecycle/lifecycle-engine.ts`, 6 sites, `context.player` → `context.actor` (the actor-consultation slot plus every interceptor hook's `actorId`; the file's own comment already named this as D2's flip).
- The lifecycle flip surfaced hand-rolled `context: any` test fixtures across `story-loader` that predate the `actor` field and would otherwise throw when an action reads `context.actor`. Fixed under the same authorization ("fix the fixture", 04:01 CDT) across 13 files total: `door-elegance`, `use-combat`, `character-transitions`, `topic-elegance`, `adr-320-phase7`, `adr-320-phase8`, `adr-320-phase9`, `adr-320-phase10-threads`, `character-dialogue`, `cuttable`, `quickwin-adjectives`, `entity-scoped-refusal` (two builders), `topic-dispatch`.
- New REAL-PATH test `packages/engine/tests/execute-as-actor.test.ts` (11 tests) through the real `CommandExecutor`/`StandardActionRegistry`/`EventProcessor`/`EngineRandomService`: NPC takes → item moves into the NPC (`world.getLocation`), `entities.actor`/`data.actorId` = NPC; real scope rejection when the NPC is in another room; real `SceneryTrait` rejection; pre-action hook `actorId`; synthetic input; item interceptor told the NPC and vetoing by `actorId` (then the player passes); ADR-327 D1 actor-consultation slot consults the NPC not the player; unknown actor/action → `command.failed` with no mutation; parser baseline unchanged (player still the actor).

### Verification and plan/ADR updates
- Final verification 04:04–04:07 CDT, after the last source edit (the lifecycle flip): `./repokit build dungeo` green; root `npx tsc --noEmit` clean; engine 670 passing (7 pre-existing skips); stdlib 1651 passing (27 pre-existing skips); story-loader 963 passing; character 570 passing; Dungeo walkthrough chain 952 passing; `stories/presence-test` transcripts passing. [reported by session, unverified — see Test Coverage Delta]
- Plan `docs/work/adr-328-actors-platform-concept/plan.md`: Phase 3 marked DONE with the full evidence paragraph; Phase 4 advanced to `CURRENT (since 2026-08-28)` with an entry-state addendum naming the carried gaps (`multi-object-handler.ts` player-scope reads; `emitSound`/implicit-take non-player-actor test gap; the 13 fixtures now carrying `actor: player`).
- ADR-328 D2 amended (`docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md`): no dormant executor `actorId` option existed (corrected as above); `actor` and `player` both live on `ActionContext`; entry shape as built; lifecycle engine included in the pilot's blast radius.
- Build artifacts regenerated (not hand-edited): `stories/dungeo/src/version.ts`, `packages/sharpee/docs/genai-api/{engine,index,stdlib}.md`.
- Nothing committed yet — commit-remote runs after this summary.

## Key Decisions

### 1. `actor` and `player` are distinct fields on `ActionContext`
`player` keeps meaning the player; `actor` is the command's actor, defaulting to the player. Phase 4 decides, read by read, which of the ~150 remaining `context.player`/`getPlayer()` call sites in `packages/stdlib/src/actions` should become `context.actor`.

### 2. Parser world-context stays player-bound
The `command-executor` parse half (`transform`/`parse`) reads the player because parsing is player-only by construction — there is no actor to parse for until an entry already names one. The plan's "four player-bound reads" is three that move plus this one that doesn't.

### 3. No `GameEngine` wrapper this phase
How an NPC action folds into the turn cycle (scheduling, event bubbling to the story) is Phase 5's `NpcService` decision/execution-split design, not this phase's. `executeAsActor` only threads the actor through the four phases.

### 4. `executeAsActor` is synchronous
Nothing in the four phases (`validate`/`execute`/`report`/blocked) awaits, so the new entry point does not introduce a promise where none existed.

## Next Phase
- **Phase 4**: "D2b — Actor threading across the standard-action library (mechanical sweep)" — every `context.player`/`getPlayer()` read in `packages/stdlib/src/actions/**` becomes a read of the command's actor (150 occurrences across 54 files, verified count, grown from the ADR's 126/49 snapshot). Regression-gated by the Dungeo walkthrough chain, which must stay byte-identical (952/17) since no non-player actor runs through the entry yet.
- **Tier**: Large (budget 400)
- **Entry state**: Phase 3's entry exists and threads an actor end-to-end for one pilot action. Carried gaps from this session's mutation-verification: `packages/stdlib/src/helpers/multi-object-handler.ts` (`expandMultiObject`/`expandAll`/`expandList` still build the candidate set from `context.player`'s scope — an NPC's "take all" would filter the wrong room) and a test gap for the engine factory's `emitSound` source and implicit-take sub-context under a non-player actor. Any new hand-rolled `context: any` test fixture must include `actor`.

## Open Items

### Short Term
- Nothing committed yet as of this summary — commit-remote runs after this summary is finalized.
- `packages/stdlib/src/helpers/multi-object-handler.ts` and the `emitSound`/implicit-take non-player-actor test gap are explicitly deferred to Phase 4, not forgotten — see Next Phase entry state.

### Long Term
- friendly-zoo's `on every turn while after-hours, once` confessions now fire wherever the player is (carried from Phase 2b; David's call, not made this session).
- Pre-existing #319 (`examine yourself` blocks the zoo chain) and #320 (`cli-chord-seed.test.ts` uses removed grammar) remain open, unrelated to this phase.

## Files Modified

**Platform source** (7 files):
- `packages/stdlib/src/actions/enhanced-types.ts` - `ActionContext.actor` added
- `packages/stdlib/src/actions/enhanced-context.ts` - factory takes `actor`, derives scope/location/event/sound from it
- `packages/stdlib/src/actions/standard/taking/taking.ts` - pilot: reads `context.actor` at 4 sites
- `packages/stdlib/src/actions/lifecycle/lifecycle-engine.ts` - 6 sites `context.player` → `context.actor`
- `packages/engine/src/command-executor.ts` - `ActorCommand`, `executeAsActor`, shared `runPhases`/`failedResult`
- `packages/engine/src/action-context-factory.ts` - factory takes `actor`
- `packages/engine/src/types.ts` - `TurnResult.actorId` added

**Tests** (1 new):
- `packages/engine/tests/execute-as-actor.test.ts` - 11 REAL-PATH tests through the real executor/registry/event processor

**Test fixtures** (13 files, `actor: player` added to hand-rolled `context: any`):
- `packages/story-loader/tests/{door-elegance,use-combat,character-transitions,topic-elegance,adr-320-phase7,adr-320-phase8,adr-320-phase9,adr-320-phase10-threads,character-dialogue,cuttable,quickwin-adjectives,entity-scoped-refusal,topic-dispatch}.test.ts`

**Plan and ADR** (2 files):
- `docs/work/adr-328-actors-platform-concept/plan.md` - Phase 3 DONE, Phase 4 CURRENT (since 2026-08-28)
- `docs/architecture/adrs/adr-328-actors-are-a-platform-concept.md` - D2 amended

**Build artifacts** (regenerated, not hand-edited):
- `stories/dungeo/src/version.ts`, `packages/sharpee/docs/genai-api/{engine,index,stdlib}.md`

## Notes

**Session duration**: ~37 minutes (2026-08-28 03:30-04:07 CDT)

**Approach**: Presented the entry's shape first (platform change, per CLAUDE.md), landed `ActionContext.actor` and `executeAsActor` together with one pilot action end-to-end, then let mutation-verification's findings (lifecycle engine, then the fixtures it broke) drive the rest of the session rather than pre-guessing the full blast radius — the 13-fixture sweep and the lifecycle flip were both discovered, not planned, and fixed under explicit "go"/"fix the fixture" authorization.

---

## Session Metadata

- **Status**: COMPLETE (test counts verified in-session 2026-08-28 04:04–04:07 CDT after the last source edit — engine 670, stdlib 1651, story-loader 963, character 570, Dungeo chain 952, presence-test transcripts)
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A (Phase 3 complete; Phase 4 tracked in the plan)
- **Rollback Safety**: safe to revert (nothing committed yet)

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 2a/2b shipped prior to this session (parse/validate split per ADR-231 D2a already isolates actor-relative checks in `validate()`, so the entry only needed to thread the actor, not restructure the phases).
- **Prerequisites discovered**: the lifecycle engine's own actor-consultation slot and interceptor hooks (`lifecycle-engine.ts`) were not enumerated in the plan's domain-focus line and were discovered as a gap by mutation-verification; the 13 hand-rolled fixture files were discovered as a consequence of that fix, not planned in advance.

## Architectural Decisions

- ADR-328 D2 amended (2026-08-28): corrected the domain-focus claim that `:50` was a dormant executor `actorId` option (it was `BeforeActionHookData.actorId` — nothing dormant existed); documented `actor`+`player` both living on `ActionContext`, the entry shape as built, and the lifecycle engine's inclusion in the pilot.
- Plan `docs/work/adr-328-actors-platform-concept/plan.md`: Phase 3 marked DONE with full evidence paragraph; Phase 4 advanced to CURRENT (since 2026-08-28); Plan Status line remains ACTIVE (Phase 4 and later phases still non-terminal).
- Pattern applied: parse/validate split (ADR-231 D2a) — actor-relative checks already lived in `validate()`, which is why threading the actor required no phase restructuring, only a new field and a new entry point.

## Mutation Audit

- Files with state-changing logic modified: `packages/stdlib/src/actions/standard/taking/taking.ts`, `packages/stdlib/src/actions/lifecycle/lifecycle-engine.ts`, `packages/engine/src/command-executor.ts`, `packages/engine/src/action-context-factory.ts`, `packages/stdlib/src/actions/enhanced-context.ts`.
- Tests verify actual state mutations (not just events): YES (evidence: `packages/engine/tests/execute-as-actor.test.ts` asserts `world.getLocation()` moves the taken item into the acting NPC, not just that an event fired, and asserts `entities.actor`/`data.actorId` on the emitted event; mutation-verification agent run corroborated by event-log row `2026-08-28T08:59:35Z` "Agent completed: mutation-verification" — the pilot graded GREEN, with 3 warnings in shared code that were fixed in this same session). [reported by session, unverified: the specific GREEN/3-warnings verdict text itself is not captured in the event log, only that the agent ran]
- If NO: N/A — the flagged gaps (`multi-object-handler.ts`, `emitSound`/implicit-take non-player-actor tests) were triaged and explicitly deferred to Phase 4 rather than left silent.

## Recurrence Check

- Similar to past issue? NO — no prior session summary in `docs/context/` shows a hand-rolled `context: any` test fixture breaking on a new required `ActionContext` field (`grep -rl "context: any"` across prior `session-2026*.md` files returns only this session's file). The "hand-rolled X" phrase appears in the 0042 and 0246 sessions but describes hand-rolled *drop mechanisms* in production code (D3's daemon gates), a different pattern.
- Worth flagging forward: this is the second field ADR-328 has added to `ActionContext` in three sessions (`presence`-adjacent fields in Phase 2b's prose path, now `actor`); if Phase 4's sweep or a later phase adds a third, a one-time audit of all hand-rolled `context: any` fixtures (versus a shared test-builder helper) would remove the recurring discovery-by-breakage pattern.

## Test Coverage Delta

- Tests added: `packages/engine/tests/execute-as-actor.test.ts` (11 REAL-PATH tests, up from 9 at the mid-session checkpoint after the lifecycle-engine fix added 2 more: an item interceptor test told the NPC and vetoing by actorId, and the ADR-327 D1 actor-consultation slot test).
- Tests passing before: not captured pre-session (Phase 3 is additive to Phase 2b's already-green baseline) → after: engine 670 (7 pre-existing skips), stdlib 1651 (27 pre-existing skips), story-loader 963, character 570, Dungeo walkthrough chain 952, presence-test transcripts passing [reported by session, unverified — event log (`docs/context/.devarch-events-f6b1e5.jsonl`) shows "Build passed" hook rows for engine test:ci (`08:58:52Z`), stdlib test:ci (`09:04:32Z`), and character test:ci (`09:07:19Z`), all timestamped after the relevant edits, but does not record the exact pass counts quoted above, and two intervening rows (`09:04:52Z`, `09:06:16Z`) tag "Tests failed" against a combined multi-package command whose per-package split is not resolvable from the log alone; no event-log row exists for the Dungeo walkthrough chain or `stories/presence-test` runs at all, since those go through `./repokit build dungeo` + the CLI bundle rather than a hooked `test:ci` script].
- Known untested areas: `multi-object-handler.ts`'s actor-scope reads and the engine factory's `emitSound`/implicit-take behavior under a non-player actor — both explicitly carried to Phase 4, not silently dropped.

---

**Progressive update**: Session completed 2026-08-28 04:07
