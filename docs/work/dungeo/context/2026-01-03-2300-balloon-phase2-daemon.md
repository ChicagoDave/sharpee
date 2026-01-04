# Balloon Puzzle Phase 2 - Daemon Implementation

**Date:** 2026-01-03 23:00
**Branch:** dungeo

## Summary

Implemented Phase 2 of the balloon puzzle: the balloon daemon that controls vertical movement through the volcano shaft.

## Completed Work

### Balloon Daemon (`scheduler/balloon-daemon.ts`)

Created a new daemon that:
- Fires every 3 turns when `daemonEnabled = true`
- Checks if receptacle has burning object with `isOpen = true`
- Moves balloon up (with heat) or down (without heat)
- Handles crash at VAIR4 position (game death)
- Emits appropriate messages when player is in balloon

**Key Functions:**
- `hasHeatSource()` - Checks receptacle for burning objects
- `getBalloonState()` - Gets balloon entity and state
- `isPlayerInBalloon()` - Checks if player is in the balloon
- `handleCrash()` - Emits game.death event for balloon crash
- `createBalloonDaemon()` - Creates the Daemon object with condition/run

**Exports:**
- `registerBalloonDaemon(scheduler, world, balloonId, receptacleId)`
- `isBalloonDaemonActive(scheduler)`
- `getBalloonPosition(world)`
- `resetBalloonDaemonTimer()`

### Scheduler Messages (`scheduler-messages.ts`)

Added balloon messages:
- `BALLOON_RISING` - "The balloon rises slowly."
- `BALLOON_FALLING` - "The balloon sinks slowly."
- `BALLOON_AT_LEDGE` - "The balloon drifts near a ledge."
- `BALLOON_LANDED` - "The balloon settles to the ground."
- `BALLOON_CRASH` - Crash death message
- `BALLOON_HOOK_VISIBLE` - "You can see a hook on the rock face here."
- `BALLOON_INFLATING` / `BALLOON_DEFLATING`

### Integration Updates

**scheduler/index.ts:**
- Added `BalloonIds` interface
- Added optional `balloonIds` parameter to `registerScheduledEvents()`
- Calls `registerBalloonDaemon()` when balloon IDs provided

**regions/volcano/index.ts:**
- Now exports `createVolcanoRegionObjects` and `VolcanoObjectIds`

**index.ts (story):**
- Added `balloonIds: VolcanoObjectIds | null` field
- Captures balloon IDs from `createVolcanoRegionObjects()`
- Passes balloon IDs to `registerScheduledEvents()`
- Added balloon daemon messages to `extendLanguage()`

## Files Created

- `stories/dungeo/src/scheduler/balloon-daemon.ts`

## Files Modified

- `stories/dungeo/src/scheduler/scheduler-messages.ts`
- `stories/dungeo/src/scheduler/index.ts`
- `stories/dungeo/src/regions/volcano/index.ts`
- `stories/dungeo/src/index.ts`

## Remaining Work (Phase 3)

1. **Receptacle PUT handler** - When player puts burning object in receptacle:
   - Set `balloonState.burningObject` to entity ID
   - Emit inflation message
   - Update cloth bag description (inflated)

2. **Burn fuse integration** - Connect object burn tracking to balloon:
   - When burn timer expires, clear `burningObject`
   - Emit deflation message

3. **Exit/enter mechanics at ledges** - When at ledge positions:
   - Allow exit from balloon to ledge room
   - Wire ledge rooms to balloon positions

4. **Full playthrough testing** - Test complete balloon journey:
   - Get guidebook and matches
   - Enter balloon, light guidebook, put in receptacle
   - Rise through positions, tie at ledge
   - Untie, descend, land

## Technical Notes

- Daemon uses `condition` to check if it should fire (interval + enabled state)
- Position movement uses the helper functions from `balloon-objects.ts`
- Events use standard `entities: { target: id }` format for type safety
- Crash handling emits `game.death` event type
