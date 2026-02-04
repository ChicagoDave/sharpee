# Feature-002: Declarative Quest Framework

## Status
Proposed

## Context
Quests are a fundamental organizing principle in Interactive Fiction games, especially larger ones. They provide player goals, narrative structure, and progression tracking. In a game like "The Kingdom Divided," there might be 50+ quests ranging from simple fetch quests to complex multi-area storylines with branching paths.

## Problem
- Quest logic scattered across locations, NPCs, and item interactions
- Difficult to track quest progress and complex dependency chains
- Hard to modify quest flow without breaking interconnected parts
- Quest state persistence is error-prone and often manually managed
- No standard way to handle quest journals/logs for players
- Testing quest completion paths is tedious
- Balancing quest rewards requires finding and updating multiple locations

## Solution
Implement a declarative quest system where quests are defined as data structures with lifecycle hooks:

```typescript
area.quest('retrieve-sunken-sword')
  .name('The Sword of the Lake')
  .description('An ancient blade lies beneath the crystal waters')
  .stages({
    'learn-legend': { 
      description: 'Learn about the sword from locals',
      hint: 'Try talking to the old fisherman'
    },
    'find-location': { 
      description: 'Discover where the sword sank',
      requires: ['map-fragment', 'fisherman-story']
    },
    'get-breathing': { 
      description: 'Acquire water breathing ability',
      hint: 'The lake spirit might help, if appeased'
    },
    'retrieve-sword': { 
      description: 'Dive down and retrieve the sword',
      requires: ['water-breathing'],
      location: 'lake.underwater-ruins'
    }
  })
  .requirements({ 
    startLevel: 5, 
    items: ['map-fragment'],
    quests: ['gain-lake-trust']
  })
  .rewards({ 
    experience: 500, 
    item: 'legendary-sword',
    faction: { 'lake-spirits': 10 }
  })
  .onStart(({ player, output }) => {
    output.add('quest-start-sunken-sword');
  })
  .onComplete(({ player, world, output }) => {
    output.add('quest-complete-sunken-sword');
    world.setFlag('lake-prophecy-fulfilled');
  });
```

### Quest Branching
For complex quests with choices:

```typescript
area.quest('kingdom-allegiance')
  .branches({
    'rebel-path': {
      stages: { /* rebel-specific stages */ },
      rewards: { faction: { rebels: 50 } }
    },
    'royal-path': {
      stages: { /* royal-specific stages */ },
      rewards: { faction: { royalists: 50 } }
    },
    'neutral-path': {
      stages: { /* neutral stages */ },
      rewards: { item: 'medallion-of-neutrality' }
    }
  })
  .onBranchChoice(({ branch, player }) => {
    player.setFlag(`chose-${branch}`);
  });
```

## Consequences

### Positive
- **Centralized Definition**: All quest logic in one place
- **Easy Modification**: Change flow without hunting through code
- **Automatic Tracking**: Framework handles state management
- **Built-in Journal**: Player quest log generated from definitions
- **Testable**: Can unit test quest progression
- **Balance-friendly**: All rewards in quest definition
- **Reusable Patterns**: Common quest types can be templated

### Negative
- **Less Flexible**: Complex custom behavior needs escape hatches
- **Memory Overhead**: All quest definitions loaded even if not active
- **Learning Curve**: Authors must learn quest DSL
- **Debugging Complexity**: Declarative nature can hide execution flow

### Neutral
- Changes how authors think about game flow
- May lead to more "gamey" feel vs. pure narrative
- Quest-centric design might not suit all IF styles

## Implementation Notes

### Quest State Management
```typescript
interface QuestState {
  id: string;
  status: 'not-started' | 'active' | 'completed' | 'failed' | 'abandoned';
  currentStage: string;
  completedStages: string[];
  branch?: string;
  variables: Record<string, any>;
  startTime: number;
  completionTime?: number;
}
```

### Quest Service Integration
```typescript
// In game engine
class QuestService {
  start(questId: string): void;
  advance(questId: string, stage: string): void;
  complete(questId: string): void;
  fail(questId: string, reason?: string): void;
  
  // Queries
  isActive(questId: string): boolean;
  isCompleted(questId: string): boolean;
  getActiveQuests(): Quest[];
  canStart(questId: string): boolean;
}
```

### Automatic Integration Points
The quest system automatically integrates with:
- **Dialogue System**: NPCs can check quest status
- **Item System**: Items can advance quest stages
- **Location System**: Entering locations can trigger stages
- **Combat System**: Defeating enemies can complete objectives

## Examples

### Simple Fetch Quest
```typescript
area.quest('find-herbs')
  .name('Medicine for the Healer')
  .stages({
    'collect': { 
      description: 'Collect 5 healing herbs',
      counter: { item: 'healing-herb', required: 5 }
    },
    'return': { description: 'Return to the healer' }
  })
  .rewards({ experience: 50, gold: 10 });
```

### Multi-Area Epic Quest
```typescript
game.quest('unite-the-kingdom')
  .name('The Shattered Crown')
  .stages({
    'gather-allies': {
      description: 'Gain support from three regions',
      substages: {
        'lake-alliance': { area: 'lake', description: 'Secure lake region support' },
        'mountain-alliance': { area: 'mountain', description: 'Gain mountain clan loyalty' },
        'city-alliance': { area: 'city', description: 'Win over city merchants' }
      }
    },
    'ancient-ritual': {
      description: 'Perform the unification ritual',
      location: 'castle.throne-room',
      requires: ['crown-fragment-1', 'crown-fragment-2', 'crown-fragment-3']
    }
  })
  .onComplete(({ world }) => {
    world.triggerEnding('unification');
  });
```

### Repeatable Quest
```typescript
area.quest('daily-fishing')
  .name('The Daily Catch')
  .repeatable({ cooldown: '1 day', maxCompletions: null })
  .stages({
    'catch-fish': {
      description: 'Catch 3 fish of any type',
      counter: { tag: 'fish', required: 3 }
    }
  })
  .rewards(() => ({
    // Random reward each time
    gold: Math.floor(Math.random() * 20) + 10,
    item: Math.random() > 0.9 ? 'pearl' : null
  }));
```

## Related Patterns
- Feature-001: Area Module System (quests span areas)
- Feature-003: Environmental Systems (quests react to environment)
- Feature-006: Event-Based Communication (quest events)
- ADR-001: Event-Driven Architecture (quest stage transitions are events)

## Future Considerations
- Visual quest editor tool
- Quest template library
- Player-created quests/objectives
- Dynamic quest generation
- Quest sharing/community features

## References
- World of Warcraft's quest system (declarative design)
- Skyrim's Radiant Quest system (dynamic generation)
- Inform 7's scenes (similar stage-based progression)
