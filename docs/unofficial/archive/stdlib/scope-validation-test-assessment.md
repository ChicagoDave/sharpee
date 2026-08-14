# Scope and Command Validation Testing Assessment

## Current Situation

### What We Changed
1. **Centralized Scope Validation**: Moved scope checking from individual actions to CommandValidator
2. **Actions No Longer Check Scope**: Actions now assume entities passed to them are valid and in scope
3. **CommandValidator Responsibility**: The CommandValidator now checks scope before creating ValidatedCommand

### Testing Problem
- **60 failing tests** related to scope validation
- Tests are expecting actions to return `action.error` events for out-of-scope entities
- Tests bypass CommandValidator by creating ValidatedCommand directly with resolved entities
- Actions execute successfully on out-of-scope entities because they no longer check scope

## Test Categories Affected

### 1. Action Scope Precondition Tests (23 failures)
These tests check scenarios like:
- "should fail when item is not visible" 
- "should fail when item is not reachable"
- "should fail when not holding item"

**Current Issue**: Actions no longer check scope, so these tests pass when they should fail.

### 2. Platform Actions Tests (18 failures)
- Saving, restoring, quitting, restarting actions
- Likely failing due to missing test setup or different issues

### 3. Sensory Extensions Tests (7 failures)
- Tests for hearing, smell, darkness
- Probably failing due to scope system changes

### 4. Witness System Tests (3 failures)
- Tests for witness events
- May be affected by scope system integration

### 5. Command Validator Tests (9 failures)
- Direct tests of CommandValidator functionality
- Need to verify these are testing the right behavior

## Design Questions to Address

### 1. Where Should Scope Validation Happen?
**Option A: In CommandValidator Only (Current Design)**
- ✅ Single responsibility - validation happens in one place
- ✅ Actions are simpler and focused on execution
- ❌ Tests must use CommandValidator or simulate its behavior
- ❌ More complex test setup

**Option B: In Both CommandValidator AND Actions**
- ✅ Actions are defensive and self-validating
- ✅ Tests can test actions in isolation
- ❌ Duplicate logic
- ❌ Violates DRY principle

**Option C: In Actions with Optional Bypass**
- ✅ Actions validate by default
- ✅ CommandValidator can pass a "pre-validated" flag
- ✅ Tests work without changes
- ❌ More complex action interface

### 2. How Should We Test Actions?
**Option A: Through CommandValidator (Integration Tests)**
- Test the full flow: ParsedCommand → CommandValidator → Action
- Most realistic but requires more setup

**Option B: With Test Helper (Current Attempt)**
- Add `executeActionWithScopeValidation` helper
- Simulates CommandValidator behavior
- Moderate complexity

**Option C: Mock/Stub Approach**
- Create test doubles for scope validation
- Most flexible but potentially brittle

## Production Flow Analysis

The engine's CommandExecutor shows the actual flow:
```typescript
// 1. Parse input
const parseResult = this.parser.parse(input);

// 2. Validate with CommandValidator (includes scope checking)
const validationResult = this.validator.validate(parsed);

// 3. Execute action with validated command
const result = await this.executeCommand(validated, world, context, turn);
```

This confirms: **Actions should NOT check scope** - it's CommandValidator's responsibility.

## Recommendations

### The Design is Correct - Fix the Tests

The current design where CommandValidator handles all validation (including scope) is correct and follows the production flow. The tests need to be updated to match this design.

### Test Strategy

1. **Action Unit Tests** (like drinking-golden.test.ts):
   - Should test action logic with VALID inputs
   - Should NOT test scope validation failures
   - Focus on: "given valid inputs, does the action do the right thing?"

2. **Scope Validation Tests** (new test category):
   - Test CommandValidator's scope checking
   - Test scenarios like "not visible", "not reachable"
   - Already exists: command-validator-golden.test.ts

3. **Integration Tests** (action-language-integration.test.ts):
   - Test full flow: parse → validate → execute
   - Test error handling at each stage

### Immediate Fix

1. **Remove Scope Tests from Action Tests**:
   - Delete or skip tests like "should fail when item is not visible"
   - These belong in CommandValidator tests

2. **Update Action Tests**:
   - Focus on testing action behavior with valid entities
   - Test action-specific validations (e.g., "not drinkable", "already consumed")

3. **Add CommandValidator Scope Tests**:
   - Move scope validation tests to command-validator tests
   - Test all scope scenarios there

### Example Refactoring

Instead of:
```typescript
// In drinking-golden.test.ts
test('should fail when item is not visible', () => {
  // ... setup item in another room
  const events = drinkingAction.execute(context);
  expectEvent(events, 'action.error', { messageId: 'not_visible' });
});
```

Move to:
```typescript
// In command-validator-golden.test.ts
test('should fail validation when item is not visible', () => {
  // ... setup item in another room
  const result = validator.validate(parsed);
  expect(result.success).toBe(false);
  expect(result.error.reason).toBe('not_visible');
});
```

## Immediate Action Items

1. **Skip/Remove Scope Tests**: Update action tests to remove scope validation tests
2. **Enhance CommandValidator Tests**: Add comprehensive scope validation tests
3. **Document Pattern**: Create clear documentation on what to test where
4. **Update Test Utils**: Remove the `executeActionWithScopeValidation` helper - not needed