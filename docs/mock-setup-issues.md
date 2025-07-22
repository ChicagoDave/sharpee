# Mock Setup Issues Analysis

## Root Cause

The tests are failing because of issues with the mock world model setup:

1. **Visibility Logic**: The mock `canSee` implementation in the test-utils is complex and might not be handling all cases correctly. When items are placed in other rooms or closed containers, the visibility check should return false, but it seems to be inconsistent.

2. **Mock Method Behavior**: When tests mock methods like `canSee` or `canReach` to return false, those mocks persist across tests if not properly reset, causing subsequent tests to fail with unexpected errors.

3. **World Model Method Availability**: Some actions call `context.world.getLocation()` which exists in the mock, but the mock might not be properly initialized in all test scenarios.

## Specific Issues

### 1. Eating Action Tests
- Test expects "not_reachable" error but gets "not_visible"
- This happens because the item in a closed transparent container should be visible but not reachable
- The mock's `canSee` implementation might not be correctly handling transparent containers

### 2. Mock Persistence
- When a test mocks `canSee` to return false: `(context.canSee as jest.Mock).mockReturnValue(false)`
- This mock might persist to the next test if not reset
- This explains why tests that should pass are failing with "not_visible" errors

### 3. Enhanced Context Issues
- The enhanced context tries to add default entities (actor, target, location) to events
- If any of these are undefined, it was causing errors
- This has been partially fixed with null checks

## Solutions

### 1. Fix Mock Reset Between Tests
Each test file needs to properly reset mocks between tests:

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 2. Fix Visibility Logic
The mock world's `canSee` implementation needs to:
- Properly handle transparent containers
- Correctly check room boundaries
- Handle the visibility of items inside containers

### 3. Improve Test Isolation
- Each test should create its own fresh context
- Mocks should be scoped to individual tests
- Use `jest.fn()` for each mock instance rather than modifying shared mocks

### 4. Fix Specific Action Issues
Actions that call `world.getLocation()` should use optional chaining or check if the method exists:
```typescript
const itemLocation = context.world.getLocation?.(item.id);
```

## Next Steps

1. Add `beforeEach` with `jest.clearAllMocks()` to test files
2. Fix the mock world's visibility logic for transparent containers
3. Ensure all actions use defensive programming when accessing world methods
4. Review and fix any remaining direct property accesses that don't check for undefined
