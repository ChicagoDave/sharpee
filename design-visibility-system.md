# Core Visibility System Design

## Overview

The visibility system handles the fundamental adventure game scenarios:
- Day/night cycles for outdoor locations
- Dark indoor/underground areas requiring light
- Container-based visibility (open/closed/transparent)

## Core Scenarios

### Light-Based Visibility
1. **Outdoors + Daytime** = Lit (no light source needed)
2. **Outdoors + Nighttime** = Dark (requires light source)
3. **Indoors** = Dark by default (requires light source)
4. **Underground** = Always dark (requires light source)

### Container-Based Visibility
5. **Open Container** = Contents visible and in scope
6. **Closed Opaque Container** = Contents not visible or in scope
7. **Closed Transparent Container** = Contents visible and in scope

## Design

### World-Model Changes

```typescript
// world-model/src/traits/room/roomTrait.ts
interface RoomTrait extends ValidatedTrait {
  type: TraitType.ROOM;
  // ... existing properties ...
  
  // Lighting properties
  baseLight?: number;         // Inherent light level (0-10, 0=pitch dark)
  isOutdoors?: boolean;       // Affected by time of day
  isUnderground?: boolean;    // Never has natural light (overrides outdoors)
}

// world-model/src/traits/room/roomBehavior.ts
class RoomBehavior {
  // ... existing methods ...
  
  static getTotalLight(room: IFEntity, world: IWorldQuery): number {
    let light = room.baseLight || 0;
    
    // Add light from time of day if outdoors
    if (room.isOutdoors && !room.isUnderground) {
      light += world.getTimeOfDay() === 'day' ? 10 : 0;
    }
    
    // Add light from all light sources in room
    light += this.getLightFromSources(room, world);
    
    return Math.min(light, 10); // Cap at 10
  }
  
  static isDark(room: IFEntity, world: IWorldQuery): boolean {
    return this.getTotalLight(room, world) < 3; // Threshold for "dark"
  }
}

// world-model/src/traits/container/containerTrait.ts
interface ContainerTrait extends ValidatedTrait {
  type: TraitType.CONTAINER;
  capacity: number;
  isTransparent?: boolean;    // Can see through when closed
  // Note: isOpen is on OpenableTrait if container can be opened
}

// world-model/src/traits/light-source/lightSourceTrait.ts
interface LightSourceTrait extends ValidatedTrait {
  type: TraitType.LIGHT_SOURCE;
  brightness: number;          // Light output (1-10)
  isLit: boolean;             // Currently providing light
  fuelRemaining?: number;     // Optional fuel/battery
}
```

### Visibility Rules

```typescript
// world-model/src/behaviors/visibilityBehavior.ts
class VisibilityBehavior {
  /**
   * Can an observer see a target object?
   */
  static canSee(observer: IFEntity, target: IFEntity, world: IWorldQuery): boolean {
    // Same room check
    if (!this.inSameRoom(observer, target, world)) {
      return false;
    }
    
    // Room darkness check
    const room = world.getLocation(observer);
    if (RoomBehavior.isDark(room, world)) {
      // Can only see light sources in darkness
      return target.has(TraitType.LIGHT_SOURCE) && 
             LightSourceBehavior.isLit(target);
    }
    
    // Container check
    const container = world.getDirectContainer(target);
    if (container?.has(TraitType.CONTAINER)) {
      // In a container - check if we can see inside
      if (!container.has(TraitType.OPENABLE)) {
        return true; // No lid, always visible
      }
      
      const isOpen = OpenableBehavior.isOpen(container);
      const isTransparent = ContainerBehavior.isTransparent(container);
      
      return isOpen || isTransparent;
    }
    
    // Otherwise visible
    return true;
  }
  
  /**
   * Get all objects visible to an observer
   */
  static getVisible(observer: IFEntity, world: IWorldQuery): IFEntity[] {
    const room = world.getLocation(observer);
    const candidates = world.getAccessibleFrom(room);
    
    return candidates.filter(obj => this.canSee(observer, obj, world));
  }
}
```

### Scope Rules (for Parser)

```typescript
// stdlib/src/services/scope-service.ts
class ScopeService {
  /**
   * Is an object in scope for the parser?
   * (Can the player refer to it by name?)
   */
  isInScope(actor: IFEntity, target: IFEntity, world: IWorldQuery): boolean {
    // Inventory is always in scope
    if (world.getLocation(target) === actor.id) {
      return true;
    }
    
    // Visible objects are in scope
    if (VisibilityBehavior.canSee(actor, target, world)) {
      return true;
    }
    
    // Previously seen objects might be in scope (story decision)
    if (this.hasBeenSeen(actor, target)) {
      return true; // "get lamp" works even in dark if you know it's there
    }
    
    return false;
  }
}
```

## Time of Day System

This is minimal - just enough for outdoor lighting:

```typescript
// world-model/src/world/worldState.ts
interface WorldState {
  timeOfDay: 'day' | 'night';
  // Extensions can add dawn/dusk/hours/etc
}
```

## Usage Examples

```typescript
// Player enters a cave
const cave = world.getEntity('cave');
if (RoomBehavior.isDark(cave, world)) {
  return "It is pitch dark. You are likely to be eaten by a grue.";
}

// Looking in a closed box
const box = world.getEntity('box');
if (!OpenableBehavior.isOpen(box) && !ContainerBehavior.isTransparent(box)) {
  return "The box is closed.";
}

// Examining something in darkness
if (!VisibilityBehavior.canSee(player, target, world)) {
  return "It's too dark to see that.";
}
```

## Light Propagation Rules

How light sources contribute to room brightness:

### Simple Rules (Core)

1. **Light sources in room** - Add full brightness to room
2. **Light in open container** - Provides full light
3. **Light in closed container** - Provides NO light (blocked, even if transparent)
4. **Light on supporter** - Provides full light
5. **Carried/worn light** - Provides full light
6. **Light in adjacent room** - Does NOT affect this room

### Implementation

```typescript
// world-model/src/traits/room/roomBehavior.ts
class RoomBehavior {
  static getLightFromSources(room: IFEntity, world: IWorldQuery): number {
    let totalLight = 0;
    
    // Get all items in room (recursive - includes contents of containers/supporters)
    const items = world.getAllItemsIn(room.id);
    
    for (const item of items) {
      if (item.has(TraitType.LIGHT_SOURCE) && LightSourceBehavior.isLit(item)) {
        // Check if light is blocked
        if (!this.isLightBlocked(item, world)) {
          totalLight += LightSourceBehavior.getBrightness(item);
        }
      }
    }
    
    return totalLight;
  }
  
  static isLightBlocked(source: IFEntity, world: IWorldQuery): boolean {
    const container = world.getDirectContainer(source);
    
    // Not in container = not blocked
    if (!container || !container.has(TraitType.CONTAINER)) {
      return false;
    }
    
    // In closed container = blocked (even if transparent)
    if (container.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(container)) {
      return true;
    }
    
    // In open container or container without lid = not blocked
    return false;
  }
}
```

### Examples

```typescript
// Lamp in backpack
const lamp = world.getEntity('lamp');
const backpack = world.getEntity('backpack');

LightSourceBehavior.light(lamp); // Turn on lamp
world.moveEntity(lamp.id, backpack.id); // Put in backpack

// If backpack is closed:
OpenableBehavior.close(backpack);
RoomBehavior.getTotalLight(room, world); // Lamp contributes 0

// If backpack is open:
OpenableBehavior.open(backpack);
RoomBehavior.getTotalLight(room, world); // Lamp contributes full brightness
```

## What's NOT Included

These would be extensions or story-specific:
- Weather effects on visibility
- Partial darkness/shadows
- Hidden objects (under/behind things)
- X-ray vision or magic sight  
- Fog, smoke, or mist
- Size/distance-based visibility
- Light color/quality
- Mirrors or reflections

## Benefits

1. **Simple core rules** - Easy to understand and implement
2. **Covers common cases** - Most IF scenarios just need dark/light
3. **Extensible** - More complex visibility can be added via extensions
4. **Performance** - Simple boolean/numeric checks
