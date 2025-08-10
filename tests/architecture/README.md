# Architecture Tests

These tests enforce architectural patterns and prevent regression of our design decisions.

## Purpose

Architecture tests verify HOW code is structured, not just WHAT it does. They would have caught our behavior pattern failure where actions reimplemented logic instead of using behaviors.

## Test Categories

### 1. Behavior Usage (`behavior-usage.test.ts`)
- Ensures actions delegate to behaviors instead of reimplementing logic
- Detects direct trait manipulation (anti-pattern)
- Verifies proper behavior imports when traits are used
- Checks for validate/execute pattern separation

**What it catches:**
- Actions directly setting `isOpen = true` instead of calling `OpenableBehavior.open()`
- Actions using traits without importing corresponding behaviors
- Validation logic mixed into execute methods

### 2. Architectural Debt Metrics (`architectural-debt.test.ts`)
- Tracks metrics over time to prevent regression
- Measures behavior usage rate across actions
- Counts direct trait manipulations
- Estimates code duplication

**Metrics tracked:**
- `behaviorUsageRate` - % of actions properly using behaviors
- `directTraitManipulation` - Count of anti-pattern usages
- `validationInExecute` - Actions mixing validation with execution
- `duplicatedLogic` - Estimated lines of reimplemented behavior logic

### 3. Dependency Rules (`dependency-rules.test.ts`)
- Enforces proper layer dependencies
- Ensures actions depend on behaviors
- Prevents reverse dependencies (world-model shouldn't depend on stdlib)
- Verifies core has no upward dependencies

**Rules enforced:**
- stdlib actions MUST import from world-model (for behaviors)
- world-model MUST NOT import from stdlib
- core MUST NOT import from any higher layer

## Running the Tests

```bash
# Run all architecture tests
pnpm test:arch

# Watch mode for development
pnpm test:arch:watch

# Run only debt metrics
pnpm test:debt

# Run as part of full test suite
pnpm test
```

## Current Status

As of 2025-08-10, these tests are documenting our architectural debt:
- Most actions don't use behaviors (major failure)
- Extensive code duplication exists
- Validation is mixed with execution

The tests currently WARN about violations rather than fail, allowing us to:
1. Track the current state
2. Prevent it from getting worse
3. Measure improvement as we refactor

## Future State

After refactoring, these tests will:
- FAIL if actions don't use behaviors
- FAIL if validation isn't separated from execution
- FAIL if architectural metrics degrade
- Ensure the behavior pattern is properly implemented

## Adding New Architecture Tests

To add new architectural rules:

1. Create a new test file in `tests/architecture/`
2. Use the `getAllTsFiles()` helper to scan code
3. Write assertions about code structure
4. Initially set to warn, then fail after fixing

Example:
```typescript
describe('Architecture: New Rule', () => {
  it('should enforce some pattern', () => {
    const files = getAllTsFiles('packages/some-package');
    files.forEach(file => {
      const content = readFileSync(file, 'utf-8');
      // Check for pattern
      expect(content).toMatch(/expectedPattern/);
    });
  });
});
```

## Metrics File

The `.architecture-metrics.json` file at the root tracks metrics over time. This file is:
- Generated automatically by tests
- Used to detect regression
- Should be committed to track improvement

## Integration with CI

These tests run as part of the standard test suite and will:
- Block PRs that make architecture worse
- Track improvement metrics
- Ensure patterns are followed

## Lessons Learned

These tests exist because we learned:
- **Architecture without enforcement is just suggestion**
- **"It works" isn't enough - it must work the right way**
- **Automated architecture tests catch problems early**
- **Metrics help track technical debt objectively**