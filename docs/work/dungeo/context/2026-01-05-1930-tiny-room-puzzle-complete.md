# Work Summary: Tiny Room Key Puzzle Complete

**Date**: 2026-01-05 19:30
**Branch**: dungeo
**Status**: Complete - All 22 tests pass

## Overview

Completed the classic IF "key under door" puzzle in the Tiny Room. This is a multi-step puzzle requiring the player to slide a mat under a locked door, push the key out of the lock with a screwdriver, then pull the mat to retrieve the key.

## What Was Implemented

### 4 New Story-Specific Actions

1. **put-under** (`stories/dungeo/src/actions/put-under/`)
   - Validates: door exists, mat not already under, player has mat
   - Fixed validation order: checks "already placed" before "player has mat"

2. **push-key** (`stories/dungeo/src/actions/push-key/`)
   - Validates: screwdriver in inventory, key still in lock
   - Drops key onto mat or loses it if no mat

3. **pull-mat** (`stories/dungeo/src/actions/pull-mat/`)
   - NEW action created this session
   - Called when "take mat" is transformed (mat is under door)
   - Retrieves mat + key if key fell onto mat

4. **door-blocked** (`stories/dungeo/src/actions/door-blocked/`)
   - Blocking action for "go north" when door locked
   - Shows "locked, no keyhole on this side" message

### 2 Command Transformers

1. **createTinyRoomDoorTransformer** - Intercepts "go north" when door locked
2. **createTinyRoomMatTransformer** - Intercepts "take mat" when mat is under door

### Bug Fixes

1. **LockableTrait usage** - Door was trying to set `isLocked` directly on entity, which conflicts with the built-in getter. Fixed to use proper `LockableTrait`.

2. **Validation order** - put-under was checking "player has mat" before "mat already placed", causing wrong error message.

3. **GDT DO command** - Fixed multi-word object names (was only using first word).

## Files Changed

### New Files
- `stories/dungeo/src/actions/put-under/` (types.ts, put-under-action.ts, index.ts)
- `stories/dungeo/src/actions/push-key/` (types.ts, push-key-action.ts, index.ts)
- `stories/dungeo/src/actions/pull-mat/` (types.ts, pull-mat-action.ts, index.ts)
- `stories/dungeo/src/actions/door-blocked/` (types.ts, door-blocked-action.ts, index.ts)
- `stories/dungeo/tests/transcripts/tiny-room-puzzle.transcript`

### Modified Files
- `stories/dungeo/src/actions/index.ts` - Export new actions
- `stories/dungeo/src/handlers/tiny-room-handler.ts` - Add mat transformer, fix LockableTrait usage
- `stories/dungeo/src/handlers/index.ts` - Export handler
- `stories/dungeo/src/index.ts` - Register actions and transformers, add grammar patterns
- `stories/dungeo/src/regions/temple/objects/index.ts` - Use LockableTrait for door
- `stories/dungeo/src/actions/gdt/commands/do.ts` - Fix multi-word object names
- `docs/work/dungeo/implementation-plan.md` - Mark puzzle complete

## Test Results

```
Running: stories/dungeo/tests/transcripts/tiny-room-puzzle.transcript
  "Tiny Room Key Puzzle"
  22 passed (87ms)
```

## Technical Notes

### Proper Trait Usage
The door entity now uses `LockableTrait` properly:
```typescript
door.add(new LockableTrait({
  isLocked: true
}));
```

To unlock, access the trait:
```typescript
const lockable = door.get(TraitType.LOCKABLE) as LockableTrait;
if (lockable) lockable.isLocked = false;
```

### Transformer Pattern
For special-case taking (pulling mat from under door):
```typescript
export function createTinyRoomMatTransformer(): ParsedCommandTransformer {
  return (parsed, world) => {
    if (!isInTinyRoom(world) || !isTakingMat(parsed) || !isMatUnderDoor(world)) {
      return parsed;
    }
    return { ...parsed, action: PULL_MAT_ACTION_ID };
  };
}
```

## Progress Update

- Puzzles complete: 22/25 (88%)
- Remaining: Coffin transport, Coal machine, Basket mechanism
