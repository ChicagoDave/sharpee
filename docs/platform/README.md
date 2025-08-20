# Platform Development Guide

> ⚠️ **ALPHA SOFTWARE**: The platform is under active development. APIs are subject to change, and this documentation may not reflect the latest implementation.

Welcome to Sharpee platform development! This guide covers contributing to the core engine, world model, and standard library.

## Overview

Platform development involves working on Sharpee's foundational systems:

- **Core Engine** - Event system, command processing, turn management
- **World Model** - Entities, traits, relationships, capabilities
- **Standard Library** - Common actions, parser, validator
- **Language System** - Localization and text generation

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm 8+
- TypeScript knowledge
- Understanding of event-driven architecture
- Familiarity with interactive fiction concepts

### Setup

```bash
# Clone and install
git clone https://github.com/your-org/sharpee.git
cd sharpee
pnpm install

# Build core packages
pnpm build

# Run tests to verify setup
pnpm test
```

## Key Concepts

### Event-Driven Architecture

All state changes happen through events:

```typescript
// Actions return events
const events = action.execute(command, context);

// World model applies events
events.forEach(event => world.applyEvent(event));

// Text service processes events after turn
textService.processEvents(events, world);
```

### Capability System

Game state is divided into:

1. **Entity Model** - Physical world (what is where)
2. **Capabilities** - Abstract state (scores, saves, preferences)

```typescript
// Register a capability
world.registerCapability('scoring', {
  schema: ScoringCapabilitySchema
});

// Update capability data
world.updateCapability('scoring', {
  scoreValue: 10
});
```

## Development Areas

### 1. Core Engine (`packages/core`)

The event system and fundamental types.

**Key Files:**
- `src/events/` - Event types and creation
- `src/types/` - Core type definitions
- `src/utils/` - Utility functions

**Common Tasks:**
- Add new event types
- Enhance event metadata
- Improve error handling

### 2. World Model (`packages/world-model`)

Entity management and game world representation.

**Key Files:**
- `src/world/WorldModel.ts` - Main world interface
- `src/entities/` - Entity system
- `src/traits/` - Trait definitions
- `src/world/capabilities.ts` - Capability system

**Common Tasks:**
- Add new traits
- Enhance entity queries
- Improve spatial indexing
- Add capability features

### 3. Standard Library (`packages/stdlib`)

Common actions and game mechanics.

**Key Files:**
- `src/actions/standard/` - Action implementations
- `src/parser/` - Command parser
- `src/validation/` - Command validator
- `src/capabilities/` - Standard capabilities

**Common Tasks:**
- Implement new actions
- Improve parser accuracy
- Add capability schemas
- Enhance validation logic

### 4. Language System (`packages/lang-en`)

Text generation and localization.

**Key Files:**
- `src/templates/` - Message templates
- `src/formatters/` - Text formatters
- `src/grammar/` - Grammar rules

**Common Tasks:**
- Add message templates
- Improve text variety
- Handle edge cases
- Support new events

## Development Workflow

### 1. Choose an Issue

Browse [open issues](https://github.com/your-org/sharpee/issues) labeled:
- `good first issue` - Great for newcomers
- `platform` - Core platform work
- `help wanted` - Community contributions welcome

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Make Changes

Follow the coding standards:
- Use TypeScript strict mode
- Write comprehensive tests
- Document public APIs
- Follow event-driven patterns

### 4. Test Your Changes

```bash
# Run tests for your package
pnpm --filter @sharpee/your-package test

# Run all tests
pnpm test

# Check types
pnpm type-check
```

### 5. Submit a Pull Request

- Describe your changes clearly
- Reference any related issues
- Include test results
- Update documentation

## Architecture Guidelines

### Actions Are Pure Functions

```typescript
// ✅ Good - Returns events
execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[] {
  if (!context.canTake(item)) {
    return [createEvent(IFEvents.ACTION_FAILED, {
      reason: 'not_takeable'
    })];
  }
  
  return [createEvent(IFEvents.TAKEN, {
    item: item.id
  })];
}

// ❌ Bad - Mutates state directly
execute(command: ValidatedCommand, context: ActionContext): void {
  world.moveEntity(item.id, player.id); // NO!
}
```

### Use Capabilities for Non-Physical State

```typescript
// ✅ Good - Score in capability
const score = world.getCapability('scoring')?.scoreValue;

// ❌ Bad - Score on player entity
const score = player.attributes.score; // NO!
```

### Messages Use Keys, Not Strings

```typescript
// ✅ Good - Message key
return [createEvent(IFEvents.MESSAGE, {
  messageKey: 'inventory.empty'
})];

// ❌ Bad - Hardcoded string
return [createEvent(IFEvents.MESSAGE, {
  text: "You're not carrying anything." // NO!
})];
```

## Testing

### Unit Tests

Test individual components:

```typescript
describe('TakeAction', () => {
  it('should fail when item is scenery', () => {
    const item = createMockEntity('rock', 'scenery');
    const events = takeAction.execute(command, context);
    
    expect(events[0].type).toBe(IFEvents.ACTION_FAILED);
    expect(events[0].data.reason).toBe('is_scenery');
  });
});
```

### Integration Tests

Test component interactions:

```typescript
it('should update inventory after taking item', () => {
  const world = new WorldModel();
  const events = takeAction.execute(command, context);
  
  events.forEach(e => world.applyEvent(e));
  
  expect(world.getLocation(item.id)).toBe(player.id);
});
```

## Common Patterns

### Adding a New Action

1. Create action file in `stdlib/src/actions/standard/`
2. Implement `ActionExecutor` interface
3. Register in action registry
4. Add vocabulary entries
5. Create tests
6. Update documentation

### Adding a New Trait

1. Create trait directory in `world-model/src/traits/`
2. Define trait interface
3. Implement trait behavior
4. Register trait type
5. Add to trait factory
6. Create tests

### Adding a Capability

1. Define schema in `stdlib/src/capabilities/`
2. Create data interface
3. Update actions to use capability
4. Add registration helper
5. Update tests
6. Document usage

## Resources

- [Architecture Decision Records](../architecture/adrs/)
- [API Documentation](../api/README.md)
- [Contributing Guide](../../CONTRIBUTING.md)

## Getting Help

- Open an issue for bugs
- Start a discussion for features
- Join our Discord (coming soon)
- Check existing docs and ADRs

---

Happy platform hacking! 🚀
