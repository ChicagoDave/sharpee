# Blood Magic Extension Tests

## Overview
The blood-magic extension has comprehensive unit tests that verify functionality without requiring full story registration or engine integration.

## Test Structure

### Trait Tests (`tests/traits/`)
Tests for the core trait definitions and their helper functions:

- **mirrorTrait.test.ts** (14 tests) ✅
  - Mirror creation with default/custom properties
  - Travel ability updates based on state
  - Connection management
  - Signature tracking and history
  
- **bloodMoonTrait.test.ts** (8 tests) ✅
  - Moon trait creation
  - Invisibility activation/deactivation
  - Time tracking for invisibility sessions
  
- **bloodSilverTrait.test.ts** (12 tests) ✅
  - Silver trait creation
  - Mirror sensing based on range
  - Travel recording
  - Connection management

### Behavior Tests (`tests/behaviors/`)
Tests for behavior logic that operates on entities with traits:

- **mirrorBehavior.test.ts** (19 tests) ✅
  - Entry/exit validation based on mirror state
  - View quality determination
  - Mirror connection establishment
  - Usage recording and signature management

### Action Tests (`tests/actions/`)
Tests for action validation and execution:

- **touchingMirror.test.ts** (9 tests) ✅
  - Action metadata and configuration
  - Validation with various inputs
  - Event generation for different scenarios
  - Silver carrier connection detection

## Running Tests

```bash
# Run all blood-magic tests
pnpm test tests/

# Run specific test suites
pnpm test mirrorTrait
pnpm test bloodMoonTrait
pnpm test bloodSilverTrait
pnpm test mirrorBehavior
pnpm test touchingMirror

# Run tests by directory
pnpm test tests/traits/
pnpm test tests/behaviors/
pnpm test tests/actions/
```

## Test Results Summary

Total tests created: **62 tests**
All tests passing: **✅ 62/62**

### By Category:
- Traits: 34 tests ✅
- Behaviors: 19 tests ✅
- Actions: 9 tests ✅

## Key Testing Patterns

### 1. Mock Entities
Tests use lightweight mock entities instead of full world model entities:
```typescript
function createMockEntity(id: string, traits: Record<string, any> = {}): IFEntity {
  return {
    id,
    getTrait: vi.fn((traitType: string) => traits[traitType]),
  } as unknown as IFEntity;
}
```

### 2. Isolated Trait Testing
Traits are tested independently without needing the full engine:
```typescript
const mirror = createMirrorTrait({ isBroken: true });
expect(mirror.canEnter).toBe(false);
```

### 3. Behavior Testing with Mocks
Behaviors are tested using mock entities with appropriate traits:
```typescript
const mirrorTrait = createMirrorTrait();
const entity = createMockEntity('mirror1', { mirror: mirrorTrait });
expect(MirrorBehavior.canEnter(entity)).toBe(false); // No connections
```

### 4. Action Testing
Actions are tested with minimal context:
```typescript
const context: ActionContext = {
  command: { verb: 'touch', directObject: { entity: mirror } },
  world: createMockWorld(player),
} as ActionContext;
const events = touchingMirrorAction.execute(context);
```

## Benefits of This Approach

1. **Fast Execution**: Tests run quickly without heavy dependencies
2. **Isolated Testing**: Each component tested independently
3. **No Registration Required**: Tests work without extension registration
4. **No Story Required**: No need for full story setup
5. **Clear Failures**: Easy to identify what's broken
6. **Easy Maintenance**: Simple mocks are easy to update

## Future Testing

Additional tests could be added for:
- Other actions (connectingMirrors, enteringMirror, etc.)
- Event generation and structure
- Grammar patterns
- Integration tests (when registration is implemented)
- Story-based end-to-end tests