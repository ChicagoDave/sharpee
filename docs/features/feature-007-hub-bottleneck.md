# Feature-007: Hub-and-Bottleneck Game Structure

## Status
Proposed

## Context
Many successful Interactive Fiction games use a "hub-and-bottleneck" structure where players explore open areas (hubs) to solve puzzles or complete objectives, which then unlock passage through bottlenecks to new hubs. This creates natural pacing, prevents overwhelming new players, and provides clear goals while maintaining freedom of exploration. Games like "Anchorhead," "Hadean Lands," and many classic Infocom titles use variations of this pattern.

## Problem
- Completely open worlds overwhelm players with too many choices
- Linear games feel restrictive and reduce player agency
- Difficult to ensure players have necessary items/knowledge before progressing
- Manual tracking of which areas should be accessible when
- Hard to visualize and modify game flow during development
- No standard way to implement common patterns (collect N items, solve X of Y puzzles)
- Testing all possible paths through hubs becomes complex
- Difficult to provide clear goals while maintaining exploration freedom

## Solution
Implement a declarative hub-and-bottleneck system that defines game flow as a graph of hubs connected by bottlenecks:

```typescript
// Define game structure
export const GameStructure = Structure.create('main-game')
  .hub('starting-village', {
    description: 'The Village and Surrounding Woods',
    areas: ['village-square', 'inn', 'woods', 'old-mill'],
    initiallyAccessible: true,
    objectives: {
      'find-three-keys': {
        type: 'collect',
        items: ['brass-key', 'iron-key', 'crystal-key'],
        description: 'Find the three keys to the ancient gate'
      },
      'learn-password': {
        type: 'knowledge',
        fact: 'gate-password',
        description: 'Learn the password from the village elders'
      }
    }
  })
  
  .bottleneck('ancient-gate', {
    from: 'starting-village',
    to: 'mountain-region',
    requirements: {
      all: [
        { completed: 'find-three-keys' },
        { completed: 'learn-password' }
      ]
    },
    transition: {
      scene: 'gate-opening-ceremony',
      description: 'The three keys turn in unison as you speak the ancient words...'
    }
  })
  
  .hub('mountain-region', {
    description: 'The Mountain Paths and Hidden Valleys',
    areas: ['mountain-base', 'hidden-valley', 'ice-caves', 'eagles-nest'],
    objectives: {
      'solve-elemental-puzzles': {
        type: 'complete-any',
        count: 2,
        options: [
          'fire-puzzle',
          'water-puzzle',
          'earth-puzzle',
          'air-puzzle'
        ],
        description: 'Solve at least two elemental challenges'
      }
    }
  })
  
  .multiBottleneck('the-convergence', {
    from: ['mountain-region', 'lake-region', 'desert-region'],
    to: 'final-citadel',
    requirements: {
      // Each path has different requirements
      'mountain-region': { completed: 'solve-elemental-puzzles' },
      'lake-region': { completed: 'restore-water-spirit' },
      'desert-region': { completed: 'find-oasis-city' },
      // But need at least 2 of 3 paths completed
      minimum: 2
    }
  });
```

### Hub Types and Patterns

```typescript
// Radial hub - Central location with spokes
.hub('city-center', {
  pattern: 'radial',
  center: 'town-square',
  spokes: ['market', 'castle', 'docks', 'temple'],
  freeMovement: true  // Can always return to center
})

// Linear hub - Sequential locations with optional branches
.hub('river-journey', {
  pattern: 'linear',
  sequence: ['dock', 'rapids', 'waterfall', 'lake'],
  branches: {
    'rapids': ['hidden-cave'],
    'lake': ['island', 'far-shore']
  },
  allowBacktrack: true
})

// Maze hub - Interconnected locations with multiple paths
.hub('ancient-ruins', {
  pattern: 'maze',
  locations: ['entrance', 'hall', 'library', 'throne', 'crypt'],
  connections: 'complex',  // Many interconnections
  objective: 'find-center'
})
```

### Dynamic Bottlenecks

```typescript
// Bottleneck that adapts to player choices
.bottleneck('moral-choice', {
  from: 'troubled-kingdom',
  to: (context) => {
    // Destination depends on player actions
    if (context.player.karma > 50) return 'blessed-lands';
    if (context.player.karma < -50) return 'cursed-wastes';
    return 'neutral-territory';
  },
  requirements: {
    custom: ({ player, world }) => {
      return world.getCompletedQuests().length >= 5;
    }
  }
})

// Bottleneck with multiple solutions
.bottleneck('castle-gates', {
  from: 'countryside',
  to: 'castle-interior',
  requirements: {
    any: [
      { item: 'royal-seal' },
      { quest: 'earn-knighthood' },
      { skill: 'disguise', level: 10 },
      { faction: 'nobles', reputation: 50 }
    ]
  },
  hint: 'There are many ways into the castle...'
})
```

### Progress Tracking and Visualization

```typescript
// Built-in progress tracking
const progress = structure.getProgress();
// Returns:
{
  currentHubs: ['mountain-region', 'lake-region'],
  completedHubs: ['starting-village'],
  availableBottlenecks: ['the-convergence'],
  blockedBottlenecks: ['final-gate'],
  overallProgress: 0.45  // 45% complete
}

// Generate visual map
structure.generateMap({
  format: 'graphviz',
  showProgress: true,
  highlightCurrent: true
});
```

## Consequences

### Positive
- **Clear Structure**: Game flow is explicit and documented
- **Flexible Pacing**: Control when players access new content
- **Multiple Solutions**: Bottlenecks can have varied requirements
- **Progress Tracking**: Players always know their goals
- **Testing Support**: Can test each hub in isolation
- **Replayability**: Different paths through multi-bottlenecks
- **Visual Design**: Can see and modify game flow easily

### Negative
- **Prescriptive**: May limit completely emergent gameplay
- **Complexity**: Another abstraction layer to learn
- **Overhead**: Need to define structure upfront
- **Rigidity**: Harder to add unexpected connections

### Neutral
- Encourages thinking about game pacing early
- Makes game structure very explicit
- May not suit all IF styles (pure sandbox, etc.)

## Implementation Notes

### Structure Service
```typescript
class GameStructureService {
  private hubs: Map<string, Hub> = new Map();
  private bottlenecks: Map<string, Bottleneck> = new Map();
  private playerProgress: PlayerProgress;
  
  isBottleneckOpen(id: string): boolean {
    const bottleneck = this.bottlenecks.get(id);
    return this.checkRequirements(bottleneck.requirements);
  }
  
  enterHub(id: string): void {
    const hub = this.hubs.get(id);
    this.playerProgress.currentHub = id;
    this.activateAreas(hub.areas);
    this.trackObjectives(hub.objectives);
  }
  
  checkCompletion(): void {
    for (const [id, hub] of this.hubs) {
      if (this.areObjectivesComplete(hub.objectives)) {
        this.unlockBottlenecks(hub.exitBottlenecks);
      }
    }
  }
}
```

### Integration with Areas
```typescript
// Hubs contain multiple areas
.hub('forest-region', {
  areas: ['dark-woods', 'clearing', 'druid-grove'],
  onEnter: ({ hub, player }) => {
    // Initialize hub-specific content
    hub.spawnCreatures('forest-animals');
    hub.startWeather('misty');
  },
  onAllObjectivesComplete: ({ hub }) => {
    // Transform the hub when complete
    hub.event('forest-blessing').trigger();
  }
})
```

### Objective Types
```typescript
interface ObjectiveTypes {
  // Collect all items
  collect: {
    items: string[];
    description: string;
  };
  
  // Complete N of M tasks
  completeAny: {
    count: number;
    options: string[];
    description: string;
  };
  
  // Reach a state
  achieve: {
    condition: (context: GameContext) => boolean;
    description: string;
  };
  
  // Survive for time
  survive: {
    duration: string;
    area: string;
    description: string;
  };
}
```

## Examples

### Classic Three-Act Structure
```typescript
Structure.create('three-act-game')
  // Act 1: Introduction and learning
  .hub('act1-hometown', {
    initiallyAccessible: true,
    objectives: {
      'learn-basics': { type: 'tutorial', steps: 5 },
      'discover-quest': { type: 'knowledge', fact: 'main-quest' }
    }
  })
  .bottleneck('leave-home', {
    from: 'act1-hometown',
    to: 'act2-wider-world',
    requirements: { all: ['learn-basics', 'discover-quest'] }
  })
  
  // Act 2: Main adventure with multiple paths
  .hub('act2-wider-world', {
    subhubs: ['kingdom', 'wilderness', 'underworld'],
    objectives: {
      'gather-allies': { type: 'recruit', count: 3 },
      'find-artifact': { type: 'collect', items: ['legendary-weapon'] }
    }
  })
  .bottleneck('final-challenge', {
    from: 'act2-wider-world',
    to: 'act3-endgame',
    requirements: { all: ['gather-allies', 'find-artifact'] }
  })
  
  // Act 3: Climax and resolution
  .hub('act3-endgame', {
    areas: ['final-dungeon', 'boss-arena'],
    objectives: { 'defeat-evil': { type: 'boss-battle' } }
  });
```

### Metroidvania Style
```typescript
Structure.create('ability-gated')
  .hub('starting-area', {
    objectives: { 'find-jump-boots': { type: 'item' } }
  })
  .bottleneck('high-ledge', {
    from: 'starting-area',
    to: 'upper-area',
    requirements: { ability: 'high-jump' },
    preview: 'You can see a ledge above, just out of reach...'
  })
  .hub('upper-area', {
    objectives: { 'find-swim-gear': { type: 'item' } }
  })
  .bottleneck('flooded-tunnel', {
    from: ['starting-area', 'upper-area'],  // Multiple access points
    to: 'water-area',
    requirements: { ability: 'underwater-breathing' }
  });
```

### Branching Narrative
```typescript
Structure.create('branching-story')
  .hub('chapter1', {
    objectives: {
      'make-choice': {
        type: 'decision',
        options: ['help-rebels', 'help-empire', 'stay-neutral']
      }
    }
  })
  .bottleneck('path-split', {
    from: 'chapter1',
    to: ({ player }) => {
      switch(player.getChoice('make-choice')) {
        case 'help-rebels': return 'rebel-path';
        case 'help-empire': return 'empire-path';
        default: return 'neutral-path';
      }
    }
  });
```

## Related Patterns
- Feature-001: Area Module System (hubs contain areas)
- Feature-002: Quest Framework (objectives are quests)
- Feature-004: Capability-Based Access (bottleneck requirements)
- Feature-006: Event Communication (hub completion events)

## Edge Cases
- Player sequence-breaks into later hubs
- Multiple bottlenecks opening simultaneously
- Circular hub dependencies
- Dynamic objectives that change during play
- Multiplayer with players in different hubs

## Future Considerations
- Visual hub map in game UI
- Procedural hub generation
- Community-created structure templates
- Speedrun-friendly features
- New Game+ with altered structure

## References
- The Legend of Zelda series (dungeon/overworld structure)
- Metroid series (ability-gated progression)
- Resident Evil series (key/door bottlenecks)
- The Witness (area-based puzzle collections)
- Classic IF like Trinity (hub-based exploration)
