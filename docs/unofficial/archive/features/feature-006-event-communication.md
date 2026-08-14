# Feature-006: Event-Based Module Communication

## Status
Proposed

## Context
In a modular Interactive Fiction architecture with separate area modules, these modules need to communicate and coordinate without creating tight coupling. Events in one area may need to affect other areas: a war's outcome changes city politics, defeating a dragon affects multiple regions, or a player's actions ripple across the game world. Traditional direct module references create dependencies that harm maintainability and testability.

## Problem
- Direct module references create tight coupling and circular dependencies
- State changes in one area don't propagate to affected areas
- Cross-area quests require complex coordination logic
- Random events can't easily affect multiple areas
- Testing modules in isolation becomes impossible with direct dependencies
- No audit trail of how areas influence each other
- Difficult to add new area reactions without modifying source areas
- Save/load needs to preserve in-flight events

## Solution
Implement an event bus system where modules communicate through typed events without direct references:

```typescript
// In battlefield module - broadcast event
area.event('battle-outcome')
  .broadcast('kingdom-event')
  .data({ 
    victor: 'rebels', 
    impact: 'major',
    location: 'golden-plains',
    casualties: { rebels: 200, royalists: 500 }
  })
  .persistent(true)  // Survives save/load
  .delay('1 hour');  // News travels slowly

// In city module - react to event
area.on('kingdom-event')
  .filter(({ data }) => data.impact === 'major')
  .then(({ area, data }) => {
    area.setFaction(data.victor);
    area.updateNPCDialogue('war-news', data);
    area.prices.adjust('wartime-inflation');
    
    if (data.victor === 'rebels') {
      area.removeNPC('royal-guard-captain');
      area.addNPC('rebel-commander');
    }
  });

// In lake module - different reaction
area.on('kingdom-event')
  .filter(({ data }) => data.victor === 'rebels')
  .then(({ area }) => {
    area.quest('smuggle-supplies').enable();
    area.npc('fisherman').dialogue.add('rebel-sympathy');
  });
```

### Event Types and Contracts
```typescript
// Define event contracts for type safety
interface KingdomEvent {
  type: 'kingdom-event';
  data: {
    victor: 'rebels' | 'royalists';
    impact: 'minor' | 'major' | 'decisive';
    location: string;
    casualties?: { rebels: number; royalists: number };
  };
}

interface DragonEvent {
  type: 'dragon-event';
  data: {
    action: 'awakened' | 'rampaging' | 'slain';
    dragon: string;
    area: string;
    slayer?: string;
  };
}

// Type-safe event emission
area.emit<DragonEvent>({
  type: 'dragon-event',
  data: {
    action: 'slain',
    dragon: 'ancient-red-dragon',
    area: 'mountain',
    slayer: player.name
  }
});
```

### Event Routing and Filtering
```typescript
// Complex event routing
area.on('player-action')
  .filter(({ data }) => 
    data.action === 'destroy' && 
    data.target === 'dam'
  )
  .then(({ area }) => {
    // Local effects
    area.flood('valley');
    
    // Cascade to other areas
    area.emit('environmental-disaster', {
      type: 'flood',
      severity: 'catastrophic',
      origin: area.id
    });
  });

// Multiple handlers for same event
area.on('dragon-slain')
  .priority(1)  // Execute first
  .then(({ area }) => area.celebrate());

area.on('dragon-slain')
  .priority(2)  // Execute second
  .then(({ area }) => area.spawnDragonCultists());
```

### Event Scheduling and Persistence
```typescript
// Delayed events
area.event('assassination-plot')
  .broadcast('political-event')
  .delay('3 days')
  .condition(() => !player.hasWarned('king'))
  .data({ target: 'king', plotters: ['duke', 'advisor'] });

// Recurring events
area.event('market-day')
  .broadcast('economic-event')
  .recurring('weekly')
  .data({ priceMultiplier: 0.9, crowdLevel: 'high' });

// Persistent events that survive save/load
area.event('prophecy-fulfilled')
  .broadcast('world-event')
  .persistent(true)
  .once()  // Can only happen once per game
  .data({ prophecy: 'chosen-one', hero: player.name });
```

## Consequences

### Positive
- **Loose Coupling**: Modules don't know about each other
- **Easy Testing**: Can test with mock events
- **Extensibility**: New modules can listen to existing events
- **Debugging**: Event log shows all interactions
- **Flexibility**: Can add/remove handlers without changing emitters
- **Asynchronous**: Natural support for delayed consequences
- **Save System**: Events can be serialized and restored

### Negative
- **Indirection**: Harder to trace what affects what
- **Type Safety**: Need careful typing to avoid runtime errors
- **Performance**: Event dispatch has overhead
- **Complexity**: Another abstraction to learn
- **Race Conditions**: Multiple handlers might conflict

### Neutral
- Encourages thinking in terms of cause and effect
- May lead to "event soup" if overused
- Requires good documentation of event contracts

## Implementation Notes

### Event Bus Architecture
```typescript
class AreaEventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private eventQueue: QueuedEvent[] = [];
  private eventLog: EventLogEntry[] = [];
  
  emit(event: GameEvent): void {
    // Log for debugging
    this.eventLog.push({
      timestamp: Date.now(),
      event,
      source: this.currentArea
    });
    
    // Process immediately or queue
    if (event.delay) {
      this.eventQueue.push({
        event,
        executeAt: Date.now() + event.delay
      });
    } else {
      this.dispatch(event);
    }
  }
  
  private dispatch(event: GameEvent): void {
    const handlers = this.handlers.get(event.type) || [];
    
    // Sort by priority
    const sorted = handlers.sort((a, b) => a.priority - b.priority);
    
    for (const handler of sorted) {
      if (handler.filter && !handler.filter(event)) continue;
      
      try {
        handler.callback({
          area: this.getArea(handler.areaId),
          event,
          data: event.data
        });
      } catch (error) {
        console.error(`Handler error for ${event.type}:`, error);
      }
    }
  }
}
```

### Event Documentation System
```typescript
// Auto-generate event documentation
interface EventDocumentation {
  event: string;
  description: string;
  emitters: string[];  // Which areas emit this
  listeners: string[]; // Which areas listen
  dataSchema: object;  // JSON schema
  examples: EventExample[];
}

// In-code documentation
area.documentEvent('kingdom-event', {
  description: 'Major political changes in the kingdom',
  emits: ['battlefield', 'castle'],
  data: {
    victor: 'Winning faction',
    impact: 'Scale of the victory',
    location: 'Where the event occurred'
  }
});
```

## Examples

### World-Changing Event
```typescript
// When the player breaks an ancient seal
area.event('ancient-seal-broken')
  .broadcast('world-event')
  .data({ 
    seal: 'demon-prison',
    breaker: player.name,
    location: 'forgotten-temple'
  });

// Multiple areas react
area.on('world-event')
  .filter(({ data }) => data.seal === 'demon-prison')
  .then(({ area }) => {
    area.spawnDemons();
    area.darkenSky();
    area.npcs.setPanic(true);
    area.quest('reseal-the-prison').activate();
  });
```

### Economic Events
```typescript
// Mine discovers gold
area.event('resource-discovered')
  .broadcast('economic-event')
  .data({
    resource: 'gold',
    quantity: 'massive',
    location: 'deep-mines'
  });

// Markets react
area.on('economic-event')
  .filter(({ data }) => data.resource === 'gold')
  .then(({ area, data }) => {
    if (data.quantity === 'massive') {
      area.prices.gold.multiply(0.5);  // Gold price crashes
      area.prices.other.multiply(1.2); // Inflation
    }
  });
```

### Chain Reactions
```typescript
// Initial event
area.event('dam-destroyed')
  .broadcast('disaster')
  .data({ type: 'flood', severity: 10 });

// Causes more events
area.on('disaster')
  .filter(({ data }) => data.type === 'flood')
  .then(({ area, data }) => {
    if (area.hasFeature('bridges')) {
      area.emit('infrastructure-damaged', {
        type: 'bridges-washed-out',
        repairTime: '2 weeks'
      });
    }
  });

// Which cause more events...
area.on('infrastructure-damaged')
  .then(({ area }) => {
    area.emit('economic-event', {
      type: 'trade-disrupted',
      impact: 'severe'
    });
  });
```

## Related Patterns
- Feature-001: Area Module System (modules that communicate)
- Feature-002: Quest Framework (quest events)
- Feature-003: Environmental Systems (weather events)
- ADR-001: Event-Driven Architecture (foundation pattern)

## Edge Cases
- Circular event chains (A triggers B triggers A)
- Events during area transitions
- Conflicting handlers modifying same state
- Event storms (too many events at once)
- Lost events during save/load
- Events targeting not-yet-loaded areas

## Future Considerations
- Visual event flow debugger
- Event replay for debugging
- Event contracts enforced at compile time
- Performance monitoring for event chains
- Player-visible event log ("News system")

## References
- Unity's Event System
- Redux action pattern
- Enterprise Service Bus patterns
- Observer pattern in game design
