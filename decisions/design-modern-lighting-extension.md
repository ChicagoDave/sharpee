# Modern Lighting Extension Design Document

## Overview
The Modern Lighting Extension (`@sharpee/ext-modern-light`) provides sophisticated lighting simulation for interactive fiction games that need realistic light behavior, including time of day, weather effects, light quality, and dynamic light propagation.

## Core Concepts

### Light Levels (0-10 Scale)
```typescript
enum LightLevel {
  PITCH_BLACK = 0,      // Cannot see anything, not even light sources
  NEAR_BLACK = 1,       // Can only see active light sources
  VERY_DARK = 2,        // Can see light sources and vague shapes
  DARK = 3,             // Can see outlines, movement
  DIM = 4,              // Can see objects but not details
  LOW_LIGHT = 5,        // Can read large text, see colors poorly
  NORMAL = 6,           // Comfortable indoor lighting
  WELL_LIT = 7,         // Bright indoor lighting
  BRIGHT = 8,           // Very bright indoor or overcast outdoor
  VERY_BRIGHT = 9,      // Bright sunny day
  BLINDING = 10         // Snow blindness, desert noon, etc.
}
```

### Light Quality
Beyond just brightness, light has qualities that affect perception:

```typescript
interface LightQuality {
  color: LightColor;        // warm, cool, neutral, colored
  steadiness: Steadiness;   // steady, flickering, pulsing
  direction: Direction;     // omnidirectional, directional, diffuse
  softness: number;         // 0-1 (hard shadows to soft light)
}

enum LightColor {
  WARM = 'warm',           // Candles, fire, incandescent
  COOL = 'cool',           // Fluorescent, overcast sky
  NEUTRAL = 'neutral',     // Midday sun, white LED
  AMBER = 'amber',         // Sodium lamps, sunset
  BLUE = 'blue',           // Moonlight, blue hour
  GREEN = 'green',         // Bioluminescence, old monitors
  RED = 'red'              // Darkroom, emergency lighting
}
```

## Light Sources

### Natural Light
```typescript
interface NaturalLightConfig {
  latitude: number;           // Affects day length, sun angle
  season: Season;             // Summer/winter light differences
  timezone: string;           // For realistic time calculations
  
  // Light levels by time of day (can be overridden by latitude/season)
  schedule: {
    astronomicalDawn: 4,      // First light
    nauticalDawn: 5,          // Shapes visible
    civilDawn: 6,             // Can read outdoors
    sunrise: 7,               // Sun appears
    morning: 8,               // Full daylight
    noon: 10,                 // Maximum light
    afternoon: 9,             // Slightly less intense
    sunset: 7,                // Sun setting
    civilDusk: 5,             // Need artificial light
    nauticalDusk: 3,          // Only bright objects visible
    astronomicalDusk: 1,      // Nearly full dark
    night: 0                  // No natural light
  };
}
```

### Artificial Light Sources
```typescript
interface ArtificialLight {
  baseLevel: number;          // Maximum brightness
  quality: LightQuality;      
  range: LightRange;          // How far light travels
  fuel?: FuelType;            // Optional fuel consumption
  powerSource?: PowerType;    // Electrical, battery, etc.
}

enum LightRange {
  PERSONAL = 1,     // Only lights immediate area
  SMALL = 2,        // Candle, match
  MEDIUM = 3,       // Lantern, flashlight  
  LARGE = 4,        // Floodlight, bonfire
  ROOM = 5          // Ceiling light
}

interface FuelConsumption {
  type: 'turns' | 'minutes' | 'fuel-units';
  rate: number;
  warning?: number;   // When to warn about low fuel
}
```

## Environmental Factors

### Weather Effects on Light
```typescript
interface WeatherLightModifier {
  outdoorModifier: number;    // 0-1 multiplier
  windowModifier: number;     // Additional reduction through windows
  artificialModifier: number; // Weather doesn't affect indoor lights
}

const WEATHER_MODIFIERS: Record<Weather, WeatherLightModifier> = {
  CLEAR: { outdoorModifier: 1.0, windowModifier: 1.0, artificialModifier: 1.0 },
  OVERCAST: { outdoorModifier: 0.7, windowModifier: 0.6, artificialModifier: 1.0 },
  LIGHT_RAIN: { outdoorModifier: 0.6, windowModifier: 0.5, artificialModifier: 1.0 },
  HEAVY_RAIN: { outdoorModifier: 0.4, windowModifier: 0.3, artificialModifier: 1.0 },
  FOG: { outdoorModifier: 0.3, windowModifier: 0.2, artificialModifier: 0.9 },
  SNOW: { outdoorModifier: 0.5, windowModifier: 0.4, artificialModifier: 1.0 },
  BLIZZARD: { outdoorModifier: 0.2, windowModifier: 0.1, artificialModifier: 1.0 }
};
```

### Windows and Openings
```typescript
interface Window {
  size: WindowSize;
  facing: Direction;          // Affects time of day when lit
  treatment: WindowTreatment;
  condition: WindowCondition;
}

enum WindowSize {
  TINY = 0.1,        // Prison cell window
  SMALL = 0.3,       // Bathroom window
  MEDIUM = 0.6,      // Standard window
  LARGE = 0.8,       // Picture window
  HUGE = 1.0         // Floor-to-ceiling
}

interface WindowTreatment {
  type: 'none' | 'sheer' | 'curtains' | 'blinds' | 'shutters' | 'blackout';
  state: 'open' | 'closed' | 'partial';
  lightReduction: number;  // 0-1 when closed
}

enum WindowCondition {
  CLEAR = 1.0,
  DIRTY = 0.7,
  CRACKED = 0.8,
  BOARDED = 0.0,
  STAINED_GLASS = 0.4
}
```

## Light Propagation

### Through Openings
```typescript
interface LightPropagation {
  throughDoor: {
    open: 0.8,         // 80% of light passes through
    ajar: 0.3,         // 30% when partially open
    closed: 0.0        // No light when closed
  };
  
  throughGaps: {
    underDoor: 0.05,   // Tiny amount under doors
    keyhole: 0.01,     // Negligible but sometimes important
    cracks: 0.02       // Around windows, walls
  };
  
  maxDistance: 3;      // Rooms away light can propagate
  falloff: 'linear' | 'inverse-square';
}
```

### Reflections and Ambient
```typescript
interface SurfaceReflectance {
  snow: 1.5,          // Can increase light
  water: 1.2,         // Slightly increases
  sand: 1.1,          // Beach, desert
  grass: 0.9,         // Absorbs some light
  stone: 0.8,         // Darker surfaces
  dirt: 0.7           // Absorbs more
}
```

## Visibility Rules

### What Can Be Seen at Each Level
```typescript
const VISIBILITY_THRESHOLDS = {
  seeAnything: 1,           // Minimum to see light sources
  seeMovement: 2,           // Can detect motion
  seeShapes: 3,             // Can identify large objects
  seeObjects: 4,            // Can see what things are
  seeDetails: 5,            // Can examine objects
  readLargeText: 5,         // Can read signs
  readNormalText: 6,        // Can read books
  seeFineDetails: 7,        // Can see texture, small items
  seeColors: 4,             // Minimum for color perception
  seeTrueColors: 6          // Colors appear correct
};
```

### Special Cases
```typescript
interface SpecialVisibility {
  // Some things are easier to see
  glowing: -2,              // Glowing objects need 2 less light
  reflective: -1,           // Shiny objects need 1 less light
  
  // Some things are harder to see
  matte_black: +2,          // Need 2 more light
  camouflaged: +3,          // Need 3 more light
  
  // Some things have their own light
  phosphorescent: true,     // Visible in complete darkness
  bioluminescent: true      // Self-illuminating
}
```

## Dynamic Effects

### Adaptation
```typescript
interface EyeAdaptation {
  currentLevel: number;     // What eyes are adapted to
  targetLevel: number;      // What they're adapting to
  darkAdaptTime: 20;        // Turns to adapt to darkness  
  lightAdaptTime: 2;        // Turns to adapt to light
  
  // Temporary blindness
  flashBlindness?: {
    duration: number;
    severity: number;       // 0-1 vision reduction
  };
}
```

### Light Changes
```typescript
interface LightChangeEvent {
  room: EntityId;
  oldLevel: number;
  newLevel: number;
  cause: LightChangeCause;
  
  // Descriptions for different magnitudes
  getDescription(): string;
}

enum LightChangeCause {
  TIME_CHANGE = 'time',
  WEATHER_CHANGE = 'weather',
  LIGHT_ON = 'light-on',
  LIGHT_OFF = 'light-off',
  DOOR_OPENED = 'door-opened',
  DOOR_CLOSED = 'door-closed',
  WINDOW_ADJUSTED = 'window-adjusted',
  POWER_FAILURE = 'power-failure'
}
```

## Integration Points

### With Core Systems
```typescript
interface ModernLightIntegration {
  // Time system integration
  timeSystem: {
    subscribe: (callback: (time: GameTime) => void) => void;
    getCurrentTime: () => GameTime;
  };
  
  // Weather system integration  
  weatherSystem?: {
    subscribe: (callback: (weather: Weather) => void) => void;
    getCurrentWeather: () => Weather;
  };
  
  // Power system integration
  powerSystem?: {
    isPowered: (room: EntityId) => boolean;
    onPowerChange: (callback: (room: EntityId, powered: boolean) => void) => void;
  };
}
```

### With Other Extensions
```typescript
interface ExtensionCompatibility {
  // Temperature affects light (heat shimmer, etc.)
  temperatureExt?: {
    getHeatShimmer: (room: EntityId) => number;  // 0-1 visibility reduction
  };
  
  // Sound is affected by light (quieter in dark)
  soundExt?: {
    notifyLightLevel: (room: EntityId, level: number) => void;
  };
  
  // NPCs react to light changes
  npcExt?: {
    notifyLightChange: (event: LightChangeEvent) => void;
  };
}
```

## Configuration

### Game-Wide Settings
```typescript
interface ModernLightConfig {
  // Feature toggles
  enableTimeOfDay: boolean;
  enableWeather: boolean;
  enableAdaptation: boolean;
  enableLightQuality: boolean;
  enablePowerSystems: boolean;
  
  // Complexity settings
  lightPropagation: 'none' | 'simple' | 'realistic';
  windowComplexity: 'none' | 'basic' | 'full';
  
  // Gameplay settings
  warnAboutDarkness: boolean;
  autoLight: boolean;         // Automatically use available light sources
  
  // Performance settings
  updateFrequency: 'realtime' | 'turn-based' | 'on-demand';
  maxPropagationDistance: number;
}
```

### Per-Room Overrides
```typescript
interface RoomLightOverride {
  // Force specific light level
  forcedLevel?: number;
  
  // Disable certain light sources
  disableNatural?: boolean;
  disableArtificial?: boolean;
  
  // Special effects
  lightFlicker?: {
    min: number;
    max: number;
    frequency: number;
  };
  
  // Atmospheric effects
  atmosphere?: {
    dustLevel: number;      // 0-1, reduces visibility
    fogLevel: number;       // 0-1, scatters light
    smokeLevel: number;     // 0-1, blocks light
  };
}
```

## Usage Examples

### Basic Setup
```typescript
const modernLight = new ModernLightExtension({
  enableTimeOfDay: true,
  enableWeather: true,
  lightPropagation: 'simple',
  latitude: 51.5,  // London
  season: Season.SUMMER
});

game.use(modernLight);
```

### Advanced Room Configuration
```typescript
const office = new Room('office', {
  windows: [
    {
      size: WindowSize.LARGE,
      facing: Direction.EAST,
      treatment: {
        type: 'blinds',
        state: 'partial',
        lightReduction: 0.5
      },
      condition: WindowCondition.CLEAR
    }
  ],
  artificialLights: [
    {
      id: 'ceiling-light',
      baseLevel: 7,
      quality: {
        color: LightColor.COOL,
        steadiness: Steadiness.STEADY,
        direction: Direction.OMNIDIRECTIONAL,
        softness: 0.8
      },
      range: LightRange.ROOM,
      powerSource: PowerType.MAINS
    }
  ]
});
```

### Complex Scenario
```typescript
// Underground facility with emergency lighting
const securityRoom = new Room('security-room', {
  underground: true,
  artificialLights: [
    {
      id: 'main-lights',
      baseLevel: 8,
      powerSource: PowerType.MAINS
    },
    {
      id: 'emergency-lights',
      baseLevel: 4,
      quality: { color: LightColor.RED },
      powerSource: PowerType.BATTERY
    }
  ]
});

// Power failure switches to emergency lighting
powerSystem.cutPower('security-room');
// Room automatically switches to red emergency lighting at level 4
```

## Migration Path

### From Simple Lighting
```typescript
// Simple: lamp is on/off
lamp.isLit = true;

// Modern: lamp has properties
lamp.light = {
  baseLevel: 6,
  quality: { color: LightColor.WARM, steadiness: Steadiness.STEADY },
  range: LightRange.MEDIUM,
  fuel: { type: 'oil', remaining: 100, rate: 1 }
};
```

### Compatibility Mode
```typescript
// Modern extension can run in simple mode
const modernLight = new ModernLightExtension({
  compatibilityMode: 'simple',
  // Only uses lit/dark, ignores advanced features
});
```

## Open Questions

1. **Performance**: How often should we recalculate light propagation?
2. **Persistence**: How do we save/load adaptation states?
3. **Multiplayer**: How do we handle per-player adaptation?
4. **Accessibility**: Should we have a "always lit" mode for players who need it?
5. **Realism vs Gameplay**: How realistic should window angles be?
6. **Cultural**: How do we handle different latitude light patterns?
