# Session Summary: 2026-04-04 - feature/adr-141-character-model (CST)

## Goals
- Implement ADR-141 Character Model in full: vocabulary types and CharacterModelTrait (world-model), observation and state update system (stdlib), fluent builder package (@sharpee/character), and end-to-end integration test

## Phase Context
- **Plan**: `docs/work/adr-141/plan-20260404-character-model.md` — ADR-141 Character Model Implementation
- **Phase executed**: All 4 phases — Phase 1 "Vocabulary Types and CharacterModelTrait" (Medium), Phase 2 "Observation Handler and State Update System" (Medium), Phase 3 "@sharpee/character Builder Package" (Large), Phase 4 "Integration Test" (Small)
- **Tool calls used**: Full session budget across all phases
- **Phase outcome**: All phases completed on budget

## Completed

### Phase 1: Vocabulary Types and CharacterModelTrait (world-model)
- Created `packages/world-model/src/traits/character-model/` directory with 3 files
- `character-vocabulary.ts`: all string literal union types (`PersonalityTrait`, `DispositionWord`, `Mood`, `ThreatLevel`, `CognitiveProfile` dimensions, `ConfidenceWord`, `FactSource`), intensity-to-value maps, parsing functions, valence-arousal mood coordinates, nearest-mood resolver
- `characterModelTrait.ts`: full trait class with personality, per-entity disposition, valence-arousal mood, threat (0-100), cognitive profile (5 dimensions), knowledge (facts with source/confidence/turn), beliefs (with resistance), goals (priority-sorted), lucidity windows, perception filters, hallucinated events, and predicate registry with all platform predicates registered at construction
- `index.ts`: barrel exports
- `CharacterModelTrait` registered as `CHARACTER_MODEL` in the ADVANCED category in `trait-types.ts`, `implementations.ts`, and `all-traits.ts`
- 54 unit tests — all passing

### Phase 2: Observation Handler and State Update (stdlib)
- Created `packages/stdlib/src/npc/character-messages.ts` — semantic message IDs for lucidity shift, hallucination onset, mood/threat/disposition changes, and fact learned; no English strings
- Created `packages/stdlib/src/npc/character-observer.ts` — `observeEvent()` with cognitive filtering (`filterPerception`), hallucination injection, default state transition rules table, lucidity trigger evaluation, and observable behavior event emission
- Created `packages/stdlib/src/npc/lucidity-decay.ts` — `processLucidityDecay()` for end-of-turn window countdown, `enterLucidityWindow()` helper, `DECAY_RATE_TURNS` mapping by cognitive profile dimension
- Wired `processLucidityDecay` into `NpcService.tick()` for all NPCs carrying `CharacterModelTrait`
- Added character-model exports to world-model `index.ts`
- 34 unit tests — all passing

### Phase 3: @sharpee/character Builder Package (new package)
- Created `packages/character/` package from scratch with full workspace wiring (`pnpm-workspace.yaml`, `package.json`, `tsconfig.json`, `build.sh` order entry after stdlib)
- `character-builder.ts`: fluent `CharacterBuilder` with `.personality()`, disposition shortcuts (`.loyalTo()`, `.likes()`, `.trusts()`, `.dislikes()`, `.distrusts()`), `.mood()`, `.threat()`, `.cognitiveProfile()` (preset names or partial overrides), `.knows()`, `.believes()`, `.goal()`, `.lucidity()`, `.filters()`, `.perceives()`, `.on()` trigger chains (`.becomes()`, `.feelsAbout()`, `.shift()`, `.becomesLucid()`) with auto-finalize, `.definePredicate()`, `.withVocabulary()`, `.compile()`
- `cognitive-presets.ts`: all 8 ADR-141 condition profiles as documented examples
- `vocabulary-extension.ts`: `defineMood()` and `definePersonality()` for story-specific vocabulary extension
- `apply.ts`: `applyCharacter()` helper to apply compiled trait data to a world-model entity
- `index.ts`: public exports
- 36 unit tests — all passing

### Phase 4: End-to-End Integration Test
- Full lifecycle test: Margaret (PTSD profile) → apply → observe violence event (amplified, filtered perception) → threat/mood/lucidity update → decay to baseline over turns → kindness event improves disposition
- Schizophrenic Eleanor: augmented perception with hallucination injection verification
- PTSD James: filtered perception correctly skips quiet/non-threatening events
- `NpcTrait` + `CharacterModelTrait` coexistence on the same entity verified
- 4 integration tests — all passing

### Documentation
- Created `docs/reference/character-model.md` — comprehensive guide covering builder API, observation system, predicates, vocabulary extension, and default state transition rules

## Key Decisions

### 1. CharacterModelTrait as Additive, Not Replacement
`CharacterModelTrait` is a separate opt-in trait alongside `NpcTrait`, mirroring `CombatantTrait`. This preserves backward compatibility and keeps `NpcTrait` as a clean structural marker for the NPC turn cycle. NPCs without `CharacterModelTrait` are unaffected.

### 2. CHARACTER_MODEL Registered as First-Class ADVANCED Trait
Rather than using a string literal type to avoid touching centralized registration, `CHARACTER_MODEL` was added to the ADVANCED category in all trait registries. This makes it a fully recognized platform concept discoverable by existing tooling.

### 3. Predicate Thresholds Use >= with THREAT_VALUES
Platform predicates (`'threatened'`, `'hostile'`, etc.) use `>=` comparisons against `THREAT_VALUES` word-to-number map, ensuring predicate word alignment with disposition word ranges is consistent throughout.

### 4. Cognitive Presets as Documented Examples, Not Platform Constants
The 8 condition profiles (schizophrenic, ptsd, dementia, etc.) are documented examples in `cognitive-presets.ts`, per the ADR's stated intent. Stories may define their own without forking the platform.

### 5. TriggerBuilder Auto-Finalizes
The `.on()` fluent chain on `TriggerBuilder` auto-finalizes when `.on()` is called again (starting a new trigger) or when `.compile()` is invoked, preventing hanging open trigger chains.

## Next Phase
Plan complete — all 4 phases done. ADR-142 (Conversation System) can layer on top of the character model when ready. The predicate registry and disposition system provide natural hooks for conversation state.

## Open Items

### Short Term
- ADR-142 Conversation System: can use `CharacterModelTrait.disposition` and `.evaluate()` as conversational guard conditions
- dungeo NPCs: Margaret, the troll, and recurring characters could benefit from `CharacterModelTrait` for richer behavior

### Long Term
- Consider lang-en-us entries for `character-messages.ts` message IDs to produce default English output for state change events
- `NpcTrait.knowledge` (loose `Record<string, unknown>`) could be formally deprecated in favor of `CharacterModelTrait.knowledge` for NPCs that use the full model

## Files Modified

**world-model — new files** (3 files):
- `packages/world-model/src/traits/character-model/character-vocabulary.ts` — all vocabulary types, maps, and mood coordinate helpers
- `packages/world-model/src/traits/character-model/characterModelTrait.ts` — full trait implementation with state and predicate registry
- `packages/world-model/src/traits/character-model/index.ts` — barrel exports

**world-model — modified** (4 files):
- `packages/world-model/src/traits/trait-types.ts` — added `CHARACTER_MODEL`
- `packages/world-model/src/traits/implementations.ts` — registered `CharacterModelTrait`
- `packages/world-model/src/traits/all-traits.ts` — added to comprehensive traits list
- `packages/world-model/src/index.ts` — added character-model exports

**stdlib — new files** (3 files):
- `packages/stdlib/src/npc/character-messages.ts` — semantic message IDs
- `packages/stdlib/src/npc/character-observer.ts` — observation handler and perception filtering
- `packages/stdlib/src/npc/lucidity-decay.ts` — end-of-turn lucidity decay processing

**stdlib — modified** (1 file):
- `packages/stdlib/src/npc/npc-service.ts` — wired `processLucidityDecay` into `tick()`

**character package — new files** (6 files):
- `packages/character/src/character-builder.ts` — fluent builder API
- `packages/character/src/cognitive-presets.ts` — 8 condition profiles
- `packages/character/src/vocabulary-extension.ts` — story vocabulary extension helpers
- `packages/character/src/apply.ts` — `applyCharacter()` helper
- `packages/character/src/index.ts` — public exports
- `packages/character/package.json`, `tsconfig.json` — package wiring

**documentation** (1 file):
- `docs/reference/character-model.md` — comprehensive guide

**build** (1 file):
- `build.sh` — added `@sharpee/character` to build order after stdlib

## Notes

**Session duration**: ~1 full work session (several hours)

**Approach**: Plan-driven implementation across 4 strictly sequential phases. Each phase depended on the previous layer being complete. world-model types first, stdlib observation system second, new builder package third, integration test last.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (branch not yet merged to main)

## Dependency/Prerequisite Check

- **Prerequisites met**: `NpcTrait` and `CombatantTrait` patterns available as architectural reference; ADR-141 fully specified before implementation began; `NpcService.tick()` had a documented extension point for per-NPC processing
- **Prerequisites discovered**: `NpcTrait.knowledge` (loose Record) already existed — `CharacterModelTrait` supersedes it with typed `Map<string, Fact>` for NPCs that use the full model; no migration required

## Architectural Decisions

- [ADR-141]: CharacterModelTrait as additive opt-in trait alongside NpcTrait — preserves backward compatibility while enabling rich internal state
- Pattern applied: Additive trait composition (same pattern as CombatantTrait per ADR-090)
- Predicate registry uses plain property access, not getter methods, to survive `loadJSON()` deserialization safely (same constraint as CombatantTrait)
- Default state transition rules authored as a data table (`eventType → { moodDelta, threatDelta, dispositionDelta }`) so stories can override without forking the handler

## Mutation Audit

- Files with state-changing logic modified: `characterModelTrait.ts` (setDisposition, adjustDisposition, setMood, setThreat, addFact, addBelief), `character-observer.ts` (observeEvent mutates trait state), `lucidity-decay.ts` (processLucidityDecay mutates lucidity fields), `npc-service.ts` (tick calls decay)
- Tests verify actual state mutations (not just events): YES — Phase 1 tests assert on trait field values after mutations; Phase 2 tests assert on actual trait field values (mood, threat, disposition) after `observeEvent`; Phase 4 integration tests verify post-observation and post-decay field values

## Recurrence Check

- Similar to past issue? NO — first implementation of character model; no prior sessions with CharacterModelTrait

## Test Coverage Delta

- Tests added: 128 (54 world-model + 34 stdlib + 36 character builder + 4 integration)
- Tests passing before: baseline (no prior character model tests)
- Tests passing after: all 128 new tests passing
- Known untested areas: lang-en-us text output for character state change message IDs (message IDs defined, English strings not yet added)

---

**Progressive update**: Session completed 2026-04-04 22:38 CST
