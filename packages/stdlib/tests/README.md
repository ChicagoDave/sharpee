# @sharpee/stdlib Tests

This directory contains the test suite for the stdlib package.

## Structure

```
tests/
├── unit/           # Unit tests for individual components
│   ├── actions/    # Action registry and standard action tests
│   ├── parser/     # Parser, tokenizer, and vocabulary tests
│   ├── language/   # Language provider interface tests
│   ├── commands/   # Command pattern and syntax tests
│   └── validation/ # Command validator tests
├── integration/    # Integration tests for component interactions
└── setup.ts        # Test environment setup
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test registry.test.ts

# Run with coverage
pnpm test --coverage

# Run in watch mode
pnpm test --watch

# Run only unit tests
pnpm test tests/unit

# Run only integration tests
pnpm test tests/integration
```

## Writing Tests

### Test Structure

Each test file should follow this general structure:

```typescript
import { ComponentToTest } from '../../../src/path/to/component';
import { MockDependency } from '../../mocks/mock-dependency';

describe('ComponentName', () => {
  let component: ComponentToTest;
  let mockDep: MockDependency;

  beforeEach(() => {
    // Set up fresh instances for each test
    mockDep = new MockDependency();
    component = new ComponentToTest(mockDep);
  });

  describe('methodName', () => {
    test('should handle success case', () => {
      // Arrange
      const input = createTestInput();
      
      // Act
      const result = component.method(input);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.value).toMatchObject({
        // expected properties
      });
    });

    test('should handle error case', () => {
      // Test error scenarios
    });
  });
});
```

### Mock Guidelines

1. **Keep mocks minimal** - Only implement what's needed for the test
2. **Use Jest mocks** - Prefer `jest.fn()` for simple function mocks
3. **Share common mocks** - Put reusable mocks in a shared location
4. **Mock external dependencies** - Never depend on real implementations from other packages

### Testing Events

Many components emit debug events. Test these like:

```typescript
test('should emit debug events', () => {
  const events: SystemEvent[] = [];
  component.setDebugCallback(event => events.push(event));
  
  component.doSomething();
  
  const relevantEvents = events.filter(e => e.type === 'expected_type');
  expect(relevantEvents).toHaveLength(1);
  expect(relevantEvents[0].data).toMatchObject({
    // expected event data
  });
});
```

### Testing Async Code

For async operations:

```typescript
test('should handle async operation', async () => {
  const result = await component.asyncMethod();
  expect(result).toBeDefined();
});
```

### Testing Errors

Test both the error result and any error events:

```typescript
test('should handle error gracefully', () => {
  const result = component.methodThatFails();
  
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.code).toBe('EXPECTED_ERROR_CODE');
    expect(result.error.message).toContain('expected text');
  }
});
```

## Coverage Goals

- Unit tests: >90% coverage
- Integration tests: >80% coverage
- All public APIs must be tested
- All error paths must be tested
- Debug events should be verified

## Common Test Data

Common test entities and scenarios are available in the test plan. Use these for consistency:

- Player entity
- Room entity
- Common objects (ball, box, key)
- Standard commands (take, drop, examine, etc.)

## Notes

- Tests should be independent - don't rely on test execution order
- Clean up any resources in `afterEach` if needed
- Use descriptive test names that explain what is being tested
- Follow the "Arrange, Act, Assert" pattern for clarity
- Mock all external dependencies
