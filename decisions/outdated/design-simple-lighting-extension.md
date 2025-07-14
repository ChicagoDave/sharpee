# Simple Lighting Extension Design Document

## Overview
The Simple Lighting Extension (`@sharpee/ext-simple-light`) provides classic adventure game lighting mechanics, inspired by Zork and other early text adventures. It implements a binary dark/light system with portable light sources.

## Core Principles

1. **Binary Lighting**: Rooms are either lit or dark
2. **Simple Rules**: Easy for players to understand
3. **Classic Feel**: Maintains traditional IF conventions
4. **Minimal Complexity**: No time of day, weather, or light levels

## Light States

### Room States
```typescript
enum RoomLightState {
  LIT = 'lit',      // Can see everything  
  DARK = 'dark'     // Can only see light sources themselves
}
```

### Determining Light State
```typescript
function isRoomLit(room: IFEntity, world: WorldModel): boolean {
  // 1. Check if room has permanent light
  if (room.hasTag('always-lit')) return true;
  
  // 2. Check if above ground (configurable)
  if (config.aboveGroundAlwaysLit && !room.isUnderground) return true;
  
  // 3. Check for active light sources
  return hasActiveLightSource(room, world);
}
```

## Light Sources

### Basic Light Source
```typescript
interface SimpleLightSource {
  isLit: boolean;           // Currently providing light
  fuelType?: FuelType;      // Optional fuel system
  fuelRemaining?: number;   // Turns of fuel left
  permanent?: boolean;      // Never runs out
}

enum FuelType {
  BATTERY = 'battery',      // Flashlight, lantern
  OIL = 'oil',              // Oil lamp
  CANDLE = 'candle',        // Candle
  MATCH = 'match',          // Very short duration
  TORCH = 'torch',          // Medium duration
  NONE = 'none'             // Permanent light
}
```

### Standard Light Sources
```typescript
const STANDARD_LIGHTS = {
  lamp: {
    name: 'brass lamp',
    fuelType: FuelType.BATTERY,
    permanent: true,  // Classic lamp never dies
    description: {
      off: 'A brass lamp.',
      on: 'A brass lamp, providing light.'
    }
  },
  
  torch: {
    name: 'torch',
    fuelType: FuelType.TORCH,
    fuelRemaining: 50,
    description: {
      off: 'An unlit torch.',
      on: 'A burning torch (turns remaining: {fuel}).'
    }
  },
  
  matches: {
    name: 'book of matches',
    fuelType: FuelType.MATCH,
    fuelRemaining: 3,  // Each match lasts 3 turns
    uses: 5,           // 5 matches in book
    description: {
      off: 'A book of matches ({uses} remaining).',
      on: 'A lit match (better hurry!).'
    }
  }
};
```

## Special Rooms

### Always-Lit Rooms
Some rooms have permanent ambient light:

```typescript
interface AmbientLitRoom {
  reason: string;  // Why it's lit
  // Examples:
  // - 'glowing fungus'
  // - 'lava illumination'  
  // - 'phosphorescent walls'
  // - 'eternal flame'
}
```

### Light Messages
```typescript
const LIGHT_MESSAGES = {
  // Entering dark room
  enterDark: {
    default: "It is pitch black. You can't see a thing.",
    withExit: "It is pitch black. You can't see a thing, but you could go {direction}.",
    scary: "It is pitch black. You are likely to be eaten by a grue."
  },
  
  // Light source events
  lightOn: {
    lamp: "The lamp is now on.",
    torch: "The torch catches fire and illuminates the area.",
    match: "The match flares to life."
  },
  
  lightOff: {
    lamp: "The lamp is now off.",
    torch: "The torch goes out.",
    match: "The match burns out."
  },
  
  // Fuel warnings
  fuelWarning: {
    low: "Your {light} is burning low.",
    veryLow: "Your {light} will go out very soon!",
    out: "Your {light} has gone out."
  },
  
  // Special
  darkDanger: "You hear a sinister chuckling in the darkness.",
  multipleLight: "You already have light."
};
```

## Visibility Rules

### In Lit Rooms
- Can see everything normally
- Can examine objects
- Can read
- Can see exits

### In Dark Rooms
- Cannot see room description
- Cannot see most objects
- Cannot read
- Can see lit light sources only
- May see glowing/phosphorescent objects
- May know exits if remembered

### Special Cases
```typescript
interface DarkVisibility {
  // Always visible in dark
  alwaysVisible: [
    'lit light sources',
    'glowing objects',
    'phosphorescent items'
  ];
  
  // Conditional visibility
  conditional: {
    'familiar exits': 'if visited before',
    'large objects': 'if touched/bumped into',
    'sounds': 'always perceivable',
    'smells': 'always perceivable'
  };
}
```

## Configuration Options

```typescript
interface SimpleLightConfig {
  // Basic behavior
  aboveGroundAlwaysLit: boolean;    // Default: true
  undergroundAlwaysDark: boolean;   // Default: true
  
  // Grue mode (Zork compatibility)
  grueMode: boolean;                // Default: false
  grueWarnings: boolean;            // Default: true
  grueMoves: number;                // Turns before grue attacks
  
  // Fuel consumption
  consumeFuel: boolean;             // Default: true
  fuelWarningThreshold: number;     // Default: 10 turns
  
  // Always-lit rooms
  ambientRooms: Set<string>;        // Room IDs that are always lit
  
  // Messages
  messages: Partial<typeof LIGHT_MESSAGES>;
  
  // Game-specific light sources
  customLights: Record<string, SimpleLightSource>;
}
```

## Integration with Core

### Commands Affected
```typescript
// Looking in dark
LOOK: {
  dark: () => "It is pitch black. You can't see a thing.",
  lit: () => describeRoom()
}

// Examining in dark  
EXAMINE: {
  dark: () => "It's too dark to see details.",
  lit: () => describeObject()
}

// Reading in dark
READ: {
  dark: () => "You can't read in the dark.",
  lit: () => readObject()
}

// Taking objects in dark
TAKE: {
  dark: (obj) => {
    if (obj.isLightSource && obj.isLit) return takeObject();
    if (obj.isGlowing) return takeObject();
    return "It's too dark to see that.";
  }
}
```

### Save/Load State
```typescript
interface SimpleLightSaveState {
  // Per light source
  lightStates: Map<EntityId, {
    isLit: boolean;
    fuelRemaining?: number;
    uses?: number;
  }>;
  
  // Grue state (if enabled)
  grueState?: {
    turnsInDark: number;
    hasWarned: boolean;
  };
}
```

## Examples

### Basic Setup
```typescript
const simpleLight = new SimpleLightExtension({
  aboveGroundAlwaysLit: true,
  grueMode: false,
  ambientRooms: new Set(['volcano-core', 'crystal-cave'])
});

game.use(simpleLight);
```

### Classic Zork Mode
```typescript
const zorkLight = new SimpleLightExtension({
  aboveGroundAlwaysLit: true,
  grueMode: true,
  grueWarnings: true,
  grueMoves: 3,
  messages: {
    enterDark: {
      scary: "It is pitch black. You are likely to be eaten by a grue."
    }
  }
});
```

### Custom Light Sources
```typescript
const customLight = new SimpleLightExtension({
  customLights: {
    'glowing-sword': {
      permanent: true,
      description: {
        on: "The sword glows with an inner light."
      }
    },
    'firefly-jar': {
      fuelType: FuelType.NONE,
      fuelRemaining: 100,  // Fireflies last 100 turns
      description: {
        on: "Fireflies dance in the jar, casting a gentle light."
      }
    }
  }
});
```

## Migration to Modern Lighting

The simple extension is designed to be a subset of modern lighting:

```typescript
// Simple lighting room
room.addTag('always-lit');

// Equivalent in modern lighting  
room.baseLight = 7;  // Permanent normal lighting

// Simple light source
lamp.isLit = true;

// Equivalent in modern lighting
lamp.light = {
  baseLevel: 6,
  quality: { color: LightColor.WARM }
};
```

This ensures games can start with simple lighting and upgrade to modern lighting without major rewrites.

## Differences from Modern Lighting

| Feature | Simple | Modern |
|---------|---------|---------|
| Light levels | Binary (lit/dark) | 0-10 scale |
| Time of day | No | Yes |
| Weather effects | No | Yes |
| Light quality | No | Yes (color, etc) |
| Windows | No | Yes |
| Light propagation | No | Yes |
| Eye adaptation | No | Yes |
| Power systems | No | Yes |

## Best Practices

1. **Clear Feedback**: Always tell player when light state changes
2. **Fair Warning**: Warn before light sources expire
3. **Consistent Rules**: Don't surprise players with exceptions
4. **Multiple Solutions**: Provide various light sources
5. **Escape Routes**: Allow leaving dark areas without light

## Open Questions

1. Should we support partial light (dim)?
2. How do we handle multi-room light (e.g., lighthouse beam)?
3. Should burning objects provide light?
4. How do we handle underwater light?
5. Should light attract monsters/NPCs?
