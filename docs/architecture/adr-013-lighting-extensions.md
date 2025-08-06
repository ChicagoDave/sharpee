# ADR-008: Lighting as Extension System

## Status
Proposed

## Context
The current lighting implementation in the world model is minimal and inconsistent:
- `RoomTrait` has a `baseLight` property that isn't used by `VisibilityBehavior`
- `VisibilityBehavior.isRoomDark()` only checks for `LightSource` traits
- No clear separation between different lighting complexity levels
- Different games need different lighting sophistication

Interactive fiction games have varying lighting needs:
- **Classic adventures** (Zork-style): Simple binary dark/light with light sources
- **Modern games**: Complex lighting with time of day, seasons, weather
- **Minimal games**: No darkness at all, everything is always visible

## Decision

Implement lighting as a pluggable extension system with different complexity levels.

### Core (No Extension)
- All rooms are visible by default
- No darkness concept
- `VisibilityBehavior` always returns true for `canSee()`

### Simple Light Extension (`@sharpee/ext-simple-light`)
Based on classic Zork-style lighting:

```typescript
interface SimpleLightConfig {
  // Above ground rooms are lit during day
  aboveGroundLit: boolean;
  
  // Some rooms have permanent ambient light
  ambientRooms: Set<string>;
  
  // Light source burn times (turns)
  burnTimes: {
    lamp: number;    // -1 for infinite
    torch: number;   // e.g., 50 turns
    matches: number; // e.g., 3 turns
  };
}

class SimpleLightExtension {
  isRoomLit(room: IFEntity, world: WorldModel): boolean {
    const roomTrait = room.getTrait(TraitType.ROOM);
    
    // Check permanent ambient light
    if (this.config.ambientRooms.has(room.id)) {
      return true;
    }
    
    // Check if above ground (always lit in simple mode)
    if (!roomTrait.isUnderground && this.config.aboveGroundLit) {
      return true;
    }
    
    // Check for active light sources
    return this.hasActiveLightSource(room, world);
  }
}
```

Example:
```typescript
// Classic cave adventure setup
const simpleLighting = new SimpleLightExtension({
  aboveGroundLit: true,
  ambientRooms: new Set(['volcano-room', 'crystal-cave']),
  burnTimes: {
    lamp: -1,      // Infinite battery
    torch: 50,     // 50 turns
    matches: 3     // 3 turns each
  }
});
```

### Modern Light Extension (`@sharpee/ext-modern-light`)
Complex lighting with multiple factors:

```typescript
interface ModernLightConfig {
  // Light levels 0-10
  levels: {
    pitchBlack: 0,
    veryDark: [1, 2],
    dim: [3, 4],
    normal: [5, 7],
    bright: [8, 9],
    blazing: 10
  };
  
  // Time-based natural light
  naturalLightCycle: {
    dawn: { start: 6, level: 7 },
    day: { start: 8, level: 10 },
    dusk: { start: 18, level: 7 },
    night: { start: 20, level: 0 }
  };
  
  // Window configurations
  windowTypes: {
    none: 0,
    small: 0.3,
    normal: 0.7,
    large: 0.9,
    skylight: 1.0
  };
  
  // Window treatments
  treatments: {
    none: 1.0,
    sheer: 0.8,
    curtains: 0.3,
    blackout: 0.0
  };
}

class ModernLightExtension {
  calculateRoomLight(room: IFEntity, world: WorldModel): number {
    const time = world.getTime();
    const weather = world.getWeather();
    const roomTrait = room.getTrait(TraitType.ROOM);
    
    let totalLight = 0;
    
    // Natural light calculation
    if (roomTrait.isOutdoors) {
      totalLight = this.getNaturalLight(time, weather);
    } else if (roomTrait.hasWindows) {
      const natural = this.getNaturalLight(time, weather);
      const windowFactor = this.getWindowFactor(room);
      totalLight = natural * windowFactor;
    }
    
    // Add artificial light
    totalLight += this.getArtificialLight(room, world);
    
    // Add ambient light from adjacent rooms
    totalLight += this.getAmbientLight(room, world);
    
    return Math.min(10, Math.max(0, totalLight));
  }
}
```

### Extension Interface
```typescript
interface ILightingExtension {
  // Core methods every lighting extension must implement
  isRoomLit(room: IFEntity, world: WorldModel): boolean;
  canSeeInRoom(observer: IFEntity, room: IFEntity, world: WorldModel): boolean;
  canSeeObject(observer: IFEntity, target: IFEntity, world: WorldModel): boolean;
  
  // Optional advanced features
  getLightLevel?(room: IFEntity, world: WorldModel): number;
  getLightDescription?(room: IFEntity, world: WorldModel): string;
  onLightChange?(room: IFEntity, oldLevel: number, newLevel: number): void;
}
```

### Integration with Core
```typescript
// In VisibilityBehavior
class VisibilityBehavior {
  private static lightingExt?: ILightingExtension;
  
  static registerLightingExtension(ext: ILightingExtension) {
    this.lightingExt = ext;
  }
  
  static canSee(observer: IFEntity, target: IFEntity, world: WorldModel): boolean {
    // If no lighting extension, everything is visible
    if (!this.lightingExt) {
      return this.basicVisibilityCheck(observer, target, world);
    }
    
    // Delegate to lighting extension
    return this.lightingExt.canSeeObject(observer, target, world);
  }
}
```

## Consequences

### Positive
- Clean separation of concerns
- Games can choose appropriate complexity
- No lighting overhead for games that don't need it
- Easy to add new lighting models
- Backward compatible (no extension = everything visible)

### Negative
- Another extension to manage
- Potential for confusion if multiple extensions loaded
- Need to coordinate with other extensions

### Neutral
- Authors must explicitly choose lighting model
- Different games can have very different lighting behavior

## Implementation Plan

1. **Phase 1**: Extract current lighting to simple extension
   - Move `isRoomDark` logic to `SimpleLightExtension`
   - Update `VisibilityBehavior` to use extension interface
   - Default behavior with no extension: everything visible

2. **Phase 2**: Implement simple light extension
   - Classic Zork-style lighting
   - Battery/fuel tracking for light sources
   - Ambient light rooms

3. **Phase 3**: Implement modern light extension
   - Full 0-10 light scale
   - Time of day support
   - Weather effects
   - Window treatments

## Usage Examples

```typescript
// No lighting (default)
const game = new Game();
// Everything is always visible

// Simple lighting
import { SimpleLightExtension } from '@sharpee/ext-simple-light';
game.use(new SimpleLightExtension({
  aboveGroundLit: true,
  ambientRooms: new Set(['lava-chamber'])
}));

// Modern lighting
import { ModernLightExtension } from '@sharpee/ext-modern-light';
game.use(new ModernLightExtension({
  enableTimeOfDay: true,
  enableWeather: true,
  enableWindowTreatments: true
}));
```
