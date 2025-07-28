# World Model Testing Plan

## Overview
This document outlines the comprehensive testing strategy for the `@sharpee/world-model` package. The world-model is the heart of the IF engine, managing entities, traits, behaviors, and the spatial/visibility systems.

## Testing Philosophy
- **Unit tests focus on logic, not types** - We test behavior and state changes, not TypeScript interfaces
- **Each trait gets its own test suite** - Traits are the core building blocks
- **Integration tests verify trait interactions** - Many IF behaviors emerge from trait combinations
- **World model tests verify spatial relationships** - The spatial index and visibility system are critical
- **Event-driven behavior is tested through scenarios** - We verify that events propagate correctly

## Test Structure

```
tests/
├── setup.ts                    # Jest setup and test helpers
├── unit/
│   ├── entities/
│   │   ├── if-entity.test.ts
│   │   └── entity-store.test.ts
│   ├── traits/
│   │   ├── identity.test.ts
│   │   ├── container.test.ts
│   │   ├── room.test.ts
│   │   ├── openable.test.ts
│   │   ├── lockable.test.ts
│   │   ├── readable.test.ts
│   │   ├── light-source.test.ts
│   │   ├── exit.test.ts
│   │   ├── entry.test.ts
│   │   ├── scenery.test.ts
│   │   ├── supporter.test.ts
│   │   ├── switchable.test.ts
│   │   ├── wearable.test.ts
│   │   ├── edible.test.ts
│   │   ├── door.test.ts
│   │   └── actor.test.ts
│   ├── behaviors/
│   │   └── behavior.test.ts
│   ├── world/
│   │   ├── world-model.test.ts
│   │   ├── spatial-index.test.ts
│   │   └── visibility-behavior.test.ts
│   ├── services/
│   │   ├── world-model-service.test.ts
│   │   └── scope-service.test.ts
│   └── extensions/
│       ├── registry.test.ts
│       └── loader.test.ts
├── integration/
│   ├── trait-combinations.test.ts
│   ├── container-hierarchies.test.ts
│   ├── room-navigation.test.ts
│   ├── door-mechanics.test.ts
│   └── visibility-chains.test.ts
└── fixtures/
    ├── test-world.ts
    ├── test-entities.ts
    └── test-behaviors.ts
```

## Testing Priorities

### Phase 1: Core Entity System (Week 1)
1. **IFEntity** - The base entity class
   - Property management
   - Trait attachment/detachment
   - Behavior execution
   - Event emission

2. **EntityStore** - Entity management
   - CRUD operations
   - Query capabilities
   - ID generation
   - Reference integrity

### Phase 2: Essential Traits (Week 1-2)
Priority order based on dependencies:

1. **Identity Trait** - Names and descriptions
   - Basic properties
   - Article handling ("a", "an", "the")
   - Plural forms

2. **Container Trait** - Core spatial relationship
   - Adding/removing contents
   - Capacity limits
   - Open/closed states
   - Visibility of contents

3. **Room Trait** - Special container for locations
   - Exit management
   - Light levels
   - First visit tracking

4. **Exit/Entry Traits** - Navigation
   - Direction mapping
   - Bidirectional connections
   - Travel permissions

### Phase 3: Interactive Traits (Week 2)
1. **Openable/Lockable** - State management
   - Open/close mechanics
   - Lock/unlock with keys
   - State persistence

2. **Switchable** - Binary states
   - On/off mechanics
   - State change events

3. **Door Trait** - Complex interaction
   - Combines openable/lockable
   - Bidirectional state sync
   - Room connections

### Phase 4: World Systems (Week 3)
1. **WorldModel** - The central registry
   - Entity registration
   - Spatial queries
   - Global state

2. **SpatialIndex** - Location tracking
   - Parent-child relationships
   - Path finding
   - Proximity queries

3. **VisibilityBehavior** - What can be seen
   - Line of sight
   - Container visibility
   - Light requirements

### Phase 5: Advanced Features (Week 3-4)
1. **Actor Trait** - NPCs and player
   - Inventory management
   - Wearing items
   - Actions

2. **Complex Behaviors**
   - Trait combinations
   - Event chains
   - State machines

## Key Test Scenarios

### 1. Container Hierarchy
```typescript
// Test: Nested containers maintain proper relationships
// box -> bag -> coin
// Moving box should move all contents
```

### 2. Room Navigation
```typescript
// Test: Bidirectional exits work correctly
// kitchen <-> hallway <-> bedroom
// Lock/unlock doors between rooms
```

### 3. Visibility Chains
```typescript
// Test: Can see through open containers
// player -> room -> open box -> coin (visible)
// player -> room -> closed box -> coin (not visible)
```

### 4. Light Propagation
```typescript
// Test: Light sources illuminate containers
// dark room + closed box with lamp inside = dark
// dark room + open box with lamp inside = lit
```

### 5. State Synchronization
```typescript
// Test: Doors maintain synchronized state
// Open door from kitchen -> door is open from hallway too
```

## Test Utilities

### Fixture Factories
```typescript
// tests/fixtures/test-entities.ts
export const createTestRoom = (name: string): IFEntity
export const createTestContainer = (name: string): IFEntity
export const createTestActor = (name: string): IFEntity
```

### Custom Matchers
```typescript
// tests/setup.ts
expect.extend({
  toBeInLocation(entity, location) { ... }
  toBeVisible(entity) { ... }
  toHaveTrait(entity, traitName) { ... }
})
```

### Test Helpers
```typescript
// tests/helpers/world-helpers.ts
export const setupTestWorld = (): WorldModel
export const moveEntity = (entity, destination): void
export const assertVisibility = (observer, target): void
```

## Coverage Goals
- **Unit test coverage**: 90%+ for all trait behaviors
- **Integration coverage**: 80%+ for trait interactions
- **Critical paths**: 100% for spatial index and visibility

## Performance Testing
- Large world creation (1000+ entities)
- Deep nesting scenarios (10+ levels)
- Visibility calculation performance
- Event propagation efficiency

## Edge Cases to Test
1. Circular containment prevention
2. Null/undefined handling
3. Maximum capacity limits
4. Deeply nested visibility
5. Orphaned entities
6. Invalid state transitions
7. Race conditions in event handling

## Testing Commands
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test suite
pnpm test -- identity.test.ts

# Run in watch mode
pnpm test:watch

# Run integration tests only
pnpm test -- integration/
```

## Success Criteria
- All traits have comprehensive unit tests
- Key interaction patterns have integration tests
- Performance benchmarks are established
- Edge cases are documented and tested
- Test helpers make writing new tests easy
- Coverage meets targets
- Tests run quickly (<30 seconds for full suite)

## Next Steps
1. Set up Jest configuration for the package
2. Create test helpers and fixtures
3. Start with IFEntity and EntityStore tests
4. Work through traits in priority order
5. Add integration tests as patterns emerge
