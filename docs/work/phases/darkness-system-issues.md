# Darkness System Issues

**Date**: 2025-12-27
**Discovered During**: Cloak of Darkness story testing
**Branch**: phase4

## Overview

Testing the Cloak of Darkness story revealed multiple issues with how Sharpee handles darkness mechanics. The story had to implement extensive workarounds that should be handled by the engine/stdlib.

---

## Issue 1: Looking Action Uses Non-Existent Property

**Severity**: Critical
**Location**: `packages/stdlib/src/actions/standard/looking/looking-data.ts:26`

### Problem

The `checkIfDark()` function checks `roomTrait.requiresLight` but this property **does not exist** on RoomTrait:

```typescript
// looking-data.ts (current - broken)
function checkIfDark(context: ActionContext): boolean {
  // ...
  if (!roomTrait.requiresLight) {  // <-- Property doesn't exist!
    return false;
  }
  // ...
}
```

### Expected

RoomTrait has `isDark: boolean` which is what should be checked:

```typescript
// RoomTrait (actual properties)
export class RoomTrait {
  isDark: boolean;        // ✓ This exists
  // requiresLight        // ✗ This does NOT exist
}
```

### Impact

- The looking action's darkness check **never triggers**
- Dark rooms display normally instead of "It's too dark to see"
- The entire darkness system in looking is non-functional

### Fix

Replace `requiresLight` check with `isDark` check, and verify the logic matches `VisibilityBehavior`.

---

## Issue 2: Room Snapshots Don't Capture isDark from RoomTrait

**Severity**: High
**Location**: `packages/stdlib/src/actions/base/snapshot-utils.ts:181-184`
**Status**: Fixed in this session

### Problem

`captureRoomSnapshot()` only looked for a separate `darkness` trait:

```typescript
// Before fix
const darknessTrait = room.get?.('darkness') as any;
if (darknessTrait !== undefined) {
  snapshot.isDark = darknessTrait.isDark === true;
}
// Never checked roomTrait.isDark!
```

### Fix Applied

```typescript
// After fix
if (darknessTrait !== undefined) {
  snapshot.isDark = darknessTrait.isDark === true;
} else if (roomTrait?.isDark !== undefined) {
  snapshot.isDark = roomTrait.isDark === true;
}
```

---

## Issue 3: Actor Snapshots Exclude Inventory by Default

**Severity**: High
**Location**: `packages/stdlib/src/actions/standard/going/going-data.ts:72`
**Status**: Fixed in this session

### Problem

The going action captured actor snapshots without contents:

```typescript
// Before fix
const actorSnapshot = captureEntitySnapshot(actor, context.world, false);
```

Entity handlers couldn't determine what the player was carrying.

### Fix Applied

```typescript
// After fix
const actorSnapshot = captureEntitySnapshot(actor, context.world, true);
```

---

## Issue 4: Entity Handler Type Mismatch

**Severity**: Medium
**Location**: `packages/engine/src/game-engine.ts:1238`
**Status**: Fixed in this session

### Problem

`dispatchEntityHandlers()` parameter type was `ISemanticEvent` but it receives `SequencedEvent`:

```typescript
// Before fix
private dispatchEntityHandlers(event: ISemanticEvent): void {

// Called with
this.dispatchEntityHandlers(event);  // event is SequencedEvent
```

### Fix Applied

```typescript
private dispatchEntityHandlers(event: SequencedEvent): void {
```

---

## Issue 5: Inconsistent Darkness Checking Across Actions

**Severity**: High
**Location**: Multiple files

### Problem

Three different places implement darkness checking differently:

1. **VisibilityBehavior** (`world-model/src/world/VisibilityBehavior.ts`)
   - Checks `roomTrait.isDark`
   - Checks for light sources in room and on actor
   - Comprehensive implementation

2. **Looking action** (`stdlib/src/actions/standard/looking/looking-data.ts`)
   - Checks `roomTrait.requiresLight` (doesn't exist!)
   - Has its own light source detection
   - Broken implementation

3. **Going action** (`stdlib/src/actions/standard/going/going.ts:331`)
   - Has `isDarkRoom()` helper
   - Checks `roomTrait.isDark`
   - Doesn't check for light sources

### Recommendation

Create a single `DarknessBehavior` or use `VisibilityBehavior.isDark()` consistently across all actions.

---

## Issue 6: No Standard "Disturbing the Dark" Mechanic

**Severity**: Medium (Feature Gap)
**Location**: N/A - missing functionality

### Problem

Traditional IF convention: actions in dark rooms cause problems (disturbing sawdust, tripping, etc.).

Sharpee has **no built-in support** for:
- Tracking number of actions taken in darkness
- Emitting events when player fumbles in the dark
- Modifying world state due to darkness disturbances
- Standard "blundering around in the dark" messages

### Current Workaround

Stories must implement custom event handlers on room entities:

```typescript
// Story has to do this manually
bar.on = {
  'if.event.actor_moved': (event) => {
    if (isDark && hasCloak) {
      this.disturbances++;
      this.updateMessage();
      return [{ type: 'game.message', data: { message: 'Blundering around...' }}];
    }
  }
};
```

### Recommendation

Consider adding optional darkness disturbance tracking:
- `RoomTrait.trackDisturbances?: boolean`
- `DarknessBehavior.recordDisturbance(room, actor)`
- Standard `if.event.darkness_disturbance` event
- Configurable disturbance effects

---

## Issue 7: Event Data Structure Not Well Defined

**Severity**: Low
**Location**: Various event data builders

### Problem

Entity handlers receive events but data structure is inconsistent:
- Some use `actorSnapshot`, others use `actor`
- Some include contents, others don't
- No documented contract for what's in event data

### Example

```typescript
// Going action uses:
{ actor: actorSnapshot, destinationRoom: roomSnapshot }

// Story handler expects:
eventData.actorSnapshot  // Wrong field name!
```

### Recommendation

- Document standard event data fields
- Use consistent naming across all actions
- Consider TypeScript interfaces for event data

---

## Issue 8: Player Identification in Events

**Severity**: Low
**Location**: Story event handlers

### Problem

Entity handlers need to identify if the actor is the player. Currently stories must do:

```typescript
const worldPlayer = this.world.getPlayer();
const isPlayer = actorSnapshot?.id === worldPlayer?.id;
```

### Recommendation

Include `isPlayer: boolean` flag in actor snapshots, or provide utility function.

---

## Files Modified During Investigation

### Engine
- `packages/engine/src/game-engine.ts` - Type fix for entity handlers

### Stdlib
- `packages/stdlib/src/actions/base/snapshot-utils.ts` - isDark capture fix
- `packages/stdlib/src/actions/standard/going/going-data.ts` - Include inventory

### Story (Workarounds - should be reverted once fixed)
- `stories/cloak-of-darkness/src/index.ts` - Multiple hacks

---

## Recommended Fix Order

1. **Critical**: Fix `requiresLight` → `isDark` in looking action
2. **High**: Unify darkness checking using VisibilityBehavior
3. **High**: Review all actions for consistent snapshot data
4. **Medium**: Document event data contracts
5. **Low**: Consider darkness disturbance feature

---

## Related ADRs

- ADR-051: Three-phase action pattern
- ADR-052: Event handlers for custom logic

## Notes

The fixes made to snapshot-utils.ts, going-data.ts, and game-engine.ts are legitimate bug fixes and should be kept. The story-specific hacks should be removed once the underlying issues are properly addressed.
