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
- **Status**: IN PROGRESS

#### Phase 2A: Remove Legacy Event Sequencing Layer (~25 `as any` casts)

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

### Phase 3: Clean Up Story Files
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — story type cleanup
- **Entry state**: Phase 2 complete; platform files cleaned
- **Deliverable**: Trait-access `as any` casts in `stories/dungeo/` source files replaced with constructor pattern; build passes
- **Exit state**: Story-side trait access is fully typed; baseline count documented
- **Status**: PENDING
