# Test Changes Required

## 1. Registry Tests (`registry-golden.test.ts`)

### Remove/Rewrite These Tests:
- **"should find actions by exact pattern match"** - Remove tests expecting `findByPattern('take')` to work
- **"should handle multi-word patterns"** - Remove tests expecting `findByPattern('pick up')` to work
- **"should support typical IF command patterns"** - Remove tests expecting `findByPattern('x')`, `findByPattern('i')`, etc.
- **"should support verb phrases"** - Same issue

### Keep These Tests:
- All basic registration tests (they test `get()` by action ID)
- Group management tests
- Priority sorting tests

### Potential New Tests:
- Test that patterns are stored correctly: `findByPattern('take [something]')` should work
- Test the actual use case for `findByPattern` (if any)

## 2. Command Validator Tests (`command-validator-golden.test.ts`)

### Current Issue:
The mock language provider is returning patterns without placeholders, and tests are expecting the validator to resolve verbs to actions.

### Fix:
- Update mock language provider to return action IDs in the vocabulary (like the real parser would)
- Create ParsedCommands with `action` set to the action ID, not the verb
- Test that validator correctly looks up actions by ID using `registry.get()`

### Example Change:
```typescript
// Instead of:
const parsed = parseCommand('take box', world);
// Where parsed.action = 'take'

// Should be:
const parsed = {
  action: 'if.action.taking',  // Parser already resolved this
  // ... rest of structure
};
```

## 3. Test Utils (`test-utils/index.ts`)

### Fix `createCommand`:
```typescript
export function createCommand(
  actionId: string,  // Change parameter name to make it clear
  options: {
    // ...
  } = {}
): ValidatedCommand {
  // ...
  return {
    parsed: {
      rawInput: /* construct from action */,
      action: actionId,  // This should be the action ID, not verb
      // ...
    },
    actionId: actionId,  // Same value
    // ...
  };
}
```

### Usage Changes:
```typescript
// Instead of:
createCommand('take', { entity: box });

// Should be:
createCommand('if.action.taking', { entity: box });
```

## 4. Action Test Files

Many action tests are failing because:
1. They use `createCommand` incorrectly (passing verb instead of action ID)
2. They expect wrong data in events (entity names vs IDs)

### Pattern for Fixing:
```typescript
// Old:
const command = createCommand('take', { entity: box });

// New:
const command = createCommand('if.action.taking', { entity: box });
```

## 5. Special Cases

### `again.test.ts`
- Fix import issue with `createTestContext`
- Update command creation to use action IDs

### `quitting.test.ts`
- Add mock shared data to test context:
```typescript
const context = {
  // ... existing context
  getSharedData: () => ({
    score: 42,
    moves: 10,
    hasUnsavedChanges: false,
    stats: { maxScore: 100 }
  })
};
```

## 6. Event Data Standardization

Many tests expect entity IDs in events but get entity names:

### Pattern:
```typescript
// If test expects:
expect(event.data.item).toBe('o01');

// But gets:
event.data.item = 'wooden box'

// Either:
// 1. Change test to expect the name
// 2. Or change action to emit IDs (design decision needed)
```

## Summary of Changes

1. **Remove verb-based pattern tests** from registry tests
2. **Fix ParsedCommand creation** in all tests to use action IDs
3. **Update createCommand** to make it clear it takes an action ID
4. **Add missing context data** (shared data, location setup)
5. **Standardize event expectations** (IDs vs names)
6. **Fix import issues** in specific test files

This should eliminate most of the 274 test failures as they're largely based on the same misunderstanding of the system design.
