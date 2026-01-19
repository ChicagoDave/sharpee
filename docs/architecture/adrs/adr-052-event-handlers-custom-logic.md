# ADR-052: Event Handlers and Custom Logic

## Status
**Implemented** (Phase 1: Entity Handlers) - Supersedes ADR-051 (ActionBehaviors)

## Context

Our current architecture is event-driven, where actions emit events like `if.event.pushed` or `if.event.taken`. However, we discovered a fundamental gap: **events are fire-and-forget with no subscription mechanism**. This means authors have no way to implement custom game logic in response to player actions.

### The Problem Scenario

Consider a simple puzzle: pushing a red book should open a secret bookshelf passage.

```typescript
// Player action
> push red book

// Current system:
// 1. Pushing action validates the command
// 2. Updates pushable.pushCount
// 3. Emits event: if.event.pushed
// 4. Shows message: "You push the red book."
// 5. NOTHING ELSE HAPPENS - bookshelf doesn't open!
```

The event is emitted but nothing handles it. The bookshelf can't react to the book being pushed.

### What We Explored

Through extensive design discussion, we explored several approaches:

#### 1. ActionBehaviors (ADR-051)
- Created specialized behaviors (ButtonPushBehavior, LeverPullBehavior)
- Problem: Unlimited author-specific cases (push table, pull stove, throw crystal)
- Realization: Can't create behaviors for every possible variant

#### 2. Custom Handlers in Story Registry
```typescript
story.registerCustomHandler('revealBookshelf', (entity, context) => {
  // Custom logic
});
```
- Problem: Indirection - logic separate from entities

#### 3. Custom Handlers in Traits
```typescript
traits: new Map([
  [TraitType.PUSHABLE, {
    onPush: (context) => { /* custom logic */ }
  }]
])
```
- Problem: Serialization of functions
- Problem: Where does cross-entity logic live?

#### 4. Entity-Based Handlers (Preferred)
```typescript
const redBook = {
  on: {
    pushed: function(event) {
      // React to being pushed
    }
  }
}
```

### The Core Realization

We designed a system that emits events but provides no way to handle them. As stated in our discussion:

> "Events without handlers are just logs."

The original design assumption that events were only for "information reasons" was incorrect. Interactive fiction requires complex game logic triggered by player actions. Events aren't just reports - they're the mechanism for game logic.

## Decision

We will add an event handler system with two levels:

### 1. Entity-Level Handlers (Primary)
Entities can define handlers for events that affect them directly:

```typescript
interface IFEntity {
  // ... existing properties
  on?: {
    [eventType: string]: (event: EventData) => EventResult | void;
  };
}
```

### 2. Story-Level Handlers (Daemons)
Stories can define global handlers for complex, multi-entity logic:

```typescript
interface Story {
  on(eventType: string, handler: (event: EventData) => void): void;
  off(eventType: string, handler: Function): void;
}
```

### Event Types

Events will be namespaced and typed:

```typescript
// Action events (from player actions)
'if.event.pushed'      // Something was pushed
'if.event.pulled'      // Something was pulled
'if.event.taken'       // Something was taken
'if.event.opened'      // Something was opened

// Story events (custom, author-defined)
'story.puzzle_solved'  // Custom puzzle completed
'story.secret_revealed' // Secret discovered

// System events
'turn.started'         // Turn began
'turn.ended'           // Turn completed
'game.started'         // Game started
'game.ended'           // Game over
```

### Execution Order

1. Action executes (e.g., pushing)
2. Action emits event(s)
3. Entity handlers fire first (if defined)
4. Story handlers fire second
5. UI/logging handlers fire last

## Implementation

### Phase 1: Entity Handlers

```typescript
// In IFEntity
export interface IFEntity {
  id: string;
  traits: Map<TraitType, Trait>;
  on?: EventHandlers;
}

export interface EventHandlers {
  pushed?: (event: PushedEvent) => EventResult | void;
  pulled?: (event: PulledEvent) => EventResult | void;
  taken?: (event: TakenEvent) => EventResult | void;
  opened?: (event: OpenedEvent) => EventResult | void;
  // ... other action events
}

export interface EventResult {
  message?: string;        // Message to display
  events?: ISemanticEvent[]; // Additional domain events to record
}
```

### Phase 2: Story Handlers

```typescript
// In Story
export class Story {
  private handlers = new Map<string, Set<EventHandler>>();
  
  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }
  
  processEvent(eventType: string, data: any): ISemanticEvent[] {
    const additionalEvents: ISemanticEvent[] = [];

    // First check entity handlers
    if (data.entity) {
      const entity = this.world.getEntity(data.entity);
      if (entity.on?.[eventType]) {
        const result = entity.on[eventType](data);
        if (result?.events) {
          additionalEvents.push(...result.events);
        }
      }
    }

    // Then story handlers
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        const result = handler(data);
        if (result?.events) {
          additionalEvents.push(...result.events);
        }
      });
    }

    return additionalEvents;
  }
}
```

### Phase 3: Action Integration

Actions will check for and execute entity handlers:

```typescript
// In pushing.ts
function execute(context: ActionContext): SemanticEvent[] {
  const target = context.command.directObject?.entity;
  
  // Do the push
  pushable.pushCount++;
  
  // Emit event
  const event = {
    type: 'if.event.pushed',
    entity: target.id,
    actor: context.player.id
  };
  
  // Entity might have a handler
  if (target.on?.pushed) {
    const result = target.on.pushed(event);
    if (result?.message) {
      // Use custom message
    }
  }
  
  // Emit for story handlers
  context.emit(event);
  
  return events;
}
```

## Examples

### Simple Entity Handler

```typescript
const redBook = story.createEntity({
  id: 'red-book',
  name: 'red leather book',
  on: {
    pushed: function(event) {
      const bookshelf = world.getEntity('bookshelf');
      bookshelf.open();
      world.addExit('library', 'north', 'secret-room');
      return { message: 'The bookshelf swings open!' };
    }
  }
});
```

### Multi-Entity Story Handler (Daemon)

```typescript
// Three statues puzzle
story.on('if.event.pushed', (event) => {
  const statues = ['statue-1', 'statue-2', 'statue-3'];
  if (statues.includes(event.entity)) {
    const allPushed = statues.every(id => 
      world.getEntity(id).getAttribute('pushed')
    );
    
    if (allPushed) {
      world.getEntity('vault-door').open();
      story.emit('story.puzzle_solved', { 
        puzzle: 'three-statues' 
      });
    }
  }
});
```

### Time-Based Daemon

```typescript
story.on('turn.ended', (event) => {
  // Torch burns out over time
  const torch = world.getEntity('torch');
  if (torch.getAttribute('lit')) {
    torch.decrementAttribute('fuel');
    if (torch.getAttribute('fuel') <= 0) {
      torch.extinguish();
      story.showMessage('The torch sputters and dies.');
    }
  }
});
```

## Consequences

### Positive

1. **Enables custom game logic** - Authors can implement any behavior
2. **Clean separation** - Actions handle mechanics, handlers handle story logic
3. **Natural patterns** - Entity handlers for direct reactions, story handlers for complex logic
4. **Composable** - Multiple handlers can react to same event
5. **Debuggable** - Can log all events and handlers
6. **No serialization issues** - Handlers are rebuilt when story loads, only state is saved

### Negative

1. **Breaking change** - Adds new required functionality
2. **Complexity** - Another system for authors to learn
3. **Performance** - Event handling overhead (likely minimal)
4. **Debugging** - Handler chains can be complex to trace

### Neutral

1. **Different from original design** - Moves away from pure fire-and-forget
2. **Similar to other IF systems** - Inform 7 has "rules", TADS has handlers

## Alternatives Considered

### Keep Fire-and-Forget Events
- Continue with events as pure information
- Put all logic in actions
- Problem: Actions become massive and unmaintainable

### ActionBehaviors Only
- Use ADR-051's behavior system for everything
- Problem: Can't handle author-specific cases
- Problem: Explosion of behavior classes

### Custom Handlers in Traits
- Store handlers as part of trait data
- Problem: Serialization complexity
- Problem: Splits logic from entity

## Migration Path

1. **Phase 1**: Add entity handler support (non-breaking)
2. **Phase 2**: Add story handler support (non-breaking)
3. **Phase 3**: Update actions to check handlers (non-breaking)
4. **Phase 4**: Migrate existing complex actions to use handlers
5. **Phase 5**: Simplify ActionBehaviors to only common patterns

## Supersedes

**ADR-051: ActionBehaviors** - The ActionBehavior pattern attempted to solve the custom logic problem by creating specialized behavior classes. However, we realized that in interactive fiction, virtually every pushable/pullable object needs custom, story-specific logic. There are no truly "generic" button pushes or lever pulls - each one does something specific in the story. Event handlers provide a simpler, more direct solution.

## Related ADRs

- ADR-051: ActionBehaviors (superseded by this ADR)
- ADR-023: Event system (original fire-and-forget design)
- ADR-106: Domain Events and Event Sourcing (clarifies that `if.event.*` are domain events - immutable records of "things that have already happened" - and handlers react to these facts)

## Notes

### Domain Events Clarification (See ADR-106)

The events that handlers react to (`if.event.pushed`, `if.event.taken`, etc.) are **domain events** - immutable records of completed actions. They are NOT traditional pub/sub events to be "fired and handled."

Handlers **react to facts** that have already occurred. A handler cannot prevent or undo a domain event - it can only cause additional consequences. For example, when `if.event.pulled` is recorded for a lever, a handler reacts by opening a door (a consequence), not by approving or denying the pull.

**Note:** The original design included `preventDefault` in `EventResult` to stop further handlers. This was never implemented and has been removed. Domain events are facts; handlers react to them but cannot prevent them.

This represents a fundamental shift in our architecture, acknowledging that interactive fiction requires complex game logic that must be triggered by events. The two-tier system (entity + story handlers) provides the right balance of encapsulation and flexibility.

The key insight from our discussion: "We designed a system that revolves around writing events, but we ignored the need to write code for such events."

This ADR addresses that gap.