## Summary
The `sleepingAction` is a meta action that advances time (similar to WAITING) without performing world mutations. It should emit an `if.event.slept` signal and a success message. The action supports customization through event handlers for location-based restrictions and fatigue systems.

### Implementation Analysis

**Four-Phase Pattern Compliance: PARTIAL**

1. **Validate Phase**: ✓ Present and returns `ValidationResult`
   - Currently always returns `valid: true` (no preconditions)
   - Calls `analyzeSleepAction()` helper but doesn't use results to determine validity

2. **Execute Phase**: ✓ Present and properly returns void
   - Stores analysis results in sharedData for report phase
   - NO world mutations (correct pattern)
   - Uses proper helper `analyzeSleepAction()` to compute state

3. **Report Phase**: ✓ Present and returns events array
   - Emits `if.event.slept` with SleptEventData
   - Emits `action.success` with messageId
   - Emits optional `woke_refreshed` message if applicable

4. **Blocked Phase**: ✓ Present and returns events array
   - Generates action.blocked events for validation failures
   - Properly structured for error reporting

**Event Emission**: Events are correctly emitted:
- `if.event.slept` - carries turnsPassed, location, locationName
- `action.success` - carries messageId and params
- Pattern follows waiting action correctly

### Test Coverage Analysis

**CRITICAL FINDING: NO DEDICATED TEST FILE EXISTS**

Searching for test files:
- No `sleeping-golden.test.ts` file exists
- No `sleeping.test.ts` file exists
- Grep searches across all stdlib tests find NO references to `sleepingAction`
- The action is exported and registered but completely untested at the unit level

**Status of Four Phases**:
- Validate: UNTESTED
- Execute: UNTESTED  
- Report: UNTESTED
- Blocked: UNTESTED

**Event Verification**: UNTESTED
- No tests verify that `if.event.slept` is actually emitted
- No tests check the event data (turnsPassed, location)
- No tests verify `action.success` message

**World State Mutation Tests**: N/A (action has no mutations, which is correct)
- Cannot verify world remains unmutated since there are no tests

**Edge Cases**: ALL UNTESTED
- Testing action in different locations (would test location capture)
- Testing in room vs container vs supporter
- Testing multiple consecutive sleeps
- Testing when no location available

### Gaps Identified

**Critical Gaps**:

1. **NO UNIT TEST FILE** - Action lacks dedicated golden test matching other meta-actions (waiting-golden.test.ts exists with 202 lines of comprehensive tests)

2. **Message Coverage Not Verified** - The action declares 13 required messages:
   - slept, dozed_off, fell_asleep, brief_nap, deep_sleep, slept_fitfully (success)
   - cant_sleep_here, too_dangerous_to_sleep, already_well_rested (error)
   - woke_refreshed, disturbed_sleep, nightmares, peaceful_sleep (quality)
   
   NO tests verify any of these messages are used or available

3. **No World State Verification** - Unlike waiting action tests that explicitly spy on `world.moveEntity()` and `world.setState()`, there are no tests confirming sleeping doesn't mutate state

4. **No Event Structure Tests** - No tests verify:
   - Event type is correct
   - Event data shape matches SleptEventData interface
   - Optional fields (location, comfortable, exhausted, etc.) are properly populated

5. **No Validation Path Tests** - Even though validation always succeeds now, there's no test coverage for the blocked() phase

6. **No Location Capture Tests** - Unlike waiting action which tests `sharedData.locationId` and `sharedData.locationName`, sleeping's location data is untested

7. **No Shared Data Flow Tests** - Execute stores analysis in sharedData; report retrieves it. No tests verify this contract

8. **Missing analyzeSleepAction() Test Coverage** - This helper function:
   - Builds SleptEventData
   - Sets eventData.location and eventData.locationName
   - Computes wakeRefreshed state
   - All UNTESTED

### Recommendations

**Create `/packages/stdlib/tests/unit/actions/sleeping-golden.test.ts`** with tests for:

1. **Action Metadata** (5 tests)
   - ID is IFActions.SLEEPING
   - Required messages declared (all 13)
   - Group is "meta"
   - requiresDirectObject = false
   - requiresIndirectObject = false

2. **Four-Phase Pattern Compliance** (8 tests)
   - Has validate/execute/report/blocked functions
   - validate always returns valid: true
   - execute returns void (not events)
   - execute stores location in sharedData
   - report returns events array with 2+ events
   - blocked returns events array
   - No world mutations during execute

3. **Event Emission** (4 tests)
   - Emits if.event.slept with turnsPassed: 1
   - Emits if.event.slept with location and locationName
   - Emits action.success with messageId 'slept'
   - Emits action.success with correct params

4. **SharedData Contract** (3 tests)
   - execute populates sharedData.messageId
   - execute populates sharedData.eventData
   - report retrieves and uses sharedData values

5. **No State Mutation** (3 tests)
   - Spy on world.moveEntity() - should not be called
   - Spy on world.setState() - should not be called
   - Spy on player.add() / player.remove() - should not be called

6. **Signal Action Pattern** (2 tests)
   - validate always succeeds (matches waiting pattern)
   - report emits exactly 2 events (if.event.slept + action.success)

**Total: ~25 tests following the waiting-golden.test.ts template**

### Risk Level: **HIGH**

**Why HIGH Risk?**

1. **Zero Test Coverage** - The action has ZERO unit tests while 42+ other stdlib actions have comprehensive golden tests. This is a pattern violation indicating untested code.

2. **Similar to Waiting but Untested** - The dropping action bug (mentioned in instructions) likely went undetected due to insufficient world state verification tests. Sleeping has the same pattern: 
   - No assertions about actual world state
   - No spy verification that mutations don't happen
   - Event structure untested

3. **Shared Data Contract Not Verified** - The execute→report handoff through sharedData is untested. If someone refactors the sharedData structure, tests would catch it; without tests, it's invisible.

4. **Language Layer Dependency** - 13 required messages are declared but never tested. If a game's lang-en-us is missing a message, this won't be caught until runtime.

5. **Pattern Compliance Not Verified** - The four-phase pattern isn't verified. A future refactor could accidentally add mutations to execute() and go undetected.

6. **Precedent of Bug in Similar Code** - The dropping action had bugs in its implementation that tests were meant to catch. Sleeping is similarly positioned as a time-passage meta action and should follow the same testing rigor.

**Comparison Risk Assessment:**
- **Waiting (7-point test file)**: ✓ Tested, LOW risk
- **Sleeping (0 tests)**: ✗ Untested, HIGH risk
- **Pattern**: Every other standard action has 15-40 test cases in a golden test file

### Action Items for User

The sleeping action should not be considered complete until it has a golden test file matching the pattern of waiting-golden.test.ts with at least 25 focused test cases covering the four-phase pattern, event emission, and no-mutation guarantees.
