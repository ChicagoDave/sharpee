# Handler → Interceptor Migration Plan

**Created**: 2026-01-26
**Updated**: 2026-01-26
**Status**: Complete
**Related**: ADR-118 (Stdlib Action Interceptors)

## Overview

Migrate event handlers to action interceptors (ADR-118) for better architecture:
- Logic co-located with entity traits
- Interceptor hooks at 5 phases: preValidate, postValidate, postExecute, postReport, onBlocked
- Can modify validation, execution, and reporting
- Type safety via InterceptorSharedData

**Note**: Original plan referenced "capability behaviors" (ADR-117). Actual implementation uses "action interceptors" (ADR-118) which provide hooks into stdlib actions rather than replacing them entirely.

## Prerequisites

Complete `(entity as any)` trait migration first (see `docs/work/platform/as-any.md`):
- [x] TreasureTrait
- [x] InflatableTrait
- [ ] BurnableTrait
- [ ] RiverRoomTrait
- [ ] SpinningRoomTrait
- [ ] etc.

## Handler Inventory

### Group 1: Simple Entity Interceptors (Complete)

| Handler | Entity | Action | Status | Notes |
|---------|--------|--------|--------|-------|
| `boat-puncture-handler.ts` | Boat | GOING | ✅ Done | PunctureableBoatTrait + GoingInterceptor |
| `glacier-handler.ts` | Glacier | THROWING | ✅ Done | GlacierTrait + ThrowingInterceptor |

### Group 2: Complex Puzzle Systems

| Handler | Entity | Action | Status | Notes |
|---------|--------|--------|--------|-------|
| `balloon-handler.ts` | Receptacle | PUTTING | ✅ Done | BalloonReceptacleTrait + PuttingInterceptor |

### Group 3: Keep as Handlers (Cross-Cutting / Daemons)

| Handler | Rationale |
|---------|-----------|
| `scoring-handler.ts` | Reacts to all treasures |
| `river-handler.ts` | Coordinates multiple rooms |
| `round-room-handler.ts` | Daemon with cross-turn state tracking; needs to override destination after standard GOING report, which interceptors can't do cleanly |
| `dam-handler.ts` | Event handler reacting to custom domain events (dungeo.dam.opened/closed); coordinates multiple reservoir rooms |
| `tiny-room-handler.ts` | Not a handler - utility module with command transformers and helpers; state already in traits |
| `exorcism-handler.ts` | Cross-entity ritual (3 events from 3 actions on 3 entities) + daemon for completion; not per-entity |
| Any daemon/fuse | Time-based, not action-based |

## Migration Template (ADR-118 Interceptors)

For each handler:

### 1. Analyze Current Handler

```typescript
// What event does it listen to?
world.registerEventHandler('if.event.X', ...);

// What entity does it target?
const entity = world.getEntity(someId);

// What state does it read/write?
(entity as any).someProperty

// Does it need to modify validation? (interceptors can, event handlers can't)
```

### 2. Create Trait (Marker + State)

```typescript
// stories/dungeo/src/traits/{entity}-trait.ts

export class FooTrait implements ITrait {
  static readonly type = 'dungeo.trait.foo' as const;
  readonly type = FooTrait.type;

  // Move state from handler here
  someProperty: boolean;

  constructor(config: { someProperty?: boolean } = {}) {
    this.someProperty = config.someProperty ?? false;
  }
}
```

### 3. Create Interceptor

```typescript
// stories/dungeo/src/interceptors/{action}-{entity}-interceptor.ts

export const FooActionInterceptor: ActionInterceptor = {
  // Called before stdlib validation
  preValidate(world, actorId, sharedData) {
    // Can return { abort: true, messageId: '...' } to block early
  },

  // Called after stdlib validation passes
  postValidate(world, actorId, sharedData) {
    // Access target via sharedData.interceptorData?.targetId
    // Store data for later phases
  },

  // Called after stdlib execute (mutations done)
  postExecute(world, actorId, sharedData) {
    const target = world.getEntity(sharedData.interceptorData?.targetId);
    const trait = target?.get(FooTrait);
    if (trait) {
      trait.someProperty = newValue;
    }
  },

  // Called after stdlib report
  postReport(world, actorId, sharedData): Effect[] {
    return [createEffect('game.message', { messageId: '...' })];
  },

  // Called when action is blocked
  onBlocked(world, actorId, error, sharedData): Effect[] | undefined {
    // Return custom effects or undefined to use default
  }
};
```

### 4. Register Interceptor

```typescript
// In story's initializeWorld()
import { registerActionInterceptor } from '@sharpee/world-model';

registerActionInterceptor(FooTrait.type, 'if.action.X', FooActionInterceptor);
```

### 5. Update Entity Creation

```typescript
// In region file where entity is created
const foo = world.createEntity('foo', EntityType.ITEM);
foo.add(new FooTrait({ someProperty: initialValue }));
```

### 6. Remove Old Handler

```typescript
// Remove registration call from orchestration/event-handlers.ts
// Remove export from scheduler/index.ts (if applicable)
// Delete handlers/{handler-name}.ts (if now empty)
```

### 7. Test

```bash
./build.sh -s dungeo
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
```

## Detailed Migration Notes

### boat-puncture-handler.ts ✅ COMPLETE

**Implemented** (commit 6927490):
- Created `PunctureableBoatTrait` - marks boat as punctureable, stores `isPunctured` state
- Created `BoatPunctureGoingInterceptor` - intercepts GOING when player is on boat
- postValidate: Checks if player carrying sharp objects (StylusTrait)
- postExecute: Punctures boat, updates InflatableTrait.isInflated
- postReport: Adds puncture message
- Registered in `stories/dungeo/src/index.ts`

### balloon-handler.ts ✅ COMPLETE

**Implemented** (commit 6679075):
- Created `BalloonReceptacleTrait` - marks receptacle, links to balloon via `balloonId`
- Created `ReceptaclePuttingInterceptor` - intercepts PUT on receptacle
- postValidate: Detects if item is burning (LightSourceTrait + isLit)
- postExecute: Updates BalloonStateTrait.isInflated on cloth bag
- postReport: Adds inflation message
- Burn daemon kept as-is (time-based, not action-based)
- Registered in `stories/dungeo/src/index.ts`

### glacier-handler.ts ✅ COMPLETE

**Implemented** (commit 6e012d2):
- Created `GlacierTrait` - stores `isMelted` state
- Created `GlacierThrowingInterceptor` - intercepts THROW at glacier location
- postValidate: Checks if torch is being thrown
- postExecute: Melts glacier, reveals passage (updates room exits)
- postReport: Adds melting description
- Registered in `stories/dungeo/src/index.ts`

## Progress Tracking

| Handler | Status | Commit | Notes |
|---------|--------|--------|-------|
| `boat-puncture-handler.ts` | ✅ Complete | 6927490 | GOING interceptor, PunctureableBoatTrait |
| `glacier-handler.ts` | ✅ Complete | 6e012d2 | THROWING interceptor, GlacierTrait |
| `balloon-handler.ts` | ✅ Complete | 6679075 | PUTTING interceptor, BalloonReceptacleTrait |
| `dam-handler.ts` | Keep as handler | | Event handler for custom domain events, coordinates multiple rooms |
| `round-room-handler.ts` | Keep as daemon | | Cross-turn tracking; can't override GOING report |
| `tiny-room-handler.ts` | Keep as utility | | Command transformers + helpers; not an event handler |
| `exorcism-handler.ts` | Keep as handler | | 3 events × 3 entities + daemon; cross-entity ritual |
| `exorcism-handler.ts` | Not Started | | Custom action (RING) or capability behavior |

## Estimated Work

| Group | Handlers | Status |
|-------|----------|--------|
| Group 1 (Simple) | 2 | 2/2 complete |
| Group 2 (Complex) | 1 | 1/1 complete (balloon) |
| Group 3 (Keep) | 5 | N/A (dam, round-room, tiny-room, exorcism, scoring/river) |
| **Total migrated** | **3** | **3/3 complete (100%)** |

### Result
All handlers that fit the interceptor pattern have been migrated. The remaining 5 handlers stay as-is because they use patterns (daemons, cross-entity coordination, command transformers, custom domain events) that interceptors aren't designed to replace.

## Success Criteria

1. All identified handlers migrated to interceptors
2. All walkthrough tests passing
3. Checkpoints correctly persist new trait state
4. Handler directory reduced to cross-cutting concerns only (scoring, river, daemons)
5. ADR-118 updated with any learnings

## Actions with Interceptor Support

| Action | Status | Interceptor Hooks |
|--------|--------|-------------------|
| THROWING | ✅ Supported | preValidate, postValidate, postExecute, postReport, onBlocked |
| GOING | ✅ Supported | preValidate, postValidate, postExecute, postReport, onBlocked |
| PUTTING | ✅ Supported | preValidate, postValidate, postExecute, postReport, onBlocked |
| PUSHING | ✅ Supported | preValidate, postValidate, postExecute, postReport, onBlocked |
