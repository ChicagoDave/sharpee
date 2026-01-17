# Work Summary: Window Blocking Investigation - 2026-01-16

## Overview

Investigation and partial fix for ISSUE-003 (window doesn't block passage to Kitchen). The window blocking implementation was added but a bug in the going action's validation order prevents custom blocked messages from appearing.

## Session Details

- **Date**: 2026-01-16 ~22:15-23:00
- **Branch**: dungeo
- **Issue**: ISSUE-003 (Critical)

## Problem

In Dungeo, the window between Behind House and Kitchen should block passage until opened. Players could walk through the closed window because the exits were set up unconditionally in `connectHouseInteriorToExterior()`.

## Implementation Approach

Used `RoomBehavior.blockExit()` / `unblockExit()` pattern (same as trapdoor):

1. Block both directions (Behind House→west, Kitchen→east) when window is created
2. Unblock on `if.event.opened`
3. Re-block on `if.event.closed`

## Changes Made

### stories/dungeo/src/regions/white-house.ts

1. **Function signature update**:
```typescript
// Before
export function createWhiteHouseObjects(world: WorldModel, roomIds: WhiteHouseRoomIds): void

// After
export function createWhiteHouseObjects(world: WorldModel, roomIds: WhiteHouseRoomIds, kitchenId?: string): void
```

2. **Window creation with room IDs**:
```typescript
const window = createWindow(world, roomIds.behindHouse, kitchenId);
```

3. **Block exits on creation**:
```typescript
const behindHouse = world.getEntity(behindHouseId);
if (behindHouse) {
  RoomBehavior.blockExit(behindHouse, Direction.WEST, 'The window is closed.');
}
if (kitchenId) {
  const kitchen = world.getEntity(kitchenId);
  if (kitchen) {
    RoomBehavior.blockExit(kitchen, Direction.EAST, 'The window is closed.');
  }
}
```

4. **Unblock on open, re-block on close**:
```typescript
window.on = {
  'if.event.opened': (event) => {
    // ... update description ...
    RoomBehavior.unblockExit(bh, Direction.WEST);
    RoomBehavior.unblockExit(k, Direction.EAST);
    // ...
  },
  'if.event.closed': (event) => {
    // ... update description ...
    RoomBehavior.blockExit(bh, Direction.WEST, 'The window is closed.');
    RoomBehavior.blockExit(k, Direction.EAST, 'The window is closed.');
    // ...
  }
};
```

### stories/dungeo/src/index.ts

Pass kitchen ID to createWhiteHouseObjects:
```typescript
createWhiteHouseObjects(world, this.whiteHouseIds, this.houseInteriorIds.kitchen);
```

### packages/stdlib/src/actions/standard/going/going.ts

Pass custom blocked message to error params:
```typescript
// Line 151-155
const blockedMessage = RoomBehavior.getBlockedMessage(currentRoom, direction) || "You can't go that way.";
return {
  valid: false,
  error: GoingMessages.MOVEMENT_BLOCKED,
  params: { direction: direction, message: blockedMessage }
};
```

### packages/lang-en-us/src/actions/going.ts

Use the message param in the template:
```typescript
'movement_blocked': "{message}",  // Was: "{You} {can't} go that way."
```

## Issue Discovered: Going Action Validation Order Bug

During testing, the going action returned `no_exit_that_way` instead of `movement_blocked`:

```
[GoingAction] Validation failed: 'if.going.no_exit_that_way'
```

**Root Cause**: The going action's validate phase checks for a valid exit BEFORE checking if the exit is blocked. Since the exit exists (with a `via` the window), it should pass that check, but something in the validation order is wrong.

Looking at `going.ts` line 137-157:
1. Checks if exit exists (line ~140)
2. Checks if blocked (line ~150)

The "exit exists" check may be returning false for blocked exits, never reaching the blocked check.

## Testing Issues

Multiple WSL/Node issues during testing:
- `require('./packages/world-model/dist')` hung (124 timeout)
- Transcript tester processes hung requiring `pkill`
- Build outputs sometimes missing after compile
- Background task outputs returning empty

These environment issues are unrelated to the code changes.

## Status: INCOMPLETE

The window blocking implementation is in place, but:
- [ ] Going action validation order needs investigation
- [ ] Custom blocked messages not appearing (always shows "You can't go that way")
- [ ] Need to verify blockExit is actually being called at startup

## Next Steps

1. **Debug going action validation order** - Add console logs to trace why `no_exit_that_way` fires before `movement_blocked`
2. **Verify blockExit at startup** - Confirm the window blocks exits when world initializes
3. **Consider alternative**: Use `via` property on exits (like trapdoor) which checks if the passage entity (window) is open

## Files Modified

- `stories/dungeo/src/regions/white-house.ts` - Window blocking logic
- `stories/dungeo/src/index.ts` - Pass kitchenId to createWhiteHouseObjects
- `packages/stdlib/src/actions/standard/going/going.ts` - Pass blockedMessage to params
- `packages/lang-en-us/src/actions/going.ts` - Use {message} template
