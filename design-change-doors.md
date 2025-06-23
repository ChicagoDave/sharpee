# Door System Design Change

## Problem Statement

The current architecture has difficulty handling doors that connect two rooms because:
- Doors need to be accessible from both rooms
- State changes (open/closed) must be consistent from both sides
- The simple "entity has one location" model breaks down

## Scenarios Analyzed

1. **Simple bidirectional door**: Kitchen ↔ Living Room
2. **Airlock system**: Module A → Airlock → Module B (with safety rules)
3. **Multi-way intersection**: Central hub with 4 doors to different modules
4. **One-way passage**: Trap door that only allows downward movement

## Design Approaches Evaluated

### Approach 1: Doors as Special Entities
- Doors exist in a special "limbo" location
- Rooms must search for doors that reference them
- **Score: 60/92** - Conceptually clean but requires special handling

### Approach 2: Doors as Relationships ⭐ SELECTED
- Rooms have exits that reference destinations and optional door entities
- Doors are normal entities that exits can reference
- **Score: 72/92** - Best balance of simplicity and functionality

### Approach 3: Explicit Door Locations
- Doors maintain a map of which rooms they appear in
- Most flexible but most complex
- **Score: 68/92** - Good for complex scenarios

## Selected Design: Approach #2

### World-Model Changes

```typescript
// world-model/src/traits/room/roomTrait.ts
interface RoomTrait extends ValidatedTrait {
  type: TraitType.ROOM;
  name?: string;
  description?: string;
  exits: {
    [direction: string]: {
      destination: string;  // room ID
      via?: string;        // door/exit entity ID (optional)
    }
  };
}

// world-model/src/traits/room/roomBehavior.ts
interface ExitInfo {
  destination: string;
  via?: string;
  direction: string;
}

class RoomBehavior {
  static getExit(room: IFEntity, direction: string): ExitInfo | null;
  static setExit(room: IFEntity, direction: string, destination: string, via?: string): void;
  static removeExit(room: IFEntity, direction: string): void;
  static getAllExits(room: IFEntity): Map<string, ExitInfo>;
}

// world-model/src/traits/door/doorTrait.ts
interface DoorTrait extends ValidatedTrait {
  type: TraitType.DOOR;
  room1: string;      // First room ID
  room2: string;      // Second room ID
  bidirectional: boolean;  // Can be traversed both ways
}

// world-model/src/traits/door/doorBehavior.ts
class DoorBehavior {
  static getRooms(door: IFEntity): [string, string];
  static getOtherRoom(door: IFEntity, currentRoom: string): string | null;
  static isBidirectional(door: IFEntity): boolean;
  static connects(door: IFEntity, room1: string, room2: string): boolean;
}
```

### StdLib Usage

```typescript
// stdlib/src/actions/going/goingAction.ts
const exitInfo = RoomBehavior.getExit(currentRoom, direction);
if (!exitInfo) {
  return fail(ActionFailureReason.NO_EXIT);
}

// Check if there's a door
if (exitInfo.via) {
  const door = world.getEntity(exitInfo.via);
  
  if (door?.has(TraitType.DOOR)) {
    // Check if door is open
    if (door.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(door)) {
      return fail(ActionFailureReason.DOOR_CLOSED);
    }
    
    // Check if door is locked
    if (door.has(TraitType.LOCKABLE) && LockableBehavior.isLocked(door)) {
      return fail(ActionFailureReason.DOOR_LOCKED);
    }
    
    // Check if one-way
    if (!DoorBehavior.isBidirectional(door)) {
      const [room1, room2] = DoorBehavior.getRooms(door);
      if (currentRoom.id === room2) {
        return fail(ActionFailureReason.ONE_WAY);
      }
    }
  }
}

// Move player
world.moveEntity(player.id, exitInfo.destination);
```

## Benefits

1. **Simple cases stay simple** - Most doors just need to be referenced by exits
2. **Extensible** - Complex door types can be added via extensions
3. **Familiar mental model** - Authors think in terms of "room exits"
4. **Consistent state** - Single door entity maintains its state

## Migration Path

1. Update RoomTrait to include exits map
2. Update RoomBehavior with exit management methods
3. Implement DoorTrait and DoorBehavior
4. Update going/opening/closing actions to use new system
5. Deprecate old Exit/Entry traits (if they become redundant)

## Extension Possibilities

Extensions can still implement Approach #3 for complex scenarios:
- Multi-location doors (visible from 3+ rooms)
- Doors with different descriptions per side
- Special portal/teleporter mechanics
- Dynamic doors that change connections
