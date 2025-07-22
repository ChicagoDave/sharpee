# Stdlib Package - Current State Assessment

## Overview
The `@sharpee/stdlib` package provides the standard library of actions, capabilities, and utilities for the Sharpee interactive fiction engine. This assessment captures the current state of the test suite migration and overall package health.

## Test Migration Status

### Completed Work
1. **Test Utilities Created** (`/tests/test-utils/index.ts`)
   - `setupBasicWorld()` - Creates a basic world with player and room
   - `createRealTestContext()` - Creates proper action contexts for testing
   - `createCommand()` - Creates ValidatedCommand objects with correct structure
   - `expectEvent()` - Validates events in test assertions
   - `TestData` class with helpers for common test scenarios
   - `findEntityByName()` helper function

2. **Vitest to Jest Conversion**
   - All test files converted from Vitest imports to Jest
   - Changed `import { describe, it, expect } from 'vitest'` to `import { describe, test, expect } from '@jest/globals'`
   - Replaced all `it()` calls with `test()`
   - Changed `vi.fn()` to `jest.fn()`

3. **Fixed Common Issues**
   - Removed references to non-existent `TraitType.NOT_REACHABLE`
   - Fixed reserved word issues (changed `package` to `pkg`)
   - Updated `TestData.basicSetup()` calls to use `setupBasicWorld()`
   - Fixed import paths for types from `@sharpee/core` and `@sharpee/world-model`

### Current Test Results Summary

#### Passing Tests
- Basic action metadata tests (ID, required messages, group)
- Simple precondition checks (no target specified)
- Some successful action execution tests
- Event structure validation tests

#### Failing Test Categories

1. **Entity Resolution Issues** (~30% of failures)
   - Command validator tests expecting entity resolution by name
   - Tests expecting adjective matching to work
   - Synonym resolution not working as expected

2. **Event Property Mismatches** (~25% of failures)
   - Tests expecting properties that actions don't set (e.g., `item` vs `target`)
   - Message ID mismatches (e.g., expecting `opened` but getting `its_empty`)
   - Missing properties in event data

3. **World Model State Issues** (~20% of failures)
   - "No player set in world model" errors
   - Tests not properly initializing world state
   - Missing player setup in some test files

4. **Command Structure Issues** (~15% of failures)
   - Tests creating commands incorrectly
   - ValidatedCommand structure not matching expectations
   - Parser integration not working as expected

5. **Action Logic Mismatches** (~10% of failures)
   - Tests expecting different error messages than implemented
   - Precondition checks behaving differently than expected
   - Side effects not matching test expectations

### Specific Problem Areas

#### 1. Command Validator (`/tests/unit/validation/command-validator-golden.test.ts`)
- Almost all tests failing
- Expects entity resolution, adjective matching, synonym support
- **Parser is fully implemented in `@sharpee/parser-en-us` package**
- Tests can import parser directly for testing (bypassing engine)
- Current tests may be creating commands without proper parsing
- Need to initialize parser with test world for entity resolution

#### 2. Complex Actions
- `putting` - Command structure issues, missing destination handling
- `unlocking`/`locking` - Key validation logic not matching tests
- `going` - Direction handling and room navigation issues
- `looking` - Darkness handling and room description logic

#### 3. Integration Tests
- Action-language integration tests failing due to missing context
- Platform-specific tests may need different setup

## Architecture Observations

### Strengths
1. **Clear Separation of Concerns**
   - Actions return events, not direct mutations
   - Enhanced context provides clean API for action authors
   - Message resolution separated from action logic
   - Parser fully implemented in separate package (`@sharpee/parser-en-us`)

2. **Comprehensive Action Coverage**
   - Full set of standard IF actions implemented
   - Consistent patterns across actions
   - Good error handling and validation

3. **Event-Driven Design**
   - All state changes go through events
   - Enables undo/redo, replay, and debugging
   - Clear audit trail of game state changes

### Areas for Improvement

1. **Test Infrastructure**
   - Need proper integration with `@sharpee/parser-en-us` for command validation tests
   - Test utilities could be more comprehensive
   - Integration test setup is complex

2. **Documentation**
   - Many tests serve as documentation but are failing
   - Need clear examples of proper usage
   - API documentation for action authors

3. **Type Safety**
   - Some any types in trait data
   - Could benefit from stricter typing
   - Better type inference for events

## Progress Update (2025-01-20)

### In Progress 🖄
3. **Priority 3: Event Property Mismatches (~25% of failures)**
   - Need to fix tests expecting different property names than actions emit
   - Message ID mismatches to resolve
   - Event data structure alignment needed

### Completed ✅
1. **Priority 1: TestData.basicSetup() References**
   - Fixed all occurrences across test suite (~71 total)
   - All tests now use `setupBasicWorld()` correctly
   - Eliminated all `TestData.basicSetup is not a function` errors

2. **Priority 2: Command Structure Issues (~30% of failures)**
   - Fixed all two-object command tests (~87 total fixes)
   - Updated createCommand calls in: putting, giving, throwing, unlocking, locking, inserting, removing
   - Tests now properly set secondEntity for indirect objects

### Recommendations

### Immediate Actions
1. **Continue Command Structure Fixes**
   - Fix remaining two-object command tests using same pattern as putting
   - Each action test file needs ~10-20 createCommand calls updated

2. **Update Test Expectations**
   - Align test expectations with actual implementation
   - Fix event property names to match what actions produce
   - Update message IDs in tests to match action messages

3. **Fix Parser Integration**
   - Parser is fully implemented in `@sharpee/parser-en-us`
   - For testing, can import and use parser directly without engine
   - Update command validation tests to use real parser
   - Create test helper that initializes parser with test world

### Medium Term
1. **Improve Test Utilities**
   - Add more helpers for common scenarios
   - Create builders for complex commands
   - Add assertion helpers for common patterns
   - Add parser initialization helper that:
     - Imports parser from `@sharpee/parser-en-us`
     - Initializes it with the test world
     - Provides easy parsing of test commands

2. **Documentation**
   - Document expected event formats
   - Create action authoring guide
   - Add examples of proper test patterns
   - Document parser integration patterns

3. **Refactor Problem Actions**
   - Review actions with many failing tests
   - Ensure consistent patterns across all actions
   - Simplify complex precondition logic

### Long Term
1. **Type System Improvements**
   - Remove any types where possible
   - Create branded types for IDs
   - Improve event type discrimination

2. **Integration Test Strategy**
   - Separate unit tests from integration tests
   - Create realistic game scenarios
   - Test full command-to-output flow
   - Include parser in integration tests

3. **Performance Testing**
   - Add benchmarks for common operations
   - Profile action execution
   - Optimize hot paths

## Conclusion

The stdlib package has a solid architecture and comprehensive functionality, but the test suite needs significant work to properly validate the implementation. The main issues are misaligned expectations between tests and implementation, rather than fundamental problems with the code itself.

The parser is fully implemented in `@sharpee/parser-en-us`. While normally the engine assigns the parser based on the language setting, for testing we can import and use it directly. This means the command validation tests can use real parsing functionality, including entity resolution, adjective matching, and synonym support. The failing tests likely just need to be updated to initialize and use the parser directly.

The event-driven architecture and separation of concerns are strong design choices that will serve the project well. With focused effort on fixing the test infrastructure and aligning expectations, the package can achieve high reliability and maintainability.

## Next Steps
1. Fix remaining `TestData.basicSetup()` references
2. Integrate command validator tests with `@sharpee/parser-en-us`
3. Systematically fix event property mismatches
4. Update test expectations to match implementation
5. Document patterns for future test authors
6. Create parser integration helpers for tests
