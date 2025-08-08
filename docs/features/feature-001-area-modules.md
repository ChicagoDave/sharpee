# Feature-001: Area Module System

## Status
Proposed

## Context
Large Interactive Fiction games need to be divided into manageable chunks for both technical and team organization reasons. Games like "The Kingdom Divided" might have hundreds of locations across multiple distinct regions, with different team members responsible for different areas.

## Problem
- Monolithic game files become unmaintainable at scale (1000+ locations)
- Multiple team members working on different regions create merge conflicts
- Loading entire game state impacts performance and memory usage
- Cross-area dependencies become tangled and hard to trace
- Testing individual areas requires loading the entire game
- No clear ownership boundaries for code maintenance

## Solution
Implement an Area Module system that allows games to be composed of self-contained regional modules:

```typescript
AreaModule.create('area-name')
  .metadata({
    displayName: 'The Crystal Lake Region',
    description: 'A mystical lake surrounded by ancient forests',
    author: 'Lake Team',
    version: '1.0.0'
  })
  .setup(({ area, shared, systems }) => {
    // Area-specific setup
  })
  .connections({
    'city': {
      from: 'lakeside-road',
      to: 'city.eastern-gate',
      travelTime: 30,
      description: 'The road winds back towards the city'
    }
  })
  .exports({
    items: ['enchanted-pearl', 'lake-water-vial'],
    npcs: ['lady-of-lake'],
    quests: ['discover-lake-secret']
  })
```

### Key Components

1. **Module Creation**: Each area is a self-contained module with its own namespace
2. **Metadata**: Author, version, and description for documentation and credits
3. **Setup Function**: Receives injected dependencies (area context, shared resources, systems)
4. **Explicit Connections**: Declares how this area connects to others
5. **Explicit Exports**: Declares what this area makes available to other modules

### Module Structure
```
areas/
├── lake/
│   ├── index.ts        # Area module definition
│   ├── locations.ts    # 20-30 locations
│   ├── npcs.ts         # Area-specific NPCs
│   ├── quests.ts       # Area questlines
│   ├── events.ts       # Random/scripted events
│   └── items.ts        # Area-specific items
```

## Consequences

### Positive
- **Clear Boundaries**: Each area has explicit boundaries and dependencies
- **Parallel Development**: Teams can work on different areas without conflicts
- **Progressive Loading**: Areas can be loaded on-demand for better performance
- **Explicit Dependencies**: Import/export system makes dependencies visible
- **Independent Testing**: Each area can be tested in isolation
- **Version Control**: Better git history with changes isolated to area files
- **Team Ownership**: Clear responsibility boundaries

### Negative
- **Initial Complexity**: More setup required than monolithic approach
- **Coordination Overhead**: Shared systems need careful design
- **Cross-Area Interactions**: Events between areas need explicit coordination
- **Learning Curve**: Team members need to understand module system

### Neutral
- Changes how authors think about game structure
- Requires tooling support for area visualization
- May influence game design toward more discrete regions

## Implementation Notes

### Area Registry
The main game file maintains an area registry:
```typescript
Story.create('game-name')
  .area('lake', LakeModule, options)
  .area('mountain', MountainModule, options)
```

### Loading Strategy
Areas can be loaded:
- **Eagerly**: All at startup (small games)
- **Lazily**: On first visit (large games)
- **Proximally**: Current area + adjacent areas

### Dependency Resolution
The system should validate:
- Connection endpoints exist
- Exported items/NPCs are defined
- No circular dependencies
- Version compatibility

## Examples

### Small Game (2-3 areas)
Even small games benefit from separation:
```typescript
.area('castle', CastleModule)
.area('village', VillageModule)
.area('forest', ForestModule)
```

### Large Game (50+ areas)
Essential for large games:
```typescript
// Main regions
.area('city', CityModule)
.area('wilderness', WildernessModule)

// City districts as sub-modules
.area('city.market', MarketDistrictModule)
.area('city.docks', DocksDistrictModule)
.area('city.palace', PalaceDistrictModule)
```

## Related Patterns
- Feature-005: Shared Resource Management
- Feature-006: Event-Based Module Communication
- ADR-001: Event-Driven Architecture (events cross areas)

## References
- Inform 7's Extensions system (similar modularity goals)
- TADS 3's module system
- Modern JavaScript module systems (ES6 modules)
