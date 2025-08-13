# Plan: Remove ADR-051 (ActionBehaviors) and Implement ADR-052 (Event Handlers)

## Overview

This plan details the removal of the ActionBehavior system (ADR-051) and implementation of the Event Handler system (ADR-052).

## Phase 1: Remove ActionBehavior Implementation

### Files to Delete

```bash
# ActionBehavior core files
/packages/stdlib/src/action-behaviors/ActionBehavior.ts
/packages/stdlib/src/action-behaviors/ActionBehaviorRegistry.ts
/packages/stdlib/src/action-behaviors/types.ts
/packages/stdlib/src/action-behaviors/utils.ts
/packages/stdlib/src/action-behaviors/index.ts

# Pulling behaviors
/packages/stdlib/src/action-behaviors/pulling/
  - LeverPullBehavior.ts
  - CordPullBehavior.ts
  - AttachedPullBehavior.ts
  - HeavyPullBehavior.ts
  - DefaultPullBehavior.ts
  - index.ts

# Pushing behaviors (already partially removed)
/packages/stdlib/src/action-behaviors/pushing/
  - ButtonPushBehavior.ts
  - index.ts

# Test files
/packages/stdlib/tests/unit/action-behaviors/
  - All test files

# Documentation
/docs/architecture/action-behaviors-testing-guide.md
/docs/architecture/adrs/adr-051-action-behaviors.md (mark as superseded)
/docs/work/action-behaviors-implementation-checklist.md
```

### Files to Revert

```bash
# Revert pulling.ts to original (before behavior refactoring)
/packages/stdlib/src/actions/standard/pulling/pulling.ts
  - Restore from pulling-original.ts
  - Delete pulling-original.ts and pulling-refactored.ts

# Revert pushing.ts to original
/packages/stdlib/src/actions/standard/pushing/pushing.ts
  - Restore from pushing-original.ts
  - Delete pushing-original.ts
```

### Cleanup Tasks

1. Remove behavior registry imports from all actions
2. Remove `convertToEvents` utility usage
3. Remove any references to ActionBehavior in documentation
4. Update ADR-051 status to "Superseded"

## Phase 2: Implement Event Handler System

### Step 1: Extend IFEntity Interface

**File:** `/packages/world-model/src/entity/entity.ts`

```typescript
export interface EventHandler {
  (event: EventData): EventResult | void;
}

export interface EventResult {
  message?: string;        // Custom message to display
  preventDefault?: boolean; // Stop further handlers
}

export interface EntityEventHandlers {
  // Action events
  pushed?: EventHandler;
  pulled?: EventHandler;
  taken?: EventHandler;
  dropped?: EventHandler;
  opened?: EventHandler;
  closed?: EventHandler;
  examined?: EventHandler;
  // Add more as needed
}

export interface IFEntity {
  // ... existing properties
  on?: EntityEventHandlers;
}
```

### Step 2: Add Event System to Story/Engine

**File:** `/packages/engine/src/story.ts`

```typescript
export class Story {
  private eventHandlers = new Map<string, Set<EventHandler>>();
  
  /**
   * Register a story-level event handler
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
  }
  
  /**
   * Remove a story-level event handler
   */
  off(eventType: string, handler: EventHandler): void {
    this.eventHandlers.get(eventType)?.delete(handler);
  }
  
  /**
   * Emit an event (called by actions)
   */
  emit(eventType: string, data: EventData): void {
    // First check entity handlers
    if (data.entity && this.world.hasEntity(data.entity)) {
      const entity = this.world.getEntity(data.entity);
      const handler = entity.on?.[eventType.replace('if.event.', '')];
      if (handler) {
        const result = handler(data);
        if (result?.preventDefault) return;
      }
    }
    
    // Then story handlers
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(h => h(data));
    }
  }
}
```

### Step 3: Update ActionContext

**File:** `/packages/stdlib/src/actions/enhanced-types.ts`

```typescript
export interface ActionContext {
  // ... existing properties
  
  /**
   * Emit an event that can be handled by entity/story handlers
   */
  emit(eventType: string, data: EventData): void;
}
```

### Step 4: Modify Actions to Use Event Handlers

**Example:** `/packages/stdlib/src/actions/standard/pushing/pushing.ts`

```typescript
export const pushingAction: Action = {
  execute(context: ActionContext): SemanticEvent[] {
    const target = context.command.directObject?.entity;
    if (!target) {
      return [context.event('action.error', {
        actionId: this.id,
        messageId: 'no_target'
      })];
    }
    
    const pushable = target.get(TraitType.PUSHABLE) as PushableTrait;
    if (!pushable) {
      return [context.event('action.error', {
        actionId: this.id,
        messageId: 'not_pushable',
        params: { object: target.attributes.name }
      })];
    }
    
    // Update state
    pushable.pushCount = (pushable.pushCount || 0) + 1;
    
    // Prepare event data
    const eventData = {
      entity: target.id,
      actor: context.player.id,
      location: context.currentLocation.id,
      pushCount: pushable.pushCount
    };
    
    // Check for entity handler
    let customMessage: string | undefined;
    if (target.on?.pushed) {
      const result = target.on.pushed(eventData);
      customMessage = result?.message;
    }
    
    // Emit for story handlers
    context.emit('if.event.pushed', eventData);
    
    // Return events
    return [
      context.event('if.event.pushed', eventData),
      context.event('action.success', {
        actionId: this.id,
        messageId: customMessage || 'pushed_default',
        params: { object: target.attributes.name }
      })
    ];
  }
};
```

### Step 5: Create Helper Functions for Authors

**File:** `/packages/stdlib/src/helpers/event-helpers.ts`

```typescript
/**
 * Common event handler patterns
 */

export function revealsExit(
  fromRoom: string,
  direction: string,
  toRoom: string
): EventHandler {
  return (event) => {
    const world = event.world;
    const from = world.getEntity(fromRoom);
    const to = world.getEntity(toRoom);
    
    // Add exit
    from.exits[direction] = toRoom;
    // Add return exit
    const opposite = getOppositeDirection(direction);
    to.exits[opposite] = fromRoom;
    
    return {
      message: `A passage to the ${direction} is revealed!`
    };
  };
}

export function togglesDevice(deviceId: string): EventHandler {
  return (event) => {
    const device = event.world.getEntity(deviceId);
    const switchable = device.get(TraitType.SWITCHABLE);
    if (switchable) {
      switchable.isOn = !switchable.isOn;
      return {
        message: `The ${device.attributes.name} ${switchable.isOn ? 'turns on' : 'turns off'}.`
      };
    }
  };
}
```

## Phase 3: Testing

### Test Plan

1. **Unit Tests**
   - Test entity handler execution
   - Test story handler execution
   - Test preventDefault behavior
   - Test handler registration/removal

2. **Integration Tests**
   - Test pushing with entity handler
   - Test pulling with story handler
   - Test complex multi-entity scenarios
   - Test handler chains

3. **Story Tests**
   - Implement "push book reveals bookshelf" scenario
   - Implement "three statues" puzzle
   - Implement time-based torch daemon

### Example Test Story

```typescript
// Test: Push book to reveal passage
const story = new Story();

const library = story.createRoom({
  id: 'library',
  exits: { south: 'hallway' }
});

const secretRoom = story.createRoom({
  id: 'secret-room'
});

const redBook = story.createEntity({
  id: 'red-book',
  name: 'red book',
  location: 'library',
  traits: new Map([[TraitType.PUSHABLE, {}]]),
  on: {
    pushed: (event) => {
      event.world.addExit('library', 'north', 'secret-room');
      return { message: 'The bookshelf swings open!' };
    }
  }
});

// Test execution
const result = story.execute('push red book');
assert(result.message === 'The bookshelf swings open!');
assert(library.exits.north === 'secret-room');
```

## Phase 4: Documentation

### Documentation Updates

1. **Author Guide**: How to use event handlers
2. **API Reference**: Event types and handler signatures
3. **Examples**: Common patterns and solutions
4. **Migration Guide**: From ActionBehaviors to Event Handlers

### Example Documentation

```markdown
# Event Handlers Guide

## Entity Handlers

Attach custom logic directly to entities:

```typescript
const book = story.createEntity({
  on: {
    pushed: (event) => {
      // Your custom logic here
      return { message: 'Something happens!' };
    }
  }
});
```

## Story Handlers (Daemons)

Handle complex multi-entity logic:

```typescript
story.on('if.event.pushed', (event) => {
  // Check conditions across multiple entities
  // Implement puzzles and sequences
});

story.on('turn.ended', (event) => {
  // Time-based events
  // Resource depletion
});
```
```

## Timeline

### Week 1
- [ ] Remove ActionBehavior files
- [ ] Revert modified actions
- [ ] Update ADR-051 status

### Week 2
- [ ] Implement IFEntity.on interface
- [ ] Implement Story event system
- [ ] Update ActionContext

### Week 3
- [ ] Modify pushing action
- [ ] Modify pulling action
- [ ] Modify other actions as needed

### Week 4
- [ ] Write tests
- [ ] Write documentation
- [ ] Test with real stories

## Success Criteria

1. All ActionBehavior code removed
2. Event handlers working for entities and story
3. Test stories working with new system
4. Documentation complete
5. No performance regression

## Risks

1. **Breaking changes** - Mitigate with thorough testing
2. **Performance** - Profile event handling overhead
3. **Complexity** - Provide good examples and documentation

## Notes

This change simplifies the architecture significantly by:
- Removing the complex ActionBehavior class hierarchy
- Providing direct, intuitive event handling
- Giving authors full control over game logic
- Maintaining clean separation between mechanics (actions) and logic (handlers)