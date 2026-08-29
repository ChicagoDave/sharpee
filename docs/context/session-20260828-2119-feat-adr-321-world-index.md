# Session Summary: 2026-08-28 - feat/adr-321-world-index

## Goals
- Land ADR-328 Phase 5 (D5) — split `NpcService` into a decision layer and an engine-owned execution layer, dissolving `packages/plugin-npc` outright.
- Migrate every consumer of the deleted `NpcAction`/`plugin-npc` surface (loader, zoo, devkit fixture, umbrella, ADR-178 baseline, repokit, basic-combat) onto the new path in the same cutover.

## Phase Context
- **Plan**: `docs/work/adr-328-actors-platform-concept/plan.md` — land ADR-328's umbrella program: one `(action, actorId)` execution path for anyone who acts.
- **Phase executed**: Phase 5 — "D5 — NpcService's decision/execution split; `plugin-npc` dissolves" (Large)
- **Tool calls used**: 305 / 350
- **Phase outcome**: Completed under budget

## Completed

### NpcService decision/execution split
`packages/stdlib/src/npc/{types,npc-service,behaviors,npc-messages}.ts` rewritten to a pure decision layer: `NpcContext.act(actionId, slots) → ActResult` (curried per NPC onto the engine's `executeAsActor`) and `NpcContext.narrate(message | {text}, params)` (one `game.message` sourced by the NPC at its room); hooks return `void`. `NpcAction`, the seven execute* methods, `announceMovement`/`npc.moved.witnessed`, the combat-resolver registry, and the runtime-dead `onSpokenTo`/`onAttacked`/`onObserve`/`onPlayerSpeaks`/`onNpcAttacked` hooks are deleted.

### Engine-owned actor turn phase
New `packages/engine/src/actor-turn-plugin.ts` (id `sharpee.engine.actors`, priority 100), registered in `GameEngine`'s constructor; `GameEngine.getNpcService()` added. `packages/plugin-npc` deleted from the workspace, the umbrella (`packages/sharpee/src/index.ts`, `runtime-surface.ts`), the ADR-178 baseline (stamped), repokit, and seven package configs. Save state moved to `pluginStates['sharpee.engine.actors']`; a `sharpee.plugin.npc` entry restores through a read-side alias in `save-restore-service.ts`.

### Supporting platform changes
`ActorCommand.direction` (reads `parsed.extras.direction`); `TurnResult.refused` (set on the `blocked()` branch — `success` alone can't see a refusal, so `ActResult.success` now reads `refused`). `going` narrates a witnessed mover through its own `actor_exited`/`actor_entered` events (`context.event(type, data, { location })` added to both context implementations) with no arrival perception for a non-protagonist. `canActorLeave` runs `going.validate()` per direction for the scene leaver (`dialogue-selector.ts`). `killPlayer`'s guard moved from `isAlive` to the `dead` flag — the health-≤0 guard was silencing `if.event.player.died` on every combat-death path. `basic-combat`'s `basicNpcResolver` deleted; the interceptor draws the villain point for a non-player attacker directly. Act-detection reads `if.event.taken`/`if.event.attacked` only.

### Migration and test repair
Loader, zoo tutorial, devkit fixture, and the six `story-loader` suites that drove the real `NpcPlugin` (`adr-320-phase8`, `adr-320-phase10-threads`, `character-dialogue`, `character-loading`, `gatehouse`, `npc-behaviors`) moved onto the engine's actor phase via new `tests/helpers/boot-engine.ts` (a real `GameEngine`, `setStory`, `getById('sharpee.engine.actors')`) — stayed real-path. Twelve other loader test stubs gained `getNpcService: () => createNpcService()`. First test run surfaced 4 stdlib, 4 engine, and ~60 story-loader failures; fixed via a going-golden location assertion, ADR-203 AC-1/2/4 rewritten onto the real `going` action, a real `PerceptionService` in the engine test, and two alias-catalog entries.

## Key Decisions

### 1. Behaviors act through the context, not by returning a list
A returned `NpcAction` list can't observe a refusal. `act`/`narrate` as void-returning context methods let a behavior branch on the real `ActResult`. `narrate` is deliberately just `game.message` sourced by the NPC at its room — presence and voice come for free from the existing pipeline.

### 2. The actor turn phase is an engine-internal `TurnPlugin`, not a bare engine method
Follows the `SceneEvaluationPlugin` precedent; no `TurnPluginContext` change needed, and save state stays under the existing `pluginStates` mechanism.

### 3. `TurnResult.refused` added as a distinct field
`success` cannot represent a `blocked()` rejection (e.g. `take_blocked` carries no `blocked: true`), so a caller reading only `success` would report a refusal as success.

### 4. `killPlayer` guards on the `dead` flag, not `isAlive`
The `isAlive`/health-≤0 guard silenced the canonical `if.event.player.died` event on every combat-death path — a latent bug the resolver had been working around by hand, uncovered while migrating basic-combat onto the interceptor.

### 5. Root `npx tsc --noEmit` is vacuous
Discovered this session: the root `tsconfig.json` is `files: []` with only project references, so it type-checks nothing. Prior sessions' "root tsc clean" evidence lines were empty evidence; per-package `tsc --noEmit -p tsconfig.json` is the real check going forward.

## Next Phase
- **Phase 6a**: "D6 — Dungeo's four lighter NPCs rewrite onto the pipeline" (troll, robot, cyclops, dungeon-master) — rewrite each `NpcBehavior` to emit `(action, actorId)` invocations directly instead of the now-deleted `NpcAction` shape, and fold Dungeo's `meleeNpcResolver` into its combat interceptor the way basic-combat did.
- **Tier**: Large (300 tool-call budget)
- **Entry state**: Phase 5 shipped — the shape is `onTurn(context): void` with `context.act(IFActions.X, { directObject | direction })` and `context.narrate(...)`; `onSpokenTo`/`onAttacked` no longer exist (they were dead code, not to be ported).

## Open Items

### Short Term
- Phase 6a/6b: Dungeo's four remaining NPCs and `meleeNpcResolver` migration (plan entry-state addendum has the file-by-file map).
- Phase 6c: `docs/` book chapter 20 snippets and `tutorials/familyzoo/*/package.json` still depend on `@sharpee/plugin-npc`.

### Long Term
- `@sharpee/plugin-npc` is still published to npm; deprecating it is David's manual step.
- ADR-327 AC-5 real-path test (the `change the player to` PC-switch half) is still owed — carried forward from Phase 4, confirmed this session as not landing in Phase 5 or 6 either.

## Files Modified

**stdlib — npc decision layer & actions** (14 files):
- `packages/stdlib/src/npc/{types,npc-service,behaviors,npc-messages,index}.ts` - decision/execution split
- `packages/stdlib/src/actions/{enhanced-context,enhanced-types,index}.ts`, `helpers/{dialogue-selector,exit-legality}.ts` - actor context plumbing, `canActorLeave`
- `packages/stdlib/src/actions/standard/going/going.ts` - witnessed-move narration
- `packages/stdlib/src/death/kill-player.ts` - guard moved to `dead` flag
- `packages/stdlib/tests/{integration/npc-attribution-realpath,unit/actions/exit-legality,unit/actions/going-golden,unit/npc/npc-service}.test.ts` - updated
- `packages/stdlib/tests/unit/actions/going-witnessed.test.ts` - new (3 tests)

**engine — actor turn phase** (9 files):
- `packages/engine/src/{action-context-factory,command-executor,game-engine,index,save-restore-service,types}.ts` - `getNpcService()`, `ActorCommand.direction`, `TurnResult.refused`, save alias
- `packages/engine/src/actor-turn-plugin.ts` - new, engine-owned `TurnPlugin` (id `sharpee.engine.actors`)
- `packages/engine/tests/actor-turn-plugin.test.ts` - new (7 REAL-PATH tests)
- `packages/engine/tests/test-helpers/setup-test-engine.ts` - updated

**basic-combat** (5 files):
- `packages/extensions/basic-combat/src/{basic-combat-interceptor,combat-service,index}.ts`, `README.md` - onto the interceptor
- `packages/extensions/basic-combat/src/basic-npc-resolver.ts` + its test - deleted
- `packages/extensions/basic-combat/tests/npc-attack-through-attacking.test.ts` - new (3 REAL-PATH tests)

**plugin-npc — dissolved** (7 files, all deleted):
- `packages/plugin-npc/{README.md,dist-npm,package.json,src/index.ts,src/npc-plugin.ts,tsconfig.esm.json,tsconfig.json}`

**story-loader — migration** (20 files):
- `packages/story-loader/{package.json,src/loader.ts,src/message-alias-map.ts}` - auto-wiring migrated
- `packages/story-loader/tests/helpers/boot-engine.ts` - new (real-`GameEngine` test harness)
- 17 existing suites updated for `getNpcService` stubs / real-engine boot, including the six that stayed real-path: `adr-320-phase8`, `adr-320-phase10-threads`, `character-dialogue`, `character-loading`, `gatehouse`, `npc-behaviors`

**lang-en-us, character, chord** (6 files):
- `packages/lang-en-us/src/{actions/going,npc/npc}.ts`, `tests/actor-voice.test.ts`
- `packages/character/src/act-detection/act-detection.ts`, `tests/{act-detection/act-detection,tick-phases/character-model-phase}.test.ts`
- `packages/chord/src/message-alias-catalog.ts`

**umbrella, package configs, lockfile** (14 files):
- `packages/sharpee/{package.json,src/index.ts,src/runtime-surface.ts,tsconfig.json}` and 7 regenerated `docs/genai-api/*.md`
- `packages/{bridge,runtime,story-runtime-baseline}/package.json`+`tsconfig.json`, `story-runtime-baseline/src/index.ts`
- `packages/devkit/fixtures/basic-story/{package.json,src/index.ts,src/npcs.ts}`
- `stories/dungeo/{package.json,tsconfig.esm.json,tsconfig.json}`, `stories/family-zoo-tutorial/{package.json,src/characters.ts,src/index.ts}`
- `tools/repokit/src/repo.ts`, `pnpm-lock.yaml`

**docs** (4 files):
- `docs/architecture/adrs/{adr-178-story-runtime-baseline,adr-328-actors-are-a-platform-concept}.md`
- `docs/core-concepts/README.md` (corrected the "plugs into the turn cycle" line)
- `docs/work/adr-328-actors-platform-concept/plan.md`

## Notes

**Session duration**: ~2 hours (21:19–23:10 CDT approx.)

**Approach**: Presented a 12-point split-boundary design to David before any edit (per the plan's own child-artifact requirement); David accepted all twelve ("keep going"). Implemented in one pass, then repaired the ~68 test failures the cutover surfaced across three packages before re-running the full suite matrix and a bundle smoke test.

**Nothing committed yet** — a commit follows this summary in the current session.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (nothing pushed; branch tracks `origin/feat/adr-321-world-index` with these changes staged/unstaged, not yet committed)

## Dependency/Prerequisite Check

- **Prerequisites met**: Phases 3-4 shipped (the programmatic execution entry and the full standard-action actor sweep) — Phase 5 builds directly on `executeAsActor` and `context.actor`.
- **Prerequisites discovered**: None beyond what the plan's entry-state notes already carried forward (ADR-327 AC-5).

## Architectural Decisions

- ADR-328 D5 amended in-session: the NPC tick's home is the engine (confirmed by David 2026-08-27 against `CLAUDE.md`'s Logic Location table), and D4 is amended to note `lang-en-us/src/npc/npc.ts` keeps three behavior lines rather than the interim third-person dialect the ADR originally said must not be built.
- Pattern applied: decision layer emits intent through a context (`act`/`narrate`); engine owns execution via a `TurnPlugin`, following the existing `SceneEvaluationPlugin` precedent.
- No `NpcAction` compatibility shim was kept — dissolve, not adapt, per David's standing "we don't keep compatibility layers" ruling (session 8ae644).

## Mutation Audit

- Files with state-changing logic modified: `packages/stdlib/src/npc/npc-service.ts`, `packages/stdlib/src/npc/behaviors.ts`, `packages/engine/src/actor-turn-plugin.ts`, `packages/stdlib/src/death/kill-player.ts`, `packages/stdlib/src/actions/standard/going/going.ts`, `packages/extensions/basic-combat/src/basic-combat-interceptor.ts`.
- Tests verify actual state mutations (not just events): YES (evidence: `mutation-verification` agent completed 2026-08-29T02:53:38Z / 21:53:38 CDT — reported clean, 24 sites reviewed, no RED/YELLOW findings; run after the last source edit to the files above).
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — this session's own finding (root `tsc --noEmit` being vacuous) is new; no prior session summary in `docs/context/` flags it.

## Test Coverage Delta

- Tests added: `going-witnessed.test.ts` (3), `actor-turn-plugin.test.ts` (7, REAL-PATH), `npc-attack-through-attacking.test.ts` (3, REAL-PATH), `npc-service.test.ts` rewritten (25), `exit-legality` +4 `canActorLeave` cases, `lang-en-us` +3 template tests.
- Tests passing before: stdlib 1656 / engine 672 / story-loader 970 / character 570 (Phase 4 close, session a19b44, 2026-08-28 20:00–20:35 CDT) → after: stdlib 1660 / engine 679 / story-loader 971 / character 570 (evidence: plan.md Phase 5 status line, runs 2026-08-28 21:35–21:55 CDT after the last source edit; corroborated by this session's build-pass events in `.devarch-events-1d6ae5.jsonl` at budget 200-205, timestamped 2026-08-29T02:52:23–02:52:55Z / 21:52–21:55 CDT). Also passing this session, no prior-phase baseline to diff against: basic-combat 32, chord 1064, lang-en-us 447, baseline 8, plugins 13.
- Known untested areas: ADR-327 AC-5 (PC-switch) has no real-path test on either half — carried forward, not this phase's territory.

---

**Progressive update**: Session completed 2026-08-28 23:10 CDT (approx.)
