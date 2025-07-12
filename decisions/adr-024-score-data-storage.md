# ADR-024: Score Data Storage

Date: 2025-07-12

## Status

Accepted

## Context

We need to determine where and how to store scoring data in the Sharpee platform. Key considerations:

1. Support for multiple player characters (swappable PCs)
2. Domain-driven design principles (aggregate boundaries, data ownership)
3. Score often depends on world events (puzzles solved, treasures found)
4. Score might be derived data rather than stored state
5. Extension/capability data should not pollute core entity model

The discussion revealed tension between storing score on PC entities vs. treating it as a projection of game events, which led to a broader realization about capability data segregation.

## Decision

All capability data (including scoring) will be stored in **capability-specific namespaces** within the world model, following a segregated data pattern:

```typescript
interface WorldModel {
  // Core entity/relationship data
  entities: EntityStore;
  relationships: RelationshipStore;
  
  // Capability-specific data stores
  capabilities: {
    [capabilityName: string]: {
      data: any;  // Capability-defined schema
    }
  }
}
```

## Implementation Approach

### Capability Registration

```typescript
// Scoring capability registers its data schema
world.registerCapability('scoring', {
  schema: {
    scoreValue: { type: 'number', default: 0 },
    maxScore: { type: 'number', default: 0 },
    achievements: { type: 'array', items: 'string', default: [] },
    history: { type: 'array', items: 'object', default: [] }
  }
});
```

### Data Access Pattern

```typescript
// Reading scoring data
const score = world.capabilities.scoring?.data.scoreValue ?? 0;
const achievements = world.capabilities.scoring?.data.achievements ?? [];

// Updating scoring data
world.updateCapability('scoring', {
  scoreValue: score + points,
  history: [...history, { action: 'puzzle_solved', points, timestamp }]
});

// Capability-specific events
events.emit('capability:scoring:changed', {
  scoreValue: score + points,
  reason: 'puzzle_solved',
  pointsAwarded: points
});
```

### Score Action Implementation

```typescript
execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[] {
  const scoringData = context.world.capabilities.scoring?.data;
  
  if (!scoringData) {
    return [createEvent(IFEvents.MESSAGE, {
      messageKey: 'scoring.not_enabled'
    })];
  }
  
  return [createEvent(IFEvents.SCORE_DISPLAYED, {
    messageKey: 'scoring.report.basic',
    score: scoringData.scoreValue,
    maxScore: scoringData.maxScore,
    achievements: scoringData.achievements
  })];
}
```

## Why Capability Segregation?

1. **Clean Separation** - Core entities remain unpolluted by capability-specific data
2. **Discoverability** - All capability data in predictable locations
3. **Type Safety** - Each capability defines and owns its data schema
4. **Extension-Friendly** - New capabilities just add their namespace
5. **Query-able** - World model remains fully query-able across capabilities

## Benefits Over Alternative Approaches

### vs. Entity Properties
- Entities stay focused on core properties (name, description, etc.)
- No need to extend entity interfaces for each capability
- Avoids property name collisions

### vs. Separate Services
- All data remains in the world model (single source of truth)
- Consistent querying patterns
- Simplifies save/restore operations

### vs. Event Sourcing Only
- Immediate access without event replay
- Simpler implementation while keeping event trail
- Better performance for frequent queries

## Text Service Integration

The Text Service pulls from both the event source and capability data to construct output:

```typescript
// After turn completion, Text Service processes events
textService.processEvents(turnEvents: Event[], world: WorldModel) {
  for (const event of turnEvents) {
    if (event.type === 'capability:scoring:changed') {
      // Pull current scoring data from world model
      const scoringData = world.capabilities.scoring?.data;
      
      // Use language provider templates with capability data
      const message = languageProvider.format(event.messageKey, {
        score: scoringData.scoreValue,
        maxScore: scoringData.maxScore,
        achievements: scoringData.achievements
      });
      
      // Add to output queue
      this.addOutput(message);
    }
  }
}
```

The Text Service:
1. Processes events from the event source after turn completion
2. Pulls current state from capability namespaces in the world model
3. Combines event data with world state to generate appropriate output
4. Never listens to events directly - always pulls after world model changes are complete

## Consequences

### Positive
- Clean separation of concerns
- Capabilities don't pollute core entity model
- Easy to add new capabilities without modifying core
- Type-safe capability data access
- All data remains query-able through world model
- Natural integration with event system

### Negative
- Additional indirection for data access
- Need to register capabilities before use
- Capability names must be unique

## Related

- ADR-022: Extension architecture (defines capability pattern)
- ADR-016: Event-driven architecture
- ADR-014: Unrestricted world model access
