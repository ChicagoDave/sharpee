# Work Summary: Vehicle Visibility Fix

**Date**: 2026-01-03 06:02
**Branch**: dungeo
**Status**: Complete

## Problem

When the player was inside the bucket (a vehicle) and used LOOK, the game described the bucket instead of the room. This happened because:

1. `context.currentLocation` returns the player's immediate parent (the bucket)
2. The looking action described whatever `currentLocation` was
3. No visibility logic existed to "see through" transparent vehicles to the room

## Solution

Added visibility transparency for vehicles:

### 1. VehicleTrait.transparent Property

Added `transparent: boolean` to `VehicleTrait` (defaults to `true`):
- Bucket, raft, boat: `transparent: true` → can see the room
- Airplane, submarine: `transparent: false` → see vehicle interior only

### 2. VisibilityBehavior.getDescribableLocation()

New method that determines what location to describe when looking:

```typescript
getDescribableLocation(observer, world): { location, immediateContainer }
```

- **Transparent vehicle** → returns room, sets `immediateContainer` to vehicle
- **Open container** → returns room, sets `immediateContainer` to container
- **Closed container/vehicle** → returns container itself
- **Room** → returns room

### 3. Looking Action Updates

Updated all data builders in `looking-data.ts` to use `getDescribableLocation()`:
- `buildLookingEventData`
- `buildRoomDescriptionData`
- `buildListContentsData`
- `determineLookingMessage`

### 4. Story Action Fixes

Updated pour/fill actions to emit `action.success` instead of `game.message`.

## Files Modified

### Platform (packages/)
```
packages/world-model/src/traits/vehicle/VehicleTrait.ts     # Added transparent property
packages/world-model/src/traits/vehicle/index.ts           # Fixed casing
packages/world-model/src/traits/vehicle/vehicleBehavior.ts # Fixed casing
packages/world-model/src/traits/implementations.ts         # Fixed casing
packages/world-model/src/world/VisibilityBehavior.ts       # Added getDescribableLocation()
packages/stdlib/src/actions/standard/looking/looking-data.ts # Use getDescribableLocation()
scripts/bundle-entry.js                                     # Use direct paths for esbuild
```

### Story (stories/dungeo/)
```
stories/dungeo/src/actions/pour/pour-action.ts   # action.success events
stories/dungeo/src/actions/fill/fill-action.ts   # action.success events
```

## Test Results

- Bucket/well puzzle: 20/20 tests pass
- All transcripts: 651 passed, 5 expected failures

## Design Decisions

1. **Visibility is the right layer** - The fix belongs in VisibilityBehavior, not in changing what `currentLocation` means

2. **Vehicles vs Containers** - Vehicles use explicit `transparent` property; containers use `isOpen` state

3. **Default transparent: true** - Most IF vehicles (bucket, raft, boat) are transparent by design
