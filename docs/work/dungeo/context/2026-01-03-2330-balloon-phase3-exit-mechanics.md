# Balloon Phase 3 - Exit Mechanics

**Date:** 2026-01-03 23:30
**Branch:** dungeo

## Summary

Completed Phase 3 of balloon puzzle implementation - exit mechanics at ledges.

## Changes Made

### 1. Balloon Handler Updates (`handlers/balloon-handler.ts`)

**Added:**
- `createBalloonExitTransformer()` - Command transformer that intercepts EXIT when in balloon
- `balloonExitAction` - Custom action for balloon exit at ledges/mid-air
- `BalloonExitMessages` - Message IDs for exit feedback

**Logic:**
- At ground (vlbot): Allow normal exit to Volcano Bottom
- At ledge (ledg2/3/4): Use custom action to move to ledge room
- At mid-air (vair1/2/3/4): Block exit with message

### 2. Balloon Objects Updates (`volcano/objects/balloon-objects.ts`)

**Changed:**
- `createBalloonObjects()` now takes `BalloonRoomIds` instead of just `volcanoBottomId`
- `VehicleTrait.positionRooms` now maps ledge positions to actual ledge rooms:
  - ledg2 → narrowLedge
  - ledg3 → narrowLedge (no dedicated room)
  - ledg4 → wideLedge

### 3. Balloon Daemon Updates (`scheduler/balloon-daemon.ts`)

**Added:**
- `syncVehicleTraitPosition()` - Syncs VehicleTrait.currentPosition with balloonState.position
- Called when balloon position changes (movement and crash)

### 4. Story Index Updates

**Added imports:**
- `createBalloonExitTransformer` from handlers

**Registered:**
- Balloon exit transformer in `onEngineReady()`

**Language messages:**
- `EXIT_SUCCESS`: "You climb out of the balloon."
- `EXIT_BLOCKED_MIDAIR`: "You are too high in the air to exit safely!"
- `EXIT_TO_LEDGE`: "You carefully climb out of the balloon onto the ledge."

### 5. Actions Index Updates

**Added:**
- Import and registration of `balloonExitAction`
- Re-export of `BALLOON_EXIT_ACTION_ID` and `BalloonExitMessages`

## Files Modified

- `stories/dungeo/src/handlers/balloon-handler.ts` - Major additions
- `stories/dungeo/src/regions/volcano/objects/balloon-objects.ts` - Interface change
- `stories/dungeo/src/regions/volcano/objects/index.ts` - Updated function call
- `stories/dungeo/src/scheduler/balloon-daemon.ts` - VehicleTrait sync
- `stories/dungeo/src/actions/index.ts` - Added balloon exit action
- `stories/dungeo/src/index.ts` - Import and registration

## Test Created

- `tests/transcripts/balloon-flight.transcript` - Tests balloon movement and exit mechanics

## Remaining Work

1. **Verify build** - Type checking timing out, need to confirm builds
2. **Run transcript tests** - Verify exit mechanics work as expected
3. **Test edge cases**:
   - Exit at different ledge positions
   - Exit after tying to hook
   - Exit after balloon crash

## Technical Notes

The balloon doesn't physically move in the world model - it stays in volcanoBottomId.
Only the `balloonState.position` and `VehicleTrait.currentPosition` track where it is.
The exit transformer handles the disconnect by using the position to determine
which room the player should exit to.
