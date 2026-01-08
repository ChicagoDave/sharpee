## Summary

The restarting action enables players to restart the game from the beginning. It analyzes current game state (score, moves, location), determines whether confirmation is required based on unsaved progress, and emits platform and notification events. The action follows the four-phase pattern (validate/execute/report/blocked) but is a "meta" action that doesn't mutate world state—instead it orchestrates platform-level restart handling.

## Implementation Analysis

### Four-Phase Pattern Compliance
- **validate()**: Line 99-102 - Correctly validates (always returns valid)
- **execute()**: Line 104-108 - Analyzes restart context and stores in sharedData (no world mutations, as appropriate for meta actions)
- **blocked()**: Line 110-118 - Included for consistency but never called (validation always succeeds)
- **report()**: Line 120-144 - Emits platform event, notification event, and optional hint event

### Event Emission
The action correctly emits three types of events:
1. `createRestartRequestedEvent()` - Platform event (line 126)
2. `if.event.restart_requested` - Notification event (line 130)
3. `action.success` - Optional hint when significant progress exists (line 134-140)

### World State Mutation
N/A - This is a meta action that doesn't mutate world state. It only analyzes state and requests platform action.

### Data Flow Analysis
The action correctly:
- Reads shared data from world.getCapability('sharedData') (line 36)
- Detects unsaved progress by comparing moves to lastSaveMove (line 37)
- Determines force restart from command extras (line 43-45)
- Computes confirmation requirements: requires confirmation if >10 moves OR unsaved changes (line 54)

## Test Coverage Analysis

### Current Tests
Tests exist in `/mnt/c/repotemp/sharpee/packages/stdlib/tests/actions/platform-actions.test.ts` (lines 372-485) but are **SKIPPED** with `.describe.skip()` (line 22).

### Test Cases That Exist (But Are Skipped)
1. ✓ Emits platform restart requested event (line 373)
2. ✓ Includes current progress in context (line 390)
3. ✓ Determines confirmation requirements (line 412)
4. ✓ Handles force restart (line 428)
5. ✓ Emits restart requested notification (line 445)
6. ✓ Provides hint for significant progress (line 466)

### Four-Phase Pattern Coverage
- **validate()**: NOT TESTED (no dedicated tests for validation logic)
- **execute()**: PARTIALLY TESTED (event emission tested, but not internal sharedData population)
- **report()**: TESTED via executeWithValidation pattern
- **blocked()**: NOT TESTED (never called since validate always returns valid)

### World State Verification
N/A - This is a meta action. Tests verify event payloads, not world mutations.

### Edge Cases Covered
1. ✓ Low move count (<10) without unsaved changes → no confirmation required
2. ✓ Force restart with extras.now
3. ✓ Current location tracking
4. ✓ Score and move tracking

## Gaps Identified

### CRITICAL GAPS

1. **Tests Are Skipped**
   - All 6 test cases in `platform-actions.test.ts` are under `.describe.skip()` (line 22)
   - Tests NEVER RUN in CI/CD
   - **Impact**: HIGH - The restarting action has zero test coverage in the test suite

2. **Missing validate() Phase Testing**
   - No tests for validation failures (though none currently exist)
   - If validation logic is added later, there's no test template

3. **Missing Internal State Verification**
   - Tests verify emitted events but NOT the internal sharedData population
   - `analyzeRestartContext()` function (lines 34-84) is untested
   - Tests don't verify that sharedData is correctly populated after execute()

4. **Missing Edge Case Tests**
   - No test for missing getCapability ('sharedData') - returns undefined
   - No test for null/undefined location
   - No test for different force restart variants (extras.force vs extras.now vs action='reset')

5. **Missing Integration Tests**
   - No tests verifying timestamp generation
   - No tests for message ID correctness ('restart_confirm', 'restart_unsaved', etc.)

### COMPARISON TO SIMILAR ACTIONS

The quitting action (`quitting.test.ts`, 444 lines) has:
- 20+ dedicated test cases
- Comprehensive edge case coverage
- Tests for missing/empty shared data
- Tests for all force quit variants
- Tests enabled and running (not skipped)

The restarting action has:
- 6 test cases (but skipped)
- Limited edge case coverage
- No "defensive coding" tests for missing data

## Recommendations

### Immediate Actions (HIGH PRIORITY)

1. **Enable the tests** - Remove `.skip()` from line 22 of platform-actions.test.ts
   - Tests are ready to run, just disabled
   - This gives baseline coverage

2. **Add internal state tests** - After execute(), verify sharedData contains:
   - `forceRestart` boolean correctly determined
   - `hasUnsavedProgress` boolean correct
   - Score, moves, location correctly extracted
   - `restartContext` object properly formed

3. **Add edge case tests** for:
   ```typescript
   // Missing shared data
   it('should handle missing shared data capability', () => {...})
   
   // Null location
   it('should handle null current location', () => {...})
   
   // All force restart variants
   it('should recognize force with extras.force', () => {...})
   it('should recognize force with extras.now', () => {...})
   it('should recognize force with action=reset', () => {...})
   
   // Zero/negative values
   it('should handle zero moves', () => {...})
   it('should handle negative moves (defensive)', () => {...})
   ```

4. **Add validation phase tests** - Even though validation always succeeds:
   ```typescript
   it('validate() should always return valid', () => {
     const result = restartingAction.validate(context);
     expect(result.valid).toBe(true);
   })
   ```

### Secondary Actions (MEDIUM PRIORITY)

5. **Add analyzeRestartContext tests** - Test the helper function directly
   - Verify confirmation requirement logic (threshold at 10 moves)
   - Verify unsaved progress calculation
   - Verify hint determination

6. **Add message verification tests** - Verify action declares all required messages:
   - 'restart_confirm', 'restart_unsaved', 'restart_requested'
   - 'game_restarting', 'starting_over', 'new_game'

7. **Add tests for blocked() phase** - Even though never called:
   ```typescript
   it('blocked() should return action.blocked event', () => {...})
   ```

## Risk Level: **HIGH**

### Rationale

1. **Zero Active Test Coverage** - All tests are skipped. The action is completely untested in CI/CD.

2. **Similar to Dropping Bug Pattern** - The dropping action had a bug where execute() didn't properly update entity containment. Here, we have no tests verifying that:
   - analyzeRestartContext() correctly reads world state
   - sharedData is properly populated with restart context
   - Event payloads match internal state

3. **Meta-Action Mutation Risk** - While this action doesn't mutate world entities, it DOES mutate sharedData. Without tests, changes could silently break:
   - Force restart detection (line 43-45)
   - Unsaved progress calculation (line 37)
   - Confirmation requirement logic (line 54)

4. **Platform Integration Risk** - The action emits platform events that the engine relies on. Wrong event structure silently breaks restart flow. Tests verify this.

5. **No Regression Testing** - If someone refactors analyzeRestartContext(), there's no test suite to catch breaking changes.

### Bug Scenarios That Tests Would Catch

1. Force restart not being detected if extras.force check is removed
2. Confirmation threshold changed from 10 to wrong value without notice
3. Score/moves not extracted from shared data
4. Event timestamps always set to wrong value
5. Required messages list gets out of sync with actual event usage

The dropping action's bug (execute() not removing item from player inventory) went undetected because tests only verified success messages, not world state. The restarting action has the same risk: tests verify events, but not the internal state population that feeds those events.
