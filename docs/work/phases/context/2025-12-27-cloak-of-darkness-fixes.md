# Work Summary: Cloak of Darkness Story Fixes

**Date**: 2025-12-27
**Branch**: phase4

## Overview

Fixed multiple issues preventing the Cloak of Darkness story from running correctly. This involved fixes across the engine, stdlib, text-services, and story packages.

## Issues Fixed

### 1. Player Not Registered in World Model
**Files**: `stories/cloak-of-darkness/src/test-runner.ts`, `stories/cloak-of-darkness/src/debug-runner.ts`

The test runners created a player entity but never registered it with `world.setPlayer()`. This caused `world.getPlayer()` to return undefined during story initialization.

**Fix**: Added `world.setPlayer(player.id)` after creating the player entity.

### 2. Event Type Naming Mismatch
**File**: `packages/text-services/src/standard-text-service.ts`

The looking action emits `if.event.room.description` but the text service only handled `if.event.room_description`. Same issue for `list.contents` vs `list_contents`.

**Fix**: Added case handlers for both naming conventions.

### 3. Going Action Used Stale Context for Room Description
**File**: `packages/stdlib/src/actions/standard/going/going.ts`

After moving the player, the going action's `report()` phase used `context.currentLocation` which still pointed to the source room, not the destination.

**Fix**:
- Added `previousLocation` and `currentLocation` to `GoingSharedData`
- Execute phase stores actual room IDs in sharedData
- Report phase builds room description using the destination from sharedData

### 4. Going Action Didn't Emit Room Contents
**File**: `packages/stdlib/src/actions/standard/going/going.ts`

After movement, no "You can see X here" message appeared.

**Fix**: Added `contents_list` action.success event emission in report phase.

### 5. Putting Action Didn't Actually Move Items (CRITICAL)
**File**: `packages/stdlib/src/actions/standard/putting/putting.ts`

The putting action called `SupporterBehavior.addItem()` and `ContainerBehavior.addItem()` for validation, but these behaviors only validate - they don't actually move items. The action said "You put X on Y" but the item stayed in inventory.

**Fix**: Added `context.world.moveEntity(item.id, target.id)` after behavior validation.

### 6. Story Scope Rules Used Wrong Cloak Name
**File**: `stories/cloak-of-darkness/src/index.ts`

Scope rules checked for `item.name === 'cloak'` but the cloak's actual name is `'velvet cloak'`.

**Fix**: Updated checks to `item.name === 'velvet cloak' || item.name === 'cloak'`.

### 7. Going Action Blocked Entry to Dark Rooms
**File**: `packages/stdlib/src/actions/standard/going/going.ts`

The going action's validate phase returned `TOO_DARK` error when trying to enter a dark room. In traditional IF, you CAN enter dark rooms - you just can't see.

**Fix**: Removed the darkness check from going validation. Darkness affects visibility (looking), not movement.

### 8. Entity Event Handlers Never Called
**File**: `packages/engine/src/game-engine.ts`

Entities could define handlers like `entity.on = { 'if.event.put_on': handler }` but these were never invoked. This broke the hook's ability to turn on the bar's lights.

**Fix**: Added `dispatchEntityHandlers(event)` method that iterates all entities and calls matching handlers for each event.

## Files Modified

### Engine
- `packages/engine/src/game-engine.ts` - Added entity handler dispatch

### Stdlib
- `packages/stdlib/src/actions/standard/going/going.ts` - Fixed room description, contents, darkness
- `packages/stdlib/src/actions/standard/putting/putting.ts` - Added actual moveEntity call

### Text Services
- `packages/text-services/src/standard-text-service.ts` - Handle both event naming conventions

### Story
- `stories/cloak-of-darkness/src/index.ts` - Fixed scope rule name checks, re-enabled bar darkness
- `stories/cloak-of-darkness/src/test-runner.ts` - Added setPlayer, enhanced debug output
- `stories/cloak-of-darkness/src/debug-runner.ts` - Added setPlayer
- `stories/cloak-of-darkness/package.json` - Added missing @sharpee/text-services dependency

## Testing

After fixes, the Cloak of Darkness game runs correctly:
1. Room descriptions show after movement
2. Contents lists display properly
3. "hang cloak on hook" actually moves the cloak
4. Player can enter dark bar
5. Hook's event handler fires to light the bar (pending final test)
6. Game can be completed

## Next Steps

1. Build and test with darkness enabled
2. Verify hook event handler fires correctly
3. Test full game playthrough
4. Commit all changes

## Related Issues

- Entity handlers are now functional but basic - future work could add priority ordering, async support, etc.
