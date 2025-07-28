# World Model Tests

This directory contains all unit and integration tests for the `@sharpee/world-model` package.

## Overview

The world-model is the heart of the Sharpee IF engine, managing:
- **Entities**: Game objects with properties and behaviors
- **Traits**: Composable behaviors (container, openable, etc.)
- **Spatial Relationships**: What contains what, visibility
- **World State**: Global registry and queries

## Test Organization

```
tests/
├── setup.ts                    # Jest configuration and custom matchers
├── unit/                       # Unit tests for individual components
│   ├── entities/              # Core entity system
│   ├── traits/                # Individual trait behaviors
│   ├── behaviors/             # Behavior system
│   ├── world/                 # World model and spatial index
│   ├── services/              # Service layer
│   └── extensions/            # Extension system
├── integration/               # Tests for component interactions
│   ├── trait-combinations.test.ts
│   ├── container-hierarchies.test.ts
│   └── room-navigation.test.ts
└── fixtures/                  # Reusable test data and helpers
    ├── test-world.ts
    ├── test-entities.ts
    └── test-behaviors.ts
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run in watch mode (recommended during development)
pnpm test:watch

# Run with coverage report
pnpm test:coverage

# Run specific test file
pnpm test -- container.test.ts

# Run tests matching a pattern
pnpm test -- --testNamePattern="should add item"
```

## Writing Tests

### Basic Test Structure
```typescript
import { IFEntity } from '@/entities';
import { ContainerTrait } from '@/traits/container';

describe('ContainerTrait', () => {
  let container: IFEntity;
  
  beforeEach(() => {
    container = new IFEntity('box');
    container.addTrait(new ContainerTrait());
  });
  
  it('should add items to contents', () => {
    const item = new IFEntity('coin');
    container.traits.container.addItem(item);
    
    expect(container.traits.container.contents).toContain(item);
  });
});
```

### Using Test Fixtures
```typescript
import { createTestRoom, createTestContainer } from '../fixtures/test-entities';

describe('Room Navigation', () => {
  it('should connect rooms with exits', () => {
    const kitchen = createTestRoom('kitchen');
    const hallway = createTestRoom('hallway');
    
    kitchen.connectTo(hallway, 'north');
    
    expect(kitchen.getExit('north')).toBe(hallway);
    expect(hallway.getExit('south')).toBe(kitchen);
  });
});
```

### Custom Matchers
```typescript
// Available custom matchers (defined in setup.ts)
expect(entity).toBeInLocation(room);
expect(entity).toBeVisible();
expect(entity).toHaveTrait('container');
expect(container).toContainEntity(item);
```

## Test Categories

### 1. Entity Tests
- Property management
- Trait composition
- Event emission
- Lifecycle

### 2. Trait Tests
Each trait has its own test suite covering:
- State management
- Behavior execution
- Event handling
- Edge cases

### 3. Integration Tests
- Trait combinations (e.g., lockable containers)
- Spatial hierarchies
- Visibility chains
- Navigation paths

### 4. World System Tests
- Entity registration
- Spatial queries
- Global state management
- Performance

## Coverage Goals

We aim for:
- **90%** unit test coverage
- **80%** integration test coverage
- **100%** coverage of critical paths (spatial index, visibility)

Check current coverage:
```bash
pnpm test:coverage
# Open coverage/index.html in browser for detailed report
```

## Best Practices

1. **Test behavior, not implementation**
   - Focus on what the code does, not how

2. **Use descriptive test names**
   - `it('should prevent adding items when container is full')`

3. **Keep tests isolated**
   - Each test should be independent
   - Use beforeEach for setup

4. **Test edge cases**
   - Null/undefined inputs
   - Circular references
   - Maximum limits

5. **Use fixtures for complex setup**
   - Reusable test objects
   - Consistent test data

## Debugging Tests

```bash
# Run tests with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Run single test with verbose output
pnpm test -- --verbose container.test.ts

# Show individual test timing
pnpm test -- --verbose --testTimeout=50000
```

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure all tests pass
3. Check coverage hasn't decreased
4. Update fixtures if needed
5. Document any new patterns

## Common Issues

### Module Resolution
If you see "Cannot find module" errors:
- Check tsconfig.test.json paths
- Ensure dependencies are installed
- Verify import paths use '@/' prefix

### Timeout Errors
For async tests that timeout:
```typescript
it('should handle async operation', async () => {
  await someAsyncOperation();
}, 10000); // Increase timeout to 10 seconds
```

### Memory Issues
For tests with many entities:
```typescript
afterEach(() => {
  // Clean up to prevent memory leaks
  world.clear();
});
```
