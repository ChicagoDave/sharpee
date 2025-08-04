# Sharpee Test Suite Fix - Continuation Prompt

## Context
We're fixing 274 failing tests in the Sharpee stdlib package. The root cause was identified: tests were expecting CommandValidator to resolve verbs to actions, but the design has the Parser already doing this resolution.

## Key Findings
1. The Parser outputs `ParsedCommand` with `action` set to the action ID (e.g., 'if.action.taking'), not the verb
2. CommandValidator just looks up actions by ID using `registry.get()`, not pattern matching
3. Pattern matching (`findByPattern`) is only for edge cases/backward compatibility
4. Tests were incorrectly simulating the wrong flow

## Changes Made So Far
1. **Updated registry tests** (`registry-golden.test.ts`) - removed verb lookup tests, kept ID-based tests
2. **Updated test utilities** (`test-utils/index.ts`):
   - Fixed `createCommand` to take action IDs, not verbs
   - Added `createTestContext` export for backward compatibility
   - Added shared data support for quitting action
3. **Updated taking action test** (`taking-golden.test.ts`) - all createCommand calls now use action IDs

## Remaining Work
Need to update ~50 test files following these patterns:

### Pattern 1: Action Tests
Change: `createCommand('take', { entity: box })`
To: `createCommand('if.action.taking', { entity: box })`

### Pattern 2: Event Data
Many tests expect entity IDs but actions emit names. Need to standardize.

### Pattern 3: Import Issues
- `again.test.ts` has import issues with createTestContext
- Various tests need proper world setup (room needs ROOM trait, player needs location)

### Pattern 4: Shared Data
Actions like quitting expect context.getSharedData() to return score, moves, etc.

## Files to Focus On
1. High-failure count tests:
   - `quitting.test.ts` (12 failures - needs shared data)
   - `command-validator-golden.test.ts` (11 failures - needs mock fix)
   - `again.test.ts` (15 failures - import issue)
   
2. Lock/unlock tests (12 failures total) - key handling issues

## Next Steps
1. Continue mechanical updates of createCommand calls
2. Fix import issues in again.test.ts
3. Standardize event data expectations (IDs vs names)
4. Run full test suite to verify fixes

The core design is sound - we just need to align tests with how the system actually works.
