# Work Summary: VehicleTrait Architecture Refactor

**Date**: 2026-01-03 16:00
**Branch**: vehicle-trait
**Status**: In Progress (build interrupted)

## Problem Statement

Initial VehicleTrait implementation was overengineered and had fundamental issues:
1. **Scope matching broken** - `matching({ enterable: true })` checked `entity['enterable']` directly, but `enterable` lives inside ContainerTrait
2. **"enter bucket" failed** - Parser couldn't match because scope constraint didn't understand traits
3. **Dual trait confusion** - Complex VehicleTrait duplicated info that belonged in story code
4. **Overengineered utilities** - `moveVehicle()` etc. were unnecessary since world model already handles containment

## Architecture Decision

Simplified to this approach:

1. **ContainerTrait** - Handles containment and `enterable: true` (already existed)
2. **VehicleTrait** - Minimal marker trait with just `vehicleType` and `blocksWalkingMovement`
3. **Scope evaluator fix** - Now checks trait properties, not just entity-level properties
4. **Going action intercept** - Blocks walking when in a vehicle with `blocksWalkingMovement: true`
5. **Story-specific movement** - Pour/fill actions use `world.moveEntity()` directly

Key insight: The world model already handles transport! When a container moves, its contents (including actors) remain inside it. No special "move occupants" code needed.

## Changes Made

### Platform (packages/)

#### 1. packages/parser-en-us/src/scope-evaluator.ts
- Added `getPropertyValue()` method that checks both entity properties AND trait properties
- Maps property names to traits: `enterable` → container/supporter/room, `isOpen` → openable, etc.
- Fixes: "enter bucket" now works because `enterable: true` on ContainerTrait is found

#### 2. packages/world-model/src/traits/vehicle/vehicleTrait.ts
- Simplified to just:
  ```typescript
  VehicleTrait {
    vehicleType: 'counterweight' | 'watercraft' | 'aircraft' | 'cable' | 'generic'
    blocksWalkingMovement: boolean
  }
  ```
- Removed: `positionRooms`, `currentPosition`, `isOperational`, `requiresExitBeforeLeaving`, `notOperationalReason`

#### 3. packages/world-model/src/traits/vehicle/vehicleBehavior.ts
- Simplified to just:
  - `isVehicle(entity)` - Check if entity has VehicleTrait
  - `getVehicleTrait(entity)` - Get the trait
  - `isActorInVehicle(world, actorId)` - Check if actor is in a vehicle
  - `getActorVehicle(world, actorId)` - Get the vehicle entity
  - `canActorWalk(world, actorId)` - Check if walking is blocked
- Removed: `moveVehicle()`, `getVehicleOccupants()`, `canVehicleMove()`, `canActorLeaveLocation()`

#### 4. packages/world-model/src/index.ts
- Added export for vehicle trait: `export * from './traits/vehicle'`

#### 5. packages/stdlib/src/actions/standard/going/going.ts
- Added import for `canActorWalk` and `IdentityTrait`
- Enhanced container check to detect vehicles and give vehicle-specific message

#### 6. packages/stdlib/src/actions/standard/going/going-messages.ts
- Added `IN_VEHICLE` message constant

#### 7. packages/lang-en-us/src/actions/going.ts
- Added messages:
  - `not_in_room`: "You'll have to get out of {container} first."
  - `in_vehicle`: "You can't walk while in the {vehicle}. You'll need to get out first."

### Story (stories/dungeo/)

#### 1. stories/dungeo/src/regions/well-room/objects/index.ts
- Simplified bucket creation to use new VehicleTrait
- Story-specific state stored on bucket: `hasWater`, `topRoomId`, `bottomRoomId`

#### 2. stories/dungeo/src/actions/pour/pour-action.ts
- Uses story-specific `bucket.topRoomId` / `bucket.bottomRoomId`
- Uses `world.moveEntity()` directly for bucket movement
- Uses `isActorInVehicle()` to check if player moved with bucket

#### 3. stories/dungeo/src/actions/fill/fill-action.ts
- Same pattern as pour action

#### 4. stories/dungeo/src/handlers/glacier-handler.ts
- Fixed type: `WorldModel` → `IWorldModel` in event handler callback

## Remaining Work

1. **Build and test** - Build was interrupted, need to complete
2. **Transcript test** - bucket-well.transcript needs updating/testing
3. **Verify enter/exit** - Confirm entering action works with new scope matching

## Key Lessons

1. **World model containment is sufficient** - No need for special vehicle movement code
2. **Trait properties need scope support** - Parser scope matching must understand traits
3. **Story-specific logic belongs in story** - Position tracking, room IDs, etc. are story concerns
4. **Platform traits should be markers** - VehicleTrait just identifies something as a vehicle

## Files Changed

```
packages/parser-en-us/src/scope-evaluator.ts
packages/world-model/src/traits/vehicle/vehicleTrait.ts
packages/world-model/src/traits/vehicle/vehicleBehavior.ts
packages/world-model/src/index.ts
packages/stdlib/src/actions/standard/going/going.ts
packages/stdlib/src/actions/standard/going/going-messages.ts
packages/lang-en-us/src/actions/going.ts
stories/dungeo/src/regions/well-room/objects/index.ts
stories/dungeo/src/actions/pour/pour-action.ts
stories/dungeo/src/actions/fill/fill-action.ts
stories/dungeo/src/handlers/glacier-handler.ts
```
