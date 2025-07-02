# Property Access Fixes Summary

## Changes Made

### 1. Fixed WearableTrait property access
- Changed `isWorn` to `worn` in:
  - `event-processor/src/handlers/movement.ts`
  - `event-processor/src/handlers/state-change.ts`
  - `actions/src/standard/examining.ts`
  - `actions/src/standard/dropping.ts`
  - `actions/src/standard/taking.ts`
  - `actions/src/standard/message-based/taking-with-messages.ts`

### 2. Fixed missing trait types
- Removed references to non-existent `WEARER` and `PORTABLE` trait types
- Updated to use `ActorTrait.inventoryLimit.maxWeight` instead of `PortableTrait.maxCarryWeight`

### 3. Fixed container capacity access
- Changed from simple `capacity` number to `capacity.maxItems`, `capacity.maxWeight`, `capacity.maxVolume` object structure

### 4. Fixed other property issues
- Removed `untakeableReason` property access from SceneryTrait
- Removed `connectedDoor` property access from DoorTrait
- Fixed `getLocation()` method call that doesn't exist on entities
- Fixed trait key access (changed `'IDENTITY'` to `'identity'`)

### 5. Fixed TypeScript issues
- Extended `ActionFailedPayload` to implement `Record<string, unknown>`
- Fixed optional property access with nullish coalescing
- Fixed type assertion for message resolver

### 6. Property inconsistencies still present
The trait system has inconsistent naming:
- OpenableTrait uses `isOpen` ✓
- LockableTrait uses `isLocked` ✓
- SwitchableTrait uses `isOn` ✓
- LightSourceTrait uses `isLit` ✓
- **But WearableTrait uses `worn` (not `isWorn`)**
- **And RoomTrait uses `visited` (not `isVisited`)**

## Remaining Issues

### TypeScript Configuration
The build still has cross-package import issues that need to be resolved:
1. `rootDir` errors when actions package imports from stdlib
2. Circular dependency between actions and stdlib packages

### Missing Functionality
Some world model methods are referenced but may not exist:
- `world.getTotalWeight()`
- Entity scope/visibility methods

## Next Steps
1. Fix the TypeScript configuration to properly handle cross-package imports
2. Consider standardizing trait property naming (all boolean properties should either use `is` prefix or not)
3. Implement missing world model methods or update actions to not use them
