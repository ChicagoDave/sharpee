# Session Plan: ADR-141 Character Model Implementation

**Created**: 2026-04-04
**Status**: COMPLETE — all 4 phases done (2026-04-04)
**Overall scope**: Implement the three-layer character model defined in ADR-141 — CharacterModelTrait in world-model, observation and state update system in stdlib, and a new @sharpee/character fluent builder package.
**Bounded contexts touched**: world-model (NPC domain state), stdlib (NPC turn cycle and observation), @sharpee/character (new authoring API package)
**Key domain language**: CharacterModelTrait, cognitive profile, disposition, lucidity window, predicate registry, observation handler

## Design Decision: Relationship to NpcTrait

`CharacterModelTrait` is a **separate, additive trait** — not a replacement for `NpcTrait`. An NPC continues to need `NpcTrait` for turn cycle participation (isAlive, isConscious, behaviorId). `CharacterModelTrait` is opt-in depth: adding it to any NPC entity grants rich internal state without disturbing the basic NPC lifecycle. This mirrors the pattern used by `CombatantTrait` — which adds combat stats independently of `NpcTrait`.

This avoids the backward-compatibility hazard of modifying `NpcTrait`, keeps `NpcTrait` a clean structural marker, and makes the character model genuinely optional per the ADR's stated intent.

## Phases

---

### Phase 1: Vocabulary Types and CharacterModelTrait Data Structure (world-model)

- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Character state model — personality, disposition, mood, threat, cognitive profile, knowledge, beliefs, goals
- **Entry state**: Branch `feature/adr-141-character-model` checked out; `packages/world-model/src/traits/npc/` contains only `npcTrait.ts` and `index.ts`
- **Deliverable**:
  - `packages/world-model/src/traits/character/` directory with:
    - `character-vocabulary.ts` — all string literal union types: `PersonalityTrait`, `Intensity`, `PersonalityExpr`, `DispositionWord`, `Mood`, `ThreatLevel`, `PerceptionMode`, `BeliefFormation`, `Coherence`, `Lucidity`, `SelfModel`, `CognitiveProfile`, `ConfidenceWord`; intensity-to-value and disposition-word-to-range maps
    - `character-model-trait.ts` — `CharacterModelTrait` class implementing `ITrait` with all state fields (personality entries, disposition map keyed by entityId, current mood, threat level, cognitive profile, knowledge facts with source/confidence, beliefs, goals with priority); state mutation methods (setDisposition, adjustDisposition, setMood, setThreat, addFact, addBelief, updateGoalPriority); predicate registry (Map of string to `(state: CharacterModelTrait) => boolean`) with platform predicates registered at construction; `evaluate(predicate: string): boolean`
    - `index.ts` — exports
  - `TraitType.CHARACTER_MODEL = 'characterModel'` added to `trait-types.ts`
  - `CharacterModelTrait` added to `implementations.ts` and `all-traits.ts`
  - Unit tests in `packages/world-model/tests/traits/character/` verifying:
    - Personality intensity values resolve correctly
    - Disposition word ranges map to correct internal ranges
    - `evaluate()` returns correct results for all platform predicates
    - State mutation methods update the correct fields
    - Cognitive profile preset 'schizophrenic' produces expected dimension values (these are validated via story-level vocabulary, see Open Question 2 in ADR)
- **Exit state**: `CharacterModelTrait` installs cleanly on any entity; unit tests pass; world-model builds without errors; no changes to `NpcTrait`

---

### Phase 2: Observation Handler and State Update System (stdlib)

- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Observation system — cognitive profile filtering, default state transition rules, lucidity decay, observable behavior events
- **Entry state**: Phase 1 complete; `CharacterModelTrait` is available from `@sharpee/world-model`
- **Deliverable**:
  - `packages/stdlib/src/npc/character-observer.ts` — the observation handler:
    - `observeEvent(npc: IFEntity, event: ISemanticEvent, world: WorldModel, turn: number): ISemanticEvent[]`
    - Retrieves `CharacterModelTrait` from entity (returns early if absent — opt-in)
    - Applies cognitive profile perception filter: `'filtered'` skips filtered event categories; `'augmented'` may inject author-defined hallucinated facts
    - Adds witnessed facts to knowledge with `source: 'witnessed'`
    - Applies default state transition rules (violence events increase threat; gift events improve disposition toward actor; etc.) — authored as a data table of `eventType → { moodDelta, threatDelta, dispositionDelta }` so stories can override without forking the handler
    - Recalculates lucidity if the event matches a lucidity trigger
    - Emits observable behavior events (lucidity shift, hallucination onset, mood swing) when cognitive state changes — these events carry `npc.characterStateChanged` type and are silent by default
  - `packages/stdlib/src/npc/lucidity-decay.ts` — end-of-turn lucidity decay processing:
    - `processLucidityDecay(npc: IFEntity, world: WorldModel, turn: number): ISemanticEvent[]`
    - Checks lucidity field of cognitive profile; if in a lucid window with no sustaining trigger active, decrements by decay rate; returns cognitive profile to baseline when threshold reached
  - Integration: `NpcService.tick()` extended to call `processLucidityDecay` for each active NPC that has a `CharacterModelTrait`; `NpcService.onObserve` hook pattern documented for story-level connection (the ADR-070 `onObserve` hook fires; stories wire it to `observeEvent`)
  - `packages/stdlib/src/npc/character-messages.ts` — message IDs for character state change events (no English strings)
  - Unit tests verifying:
    - `'filtered'` perception correctly misses configured event categories
    - `'augmented'` perception injects hallucinated facts on the same turn
    - Default transition rules update mood and threat fields correctly
    - Lucidity decay returns cognitive profile to baseline after correct number of turns
    - Observable behavior events are emitted on state transitions
    - State mutation is verified against actual trait field values, not just events
- **Exit state**: `observeEvent` and `processLucidityDecay` are callable from NPC behaviors; stdlib builds without errors; unit tests pass

---

### Phase 3: @sharpee/character Builder Package

- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: Character authoring surface — fluent builder API, vocabulary validation, compilation from builder DSL to trait data and event handlers
- **Entry state**: Phases 1 and 2 complete; `CharacterModelTrait` and `observeEvent` are available as imports
- **Deliverable**:
  - New package `packages/character/` with:
    - `package.json` — name `@sharpee/character`, depends on `@sharpee/world-model` and `@sharpee/stdlib`
    - `tsconfig.json` — mirrors pattern of other packages
    - `src/character-builder.ts` — `CharacterBuilder` class implementing the fluent API from ADR-141 section 4:
      - `.personality(...traits: PersonalityExpr[])` — sets personality entries
      - `.knows(topic: string, opts?: { witnessed?: boolean; confidence?: ConfidenceWord })` — adds a fact
      - `.believes(topic: string, opts?)` — adds a belief (may differ from facts)
      - `.loyalTo(entityId: string)` / `.likes(entityId: string)` / `.distrusts(entityId: string)` — shorthand disposition setters
      - `.mood(word: Mood)` — sets starting mood
      - `.threat(word: ThreatLevel)` — sets starting threat
      - `.cognitiveProfile(preset: string | Partial<CognitiveProfile>)` — applies named preset or custom profile
      - `.lucidity(config: LucidityConfig)` — defines lucidity windows with triggers and decay
      - `.perceives(topic: string, opts)` — registers a hallucinated perceived event
      - `.filters(config: FilterConfig)` — registers perception filters and amplifiers
      - `.on(trigger: string)` — returns a `TriggerBuilder` fluent chain for `.becomes()`, `.feelsAbout()`, `.shift()`, `.becomesLucid()`
      - `.definePredicate(name: string, fn: (state: CharacterModelTrait) => boolean)` — registers custom predicate
    - `src/cognitive-presets.ts` — the named preset profiles from the ADR table (schizophrenic, ptsd, dementia, dissociative, tbi, obsessive, intoxicated) as `Partial<CognitiveProfile>` objects with documentation; these are examples, not platform-level constants as ADR specifies
    - `src/compiler.ts` — `compile(builder: CharacterBuilder): { traitData: ICharacterModelData; eventHandlers: CompiledHandler[]; stateRules: CompiledStateRule[] }` — translates builder state into:
      - `CharacterModelTrait` constructor data
      - Event handler functions wired to the `on()` triggers
      - State mutation rules for default transition overrides
    - `src/vocabulary-extension.ts` — `defineMood(name: string, axes: { valence: number; arousal: number })` and `definePersonality(name: string)` for story-specific vocabulary extension
    - `src/index.ts` — public exports
  - Unit tests verifying:
    - Builder methods accumulate state correctly before compilation
    - `compile()` produces correct `CharacterModelTrait` data for personality, disposition, mood, threat
    - Named cognitive presets compile to the expected dimension values from the ADR table
    - Lucidity config compiles to trigger rules with correct transition timing (immediate vs. next turn)
    - `.on()` trigger chain compiles to event handlers that invoke the correct `CharacterModelTrait` mutations
    - `defineMood()` and `definePersonality()` extend the vocabulary and pass validation
    - Story-specific predicate registration survives `compile()` roundtrip
  - `pnpm-workspace.yaml` updated to include `packages/character`
- **Exit state**: `@sharpee/character` builds; a story author can import `CharacterBuilder`, describe an NPC in words, call `compile()`, and apply the resulting trait data to a world-model entity; all tests pass

---

### Phase 4: Integration Test with a Story NPC

- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: End-to-end character model feeding ADR-070 NPC behavior hooks
- **Entry state**: Phases 1-3 complete; `@sharpee/character` exports `CharacterBuilder` and `compile()`
- **Deliverable**:
  - A minimal story-level integration test (not in dungeo production code) demonstrating:
    - NPC with `CharacterModelTrait` configured via `CharacterBuilder`
    - NPC's `onObserve` behavior hook wired to `observeEvent`
    - After a violence event, the NPC's threat level increases to `'threatened'`
    - After several turns with no sustaining trigger, lucidity decays to baseline
    - The predicate `'threatened'` evaluates true after the violence event
    - `NpcTrait` still functions correctly alongside `CharacterModelTrait` on the same entity
  - Location: `packages/character/tests/integration/` or `stories/zoo/` (whichever David directs)
  - This phase is the acceptance test for the full ADR-141 stack
- **Exit state**: Integration test passes against the built bundle; all three layers communicate correctly through the established interfaces

---

## Cross-Cutting Notes

**No hardcoded English strings**: All user-facing text (observable behavior events, state change messages) goes through `character-messages.ts` message IDs and the lang-en-us layer.

**loadJSON() safety**: Like `CombatantTrait`, `CharacterModelTrait` must not rely on getter methods or prototype methods surviving JSON deserialization. All predicate evaluation must use plain property access internally. Computed predicates are registered functions that read plain fields.

**Trait registration**: `CharacterModelTrait` must be added to `TraitType`, `TRAIT_IMPLEMENTATIONS`, `all-traits.ts`, and `trait-types.ts` in Phase 1. Using a string literal type (`'characterModel'`) rather than adding to the const object is acceptable if the team prefers to avoid touching the centralized type — David should decide before Phase 1 begins.

**Existing NpcTrait.knowledge**: The `NpcTrait` already has a `knowledge?: Record<string, unknown>` field. `CharacterModelTrait` supersedes this with a typed `Map<string, Fact>`. For NPCs that have both traits, the richer `CharacterModelTrait` knowledge is authoritative. The `NpcTrait.knowledge` field is not removed — existing NPCs without `CharacterModelTrait` continue to use it. No migration needed.

**Phase ordering**: Phases 1, 2, and 3 are strictly sequential (each depends on the previous layer). Phase 4 depends on all three. There is no opportunity for parallel execution within these phases.
