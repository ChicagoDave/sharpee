# Session Summary: 2026-04-07 - feature/npc-behavior-chain (CST)

## Goals
- Create a 7-phase implementation plan for the NPC behavior chain (ADR-142, ADR-144, ADR-145, ADR-146)
- Implement Phases 1-5: Conversation types through Goal pathfinding
- Achieve all tests GREEN with state-mutation assertions throughout

## Phase Context
- **Plan**: `docs/work/npc-behavior-chain/plan-20260406-npc-behavior-chain.md`
- **Phase executed**: Phases 1-5 — Conversation Types, Lifecycle, Builder API, Information Propagation, Goal Pursuit (all Medium tier)
- **Tool calls used**: Not tracked
- **Phase outcome**: Phases 1-5 completed; Phases 6-7 remain PENDING

## Completed

### Planning
Created 7-phase implementation plan at `docs/work/npc-behavior-chain/plan-20260406-npc-behavior-chain.md` covering the full NPC intelligence stack across ADR-142 (Conversation), ADR-144 (Information Propagation), ADR-145 (Goal Pursuit), and ADR-146 (Influence).

### Phase 1: Conversation Types, Topic Registry, Constraint Evaluation (ADR-142 layers 1-2)
- `packages/character/src/conversation/response-types.ts` — ResponseAction union, ResponseCandidate, ResponseIntent, ConversationRecord, EvidenceRecord
- `packages/character/src/conversation/topic-registry.ts` — TopicDef, TopicRegistry with exact keyword matching and neighborhood fallback
- `packages/character/src/conversation/constraint-evaluator.ts` — evaluateConstraints (first-match-wins), ConstraintEvaluator (response recording, contradiction detection, evidence tracking, serialization)
- 40 tests

### Phase 2: Conversation Lifecycle, Attention, ACL (ADR-142 layers 3-4)
- `packages/character/src/conversation/lifecycle.ts` — ConversationLifecycle with intent/strength/decay, attention shifts (yields/protests/blocks), between-turn commentary, continuation scheduling, initiative triggers, serialization
- `packages/character/src/conversation/acl.ts` — buildResponseIntent, selectMoodVariant, applyCognitiveColoring
- 50 tests

### Phase 3: Conversation Builder API and DialogueExtension (ADR-142 layers 5-6)
- `packages/character/src/conversation/dialogue-types.ts` — DialogueExtension interface, DialogueResult type (from ADR-102)
- `packages/character/src/conversation/builder.ts` — ConversationBuilder extending CharacterBuilder: .topic(), .when().if().tell()/.lie()/.confess() fluent chain, .setsContext(), .betweenTurns(), .updatesState(), .initiates(), .offscreen(), .witnessed()
- `packages/character/src/conversation/dialogue-extension.ts` — CharacterModelDialogue implementing DialogueExtension: handleAsk (resolve/evaluate/record/intent), handleTell (confrontation with state mutations), handleTalkTo (lifecycle + initiative), handleSay
- 30 tests

### Phase 4: Information Propagation — Profile, Evaluation, Fact Transfer (ADR-144 layers 1-3)
- `packages/character/src/propagation/propagation-types.ts` — Tendency/Audience/Pace/Coloring vocabularies, PropagationProfile, PropagationTransfer, AlreadyToldRecord
- `packages/character/src/propagation/propagation-evaluator.ts` — evaluatePropagation: mute check, schedule, eligible listeners, eligible facts, pace
- `packages/character/src/propagation/fact-transfer.ts` — transferFact with provenance, "as fact" vs "as belief" receiving, applyTransfers batch
- 23 tests

### Phase 5: Propagation Visibility, Goal Activation, Pathfinding (ADR-144 layer 4, ADR-145 layers 1-3)
- `packages/character/src/propagation/visibility.ts` — Three modes: absent (silent), present (witnessed by coloring), concealed (player learns)
- `packages/character/src/goals/goal-types.ts` — GoalPriority, PursuitMode, 8 step types, GoalDef, ActiveGoal, MovementProfile
- `packages/character/src/goals/goal-activation.ts` — GoalManager: activation from predicates, interruption/resumption, priority queue, serialization
- `packages/character/src/goals/step-evaluator.ts` — evaluateGoalStep: sequential/opportunistic/prepared modes
- `packages/character/src/goals/pathfinding.ts` — BFS over room graph filtered by movement profile (knows/access)
- 32 tests

## Key Decisions

### 1. DialogueExtension stays in @sharpee/character
The DialogueExtension interface was defined in `@sharpee/character` rather than moving it upstream to `@sharpee/world-model`. Rationale: it is currently the only consumer; the interface can migrate later without breaking callers if a second consumer appears. Avoids premature abstraction.

### 2. NpcService.tick() integration deferred to Phase 6/7
All five Phase 1-5 modules implement pure evaluation functions with no engine coupling. This allowed all 215 tests to be written against isolated logic without requiring engine scaffolding. NpcService integration wires up the evaluation pipeline in Phase 7.

### 3. Pathfinding is narrative, not mechanical
The BFS pathfinder in Phase 5 filters room traversal by MovementProfile (rooms the NPC knows about and has access to), per ADR-145. NPCs do not find globally optimal paths — they find paths through their known world. This prevents NPCs from exploiting map knowledge the player wouldn't expect them to have.

## Next Phase
- **Phase 6** (Large): Propagation builder, goal builder, movement builder, full influence system (ADR-146)
- **Phase 7** (Medium): lang-en-us messages, save/restore audit, end-to-end integration test story fragment, NpcService.tick() wiring
- **Entry state for Phase 6**: Phases 1-5 green; `@sharpee/character` compiles cleanly; no NpcService integration yet

## Open Items

### Short Term
- Phase 6: PropagationBuilder, GoalBuilder, MovementBuilder fluent APIs; full influence system (InfluenceProfile, InfluenceEffect, influence evaluation in tick)
- Phase 7: lang-en-us message IDs for conversation/propagation/goal events; save/restore audit for all new state; integration test story fragment demonstrating full NPC behavior chain end-to-end
- NpcService.tick() phases: propagation evaluation phase, goal step evaluation phase, influence evaluation phase

### Long Term
- Second consumer of DialogueExtension (if needed, migrate interface to @sharpee/world-model)
- ADR-146 influence system: persuasion, intimidation, bribery, favor economy

## Files Modified

**packages/character/src/conversation/** (6 files):
- `response-types.ts` - ResponseAction union, ResponseCandidate, ResponseIntent, ConversationRecord, EvidenceRecord
- `topic-registry.ts` - TopicDef, TopicRegistry with exact and neighborhood matching
- `constraint-evaluator.ts` - First-match-wins constraint evaluation, contradiction detection, evidence tracking
- `lifecycle.ts` - ConversationLifecycle with intent/strength/decay, attention shifts, scheduling
- `acl.ts` - Anti-corruption layer: buildResponseIntent, selectMoodVariant, applyCognitiveColoring
- `dialogue-types.ts` - DialogueExtension interface, DialogueResult type
- `builder.ts` - ConversationBuilder fluent API
- `dialogue-extension.ts` - CharacterModelDialogue: handleAsk, handleTell, handleTalkTo, handleSay
- `index.ts` - Updated exports

**packages/character/src/propagation/** (3 files):
- `propagation-types.ts` - Tendency/Audience/Pace/Coloring vocabularies, PropagationProfile, PropagationTransfer, AlreadyToldRecord
- `propagation-evaluator.ts` - evaluatePropagation with mute/schedule/listener/fact/pace logic
- `fact-transfer.ts` - transferFact with provenance, applyTransfers batch
- `visibility.ts` - Three propagation visibility modes

**packages/character/src/goals/** (4 files):
- `goal-types.ts` - GoalPriority, PursuitMode, 8 step types, GoalDef, ActiveGoal, MovementProfile
- `goal-activation.ts` - GoalManager: activation, interruption, priority queue, serialization
- `step-evaluator.ts` - evaluateGoalStep: sequential/opportunistic/prepared modes
- `pathfinding.ts` - BFS over room graph with movement profile filtering

**packages/character/src/index.ts** - Updated barrel exports

**Test files** (7 new files):
- `tests/conversation/response-types.test.ts`
- `tests/conversation/topic-registry.test.ts`
- `tests/conversation/constraint-evaluator.test.ts`
- `tests/conversation/lifecycle.test.ts`
- `tests/conversation/dialogue-extension.test.ts`
- `tests/propagation/propagation.test.ts`
- `tests/goals/goals.test.ts`

## Notes

**Session duration**: ~8 hours (estimated across the full 5-phase session)

**Approach**: Each phase followed the project's behavior-statement-first pattern: describe what the module DOES/WHEN/BECAUSE/REJECTS WHEN, derive tests from the behavior statement, implement, verify GREEN. All 215 tests assert on actual state mutations (trait fields, registry entries, queue contents, location records) rather than on events or return values alone.

---

## Session Metadata

- **Status**: INCOMPLETE
- **Blocker**: None — clean stopping point between planned phases
- **Blocker Category**: N/A
- **Estimated Remaining**: ~2 sessions (Phase 6 Large, Phase 7 Medium)
- **Rollback Safety**: safe to revert — branch is `feature/npc-behavior-chain`, no merge to main yet

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-141 (CharacterModelTrait, CharacterBuilder, predicate registry) fully implemented; `@sharpee/character` package scaffold in place
- **Prerequisites discovered**: NpcService.tick() integration requires engine-side hooks not yet defined; deferred to Phase 7 by design

## Architectural Decisions

- ADR-142: Conversation system — first-match-wins constraint evaluation, attention strength/decay, ACL translating ResponseIntent to message IDs
- ADR-144: Information propagation — Tendency/Audience/Pace/Coloring as typed vocabularies; fact transfer records provenance chain; three visibility modes (absent/present/concealed)
- ADR-145: Goal pursuit — BFS pathfinding filtered by MovementProfile (narrative, not mechanical); GoalManager with interruption/resumption and priority queue
- Pattern applied: Pure evaluation functions with no engine coupling in Phases 1-5; engine integration deferred to Phase 7

## Mutation Audit

- Files with state-changing logic modified: ConversationLifecycle (intent/strength/decay), ConstraintEvaluator (response recording, contradiction detection), GoalManager (activation/interruption queue), fact-transfer (AlreadyToldRecord updates)
- Tests verify actual state mutations (not just events): YES
- All key mutation paths have postcondition assertions on trait fields, registry contents, and queue state

## Recurrence Check

- Similar to past issue? NO — NPC behavior chain is a new subsystem; prior sessions addressed test suite grading and stdlib action testing

## Test Coverage Delta

- Tests added: 175 (40 Phase 1 + 50 Phase 2 + 30 Phase 3 + 23 Phase 4 + 32 Phase 5)
- Tests passing before: 40 (existing @sharpee/character tests)
- Tests passing after: 215
- Known untested areas: NpcService.tick() integration (Phase 7), lang-en-us message rendering for new intents (Phase 7), end-to-end story fragment (Phase 7)

---

**Progressive update**: Session completed 2026-04-07 01:45 CST
