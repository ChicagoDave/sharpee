# Stdlib Test Suite - Master Checklist

## Overview
This checklist consolidates all test fixing work for the `@sharpee/stdlib` package. The test suite has approximately 200 failing tests that need systematic fixes.

## Current State (as of 2025-01-20)
- **Total test files**: ~50
- **Failing tests**: ~200
- **Test coverage**: Needs improvement
- **Main issues**: Event property mismatches, command structure issues, missing capabilities

## ✅ Completed Priorities

### Priority 1: TestData.basicSetup() References (COMPLETED)
- **Impact**: ~40% of failures
- **Total fixes**: 71 occurrences across 7 files
- **Result**: Zero `TestData.basicSetup is not a function` errors

### Priority 2: Command Structure Issues (COMPLETED)
- **Impact**: ~30% of failures
- **Total fixes**: 87 createCommand calls across 8 test files
- **Result**: Two-object commands now use correct structure with `secondEntity`

### Priority 3: Event Property Mismatches (IN PROGRESS)
- **Impact**: ~25% of failures
- **Completed**:
  - [x] Fixed resolveMessageId to not prepend action ID
  - [x] Fixed opening action message IDs
  - [x] Fixed wearing action layer conflicts and properties
  - [x] Fixed pushing action message IDs and properties
  - [x] Separated event data from message params in 5 actions
- **Remaining**:
  - [ ] Fix value corrections (prepositions, property types)
  - [ ] Fix remaining actions with property issues
  - [ ] Ensure event data includes all needed properties

## 📝 Remaining Priorities

### Priority 4: Player Setup Issues (COMPLETED)
**Files missing world.setPlayer():**
- [x] `/tests/integration/action-language-integration.test.ts`
- [x] `/tests/unit/actions/looking-golden.test.ts` - darkness tests
- [x] `/tests/unit/actions/taking-golden.test.ts` - capacity tests
- [x] `/tests/actions/sleeping.test.ts` - Check if player setup is correct

**Fix Pattern:**
```typescript
const player = world.createEntity('Player', 'actor');
world.setPlayer(player.id); // Note: Use player.id, not player entity
```

### Priority 5: Command Validator Tests (COMPLETED)
**Parser Integration Tasks:**
- [x] Create parser integration helper in test-utils
- [x] Import parser from `@sharpee/parser-en-us` package
- [x] Update `/tests/unit/validation/command-validator-golden.test.ts`
- [x] Add parser initialization to test setup
- [x] Update tests to use real parsing instead of manual command creation
- [x] Use LanguageProvider interface from if-domain for language flexibility
- [x] Add MockLanguageProvider for testing with custom vocabularies

### Priority 6: Action Logic Mismatches (COMPLETED)
**Specific Issues Fixed:**
- [x] Unlocking action - Key validation logic (already correct)
- [x] Turning action - Key in lock detection (fixed)
- [x] Sleeping action - State detection logic (fixed)
- [x] Pulling action - Reachability checks (already correct)
- [x] Pushing action - Reachability checks (already correct)
- [x] Entering action - Already inside checks (already correct)
- [x] Exiting action - Various state checks (already correct)

## 🔧 Infrastructure Tasks

### Test Utilities
- [ ] Document proper test patterns in `/tests/README.md`
- [ ] Add more test utility helpers for common scenarios
- [ ] Create builders for complex test objects
- [ ] Add assertion helpers for event validation
- [ ] Create parser integration helper

### Type Safety
- [ ] Fix `Invalid trait: must have a type property` errors
- [ ] Review trait construction in tests
- [ ] Ensure all traits have required properties
- [ ] Remove any types where possible

### Integration Tests
- [ ] Fix platform-specific test setup
- [ ] Ensure action-language integration tests work
- [ ] Add parser integration to relevant tests
- [ ] Create realistic game scenarios

## 📊 Success Metrics
- [ ] All tests passing (0 failures)
- [ ] No skipped tests without documentation
- [ ] Test coverage > 80%
- [ ] Clear patterns documented
- [ ] No console errors during test runs

## 🎯 Next Actions
1. Complete remaining Priority 3 value corrections
2. Address Priority 6 action logic mismatches
3. Fix the parser-en-us module not found issue
4. Run full test suite and measure improvement
5. Fix remaining test failures

## 📈 Progress Tracking
- Priority 1: 100% ✅
- Priority 2: 100% ✅
- Priority 3: 70% 🟡
- Priority 4: 100% ✅
- Priority 5: 100% ✅
- Priority 6: 100% ✅
- Overall: ~75% complete
