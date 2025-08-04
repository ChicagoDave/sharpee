# StdLib Testing Guide

## Overview

The stdlib package has undergone significant architectural changes. This guide explains the new testing patterns.

## Key Changes

### 1. Actions No Longer Have Aliases
- Aliases are now provided by the language provider
- Tests should not check for `action.aliases`
- Use mock language providers to test alias resolution

### 2. New Action Execution Model
- Old: `action.execute(command, context)`
- New: `action.execute(context)` where context includes the command
- Context is now `EnhancedActionContext` with helper methods

### 3. Event-Driven Architecture
- Actions return `SemanticEvent[]` not direct results
- Use `context.emitSuccess()`, `context.emitError()`, `context.emit()`
- No direct state mutation

### 4. Vocabulary System Refactored
- Vocabulary moved from stdlib to language providers
- Parser uses registered language providers for vocabulary

## Testing Patterns

### Golden Test Pattern

See `waiting-golden.test.ts` and `closing-golden.test.ts` for complete examples.

```typescript
import { createTestContext, expectEvent } from '../../test-utils';

describe('MyAction', () => {
  test('should execute successfully', () => {
    const context = createTestContext(myAction, {
      // Optional overrides
    });
    
    const events = myAction.execute(context);
    
    expectEvent(events, 'if.event.something', {
      // Expected event data
    });
  });
});
```

### Testing with Direct Objects

```typescript
const { world, player, object } = TestData.withObject('box', 'wooden box', {
  'if.trait.openable': { isOpen: true }
});

const context = createTestContext(closingAction, {
  world,
  player,
  command: {
    parsed: { action: IFActions.CLOSING } as any,
    actionId: IFActions.CLOSING,
    directObject: { entity: object } as any
  }
});
```

### Mocking Language Providers

```typescript
const languageProvider = createMockLanguageProvider({
  'if.action.waiting': ['wait', 'z'],
  'if.action.looking': ['look', 'l', 'examine']
}, {
  'if.action.waiting.waited': 'Time passes.',
  'if.action.looking.looked': 'You look around.'
});
```

## Test Utilities

The `test-utils.ts` module provides:

- `createEntity()` - Create mock entities
- `createWorld()` - Create mock world model
- `createCommand()` - Create validated commands
- `createTestContext()` - Create enhanced action context
- `expectEvent()` - Assert event properties
- `TestData` - Common test scenarios

## Migration Guide

### Old Pattern
```typescript
test('should have aliases', () => {
  expect(action.aliases).toContain('close');
});

test('should execute', () => {
  const events = action.execute(command, context);
  expect(events[0].type).toBe(IFEvents.CLOSED);
});
```

### New Pattern
```typescript
test('language provider provides aliases', () => {
  const aliases = languageProvider.getActionAliases(action.id);
  expect(aliases).toContain('close');
});

test('should execute', () => {
  const context = createTestContext(action, { command });
  const events = action.execute(context);
  expectEvent(events, 'if.event.closed');
});
```

## Running Tests

```bash
# Run specific golden test
pnpm test waiting-golden.test.ts

# Run all golden tests
pnpm test -- --testNamePattern="Golden Pattern"

# Run with coverage
pnpm test -- --coverage
```

## Next Steps

1. Use golden tests as templates for new tests
2. Gradually migrate old tests using the patterns shown
3. Focus on testing behavior, not implementation details
4. Consider integration tests for language provider interactions
