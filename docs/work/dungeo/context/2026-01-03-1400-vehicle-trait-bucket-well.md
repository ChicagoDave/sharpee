# Work Summary: VehicleTrait and Bucket/Well Puzzle

**Date**: 2026-01-03 14:00
**Branch**: vehicle-trait (forked from dungeo)
**Status**: In Progress

## Overview

Implemented Infocom's "vehicle" concept as a proper platform trait, then applied it to the bucket/well puzzle in Dungeo.

## Commits Made

1. `refactor(dungeo): Restructure well region for bucket puzzle`
   - Created Top of Well room (replaces Well Room)
   - Created Well Bottom room (E of Pearl Room)
   - Fixed connections per canonical map

2. `feat(world-model): Add VehicleTrait for enterable transport containers`
   - New trait type: VEHICLE
   - VehicleTrait with properties for different vehicle types
   - VehicleBehavior utilities for movement and actor tracking

3. `feat(dungeo): Update bucket to use VehicleTrait`
   - Bucket now uses VehicleTrait with counterweight type
   - enterable: true on ContainerTrait

## New Files Created

### Platform (packages/world-model)
```
packages/world-model/src/traits/vehicle/
├── index.ts
├── vehicleTrait.ts      # VehicleTrait class
└── vehicleBehavior.ts   # Utility functions
```

### Story (stories/dungeo)
```
stories/dungeo/src/regions/well-room/rooms/
├── top-of-well.ts       # New room
└── well-bottom.ts       # New room

stories/dungeo/src/actions/pour/
├── index.ts
├── types.ts
└── pour-action.ts       # Pour water → bucket rises

stories/dungeo/src/actions/fill/
├── index.ts
├── types.ts
└── fill-action.ts       # Fill bottle → bucket descends
```

## VehicleTrait Design

```typescript
VehicleTrait {
  vehicleType: 'counterweight' | 'watercraft' | 'aircraft' | 'cable' | 'generic'
  blocksWalkingMovement: boolean   // Can't GO while in vehicle
  requiresExitBeforeLeaving: boolean
  currentPosition?: string         // e.g., 'top', 'bottom'
  positionRooms?: Record<string, string>  // Position → room ID map
  isOperational: boolean
}
```

VehicleBehavior utilities:
- `isVehicle()`, `isActorInVehicle()`, `getActorVehicle()`
- `getVehicleOccupants()` - get actors in vehicle
- `moveVehicle()` - move vehicle and all contents together
- `canVehicleMove()`, `canActorLeaveLocation()`, `canActorWalkInVehicle()`

## Bucket/Well Puzzle Mechanics

Based on Mainframe Zork's counterweight mechanism:

1. **POUR water into bucket** → bucket rises (water adds weight)
   - Player must have water (in bottle)
   - If bucket at bottom with water, moves to Top of Well
   - If player in bucket, player moves with it

2. **FILL bottle from bucket** → bucket descends (water removed)
   - Player must have empty bottle
   - Bucket must have water
   - If bucket at top without water, moves to Well Bottom
   - If player in bucket, player moves with it

## Grammar Patterns Added

```
pour :target
pour water
pour water in :container
pour water into :container

fill :target
fill bottle
fill :target from :source
fill bottle from bucket
fill bottle with water
```

## Remaining Work

- [ ] Build and test the changes
- [ ] Create bucket-well.transcript test
- [ ] Test ENTER/EXIT bucket mechanics (may need stdlib entering action update)
- [ ] Verify room descriptions show correctly after bucket movement

## Future Vehicle Uses

The VehicleTrait is designed to support:
- **Boat** (watercraft) - River navigation with current
- **Basket** (cable) - Shaft area raise/lower
- **Balloon** (aircraft) - Volcano area rise/descend with heat

## Technical Notes

- VehicleTrait works alongside ContainerTrait (enterable: true)
- Vehicle movement uses `moveVehicle()` which handles position tracking
- Room descriptions are emitted via `room.described` event after movement
- Water is tracked via `(bucket as any).hasWater` flag (could be formalized later)
