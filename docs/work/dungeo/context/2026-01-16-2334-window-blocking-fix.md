# Work Summary: Window Blocking Fix (ISSUE-003)

**Date**: 2026-01-16
**Issue**: ISSUE-003 - Window doesn't block passage to Kitchen
**Status**: Fixed

## Problem

Player could walk west from Behind House into Kitchen without opening the window first. The window should block passage until opened, similar to how the trapdoor blocks passage to the cellar.

**Reproduction**:
```
> n
> e
Behind House
> w
Kitchen   # Should have been blocked!
```

## Investigation

Initial approach was overly complex - looked at event handlers, blockExit/unblockExit pattern, initialization order, etc. The troll blocking uses `blockExit()` but this requires manual unblock handling.

**Key insight**: The trapdoor uses a simpler pattern - the `via` property on exits:
```typescript
RoomBehavior.setExit(livingRoom, Direction.DOWN, cellarId, trapdoor.id);
```

The going action (line 160-188 in `packages/stdlib/src/actions/standard/going/going.ts`) automatically checks if the `via` entity is open before allowing passage. No event handlers needed.

## Solution

Wire the Kitchen↔Behind House exits through the window entity using `via`:

```typescript
// In createWhiteHouseObjects after creating window:
RoomBehavior.setExit(behindHouse, Direction.WEST, kitchenId, window.id);
RoomBehavior.setExit(kitchen, Direction.EAST, roomIds.behindHouse, window.id);
```

The window already has `OpenableTrait({ isOpen: false })`, so the going action blocks passage automatically.

## Files Changed

1. **`stories/dungeo/src/regions/white-house.ts`**
   - Simplified `createWindow()` - removed blockExit/unblockExit logic
   - Added exit wiring with `via` in `createWhiteHouseObjects()`

2. **`stories/dungeo/src/regions/house-interior.ts`**
   - Removed duplicate exit setup in `connectHouseInteriorToExterior()`
   - Exits now wired in `createWhiteHouseObjects()` with window as `via`

3. **`stories/dungeo/tests/transcripts/troll-blocking.transcript`**
   - Added "open window" step before going west to Kitchen

4. **`docs/work/issues/issues-list.md`**
   - Marked ISSUE-003 as fixed
   - Moved to Closed Issues section with solution documented

## Key Takeaway

For passage blocking through doors/windows, use the `via` property on exits rather than manual `blockExit()`/`unblockExit()` calls. The going action handles the check automatically for any entity with `OpenableTrait`.

```typescript
// Preferred pattern for blocking exits with openable entities:
RoomBehavior.setExit(room1, direction, room2Id, doorOrWindowId);
```
