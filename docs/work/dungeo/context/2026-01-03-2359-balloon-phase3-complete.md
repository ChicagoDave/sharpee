# Balloon Phase 3 Complete - Exit Mechanics

**Date:** 2026-01-03 23:59
**Branch:** dungeo

## Summary

Completed Phase 3 of balloon puzzle implementation - exit mechanics at ledges. Also debugged apparent GDT issue (was just wrong room name format).

## What Was Implemented

### 1. Receptacle PUT Handler (`handlers/balloon-handler.ts`)
- Listens for `if.event.put_in` when target is receptacle
- Tracks burning objects, updates `balloonState.burningObject`
- Manages cloth bag inflation description
- Also handles `if.event.taken` to clear burning object when removed

### 2. Burn Fuse Daemon (`handlers/balloon-handler.ts`)
- Decrements `burnTurnsRemaining` on all burning objects each turn
- When object burns out: clears `isBurning`, sets `isBurnedOut`
- If in receptacle: clears balloon state, deflates bag
- Emits `OBJECT_BURNED_OUT` and `BALLOON_DEFLATING` messages

### 3. Balloon Exit Transformer & Action (`handlers/balloon-handler.ts`)
- `createBalloonExitTransformer()` - Intercepts EXIT when player in balloon
- `balloonExitAction` - Custom action for balloon exit
- Logic:
  - At ground (vlbot): Allow normal stdlib exit
  - At ledge (ledg2/3/4): Custom action moves player to ledge room
  - At mid-air (vair1-4): Block exit with message

### 4. VehicleTrait Position Sync (`scheduler/balloon-daemon.ts`)
- Added `syncVehicleTraitPosition()` helper
- Called when balloon position changes (movement and crash)
- Keeps `VehicleTrait.currentPosition` in sync with `balloonState.position`

### 5. Position-to-Room Mappings (`volcano/objects/balloon-objects.ts`)
- New `BalloonRoomIds` interface with volcanoBottom, narrowLedge, wideLedge
- Updated `positionRooms` in VehicleTrait:
  - `vlbot` → volcanoBottom
  - `ledg2` → narrowLedge
  - `ledg3` → narrowLedge (no dedicated room)
  - `ledg4` → wideLedge

## Files Modified

- `stories/dungeo/src/handlers/balloon-handler.ts` - Major additions (PUT handler, burn daemon, exit transformer/action)
- `stories/dungeo/src/handlers/index.ts` - Export balloon-handler
- `stories/dungeo/src/scheduler/balloon-daemon.ts` - Added VehicleTrait sync
- `stories/dungeo/src/scheduler/index.ts` - Export and register burn daemon
- `stories/dungeo/src/regions/volcano/objects/balloon-objects.ts` - BalloonRoomIds interface, position mappings
- `stories/dungeo/src/regions/volcano/objects/index.ts` - Pass ledge room IDs
- `stories/dungeo/src/actions/index.ts` - Added balloonExitAction
- `stories/dungeo/src/index.ts` - Import transformer, register it, add language messages

## GDT "Bug" - Not Actually Broken

Investigated apparent GDT failure. Issue was:
- Used `ah volcano-bottom` (hyphenated)
- Room name is `Volcano Bottom` (spaces, capitalized)
- GDT AH joins args with spaces, so `ah Volcano Bottom` works

Transcript assertion format was also wrong:
- Wrong: `~text~`
- Correct: `[OK: contains "text"]`

## Test Results

`balloon-flight.transcript` - **10 passed**
- GDT teleport to Volcano Bottom
- Enter/exit balloon at ground level
- All mechanics working

`balloon-actions.transcript` - **8 passed, 1 failed**
- TIE action needs grammar/action implementation completed

## Remaining Work

1. **TIE/UNTIE actions** - Grammar patterns may need debugging
2. **LIGHT action** - Test with actual burning
3. **Full balloon journey test** - Inflate, rise, exit at ledge
4. **Edge cases** - Exit after tying, after crash

## Bundle Build

Bundle builds successfully (1.3MB, loads in ~120ms).
Two warnings about VehicleTrait case sensitivity (cosmetic).
