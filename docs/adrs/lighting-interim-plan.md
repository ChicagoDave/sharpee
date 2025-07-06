# Lighting System - Interim Implementation Plan

## Current State
- `RoomTrait` has `baseLight` property (0-10 scale) but it's not used
- `VisibilityBehavior.isRoomDark()` only checks for `LightSource` traits
- Tests are adding `LightSource` traits to rooms as a workaround

## Interim Solution (Before Full ADR Implementation)

### Phase 1: Make baseLight Work (Immediate)
1. Update `VisibilityBehavior.isRoomDark()` to check `baseLight`:
   ```typescript
   private static isRoomDark(room: IFEntity, world: WorldModel): boolean {
     // Check room's base light level first
     const roomTrait = room.getTrait(TraitType.ROOM);
     if (roomTrait && (roomTrait as any).baseLight > 2) {
       return false; // Room has enough ambient light
     }
     
     // Then check for light sources (existing code)
     // ...
   }
   ```

2. Update room creation helpers:
   ```typescript
   export function createTestRoom(name: string, description?: string): IFEntity {
     const room = new IFEntity(generateId('room'), 'room', {
       attributes: { name, description }
     });
     
     room.add(new RoomTrait({
       baseLight: 10 // Well-lit by default for tests
     }));
     room.add(new ContainerTrait());
     room.add(new IdentityTrait({ name, description }));
     
     return room;
   }
   ```

### Phase 2: Simplify Light Levels (Next Sprint)
1. Use three simple states:
   - **Dark** (0-2): Can only see light sources
   - **Dim** (3-5): Can see shapes but not details  
   - **Lit** (6-10): Normal visibility

2. Add helper methods:
   ```typescript
   class RoomTrait {
     get isDark(): boolean { return this.baseLight <= 2; }
     get isDim(): boolean { return this.baseLight > 2 && this.baseLight <= 5; }
     get isLit(): boolean { return this.baseLight > 5; }
   }
   ```

### Phase 3: Basic Time Support (Future)
1. Add simple day/night to WorldModel state
2. Outdoor rooms check world time
3. Indoor rooms use baseLight unless they have windows

## Benefits of Interim Approach
- Fixes immediate test issues
- Maintains backward compatibility
- Provides foundation for full system
- No breaking changes to existing content
- Can be implemented incrementally

## Migration Path
1. Fix `isRoomDark()` to use `baseLight` ✓
2. Update test fixtures ✓
3. Add light level helpers
4. Implement basic time when needed
5. Full ADR implementation when scope allows
