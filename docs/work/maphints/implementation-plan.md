# ADR-113 Implementation Plan: Map Position Hints

## Overview

Implement Phase 1 (Exit Hints) of ADR-113 to allow story authors to provide map position hints that guide the auto-mapper when direction-based positioning would be incorrect.

## Current State

The `useMap` hook in `packages/client-react/src/hooks/useMap.ts` positions rooms using:
1. Direction offsets from `DIRECTION_OFFSETS` (north=-1y, east=+1x, etc.)
2. Collision detection with perpendicular fallback
3. `arrivedFrom` direction from the `if.event.actor_moved` event

## Problem

Non-Euclidean connections break the auto-mapper:
- Going west from Behind House to Kitchen shouldn't place Kitchen at (x-1, y)
- Interior rooms entered via window shouldn't occupy the same grid space
- Caves with irregular connections look wrong on the map

## Implementation Plan

### Step 1: Add `mapHint` to IExitInfo (world-model)

**File:** `packages/world-model/src/traits/room/roomTrait.ts`

```typescript
export interface IExitMapHint {
  dx?: number;  // Grid offset X (-1 = west, +1 = east)
  dy?: number;  // Grid offset Y (-1 = north, +1 = south)
  dz?: number;  // Grid offset Z (-1 = down, +1 = up)
}

export interface IExitInfo {
  destination: string;
  via?: string;
  mapHint?: IExitMapHint;  // NEW
}
```

### Step 2: Pass `mapHint` in ActorMovedEventData (stdlib)

**File:** `packages/stdlib/src/actions/standard/going/going-events.ts`

```typescript
export interface ActorMovedEventData {
  // ... existing fields ...

  /** Map positioning hint from exit definition */
  mapHint?: { dx?: number; dy?: number; dz?: number };
}
```

**File:** `packages/stdlib/src/actions/standard/going/going.ts`

In the execute phase, include `mapHint` from the exit definition in the event data.

### Step 3: Update RoomExit in client (client-react)

**File:** `packages/client-react/src/types/game-state.ts`

```typescript
export interface RoomExit {
  direction: string;
  destination: string;
  destinationName?: string;
  via?: string;
  mapHint?: { dx?: number; dy?: number; dz?: number };  // NEW
}
```

### Step 4: Update CurrentRoom to include mapHint (client-react)

**File:** `packages/client-react/src/types/game-state.ts`

```typescript
export interface CurrentRoom {
  // ... existing fields ...

  /** Map hint from the exit used to reach this room */
  arrivedViaMapHint?: { dx?: number; dy?: number; dz?: number };
}
```

### Step 5: Update GameContext to extract mapHint (client-react)

**File:** `packages/client-react/src/context/GameContext.tsx`

When processing `if.event.actor_moved`, extract `mapHint` from event data and pass to CurrentRoom.

### Step 6: Update useMap to use mapHint (client-react)

**File:** `packages/client-react/src/hooks/useMap.ts`

Modify `findDirectionalPosition` to check for `mapHint` first:

```typescript
// In the room positioning logic:
if (prevRoom && rooms.has(prevRoom.id)) {
  const prevMapRoom = rooms.get(prevRoom.id)!;

  // Check for map hint first
  if (currentRoom.arrivedViaMapHint) {
    const hint = currentRoom.arrivedViaMapHint;
    const hintX = prevMapRoom.x + (hint.dx ?? 0);
    const hintY = prevMapRoom.y + (hint.dy ?? 0);
    const hintZ = prevMapRoom.z + (hint.dz ?? 0);

    // Use hint position if not occupied, otherwise fall back to algorithm
    if (!isOccupied(hintX, hintY, hintZ)) {
      x = hintX;
      y = hintY;
      z = hintZ;
    } else {
      // Fall back to direction-based with hint as starting point
      const pos = findDirectionalPosition(hintX, hintY, hintZ, direction);
      x = pos.x;
      y = pos.y;
      z = pos.z;
    }
  } else if (direction) {
    // Existing direction-based positioning
    const pos = findDirectionalPosition(prevMapRoom.x, prevMapRoom.y, prevMapRoom.z, direction);
    // ...
  }
}
```

### Step 7: Test with Dungeo

Add `mapHint` to problematic exits in Dungeo:

**File:** `stories/dungeo/src/regions/white-house.ts`

```typescript
// Behind House -> Kitchen (west exit, but Kitchen is interior/below)
exits: {
  west: {
    destination: 'kitchen',
    mapHint: { dx: -1, dy: 1 }  // Left and down (interior offset)
  }
}
```

## Files to Modify

| Package | File | Change |
|---------|------|--------|
| world-model | `src/traits/room/roomTrait.ts` | Add `IExitMapHint` interface, add `mapHint` to `IExitInfo` |
| stdlib | `src/actions/standard/going/going-events.ts` | Add `mapHint` to `ActorMovedEventData` |
| stdlib | `src/actions/standard/going/going.ts` | Pass `mapHint` in event data |
| client-react | `src/types/game-state.ts` | Add `mapHint` to `RoomExit`, add `arrivedViaMapHint` to `CurrentRoom` |
| client-react | `src/context/GameContext.tsx` | Extract `mapHint` from events |
| client-react | `src/hooks/useMap.ts` | Use `mapHint` for positioning |

## Testing

1. Build platform with `./build.sh -s dungeo -c react`
2. Play through Behind House -> Kitchen transition
3. Verify Kitchen appears at offset position, not directly west

## Not In Scope (Phase 2+)

- Room-level absolute positioning (`MapLayout`)
- Region anchoring (`RegionMapConfig`)
- Visual map editor tool
- Multi-level (z-axis) visualization

## Dependencies

None - this is an additive change. Existing exits without `mapHint` continue to work with direction-based positioning.
