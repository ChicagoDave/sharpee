# Core Layer Unit Testing Plan

## Overview

This document outlines the unit testing strategy for the Core layer of the IF Framework. The goal is to **verify** the existing architecture works as designed, not to change it. All test results should be discussed before any modifications are made.

## Testing Philosophy

1. **Verification, Not Modification**: Tests verify the current behavior is correct
2. **Layer Isolation**: Core tests should not depend on Standard Library or Engine
3. **Event-Driven Testing**: Focus on event flow and state changes
4. **Query-able World Model**: Verify data relationships and accessibility

## Test Structure

```
/packages/core/tests/
├── setup.test.ts           # Test harness and utilities
├── events/
│   ├── event-bus.test.ts   # Event dispatching and handling
│   └── event-types.test.ts  # Event type system
├── entities/
│   ├── entity.test.ts       # Base entity functionality
│   ├── relations.test.ts    # Entity relationships
│   └── validation.test.ts   # Entity validation rules
├── state/
│   ├── world-state.test.ts  # World state management
│   ├── queries.test.ts      # State query system
│   └── changes.test.ts      # State change tracking
├── actions/
│   ├── action-base.test.ts  # Base action functionality
│   ├── execution.test.ts    # Action execution flow
│   └── results.test.ts      # Action result handling
└── integration/
    ├── turn-flow.test.ts    # Complete turn execution
    └── event-flow.test.ts   # Event propagation
```

## Test Categories

### 1. Event System Tests

**Purpose**: Verify the event bus correctly dispatches and handles events

**Key Tests**:
- Event registration and deregistration
- Event dispatching with correct data
- Multiple handler execution order
- Event cancellation
- Error handling in event handlers

**Example Test Cases**:
```typescript
// event-bus.test.ts
describe('EventBus', () => {
  it('should dispatch events to registered handlers', () => {
    // Verify handlers receive correct event data
  });
  
  it('should handle multiple handlers for same event', () => {
    // Verify execution order and data isolation
  });
  
  it('should allow event cancellation', () => {
    // Verify cancelled events stop propagation
  });
});
```

### 2. Entity System Tests

**Purpose**: Verify entities maintain consistent state and relationships

**Key Tests**:
- Entity creation with required properties
- Property validation
- Relationship establishment (containment, connection)
- Entity queries by type, property, relationship
- Entity destruction and cleanup

**Example Test Cases**:
```typescript
// entity.test.ts
describe('Entity', () => {
  it('should create entity with valid properties', () => {
    // Verify required properties are set
  });
  
  it('should validate property types', () => {
    // Verify type checking works
  });
  
  it('should maintain bidirectional relationships', () => {
    // Verify parent/child consistency
  });
});
```

### 3. World State Tests

**Purpose**: Verify the world state maintains consistency

**Key Tests**:
- State initialization
- Entity registration/deregistration
- Query system functionality
- State snapshots and rollback
- Concurrent modification handling

**Example Test Cases**:
```typescript
// world-state.test.ts
describe('WorldState', () => {
  it('should register entities correctly', () => {
    // Verify entity is queryable after registration
  });
  
  it('should support complex queries', () => {
    // Verify query by type, property, relationship
  });
  
  it('should maintain referential integrity', () => {
    // Verify no dangling references
  });
});
```

### 4. Action System Tests

**Purpose**: Verify actions execute correctly and produce expected results

**Key Tests**:
- Action validation
- Precondition checking
- State modification
- Result generation
- Error handling

**Example Test Cases**:
```typescript
// action-base.test.ts
describe('Action', () => {
  it('should validate preconditions', () => {
    // Verify action fails with invalid state
  });
  
  it('should modify state correctly', () => {
    // Verify expected state changes
  });
  
  it('should generate appropriate results', () => {
    // Verify result structure and data
  });
});
```

### 5. Integration Tests

**Purpose**: Verify complete flows work as designed

**Key Tests**:
- Complete turn execution
- Event flow through system
- State consistency after complex operations
- Error recovery

**Example Test Cases**:
```typescript
// turn-flow.test.ts
describe('Turn Flow', () => {
  it('should execute complete turn', () => {
    // Action → Events → State Changes → Results
  });
  
  it('should maintain consistency through turn', () => {
    // Verify no partial states
  });
});
```

## Test Utilities

### Mock Helpers
```typescript
// setup.test.ts
export function createTestEntity(type: string, props: any) {
  // Helper to create entities for testing
}

export function createTestWorld() {
  // Helper to create clean world state
}

export function captureEvents() {
  // Helper to capture dispatched events
}
```

### Assertion Helpers
```typescript
export function assertEntityState(entity: Entity, expected: any) {
  // Custom assertions for entity state
}

export function assertEventDispatched(eventType: string, data: any) {
  // Custom assertions for events
}
```

## Testing Guidelines

### DO:
- Write tests that verify current behavior
- Use descriptive test names
- Test edge cases and error conditions
- Keep tests focused on single functionality
- Use appropriate setup/teardown

### DON'T:
- Don't modify core functionality based on test failures
- Don't test implementation details
- Don't create dependencies between tests
- Don't test Standard Library or Engine functionality

## Test Data

### Minimal Test Entities
```typescript
const testRoom = {
  type: 'location',
  id: 'test-room',
  properties: {
    name: 'Test Room',
    description: 'A simple test room'
  }
};

const testItem = {
  type: 'thing',
  id: 'test-item',
  properties: {
    name: 'Test Item',
    portable: true
  }
};
```

## Execution Strategy

1. **Phase 1**: Event System Tests
   - Verify event bus functionality
   - Ensure event types work correctly

2. **Phase 2**: Entity System Tests
   - Verify entity creation and validation
   - Test relationship management

3. **Phase 3**: State Management Tests
   - Verify world state consistency
   - Test query system

4. **Phase 4**: Action System Tests
   - Verify action execution
   - Test result generation

5. **Phase 5**: Integration Tests
   - Test complete flows
   - Verify system consistency

## Success Criteria

- All tests pass without modifying core functionality
- Tests provide clear documentation of expected behavior
- Edge cases are identified and verified
- Test coverage includes all critical paths

## Next Steps

1. Review this plan and discuss any concerns
2. Set up test infrastructure (Jest/Vitest configuration)
3. Begin with Phase 1 (Event System Tests)
4. Review results before proceeding to next phase
