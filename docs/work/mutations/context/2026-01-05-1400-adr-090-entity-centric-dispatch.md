# Work Summary: ADR-090 Entity-Centric Action Dispatch

**Date**: 2026-01-05
**Status**: ADR PROPOSED - Ready for review

## Problem

When player types "lower basket", the parser correctly resolves the entity but routes to the wrong action (Inside Mirror pole logic instead of basket elevator). Root cause: action selection is grammar-based via priority ordering, leading to:
- Proliferation of action IDs per entity type
- Priority conflicts in grammar patterns
- Type flags scattered on entities (`isBasketElevator`, `poleType`)
- 100+ lines of boilerplate per entity-specific action

## Key Insight: Common vs Custom Mutations

**Common mutations** (stdlib handles completely):
- TAKE, DROP, OPEN have standard semantics
- Same mutation for all entities with the right trait
- Entity has trait → behavior performs standard mutation

**Custom mutations** (story provides):
- LOWER, TURN, WAVE have no standard semantics
- Each entity defines what the verb means for it
- Story must provide the logic via trait+behavior

## Solution: Trait-Based Capability Dispatch

### The Pattern

1. **Traits declare capabilities** using action IDs:
   ```typescript
   static readonly capabilities = ['if.action.lowering', 'if.action.raising'];
   ```

2. **Behaviors return Effects** (ADR-075 pattern):
   ```typescript
   static lower(entity, world, playerId): Effect[] {
     trait.position = 'bottom';
     world.moveEntity(entity.id, trait.bottomRoomId);
     return [emit(IFEvents.LOWERED, { target: entity.id, messageId: '...' })];
   }
   ```

3. **Stdlib action dispatches** by finding trait with matching capability:
   ```typescript
   const trait = findTraitWithCapability(entity, this.id);  // 'if.action.lowering'
   const behavior = getBehaviorForTrait(trait);
   const effects = behavior.lower(entity, world, playerId);
   ```

4. **One grammar pattern per verb** - no priority conflicts

### Design Decisions Made

1. **Behaviors return `Effect[]`** - behavior controls what events are emitted
2. **Capabilities use action IDs** - `'if.action.lowering'` not `'lower'`
3. **Events use constants** - `IFEvents.LOWERED` not string literals
4. **Extensible event naming** - stories define their own event constants (e.g., `DungeoEvents`)

## Files Created/Modified

- `docs/architecture/adrs/adr-090-entity-centric-action-dispatch.md` - Full ADR with:
  - Problem statement and context
  - Complete basket example (trait, behavior, entity creation)
  - Stdlib action implementation
  - Capability registry infrastructure
  - Implementation phases
  - Design decisions and open questions

## Implementation Phases (Proposed)

### Phase 1: Core Infrastructure (world-model)
- Add `static capabilities: string[]` to Trait base class
- Add `findTraitWithCapability(entity, actionId)` helper
- Add trait-behavior registry

### Phase 2: Stdlib Actions
- Create `if.action.lowering` and `if.action.raising`
- These find trait with capability and delegate to behavior
- Default: "You can't lower that"

### Phase 3: Dungeo Migration
- Create `BasketElevatorTrait` + `BasketElevatorBehavior`
- Create `MirrorPoleTrait` + `MirrorPoleBehavior`
- Remove story-specific action files
- Remove conflicting grammar patterns
- Remove type flags

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Action files per entity | 2 files, 100+ lines | 0 (use stdlib) |
| Grammar patterns | Multiple with priority | 1 per verb |
| Type flags | `isBasketElevator`, etc. | None |
| Logic location | Scattered | Co-located with trait |

## Open Questions

1. Multiple traits with same capability - first match wins?
2. Which verbs get capability-dispatching actions?
3. Validation method naming - `canLower()` or generic `validate()`?

## Next Steps

1. Review ADR with stakeholders
2. Implement Phase 1 infrastructure
3. Create lowering/raising actions in stdlib
4. Migrate basket and pole in Dungeo as proof of concept
