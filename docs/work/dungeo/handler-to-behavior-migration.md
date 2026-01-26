# Handler → Behavior Migration Plan

**Created**: 2026-01-26
**Status**: Planning
**Related**: ADR-117 (Event Handlers vs Capability Behaviors)

## Overview

Migrate ~20 event handlers to capability behaviors for better architecture:
- Logic co-located with entity traits
- Clear 4-phase mutation pattern
- Checkpoint persistence
- Type safety

## Prerequisites

Complete `(entity as any)` trait migration first (see `docs/work/platform/as-any.md`):
- [x] TreasureTrait
- [x] InflatableTrait
- [ ] BurnableTrait
- [ ] RiverRoomTrait
- [ ] SpinningRoomTrait
- [ ] etc.

## Handler Inventory

### Group 1: Simple Entity Behaviors (Start Here)

| Handler | Entity | Capability | Complexity | Notes |
|---------|--------|------------|------------|-------|
| `boat-puncture-handler.ts` | Boat | `entering` | Low | Check sharp object, puncture |
| `glacier-handler.ts` | Glacier | `throwing` | Low | Check torch, melt |
| `dam-handler.ts` | Dam buttons | `pushing` | Medium | Already uses ButtonTrait |

### Group 2: Complex Puzzle Systems

| Handler | Entity | Capability | Complexity | Notes |
|---------|--------|------------|------------|-------|
| `balloon-handler.ts` | Receptacle | `putting` | High | Inflation, burning, movement |
| `round-room-handler.ts` | Round Room | `going` | Medium | Spinning, carousel exits |
| `tiny-room-handler.ts` | Door/Key/Mat | Multiple | High | 3 entities, complex state |
| `exorcism-handler.ts` | Bell/Book/Candles | `ringing`/etc | Medium | Ritual sequence |

### Group 3: Keep as Handlers (Cross-Cutting)

| Handler | Rationale |
|---------|-----------|
| `scoring-handler.ts` | Reacts to all treasures |
| `river-handler.ts` | Coordinates multiple rooms |
| Any daemon/fuse | Time-based, not action-based |

## Migration Template

For each handler:

### 1. Analyze Current Handler

```typescript
// What event does it listen to?
world.registerEventHandler('if.event.X', ...);

// What entity does it check?
const entity = world.getEntity(someId);

// What state does it read/write?
(entity as any).someProperty

// Can it block the action? (probably not - it's post-action)
```

### 2. Create/Extend Trait

```typescript
// stories/dungeo/src/traits/{entity}-trait.ts

export class FooTrait implements ITrait {
  static readonly type = 'dungeo.trait.foo' as const;
  static readonly capabilities = ['if.action.X'] as const;

  readonly type = FooTrait.type;

  // Move state from handler here
  someProperty: boolean;

  constructor(config: { someProperty: boolean }) {
    this.someProperty = config.someProperty;
  }
}
```

### 3. Create Behavior

```typescript
// stories/dungeo/src/traits/{entity}-behaviors.ts

export const FooXBehavior: CapabilityBehavior = {
  validate(entity, world, actorId, sharedData) {
    // Validation logic from handler
    // Can return { valid: false, error: 'message.id' } to block
    return { valid: true };
  },

  execute(entity, world, actorId, sharedData) {
    // Mutation logic from handler
    const trait = entity.get(FooTrait);
    trait.someProperty = newValue;
  },

  report(entity, world, actorId, sharedData) {
    // Messaging logic from handler
    return [createEffect('game.message', { messageId: '...' })];
  },

  blocked(entity, world, actorId, error, sharedData) {
    return [createEffect('action.blocked', { messageId: error })];
  }
};
```

### 4. Register Behavior

```typescript
// In story's initializeWorld()
import { registerCapabilityBehavior, hasCapabilityBehavior } from '@sharpee/world-model';

if (!hasCapabilityBehavior(FooTrait.type, 'if.action.X')) {
  registerCapabilityBehavior(FooTrait.type, 'if.action.X', FooXBehavior);
}
```

### 5. Update Entity Creation

```typescript
// In region file where entity is created
const foo = world.createEntity('foo', EntityType.ITEM);
foo.add(new FooTrait({ someProperty: initialValue }));
```

### 6. Delete Handler

```typescript
// Remove from handlers/index.ts
// Delete handlers/{handler-name}.ts
```

### 7. Test

```bash
node dist/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
```

## Detailed Migration Notes

### boat-puncture-handler.ts

**Current**:
- Listens: `if.event.entered`
- Checks: `isInflatedBoat(target)` and `puncturesBoat(inventoryItem)`
- Mutates: `isInflated = false`, removes traits, updates description

**Migration**:
- Extend `InflatableTrait` with `isPunctured: boolean`
- Create `BoatEnteringBehavior`
- Register for `if.action.entering`
- In validate: check sharp objects, allow entry but flag
- In execute: puncture if flagged
- In report: show puncture message

### balloon-handler.ts

**Current**:
- Listens: `if.event.put_in`, `if.event.taken`
- Complex: tracks burning objects, updates cloth bag inflation
- Also has burn daemon (keep as daemon)

**Migration**:
- Create `BalloonReceptacleTrait` with burning object tracking
- Create `ReceptaclePuttingBehavior`
- Keep burn daemon as-is (time-based, not action-based)
- Split responsibilities: trait owns state, daemon owns time

### glacier-handler.ts

**Current**:
- Listens: `if.event.thrown`
- Checks: torch thrown at glacier
- Mutates: glacier melts, reveals passage

**Migration**:
- Create `GlacierTrait` with `isMelted: boolean`
- Create `GlacierThrowingBehavior`
- In validate: check if torch
- In execute: melt glacier, update room exits

## Progress Tracking

| Handler | Status | PR | Notes |
|---------|--------|-----|-------|
| `boat-puncture-handler.ts` | Not Started | | |
| `balloon-handler.ts` | Not Started | | |
| `glacier-handler.ts` | Not Started | | |
| `dam-handler.ts` | Not Started | | |
| `round-room-handler.ts` | Not Started | | |
| `tiny-room-handler.ts` | Not Started | | |
| `exorcism-handler.ts` | Not Started | | |

## Estimated Work

| Group | Handlers | Est. Sessions |
|-------|----------|---------------|
| Group 1 (Simple) | 3 | 1 session |
| Group 2 (Complex) | 4 | 2-3 sessions |
| Testing & Cleanup | - | 1 session |
| **Total** | **7** | **4-5 sessions** |

## Success Criteria

1. All identified handlers migrated to behaviors
2. 148/148 walkthrough tests passing
3. Checkpoints correctly persist new trait state
4. Handler directory reduced to cross-cutting concerns only
5. ADR-117 updated with any learnings
