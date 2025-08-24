# Story-Based Testing Plan for @sharpee/engine

## Overview
Refactor the engine tests to use test stories that properly initialize with the language provider, avoiding module resolution issues and testing the engine as it's actually used.

## Current Issues
- Tests are failing with "verbDef.verbs is not iterable" errors
- Direct mocking of language provider causes module resolution conflicts
- Tests don't reflect real-world usage patterns
- Symbolic link issues between packages during test execution

## Solution: Test Stories
Create test story implementations that:
1. Properly specify a language ('en-us')
2. Let the engine load the language provider through normal initialization
3. Expose test helpers to verify internal state
4. Cover different aspects of engine functionality

## Test Story Structure

### Location
`/packages/engine/tests/stories/`

### Test Stories to Create

1. **minimal-test-story.ts**
   - Basic world with one room
   - Tests: engine lifecycle, initialization, start/stop

2. **action-test-story.ts**
   - Custom actions with test helpers
   - Tests: action registration, command execution, action context

3. **complex-world-test-story.ts**
   - Multiple rooms, objects, containers
   - Tests: world navigation, object manipulation, scope/visibility

4. **event-test-story.ts**
   - Event logging and inspection helpers
   - Tests: event generation, sequencing, event metadata

5. **game-state-test-story.ts**
   - Stateful objects and markers
   - Tests: save/load, turn history, state persistence

6. **completion-test-story.ts**
   - Configurable completion conditions
   - Tests: game over detection, completion handling

7. **index.ts**
   - Export all test stories for easy importing

## Test Refactoring Plan

### Phase 1: Create Test Stories
- Implement all test story classes
- Each implements the Story interface
- Include test-specific helper methods

### Phase 2: Refactor Existing Tests
- Remove direct language provider imports from setup.ts
- Update each test file to use appropriate test stories
- Remove mock language provider usage

### Phase 3: Fix Test Patterns
Convert from:
```typescript
const mockLanguageProvider = /* complex mock */
const engine = new GameEngine(world, player, config, mockLanguageProvider);
```

To:
```typescript
const story = new ActionTestStory();
const engine = createStandardEngine();
await engine.setStory(story);
engine.start();
```

### Phase 4: Verify Coverage
- Ensure all existing tests are converted
- Add new tests for previously untestable scenarios
- Verify 80% coverage targets

## Benefits
1. **Real-world testing** - Tests use engine as designed
2. **No module conflicts** - Language provider loaded normally
3. **Better test isolation** - Each story focused on specific features
4. **Clearer tests** - Test intent obvious from story type
5. **Maintainable** - Test stories are simple TypeScript classes

## Implementation Order
1. Create minimal-test-story.ts first
2. Convert game-engine.test.ts to use it
3. Verify the approach works
4. Create remaining test stories
5. Convert all test files
6. Remove old mocking code

## Success Criteria
- All tests pass
- No "verbDef.verbs is not iterable" errors
- 80% code coverage achieved
- Tests are more readable and maintainable
