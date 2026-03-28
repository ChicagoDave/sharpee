# Session Plan: ISSUE-063 — Eliminate `as any` Casts

**Created**: 2026-03-26
**Overall scope**: Eliminate `as any` casts caused by trait access. The `getTrait` method already supports a constructor-based generic pattern — `getTrait(OpenableTrait)` returns `OpenableTrait | undefined` — but callers use `getTrait(TraitType.OPENABLE) as any` instead. This is a caller-side cleanup: replace `TraitType` constant + `as any` with trait class import + constructor call.
**Bounded contexts touched**: N/A — infrastructure/tooling (TypeScript type system, no domain behavior change)
**Key domain language**: N/A

## Discovery

`getTrait` is **already generic** with signature:
```typescript
getTrait<T extends ITrait>(type: TraitType | string | ITraitConstructor<T>): T | undefined
```

When passed a trait constructor (e.g., `OpenableTrait`), TypeScript infers `T` automatically and the return type is `OpenableTrait | undefined`. No platform change needed — the fix is purely updating callers.

Pattern:
```typescript
// Before — untyped, requires cast
const openable = entity.getTrait(TraitType.OPENABLE) as any;

// After — pass the class, T is inferred
const openable = entity.getTrait(OpenableTrait);
```

## Phases

### Phase 1: Clean Up Worst Offender Source Files — COMPLETE
- **Status**: COMPLETE
- **Result**: All trait-access `as any` casts removed from 8 platform source files

| File | Before | After | Notes |
|------|--------|-------|-------|
| `VisibilityBehavior.ts` | 21 | 0 | All trait-access casts removed |
| `WorldModel.ts` | 12 | 0 | Trait-access + exit info typed |
| `if-entity.ts` | 12 | 2 | 2 structural (dynamic property lookup) |
| `AuthorModel.ts` | 8 | 2 | 2 structural (`worldModel.playerId`) |
| `attack.ts` | 6 | 0 | Weapon/equipped casts removed |
| `scope-resolver.ts` | 12 | 6 | 6 structural (`customProperties`) |
| `npc-service.ts` | 3 | 0 | Also fixed Direction type mismatch |
| `weapon-utils.ts` | 1 | 0 | Equipped trait cast removed |

**Additional fixes discovered during Phase 1:**
- `requiredKey` → `keyId` bug in `AuthorModel.setupContainer()` — was setting a non-existent property via `as any`
- Removed duplicate lowercase `Direction` type from NPC types, now uses `DirectionType` from world-model
- Exported `IExitInfo` from room trait barrel

**Tests updated:** 3 files
- `author-model.test.ts` (both copies): `requiredKey` → `keyId`
- `if-entity.test.ts`: corrected name priority assertion (IdentityTrait is authoritative)

**Verification:** Build passes, stdlib 1113/1113, walkthroughs 835/835

### Phase 2: Clean Up Remaining Source Files
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — platform type cleanup
- **Entry state**: Phase 1 complete; worst offenders cleaned
- **Deliverable**: All remaining `as any` trait-access casts in non-test platform source files eliminated; other `as any` patterns (`sharedData as any`, `world as any`) addressed where straightforward; build passes
- **Exit state**: `as any` count in `packages/` source files (excluding tests) materially reduced; baseline documented for future CI enforcement
- **Status**: DONE

#### Phase 2A: Remove Legacy Event Sequencing Layer (~25 `as any` casts) — DONE

The engine has a vestigial event-driven architecture layer that wraps `ISemanticEvent` into `SequencedEvent` shells (adding `sequence`, `turn`, `scope` fields). No consumer uses these fields. Platform listeners immediately reverse-engineer `SequencedEvent` back to `ISemanticEvent` with `as any` casts. The fix is to emit `ISemanticEvent` directly and delete the sequencing infrastructure.

**Step 1: Update type definitions**
- `types.ts` — Remove `GameEvent<T>` and `SequencedEvent` interfaces; change `TurnResult.events` and `EngineConfig.onEvent` to use `ISemanticEvent`
- `game-engine.ts` — Change `GameEngineEvents['event']` to `(event: ISemanticEvent) => void`

**Step 2: Preserve event enrichment logic**
- `turn-event-processor.ts` — Inline `processEvent`/`normalizeEvent`/`enrichEvent` from `event-adapter.ts`; change all `SequencedEvent` refs to `ISemanticEvent`

**Step 3: Remove sequencer from command-executor.ts**
- Remove `eventSequencer` import and all `.sequence()` / `.resetTurn()` calls; construct `ISemanticEvent` directly

**Step 4: Remove sequencer from game-engine.ts**
- Remove sequencer/adapter imports; emit `ISemanticEvent` directly everywhere; simplify `emitGameEvent()`; remove ~20 `as any` casts

**Step 5: Remove sequencer from save-restore-service.ts**
- Remove `toSequencedEvent` import; use `event.id` instead of `turn-sequence` composite

**Step 6: Delete legacy files**
- Delete `event-sequencer.ts`, `event-adapter.ts`, `event-sequencer.test.ts`

**Step 7: Update engine barrel export (index.ts)**
- Remove `event-sequencer` and `event-adapter` re-exports

**Step 8: Update external consumer type annotations**
- All platform files, bridge, transcript-tester, runtime, sharpee barrel: `SequencedEvent` → `ISemanticEvent`
- Remove SequencedEvent-to-SemanticEvent reverse-engineering code in cli-platform and browser-platform

**Step 9: Update test files**
- Remove SequencedEvent tests from `types.test.ts`; update test fixtures

#### Phase 2B: Resolve Remaining `as any` Casts in game-engine.ts (11 casts) — DONE

Eleven `as any` casts remain in `game-engine.ts` after Phase 2A. They fall into 5 categories.

**Step 1: Remove unnecessary casts (types already exist)**
- Line 1887: `(entity as any).on` → `entity.on` — `IFEntity` already declares `on?: IEventHandlers`
- Lines 557, 1215: `(this.parser as any).setWorldContext(...)` → use narrowed type after `hasWorldContext()` guard — `IEngineAwareParser` already declares the method

**Step 2: Fix event listener typing**
- Line 98: Change `eventListeners` Map from `Set<Function>` to properly typed callbacks
- Line 1869: `(listener as any)(...args)` — remove cast once Map is typed

**Step 3: Add `setNarrativeSettings` to `LanguageProvider` interface**
- `if-domain/src/language-provider.ts`: Add optional `setNarrativeSettings?(settings: NarrativeContext): void`
- Line 1195: Remove `(this.languageProvider as any)` cast, add guard check

**Step 4: Expose validation on CommandExecutor**
- `command-executor.ts`: Add a public `validateCommand()` method (or make `validator` accessible)
- Line 782: Replace `(this.commandExecutor as any).validator.validate(...)` with new public method

**Step 5: Fix StoryInfoTrait access + remove dead legacy fallback**
- Lines 376-377: Use `StoryInfoTrait` class + `getTrait(StoryInfoTrait)` pattern from Phase 1
- Lines 378-379: Verify `(this.world as any).versionInfo` is dead code, remove if so

**Step 6: Fix event handler return type**
- Line 168: `handler(event) as any[]` — align return types between `IEventProcessorWiring` handler and `EventProcessor.registerHandler`

**Verification**: Engine tests 184/184 passing, build passes

### Phase 3: Clean Up Story Files
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — story type cleanup
- **Entry state**: Phase 2 complete; platform files cleaned
- **Deliverable**: Trait-access `as any` casts in `stories/dungeo/` source files replaced with constructor pattern; build passes
- **Exit state**: Story-side trait access is fully typed; baseline count documented
- **Status**: DONE — 0 code-level `as any` casts remaining (2 tagged ISSUE-068 in kl.ts)
- **Details**: `docs/work/dungeo/plans/issue-063-phase-3-as-any-cleanup.md`

---

## Remaining Work (2026-03-27)

**Baseline**: 223 `as any` casts in `packages/*/src/` (non-test) files across 72 files. Story source is clean (27 apparent hits are in JSDoc comments only, not executable code). Test files (573 casts) are Phase 9, lowest priority.

**Pattern taxonomy** (determines grouping):
- **A — Trait fields missing from interface**: Properties used at runtime (`portions`, `consumed`, `isDrink` on EdibleTrait; `containsLiquid`, `liquidType`, `liquidAmount`, `satisfiesThirst` on ContainerTrait; `inventoryLimit` on ActorTrait) that the constructor accepts but the class doesn't declare. Fix: add optional fields to trait interfaces.
- **B — `entity.get('string') as any`**: Uses string-keyed `get()` instead of the typed constructor pattern from Phase 1. Fix: migrate to `entity.getTrait(TraitClass)`.
- **C — Fields that exist on the typed class but caller didn't import**: `(identityTrait as any).description`, `(readableTrait as any).text`, `(wearableTrait as any).worn`, `(identity as any).adjectives`, `(identity as any).aliases` — the property exists, the cast is unnecessary. Fix: remove cast or import the trait class.
- **D — sharedData extension**: `(sharedData as any)._interceptor`, `(sharedData as any)._interceptorData` in taking.ts — extend the TakingSharedData interface.
- **E — `customProperties as any`**: `identity.customProperties` is typed as `Record<string, unknown>` but callers treat it as an open object. Fix: index with bracket notation or narrow properly.
- **F — Parser internal types**: `english-parser.ts` accesses `.direction`, `.extras` on `ParsedCommand`-like objects that lack those fields in the current interface. Fix: add fields to the parse result types or narrow with a type guard.
- **G — Runtime/integration boundary**: `window as any`, `world as any`, `engine as any` in bridge/runtime/platform code — some are legitimate runtime escapes needing comment justification; others can be fixed by adding the method to the interface.
- **H — Low-count scattered**: 1–3 casts each across ~35 files in stdlib, world-model, engine, core — mix of patterns A–G, handled by file in a single sweep.

### Phase 4: Extend Trait Interfaces for Missing Runtime Properties (Pattern A)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — platform type system
- **Entry state**: Phase 3 complete; 223 source casts remain; EdibleTrait, ContainerTrait, ActorTrait missing optional fields their constructors already accept
- **Deliverable**:
  - `EdibleTrait` gains optional `portions?: number`, `isDrink?: boolean`, `consumed?: boolean`, `satisfiesThirst?: boolean` (legacy aliases — the constructor already handles them, these expose them to callers)
  - `ContainerTrait` gains optional `containsLiquid?: boolean`, `liquidType?: string`, `liquidAmount?: number`
  - ActorTrait gains optional `inventoryLimit?: { maxWeight?: number }` if not already present
  - `edibleBehavior.ts` (13 casts) and `drinking.ts` (22 casts) updated to use typed access — no more `as any`
  - Build passes; stdlib tests pass
- **Exit state**: ~35 casts eliminated; trait interfaces match the data shape their constructors already accept; no semantic behavior change
- **Status**: DONE — 36 casts eliminated; trait interfaces extended; 183 source casts remain

### Phase 5: Migrate `entity.get('string') as any` to Constructor Pattern (Patterns B and C)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — platform type system
- **Status**: DONE — 45 casts eliminated; 138 source casts remain; all stdlib actions use typed constructor pattern; dead code removed (PhysicalTrait, inventoryLimit); TakingSharedData extended
- **Entry state**: Phase 4 complete; trait interfaces extended; snapshot-utils and several action files still use string-keyed `get()` with `as any` casts
- **Deliverable**:
  - `snapshot-utils.ts` (15 casts): all `entity.get?.('identity') as any` etc. replaced with `entity.getTrait(IdentityTrait)` constructor pattern
  - `examining-data.ts` (7 casts): `(identityTrait as any).description`, `.brief`, `(readableTrait as any).text` replaced with typed access
  - `reading.ts` (4 casts): `(readable as any).isReadable`, `.cannotReadMessage`, `.requiresAbility` replaced after migrating the one `target.get(TraitType.READABLE) as any` call to constructor pattern
  - `inventory.ts` (4 casts): `(actorTrait as any).inventoryLimit`, `(identity as any).weight` replaced using Phase 4 extended interfaces
  - `taking.ts` (7 casts): `(sharedData as any)._interceptor` and `._interceptorData` eliminated by extending `TakingSharedData`; `(wearableTrait as any).worn` replaced with typed `wearableTrait.worn`; identity cast replaced with constructor call
  - `looking-data.ts` (6 casts): `location.get?.('identity') as any` and `(context as any).verboseMode` replaced — verboseMode needs to be on a typed context interface or moved to sharedData
  - `command-validator.ts` (2 casts): `(identity as any).adjectives` and `.aliases` replaced with typed access (both fields exist on IdentityTrait)
  - Build passes; stdlib tests pass
- **Exit state**: ~45 casts eliminated; all entity trait access in stdlib actions uses the typed constructor pattern from Phase 1; `entity.get('string') as any` pattern is gone

### Phase 6: Type Parser Internal Result Objects (Pattern F)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — platform type system
- **Status**: DONE — 23 casts eliminated; 81 source casts remain
- **Entry state**: Phase 5 complete; parser files still use `as any` to access informal fields on parse result objects
- **Deliverable**:
  - `grammar-builder.ts`: Added `experimentalConfidence?` to `GrammarRule`; added `isPronoun?`, `entityId?`, `resolvedText?` to `SlotMatch`
  - `english-parser.ts` (12 → 0): Added `direction?`, `extras?` to `RichCandidate`; removed unnecessary `slotData as any` casts
  - `english-grammar-engine.ts` (4 → 0): Removed `experimentalConfidence` casts
  - `scope-evaluator.ts` (7 → 0): Added `ITraitAwareEntity` interface; typed dynamic property lookup
  - `entity-slot-consumer.ts` (3 → 0): `isPronoun`/`entityId` via `SlotMatch`; debug logging typed
  - `pronoun-context.ts` (2 → 0): Imported `ActorTrait`/`IdentityTrait`, uses `getTrait()` pattern
  - `grammar-engine.ts` (1 → 0): `canonical as SemanticProperties['direction']`
  - Build passes; stdlib 1111 passing; walkthroughs 855 passing
- **Exit state**: 0 `as any` casts in parser source files; parser result types have explicit optional fields

### Phase 7: Runtime and Integration Boundary Casts (Pattern G)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — platform type system
- **Status**: DONE — 11 casts eliminated (9 `as any` + 2 `<any>` generic params); 82 total source casts remain
- **Entry state**: Phase 6 complete; runtime/bridge/platform-browser had integration boundary casts; transcript-tester was already clean
- **Deliverable**:
  - `game-engine.ts`: Added `getSaveRestoreHooks()` public getter
  - `runtime-entry.ts` (2 → 0): Removed `window as any` — `declare global` augments Window
  - `runtime/bridge.ts` (4 → 0): `window.SharpeeStory` typed via Window augmentation; `engine.getContext()` replaces private access; `engine.getSaveRestoreHooks()` replaces private access
  - `bridge/bridge.ts` (2 → 0): Same engine accessor fixes
  - `platform-browser/BrowserClient.ts` (3 → 0): `TraitType.STORY_INFO` + `StoryInfoTrait` typed access; removed dead else branch
  - Build passes; engine 181 passing; stdlib 1111 passing; walkthroughs 789 passing

### Phase 8: Sweep Remaining Scattered Casts (Patterns C, D, E, H)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — platform type system
- **Entry state**: Phases 4–7 complete; ~80–90 casts remain across ~35 files, each with 1–3 casts
- **Deliverable**: All remaining `packages/*/src/` (non-test) `as any` casts eliminated or documented; files addressed include:
  - `stdlib`: about, attacking, closing, dropping, giving, going, help, inserting, listening, pulling, smelling, switching-shared, switching_on, switching_off, talking, throwing, unlocking, wearable-shared + helpers, inference, registry, context, context-adapter, enhanced-types, data-builder-types, meta-registry
  - `world-model`: if-entity, AuthorModel, VisibilityBehavior, behaviors/attack, capabilities/capability-helpers, capabilities/interceptor-helpers, traits/story-info, traits/trait-types, examples/event-handler-registration
  - `engine`: capability-dispatch-helper, command-executor, parser-interface
  - `core`: events/event-helpers, events/event-system, rules/helpers
  - `if-domain`: already addressed in Phase 6 or swept here
  - `plugin-scheduler`: scheduler-service
  - Final build and full stdlib test suite run
- **Exit state**: `packages/*/src/` source cast count is **zero** — no `as any` casts in any source file; all comments-only references remain; CI enforcement ready
- **Status**: DONE — 82 casts eliminated across 48 files; stdlib 1111 passing; walkthroughs all passing
- **Patterns used**: `getTrait(TraitClass)` for typed access; `Record<string, unknown>` for dynamic property access; `customProperties?.['key']` with direct-property fallback for raw test objects; `unknown` intermediate for incompatible type casts

### Phase 9: Test File Cleanup (573 casts)
- **Tier**: Large
- **Budget**: 400
- **Domain focus**: N/A — platform type system
- **Entry state**: Phase 8 complete; source files clean; test files contain 573 `as any` casts
- **Deliverable**: Test files in `packages/*/src/**/*.test.ts` updated to use typed accessors; test helper utilities (`test-utils/index.ts`) extended with typed helpers that replace `as any` access patterns; full test suite passes
- **Exit state**: `as any` count across all package files (source + test) is near-zero; issue closed
- **Status**: DONE — 527 test-file casts eliminated; CI guard installed; dead rules/ subsystem removed; all test suites passing
