# Scope Test Assessment

## Current State of Scope Tests

Based on our successful container visibility test, we've established clear patterns for test setup. Now let's assess all scope-related tests.

## Established Patterns

1. **World Setup**: Use `AuthorModel` for test setup to bypass sanity checks
2. **Room Creation**: Rooms MUST have `TraitType.ROOM` trait
3. **Object Placement**: Use `author.moveEntity()` for placement
4. **Scope Testing**: Use `StandardScopeResolver` directly for scope checks
5. **Command Validation**: Use real parser and validator for integration tests

## Test Categories

### 1. Core Scope Tests (`tests/unit/scope/`)

#### `scope-resolver.test.ts`
- **Purpose**: Unit tests for StandardScopeResolver
- **Status**: Likely failing due to missing ROOM traits
- **Needs**: Update all room creation to add ROOM trait

#### `sensory-extensions.test.ts` 
- **Purpose**: Tests for hearing, smell, darkness mechanics
- **Status**: 7 failures
- **Issues**:
  - Missing ROOM traits
  - May need proper door setup for "hearing through doors"
  - Darkness mechanics need room properties

#### `witness-system.test.ts`
- **Purpose**: Tests for knowledge/discovery tracking
- **Status**: 3 failures
- **Issues**: 
  - Event emission tests failing
  - Probably expecting different event structure

### 2. Action Scope Tests (`tests/unit/actions/*-golden.test.ts`)

These tests were checking scope validation within actions, but we removed that because scope validation belongs in CommandValidator. These tests should be:
- **Removed**: Any test checking "should fail when not visible/reachable"
- **Kept**: Tests for action-specific logic only

### 3. Integration Tests

#### `scope-integration.test.ts`
- **Purpose**: Full integration of scope with actions
- **Needs**: Review against our patterns

#### `scope-validation-basic.test.ts`
- **Purpose**: Basic scope validation scenarios
- **Needs**: Review against our patterns

#### `scope-debug.test.ts`
- **Purpose**: Debug/example scenarios
- **Needs**: Update or remove

## Recommendations

### Phase 1: Fix Core Scope Tests
1. Update `scope-resolver.test.ts` with ROOM traits
2. Fix `sensory-extensions.test.ts` with proper room/door setup
3. Fix `witness-system.test.ts` event expectations

### Phase 2: Clean Up Action Tests
1. Remove ALL scope validation tests from action unit tests
2. Keep only action-specific behavior tests
3. Or wholesale replace with new minimal action tests

### Phase 3: Update Integration Tests
1. Update all integration tests to use our established patterns
2. Ensure they test real scenarios, not implementation details

## Key Design Decisions to Confirm

1. **Rooms**: Should entities with type 'location' automatically get ROOM trait?
2. **Darkness**: How should darkness be implemented? Custom property or trait?
3. **Sensory**: Are hearing/smell working as designed with room connections?
4. **Witnessing**: When exactly are witness events emitted?

## Proposed Next Steps

1. Start with `scope-resolver.test.ts` - fix with ROOM traits
2. Move to `sensory-extensions.test.ts` - fix room setup
3. Then `witness-system.test.ts` - understand event structure
4. Finally, wholesale review action tests