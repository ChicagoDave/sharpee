# Stdlib Rearchitecture (June 2025)

## Description
In June 2025, the stdlib was completely rearchitected from an imperative mutation model to event-sourcing architecture. This was not a removal but a fundamental transformation.

## The Problem
The stdlib had evolved with a traditional MUD-style mental model where actions directly mutated state. This violated Sharpee's core event-driven design principles.

### Issues Found
- Actions using imperative mutations instead of returning events
- Two conflicting ActionContext interfaces
- Services making direct state changes
- Mix of Entity vs IFEntity types
- Actions trying to use non-existent methods (context.emit(), context.success())

## The Decision
Rather than fix 80+ files with wrong patterns, the decision was to:
1. **Preserve stdlib as requirements documentation** - The existing code documents what functionality needs to exist
2. **Create new event-driven packages** - Build proper event-sourcing implementations from scratch
3. **Maintain separation of concerns** - World model remains generic, doesn't know IF-specific events

## Implementation Strategy

### New Package Structure
- **@sharpee/actions** - Pure functions that validate conditions and return events
- **@sharpee/event-processor** - Applies events to world model through handlers
- **World-model updates** - Added event handler registration without IF knowledge

### Key Architectural Choices
1. **Registry Pattern** - World model has generic event handler registry
2. **Actions Never Mutate** - Actions are pure functions returning SemanticEvent[]
3. **Handlers Apply Changes** - Separate handlers registered to apply events
4. **Read-Only Context** - Actions get read-only view of world state

## What Changed

### Before (Imperative)
```typescript
// Old stdlib action
execute(command, context) {
  // Direct mutation!
  context.world.moveEntity(item.id, player.id);
  context.emit('taken', { item });
}
```

### After (Event-Sourcing)
```typescript
// New action
execute(command, context): SemanticEvent[] {
  // Validation only
  if (!context.canTake(item)) {
    return [createEvent(IFEvents.ACTION_FAILED, {...})];
  }
  // Return events, no mutations
  return [createEvent(IFEvents.TAKEN, {...})];
}

// Separate handler
handleTaken(event, world) {
  // Handler applies the change
  world.moveEntity(event.entities.target, event.entities.actor);
}
```

## Current State (June 2025)
- **Core** - Builds fine, IF-agnostic
- **World-model** - Has event-sourcing support
- **Actions** - New pure event-driven implementation
- **Event-processor** - Bridges events to world mutations
- **Stdlib** - Preserved as documentation (~200 TypeScript errors)

## Benefits
1. **True event-sourcing** - Complete audit trail, undo/redo capability
2. **Separation of concerns** - Actions validate, handlers mutate
3. **Extensibility** - Easy to add new events and handlers
4. **Type safety** - Clear contracts between layers
5. **Testing** - Pure functions are easy to test

## Lessons Learned
- Mental models matter - MUD-style thinking led to wrong architecture
- Better to rewrite than refactor when the foundation is wrong
- Event-sourcing requires discipline but provides better architecture
- Keep old code as documentation when doing major rewrites