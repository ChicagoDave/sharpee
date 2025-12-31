# Work Summary: Cyclops & Bat NPC Testing and Fixes

**Date**: 2025-12-29
**Duration**: ~1 hour
**Feature/Area**: Dungeo - NPC Testing (Phase 3 NPCs)

## Objective

Continue from previous session's Cyclops NPC, Say action, and Bat handler implementation by:
1. Verifying the build compiles
2. Writing transcript tests for Cyclops magic word puzzle and Bat room behavior
3. Debugging and fixing issues discovered during testing

## What Was Accomplished

### 1. Build Verification (Complete)

Successfully built dungeo story and all dependencies:
```bash
pnpm --filter '@sharpee/story-dungeo...' run build
```

### 2. Transcript Tests Created

Created three transcript tests in `stories/dungeo/tests/transcripts/`:

#### cyclops-magic-word.transcript
Tests the Cyclops puzzle where saying "odysseus" or "ulysses" scares the cyclops away:
- Navigate to Cyclops Room via GDT teleport
- Verify cyclops blocks north passage
- Say "odysseus" - cyclops panics and flees
- Verify north passage to Living Room is now open
- Return to Cyclops Room and verify cyclops is gone

**Status**: PASSING (18 passed, 2 expected failures)

#### bat-with-garlic.transcript
Tests entering Bat Room with garlic protection:
- Get brown sack (contains garlic) from Kitchen
- Teleport to Gas Room (adjacent to Bat Room)
- Walk east into Bat Room
- Expected: bat cowers from garlic smell

**Status**: FAILING - bat daemon not triggering

#### bat-without-garlic.transcript
Tests entering Bat Room without garlic:
- Navigate without picking up garlic/sack
- Teleport to Gas Room
- Walk east into Bat Room
- Expected: bat attacks and teleports player to random underground room

**Status**: FAILING - bat daemon not triggering

### 3. Bug Fixes Applied

#### Fix 1: Recursive Garlic Detection
The `playerHasGarlic()` function in bat-handler.ts only checked direct inventory contents, not items inside containers (garlic is in the brown sack).

**Changed**: `stories/dungeo/src/handlers/bat-handler.ts`
```typescript
// Before: Only checked direct contents
function playerHasGarlic(world: WorldModel, playerId: string): boolean {
  const contents = world.getContents(playerId);
  return contents.some(item => {
    // Check if item is garlic
  });
}

// After: Recursively checks nested containers
function playerHasGarlic(world: WorldModel, playerId: string): boolean {
  const checkContents = (entityId: string): boolean => {
    const contents = world.getContents(entityId);
    return contents.some(item => {
      if (isGarlic(item)) return true;
      return checkContents(item.id); // Check nested
    });
  };
  return checkContents(playerId);
}
```

### 4. Issue Discovered: Bat Daemon Not Triggering

**Problem**: The bat daemon's `condition` and `run` functions are never being called when player enters Bat Room, even though:
- The daemon IS registered (confirmed by "Dungeo scheduler: Registered all daemons and fuses" log)
- The player successfully moves to Bat Room (confirmed by `if.event.actor_moved` event)
- The scheduler tick SHOULD run after non-meta commands

**Investigation Status**: Added debug logging to bat-handler.ts to trace daemon execution:
```typescript
condition: (context: SchedulerContext): boolean => {
  const result = context.playerLocation === batRoomId;
  console.log(`[BAT DEBUG] condition: playerLocation=${context.playerLocation}, batRoomId=${batRoomId}, result=${result}`);
  return result;
},
```

**Suspected Causes** (to investigate):
1. Scheduler tick not being called by game engine
2. Room ID mismatch between registration and runtime
3. Issue with how transcript tester initializes the engine

## Files Modified

### Created
- `stories/dungeo/tests/transcripts/cyclops-magic-word.transcript`
- `stories/dungeo/tests/transcripts/bat-with-garlic.transcript`
- `stories/dungeo/tests/transcripts/bat-without-garlic.transcript`

### Modified
- `stories/dungeo/src/handlers/bat-handler.ts` - Fixed garlic detection, added debug logging

## Test Results

```
Cyclops Magic Word: 18 passed, 2 expected failures ✓
Bat With Garlic: 11 passed, 1 failed ✗
Bat Without Garlic: 11 passed, 1 failed, 1 expected failure ✗
```

## Next Steps

### Immediate (Required for Bat Tests to Pass)
1. [ ] Run build with debug logging to see if daemon condition is evaluated
2. [ ] Verify scheduler tick is actually running during `executeCommand`
3. [ ] Check if room IDs match between bat handler registration and player location
4. [ ] Consider if GDT teleport affects scheduler state tracking

### Potential Fixes to Try
1. Add scheduler tick debug logging in game-engine.ts
2. Verify `BAT_PREV_LOCATION_KEY` state is being properly initialized
3. Check if transcript tester's engine initialization differs from CLI runner

### After Bat Fix
4. [ ] Remove debug logging from bat-handler.ts
5. [ ] Run all transcript tests to verify no regressions
6. [ ] Consider adding cyclops-combat.transcript for combat defeat path

## References

- Previous work summary: `docs/work/dungeo/context/2025-12-29-cyclops-bat-npcs.md`
- ADR-070: NPC System Architecture
- ADR-071: Daemons and Fuses (Timed Events)
- ADR-073: Transcript Testing

## Notes

The Cyclops puzzle works correctly - saying "odysseus" triggers:
- `npc.emoted` event with `messageId="dungeo.cyclops.panics"`
- `npc.emoted` event with `messageId="dungeo.cyclops.flees"`
- `game.message` event with `messageId="dungeo.cyclops.passage_opens"`
- Player can then go north to Living Room

The bat daemon registration appears correct but the daemon never executes. This is a scheduler/engine integration issue that needs further debugging.
