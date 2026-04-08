# Session Summary: 2026-04-07 - feature/npc-behavior-chain (CST)

## Goals
- Complete Phase 6 (Large): Propagation builder, Goal builder, Movement builder, and full Influence system (ADR-146)
- Complete Phase 7 (Medium): lang-en-us messages, NpcService tick wiring, save/restore audit, and integration test

## Phase Context
- **Plan**: docs/work/npc-behavior-chain/plan-20260406-npc-behavior-chain.md
- **Phase executed**: Phase 6 — "Propagation Builder API, Goal Builder API, Influence System" (Large) and Phase 7 — "End-to-End Integration, lang-en-us, Save/Restore" (Medium)
- **Tool calls used**: 436 / 650 (Phase 6 budget: 400, Phase 7 budget: 250)
- **Phase outcome**: Both phases completed on budget

## Completed

### Phase 6 — Propagation Builder API
- `packages/character/src/propagation/builder.ts` — `.propagation(opts)` on CharacterBuilder accepts full PropagationOptions and returns PropagationProfile stored in compiled output
- 7 tests covering round-trip compile→apply, pace settings, coloring, overrides

### Phase 6 — Goal Builder API
- `packages/character/src/goals/builder.ts` — replaced stub `.goal(id, priority)` with fluent `.goal(id)` returning GoalBuilder chain
- GoalBuilder chain: `activatesWhen`, `priority`, `mode`, `pursues`, `actsWhen`, `act`, `interruptedBy`, `onInterrupt`, `resumeOnClear`
- Legacy `.goal(id, number)` overload preserved for backward compatibility
- 11 tests

### Phase 6 — Movement Profile Builder
- `.movement(opts)` on CharacterBuilder for `knows` and `access` settings
- 6 tests

### Phase 6 — Influence System (ADR-146, full implementation)
- `influence-types.ts` — InfluenceMode, InfluenceRange, InfluenceDuration, InfluenceEffect, InfluenceDef, ResistanceDef, ActiveInfluenceEffect, InfluenceResult
- `influence-evaluator.ts` — `evaluatePassiveInfluences` (per-room, each NPC turn), `evaluateActiveInfluence` (on-demand for goal steps and direct calls), `checkResistance` (binary with except conditions)
- `influence-duration.ts` — InfluenceTracker class with track/expire/serialize; handles 'while present', 'momentary', 'lingering' durations
- `pc-influence.ts` — `evaluatePcInfluence` checks focus:clouded and fires onPlayerAction message
- `builder.ts` — `.influence(name)` returning InfluenceBuilder chain and `.resistsInfluence(name, opts?)` on CharacterBuilder
- 31 tests for influence system, 18 for builder API

### Phase 6 — applyCharacter Return Type Change
- `applyCharacter` now returns `AppliedCharacter` with trait + propagationProfile + goalDefs + movementProfile + influenceDefs + resistanceDefs
- Breaking change: callers must use `const { trait } = applyCharacter(...)` instead of direct assignment
- Updated all existing tests to destructure `{ trait }`
- 3 round-trip tests added

### Phase 7 — Message IDs
- `ConversationMessages` (17 IDs) in `@sharpee/character`
- `PropagationMessages` (6 IDs) in `@sharpee/character`
- `InfluenceMessages` (6 IDs) in `@sharpee/character`

### Phase 7 — lang-en-us Message Text
- `packages/lang-en-us/src/npc/conversation.ts` — platform defaults for conversation response actions
- `packages/lang-en-us/src/npc/propagation.ts` — platform defaults per propagation coloring
- `packages/lang-en-us/src/npc/influence.ts` — platform defaults for witnessed/resisted influence messages
- All registered in LanguageProvider

### Phase 7 — NpcService Tick Wiring
- Added `registerTickPhase(name, handler)` to NpcService — tick phase handler pattern avoiding circular dependency between stdlib and character packages
- `CharacterPhaseRegistry` created in `@sharpee/character/tick-phases.ts`
- Factory functions: `createPropagationPhase()`, `createGoalPhase()`, `createInfluencePhase()`
- Story wires phases via registry; NpcService remains dependency-free of character package

### Phase 7 — Save/Restore Audit
- CharacterPhaseRegistry.toJSON()/restoreState() round-trips GoalManager state, InfluenceTracker effects, and AlreadyToldRecord
- 5 round-trip tests

### Phase 7 — Integration Test Story Fragment
- `packages/character/tests/integration/mystery-fragment.test.ts`
- 3 NPCs: maid (chatty propagator), cook (selective), colonel (ruthless killer)
- Exercises all four ADR builder APIs end-to-end
- Covers: ask → constraint evaluate → ResponseIntent; fact propagation with provenance; goal activation → step execution; influence clearing conversation context
- 5 integration tests

## Key Decisions

### 1. Tick Phase Handler Pattern
NpcService accepts registered phase handlers instead of importing from @sharpee/character directly. This eliminates a circular dependency (stdlib imports character; character would import stdlib for NpcService). CharacterPhaseRegistry lives entirely in @sharpee/character and exposes phase factory functions. Story code wires them together in initializeWorld().

### 2. applyCharacter Return Type Change
applyCharacter now returns AppliedCharacter (object) rather than the bare CharacterModelTrait. This is a breaking change for any callers using `const trait = applyCharacter(...)`. All existing tests updated to `const { trait } = applyCharacter(...)`. The richer return type is required because propagation profiles, goal defs, and influence defs need to be applied separately from the trait during NPC initialization.

### 3. GoalBuilder Generic TParent Pattern
GoalBuilder uses `TParent` generic (same as InfluenceBuilder) to allow `.compile()` convenience method from the builder chain. This keeps the builder API consistent across all four ADRs implemented in this branch.

## Next Phase
Plan complete — all phases done. Branch is ready for PR to main.

## Open Items

### Short Term
- PR to main: feature/npc-behavior-chain → main
- Review if any story-level NPC examples (dungeo) should use the new builder APIs

### Long Term
- Performance profiling of NpcService.tick() with many NPCs and all four phases active
- Stryker mutation testing coverage for influence evaluator (currently not covered by Stryker config)

## Files Modified

**New files — character package** (20 files):
- `packages/character/src/propagation/builder.ts` — PropagationOptions builder API
- `packages/character/src/propagation/propagation-messages.ts` — PropagationMessages IDs
- `packages/character/src/goals/builder.ts` — GoalBuilder fluent chain
- `packages/character/src/influence/index.ts` — influence barrel export
- `packages/character/src/influence/influence-types.ts` — all influence type definitions
- `packages/character/src/influence/influence-evaluator.ts` — passive/active evaluation
- `packages/character/src/influence/influence-duration.ts` — InfluenceTracker
- `packages/character/src/influence/pc-influence.ts` — PC influence handling
- `packages/character/src/influence/builder.ts` — InfluenceBuilder API
- `packages/character/src/influence/influence-messages.ts` — InfluenceMessages IDs
- `packages/character/src/conversation/conversation-messages.ts` — ConversationMessages IDs
- `packages/character/src/tick-phases.ts` — CharacterPhaseRegistry + phase factories
- 7 test files across propagation, goals, influence, and integration directories

**New files — lang-en-us** (3 files):
- `packages/lang-en-us/src/npc/conversation.ts` — conversation message text
- `packages/lang-en-us/src/npc/propagation.ts` — propagation message text
- `packages/lang-en-us/src/npc/influence.ts` — influence message text

**Modified files — character package** (6 files):
- `packages/character/src/character-builder.ts` — added .propagation(), .movement(), .influence(), .resistsInfluence(), fluent .goal(id)
- `packages/character/src/apply.ts` — returns AppliedCharacter; applies all new profile types
- `packages/character/src/index.ts` — new exports for influence, tick-phases, message IDs
- `packages/character/src/conversation/index.ts` — adds ConversationMessages export
- `packages/character/src/propagation/index.ts` — adds PropagationMessages, builder export
- `packages/character/src/goals/index.ts` — adds GoalBuilder export

**Modified files — stdlib** (2 files):
- `packages/stdlib/src/npc/npc-service.ts` — added registerTickPhase()
- `packages/stdlib/src/npc/index.ts` — exports registerTickPhase

**Modified files — lang-en-us** (2 files):
- `packages/lang-en-us/src/language-provider.ts` — registers NPC message namespaces
- `packages/lang-en-us/src/npc/index.ts` — exports conversation/propagation/influence modules

**Modified files — planning** (1 file):
- `docs/work/npc-behavior-chain/plan-20260406-npc-behavior-chain.md` — all phases marked DONE

## Notes

**Session duration**: ~8 hours (phases 6 and 7 in same session)

**Approach**: Phase 6 implemented influence system bottom-up (types → evaluator → duration → PC handling → builder), then added propagation and goal builders. Phase 7 added message IDs, lang-en-us text, tick wiring, save/restore, and integration test top-down from story perspective.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: Phases 1-5 complete (conversation, propagation evaluators, goal evaluators, pathfinding); ADR-141 CharacterModelTrait foundation available; NpcService.tick() extensible
- **Prerequisites discovered**: None — plan fully specified all dependencies

## Architectural Decisions

- Tick phase handler pattern: NpcService decoupled from @sharpee/character via registered phase handlers — avoids circular dependency (stdlib ↔ character)
- applyCharacter return type broadened to AppliedCharacter — breaking change documented and all callers updated
- GoalBuilder uses TParent generic for consistent builder chaining pattern across all four ADRs
- Pattern applied: CharacterPhaseRegistry follows the same registry pattern as TopicRegistry (ADR-142 layer 1)

## Mutation Audit

- Files with state-changing logic modified: influence-evaluator.ts, influence-duration.ts, fact-transfer.ts, apply.ts, npc-service.ts
- Tests verify actual state mutations (not just events): YES
- Integration tests verify CharacterModelTrait.knowledge updated with correct provenance after propagation; InfluenceTracker.effects updated after passive influence; GoalManager step index advances after step evaluation

## Recurrence Check

- Similar to past issue? NO

## Test Coverage Delta

- Tests added: +86 (character package: 215 → 301)
- Tests passing before: stdlib 1122, character 215
- Tests passing after: stdlib 1122, character 301
- Known untested areas: Stryker mutation coverage not run for influence evaluator; walkthrough chain passes (RNG-dependent thief combat re-run confirmed clean)

---

**Progressive update**: Session completed 2026-04-07 21:21
