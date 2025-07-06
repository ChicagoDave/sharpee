# Lighting - Immediate Fix for Tests

## Problem
- `VisibilityBehavior.isRoomDark()` doesn't check `RoomTrait.baseLight`
- Tests are adding `LightSource` traits to rooms as a workaround
- This will all be replaced when we implement lighting extensions

## Quick Fix (Until Extensions Are Ready)

### Option 1: Update isRoomDark() [Recommended]
```typescript
// In VisibilityBehavior.ts
private static isRoomDark(room: IFEntity, world: WorldModel): boolean {
  // Check room's base light FIRST
  const roomTrait = room.getTrait(TraitType.ROOM);
  if (roomTrait && (roomTrait as any).baseLight > 0) {
    return false; // Any baseLight > 0 means room is lit
  }
  
  // Original light source checking code...
  if (room.hasTrait(TraitType.LIGHT_SOURCE)) {
    const light = room.getTrait(TraitType.LIGHT_SOURCE);
    if ((light as any)?.isOn) return false;
  }
  
  // Check for any active light sources in the room
  const contents = world.getAllContents(room.id, { recursive: true });
  
  for (const entity of contents) {
    if (entity.hasTrait(TraitType.LIGHT_SOURCE)) {
      const light = entity.getTrait(TraitType.LIGHT_SOURCE);
      if ((light as any)?.isOn) return false;
    }
  }
  
  return true;
}
```

### Option 2: Update Test Fixtures
```typescript
// In test-entities.ts
export function createLitRoom(name: string, description?: string): IFEntity {
  const room = createTestRoom(name, description);
  room.getTrait(TraitType.ROOM).baseLight = 10; // Well-lit
  return room;
}

export function createDarkRoom(name: string, description?: string): IFEntity {
  const room = createTestRoom(name, description);
  room.getTrait(TraitType.ROOM).baseLight = 0; // Dark
  return room;
}
```

### Option 3: Document Current Behavior
Add a comment to tests explaining the workaround:
```typescript
// WORKAROUND: Until lighting extensions are implemented,
// rooms need explicit LightSource traits to be considered lit
// because VisibilityBehavior doesn't check baseLight
room.add(new LightSourceTrait({ isLit: true }));
(room.getTrait(TraitType.LIGHT_SOURCE) as any).isOn = true;
```

## Recommendation
Go with Option 1 - it's a one-line fix that makes the system work as expected until we can properly implement lighting extensions. This:
- Fixes all tests immediately
- Makes baseLight actually useful
- Doesn't break anything
- Easy to remove when extensions are ready

## Future State
When lighting extensions are implemented:
- Remove `baseLight` from `RoomTrait` 
- Remove lighting logic from `VisibilityBehavior`
- Lighting becomes opt-in via extensions
- Default behavior: everything is visible
