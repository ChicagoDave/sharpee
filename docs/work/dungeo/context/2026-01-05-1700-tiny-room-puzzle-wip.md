# Work Summary: Tiny Room Key Puzzle (WIP)

**Date**: 2026-01-05 17:00
**Branch**: dungeo
**Status**: In Progress (interrupted)

## Overview

Started implementing the classic IF "key under door" puzzle in the Tiny Room.

## Puzzle Design

The player must:
1. PUT MAT UNDER DOOR - positions welcome mat to catch key
2. PUSH KEY WITH SCREWDRIVER / USE SCREWDRIVER ON KEYHOLE - key falls onto mat
3. TAKE MAT / PULL MAT - retrieve key from under door
4. UNLOCK DOOR WITH KEY - standard unlock action
5. OPEN DOOR / GO NORTH - access Dreary Room with blue crystal sphere

## Completed

### 1. Door and Key Objects
**File**: `stories/dungeo/src/regions/temple/objects/index.ts`

Added two new objects:

**Small Door** (lines 342-390):
- Placed in Tiny Room, blocks north exit to Dreary Room
- Has OpenableTrait and SceneryTrait
- Tracks puzzle state:
  - `isLocked: true` - until player uses key
  - `keyInLock: true` - key starts on other side
  - `matUnderDoor: false` - mat placement state
  - `keyOnMat: false` - key fell onto mat
- Marker: `isTinyRoomDoor: true`

**Small Key** (lines 392-419):
- Brass key for the door
- Starts hidden (`isHidden: true`) - represents being "in the lock"
- Marker: `isTinyRoomKey: true`
- Will be moved to player inventory when puzzle solved

### 2. Puzzle Handler
**File**: `stories/dungeo/src/handlers/tiny-room-handler.ts` (NEW)

Created handler with:
- Message IDs for all puzzle states
- Helper functions:
  - `findTinyRoomDoor()` - locate door in room
  - `findTinyRoomKey()` - locate key anywhere
  - `findMat()` - find mat in player inventory
  - `findScrewdriver()` - find screwdriver in player inventory
- Action handlers:
  - `handlePutMatUnderDoor()` - place mat under door
  - `handlePushKeyWithScrewdriver()` - push key through keyhole
  - `handlePullMat()` - retrieve mat (and key if present)
  - `handleUnlockDoor()` - unlock with correct key
- Utility functions:
  - `isNorthBlocked()` - check if door blocks movement
  - `getDoorDescription()` - dynamic description based on state

## Remaining Work

### High Priority
1. **Block north exit** - Add handler/event listener to intercept going north when door is locked
2. **Wire handler to actions** - Create story-specific actions or extend existing ones:
   - PUT :item UNDER :target pattern
   - USE :tool ON :target pattern (or PUSH KEY WITH SCREWDRIVER)
   - PULL :item pattern
3. **Add messages to language provider** - All the TinyRoomMessages IDs need text
4. **Export handler** from `handlers/index.ts`
5. **Update door description dynamically** - Override examine for the door

### Lower Priority
6. **Add transcript test** - Test the full puzzle flow
7. **Handle edge cases**:
   - What if player pushes key without mat? (key lost - puzzle unsolvable)
   - What if player takes mat after key falls? (key should come with it)
   - Multiple screwdriver uses after key pushed

## Files Changed

- `stories/dungeo/src/regions/temple/objects/index.ts` - Added door and key objects
- `stories/dungeo/src/handlers/tiny-room-handler.ts` - NEW: Puzzle handler logic

## Files To Change (not done)

- `stories/dungeo/src/handlers/index.ts` - Export handler
- `stories/dungeo/src/index.ts` - Wire handler, add grammar patterns, add messages
- `stories/dungeo/src/regions/temple/index.ts` - May need to modify north exit behavior
- `stories/dungeo/tests/transcripts/tiny-room-puzzle.transcript` - NEW: Test file

## Grammar Patterns Needed

```typescript
// PUT MAT UNDER DOOR
grammar.define('put :item under :target')
  .mapsTo('dungeo.action.put_under')
  .build();

grammar.define('slide :item under :target')
  .mapsTo('dungeo.action.put_under')
  .build();

// USE SCREWDRIVER ON KEYHOLE
grammar.define('push key with :tool')
  .mapsTo('dungeo.action.push_key')
  .build();

grammar.define('use :tool on keyhole')
  .mapsTo('dungeo.action.push_key')
  .build();

// PULL MAT
grammar.define('pull :item')
  .mapsTo('dungeo.action.pull_mat')
  .build();
```

## Notes

- The welcome mat already exists in West of House (`white-house/objects/index.ts`)
- Screwdriver already exists in Maintenance Room
- Blue crystal sphere (15 pts) is already in Dreary Room - this puzzle gates access to it
