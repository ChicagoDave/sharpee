# Feature-003: Layered Environmental Effects

## Status
Proposed

## Context
Rich Interactive Fiction worlds need dynamic environments that affect gameplay. Players expect day/night cycles, weather changes, seasonal variations, and location-specific environmental effects (tides, moon phases, etc.). These systems should enhance immersion without overwhelming authors or players with complexity.

## Problem
- Hard-coding environmental effects in each location leads to massive duplication
- Inconsistent behavior when weather is "sunny" in one area but actions assume "rainy"
- Difficult to add new environmental systems without touching every location
- Performance impact of constantly checking environmental conditions
- No standard way to handle environmental transitions (dawn, season changes)
- Complex interactions between systems (full moon during winter storm at high tide)
- Save/load needs to preserve environmental state correctly

## Solution
Implement a layered environmental system where effects can be enabled per-area with consistent behavior:

```typescript
area.config({
  environmental: { 
    weather: 'dynamic',      // Full weather system
    dayNight: true,          // 24-hour cycle
    seasons: true,           // Four seasons
    tides: 'lake',          // Area-specific: lake tides
    moonPhases: true        // Fantasy elements
  }
})

// Environmental rules
area.rule('sunrise-effects')
  .when('time.sunrise')
  .then(({ area, output }) => {
    output.add('sunrise-description', { area: area.name });
    area.modifyLighting('dawn');
    area.creatures.triggerBehavior('dawn-activity');
  });

area.rule('moon-phase-effects')
  .when('time-change')
  .if(({ world }) => world.time.isMoonFull())
  .then(({ area }) => {
    area.getLocation('hidden-grove').reveal();
    area.getNPC('lake-spirit').enable();
    area.setAmbient('mystical-energy');
  });

area.rule('winter-lake-frozen')
  .when('season-change')
  .if(({ season }) => season === 'winter')
  .then(({ area }) => {
    area.getLocation('lake-surface').addTrait('frozen');
    area.connections.enable('walk-across-lake');
    area.connections.disable('swim-across-lake');
  });
```

### Environmental Queries
```typescript
// Authors can query current conditions
if (world.environment.isNight()) {
  npc.dialogue.use('night-greeting');
}

if (world.environment.weather.isStormy()) {
  player.vision.reduce('heavy-rain');
}

if (area.environment.temperature < 0) {
  player.status.add('cold');
}
```

### Environmental Descriptions
```typescript
location.description(({ env }) => {
  const base = 'You stand at the edge of the crystal lake.';
  
  // Layer environmental descriptions
  const time = env.isNight() ? 'Stars reflect in the dark water.' 
                             : 'Sunlight sparkles on the waves.';
  
  const weather = env.weather.isRaining() ? 'Rain dimples the surface.'
                                          : '';
  
  const season = env.season === 'winter' ? 'Ice creeps along the shore.'
                                         : '';
  
  return [base, time, weather, season].filter(Boolean).join(' ');
});
```

## Consequences

### Positive
- **Consistency**: Weather/time is consistent across all locations in an area
- **Performance**: Only active systems consume resources
- **Extensibility**: New environmental systems plug in easily
- **Author-Friendly**: Declarative rules instead of imperative checks
- **Rich Interactions**: Systems can interact (frozen lake in winter)
- **Automatic Descriptions**: Environmental details layer automatically
- **Save System**: Environmental state handled by framework

### Negative
- **Complexity Budget**: Each system adds complexity for players to track
- **Testing Burden**: Many environmental combinations to test
- **Realism Debates**: How realistic should weather patterns be?
- **Performance Scaling**: Many active systems could impact performance

### Neutral
- Encourages "living world" design philosophy
- May influence pacing (waiting for night, seasons)
- Some games may not need any environmental systems

## Implementation Notes

### Environmental Service Architecture
```typescript
interface EnvironmentalService {
  // Core systems
  time: TimeSystem;
  weather: WeatherSystem;
  seasons: SeasonSystem;
  
  // Optional area-specific systems
  extensions: Map<string, EnvironmentalExtension>;
  
  // Queries
  getCurrentConditions(): EnvironmentalState;
  subscribe(event: string, handler: Function): void;
  
  // Time control
  advance(minutes: number): void;
  setTime(time: GameTime): void;
}
```

### System Interactions
```typescript
// Define how systems affect each other
interactions: {
  'winter+lake': {
    effects: ['surface-freezes', 'fish-go-deep'],
    description: 'The lake has frozen over'
  },
  'storm+night': {
    effects: ['visibility-zero', 'navigation-difficult'],
    description: 'The storm makes the darkness impenetrable'
  },
  'full-moon+clear': {
    effects: ['enhanced-magic', 'lycanthrope-active'],
    description: 'The full moon bathes everything in silver light'
  }
}
```

### Performance Optimization
- Systems only calculate when queried or on transitions
- Areas can subscribe to only needed events
- Descriptions computed lazily
- Environmental state changes batched

## Examples

### Simple Day/Night
```typescript
area.config({
  environmental: { dayNight: true }
})

location.creatures('nocturnal-owl')
  .appearWhen(({ env }) => env.isNight());
```

### Complex Weather Patterns
```typescript
area.config({
  environmental: {
    weather: {
      mode: 'realistic',
      patterns: ['coastal'],
      extremeEvents: ['hurricane'],
      transitionSpeed: 'natural'
    }
  }
})

area.rule('hurricane-approaching')
  .when('weather.pressure-drop')
  .if(({ magnitude }) => magnitude > 20)
  .then(({ area, output, quest }) => {
    output.broadcast('hurricane-warning');
    quest.start('evacuate-villagers');
    area.lockdown('outdoor-locations');
  });
```

### Fantasy Moon Magic
```typescript
area.config({
  environmental: {
    moonPhases: true,
    magicalResonance: true
  }
})

spell.requirement('lunar-blessing')
  .moonPhase(['full', 'waxing-gibbous']);

item('moonstone').power(({ env }) => {
  const moonPower = env.moon.illumination;
  return Math.floor(moonPower * 10);
});
```

## Related Patterns
- Feature-001: Area Module System (environment per area)
- Feature-004: Progressive Disclosure (weather gates)
- Feature-006: Event Communication (environmental events)
- ADR-001: Event-Driven Architecture (environmental changes are events)

## Edge Cases
- Teleportation between areas with different weather
- Time travel and environmental state
- Indoor locations and weather effects
- Conflicting area environmental settings at borders

## Future Considerations
- Visual weather effects in UI
- Procedural weather generation
- Player weather prediction/control abilities
- Seasonal events and festivals
- Climate change as plot element

## References
- Skyrim's weather system
- Minecraft's day/night and weather
- Harvest Moon's seasonal gameplay
- NetHack's moon phase effects
