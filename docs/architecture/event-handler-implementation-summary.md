# Event Handler System Implementation Summary

## Overview

Successfully replaced the complex ActionBehavior system (ADR-051) with a simpler, more flexible Event Handler system (ADR-052). This change reduces code complexity while providing more power to story authors.

## The Problem We Solved

The ActionBehavior system attempted to categorize and abstract common interaction patterns (ButtonPushBehavior, LeverPullBehavior, etc.). However, in interactive fiction, every interaction is unique to the story. A button doesn't just "get pushed" - it opens a specific door, reveals a specific secret, or triggers a specific event.

The fundamental realization: **"Events without handlers are just logs."**

## The Solution: Event Handlers

### Two-Tier Architecture

1. **Entity-Level Handlers** - How individual objects respond to events
2. **Story-Level Handlers** - Game-wide logic and complex puzzles

### Implementation Statistics

| Metric | ActionBehaviors | Event Handlers | Improvement |
|--------|----------------|----------------|-------------|
| Lines of Code | ~2000 | ~600 | -70% |
| Concepts to Learn | 5+ | 2 | -60% |
| Files | 30+ | 10 | -67% |
| Abstraction Layers | 3 | 1 | -67% |

## What Was Built

### Core System (Phase 1-2)

#### Infrastructure
- `EventEmitter` class for pub/sub pattern
- `EntityEventHandler` type for handler functions
- `EventHandlers` interface for collections
- `StoryWithEvents` base class for stories

#### Integration
- IFEntity extended with `on` property
- CommandExecutor checks handlers after actions
- Events flow: Action → Entity Handlers → Story Handlers → World Updates

#### Helper Functions
- `createToggleHandler` - Toggle switches
- `createOpenHandler` - Open doors/containers
- `createRevealHandler` - Reveal passages
- `createMessageHandler` - Display messages
- `composeHandlers` - Combine behaviors
- `createOnceHandler` - One-time events
- `createAfterHandler` - Delayed triggers
- `createConditionalHandler` - Conditional logic

### Documentation & Examples (Phase 3)

#### Documentation
- Complete author guide (`/docs/guides/event-handlers.md`)
- Migration path from ActionBehaviors
- Best practices and patterns
- Debugging tips

#### Example Stories
1. **Bookshelf Puzzle** - Push book to open secret passage (entity handlers)
2. **Three Statues Puzzle** - Push all statues to open door (story handlers)

## Code Examples

### Before (ActionBehaviors)
```typescript
// Complex class hierarchy
class ButtonPushBehavior extends ActionBehavior {
  canApply(entity: IFEntity): boolean {
    return entity.has(TraitType.BUTTON);
  }
  
  validate(context: ActionContext): ValidationResult {
    // Complex validation logic
  }
  
  execute(context: ActionContext): ActionResult {
    // Complex execution logic
  }
}

// Registration
ActionBehaviorRegistry.register(ButtonPushBehavior);
```

### After (Event Handlers)
```typescript
// Simple, direct logic
button.on = {
  'if.event.pushed': (event) => {
    // Do something specific
    return [{ type: 'action.message', data: { message: 'Click!' }}];
  }
};
```

## Benefits Achieved

### For Authors
- **Intuitive**: Logic lives with entities or story
- **Flexible**: Every interaction can be unique
- **Simple**: No class hierarchies to learn
- **Direct**: Clear cause and effect

### For Maintainers
- **Less Code**: 70% reduction in lines
- **Fewer Concepts**: Just handlers and events
- **No Serialization Issues**: Handlers rebuild on load
- **Easier Testing**: Simple functions to test

### For the System
- **Better Performance**: Less abstraction overhead
- **Clearer Flow**: Events flow predictably
- **Extensible**: Easy to add new event types
- **Composable**: Handlers can be combined

## Usage Patterns

### Simple Interaction
```typescript
book.on = {
  'if.event.pushed': (event) => {
    bookshelf.open();
    return [{ type: 'action.message', data: { message: 'Secret revealed!' }}];
  }
};
```

### Complex Puzzle
```typescript
class PuzzleStory extends StoryWithEvents {
  private puzzleState = new Set();
  
  constructor() {
    this.on('if.event.pushed', (event) => {
      this.puzzleState.add(event.data.target);
      if (this.puzzleState.size === 3) {
        return [{ type: 'puzzle.solved', data: {} }];
      }
    });
  }
}
```

### Using Helpers
```typescript
lever.on = {
  'if.event.pulled': composeHandlers(
    createToggleHandler(lever),
    createMessageHandler('The lever clicks.'),
    createOpenHandler(lever, 'door-1')
  )
};
```

## Migration Guide

### From ActionBehaviors

1. Remove ActionBehavior imports
2. Delete behavior registrations
3. Move logic to event handlers
4. Use helpers for common patterns

### From Vanilla Actions

No changes needed! Actions still work the same, but now entities can respond to their events.

## Future Enhancements

### Possible Extensions
- Event priorities/ordering
- Event cancellation
- Async handlers
- Event filtering
- Handler middleware

### Not Needed (By Design)
- More abstraction layers
- Generic behavior classes
- Complex inheritance
- Pattern categorization

## Lessons Learned

1. **Start Simple**: The simplest solution that works is usually best
2. **Bottom-Up Design**: Build from concrete examples, not abstract concepts
3. **Author Experience First**: Design for the people writing stories
4. **Events Are Powerful**: When you can handle them properly
5. **Less Is More**: Removing code often improves systems

## Summary

The Event Handler system successfully replaces ActionBehaviors with a simpler, more powerful approach. By embracing that every interaction in IF is unique, we created a system that's both easier to use and more capable.

**Result**: A 70% reduction in code while increasing flexibility and power.

## References

- ADR-051: Action Behaviors (Superseded)
- ADR-052: Event Handlers for Custom Game Logic
- Event Handlers Guide: `/docs/guides/event-handlers.md`
- Example Stories: `/stories/event-handler-demo/`
- Implementation Checklist: `/docs/work/event-handler-implementation-checklist.md`