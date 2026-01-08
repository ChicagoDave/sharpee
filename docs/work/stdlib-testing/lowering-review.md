## Summary

The `lowering` action (and its counterpart `raising`) is a **capability-dispatch action** that delegates to trait behaviors rather than implementing fixed semantics. It's located in `/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/lowering/` and dispatches to entities that declare the `if.action.lowering` capability.

## Implementation Analysis

**Four-Phase Pattern Compliance: YES - Delegated to Behaviors**

The lowering action follows the four-phase pattern through the capability dispatch system:

1. **validate()** (line 95-153 in capability-dispatch.ts):
   - Checks for target entity existence
   - Finds trait with the capability
   - Gets registered behavior
   - Delegates validation to behavior.validate()

2. **execute()** (line 155-165):
   - Delegates to behavior.execute()
   - No direct world state mutation in the action itself

3. **report()** (line 195-211):
   - Delegates to behavior.report()
   - Converts CapabilityEffect[] to semantic events

4. **blocked()** (line 167-193):
   - Handles validation failures
   - Delegates to behavior.blocked()
   - Returns appropriate error events

**World State Mutation: DELEGATED (Not Direct)**

The lowering action itself does NOT mutate world state. Instead:
- The registered behavior (e.g., `BasketLoweringBehavior`) performs the mutations in its execute phase
- Example: BasketElevatorTrait position changes from 'top' to 'bottom' (line 102 in basket-elevator-behaviors.ts)
- Player transportation also happens in behavior's execute phase (line 105)

**Event Emission: YES - Properly Delegated**

Events are emitted through the report() phase, which receives CapabilityEffect[] from the behavior and converts them to ISemanticEvent[] (lines 51-56, capability-dispatch.ts).

## Test Coverage Analysis

**CRITICAL FINDING: NO UNIT TESTS EXIST FOR LOWERING/RAISING ACTIONS**

Searching `/mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/actions/`:
- ❌ No `lowering-golden.test.ts`
- ❌ No `raising-golden.test.ts`
- ❌ No `lowering.test.ts`
- ❌ No `raising.test.ts`

Compare to other similar actions:
- ✅ `taking-golden.test.ts` - 270+ lines
- ✅ `dropping-golden.test.ts` - 300+ lines
- ✅ `opening-golden.test.ts` - exists
- ✅ `closing-golden.test.ts` - exists

**Existing Test Coverage:**

1. **Capability System Tests** (capability-dispatch.test.ts):
   - Tests the generic capability dispatch infrastructure
   - Tests trait capability detection
   - Tests behavior registry
   - Line 252-313: Tests CapabilityBehavior pattern with a TestLowerableTrait
   - But these are NOT specific to the lowering action itself

2. **Story Integration Tests** (basket-elevator.transcript):
   - Tests `LOWER BASKET` command flow
   - Tests `RAISE BASKET` command flow
   - Tests "already lowered" validation failure
   - Tests alternate verb "lift" for raising
   - But this is integration test only, does NOT verify world state directly

**Four Phases Coverage in Existing Tests:**

From capability-dispatch.test.ts (generic tests):
- ✅ validate() - tested (lines 270-286)
- ✅ execute() - tested (lines 288-294)
- ✅ report() - tested (lines 296-303)
- ✅ blocked() - tested (lines 305-312)

But these are **generic capability system tests**, NOT tests of the lowering action's integration with the system.

From basket-elevator.transcript (integration):
- ✅ Happy path: LOWER BASKET succeeds
- ✅ Blocked case: Try to lower when already down
- ✅ Happy path: RAISE BASKET succeeds
- ✅ Blocked case: Try to raise when already up
- ❌ No verification of actual position mutation
- ❌ No verification of player transportation
- ❌ No verification that basket doesn't move to wrong room
- ❌ No edge cases (invalid targets, etc.)

## Gaps Identified

### CRITICAL GAPS (Risk of Silent Bugs):

1. **No Unit Tests for Capability Dispatch Integration**
   - No test verifies that the lowering action correctly finds the trait and behavior
   - No test verifies that it passes the entity correctly to the behavior
   - No test verifies that sharedData flows correctly between phases
   - This is exactly where the "dropping bug" could happen again

2. **No World State Verification Tests**
   - Transcript test checks for "lower" in output but NOT that position actually changed
   - No test verifies `trait.position` changed from 'top' to 'bottom'
   - No test verifies player was actually transported to the correct room
   - No test verifies events contain correct targetId/data

3. **No Error Handling Tests**
   - No test for entity without the capability trait
   - No test for unregistered behavior (configuration error)
   - No test for null/undefined entities
   - No test for scope validation

4. **No Edge Cases**
   - No test for lowering non-lowerable objects
   - No test for lowering when already at bottom
   - No test for invalid command targets
   - No test for player NOT in basket (should work, basket stays at location)

5. **Missing Test Cases from Dropping Pattern**

Dropping test has 300+ lines covering:
- No target specified
- Not holding item
- Worn item special handling
- Container checks (open/closed)
- Container capacity
- Player location context
- Room vs container vs supporter
- Multiple drop destinations
- Quiet vs careful dropping

But lowering has transcript-only coverage.

### MODERATE GAPS:

6. **Grammar Integration Not Tested**
   - Parser grammar defines `.forAction('if.action.lowering').verbs(['lower', 'lower'])` but no test verifies the command reaches the action

7. **Scope Level Not Tested**
   - The dispatcher uses `ScopeLevel.REACHABLE` by default but no test verifies scope is enforced correctly

8. **No Alternate Verb Testing** (except in transcript)
   - Grammar allows "lift" as alternate for raising
   - Transcript tests it but unit test doesn't

## Recommendations

### HIGH PRIORITY (Must Add):

1. **Create `lowering-golden.test.ts`** with full unit test suite:
   ```
   - No target specified (blocked)
   - Target lacks capability (blocked)
   - Unregistered behavior (blocked)
   - Valid target with behavior (success)
   - Verify world state mutation
   - Verify events contain correct data
   - Verify sharedData flows through phases
   ```

2. **Create `raising-golden.test.ts`** with matching suite

3. **Enhanced basket-elevator.transcript** tests:
   ```
   Add assertions that verify:
   - basket position actually changed (e.g., "examine basket" shows different state)
   - player was transported (location should change after basket moves)
   - player inventory preserved during transport
   - multiple up/down cycles work correctly
   ```

### MEDIUM PRIORITY:

4. **Test behavior registration failure**:
   - Register trait without behavior
   - Verify proper error handling and message

5. **Test edge cases**:
   - Try to lower object not in scope
   - Try to lower object without trait
   - Try to lower in wrong location

6. **Test grammar integration**:
   - Verify command "lower basket" correctly routes to lowering action
   - Verify alternate verb "lift basket" routes to raising action

## Risk Assessment

**RISK LEVEL: HIGH**

### Why HIGH Risk:

1. **No Direct Unit Tests**: The lowering action has ZERO unit tests in the stdlib test suite. It only has integration tests via transcripts.

2. **Pattern Matches Previous Bug**: The "dropping bug" mentioned in the review request involved:
   - State not being mutated during execute phase
   - Wrong values in events
   - Off-by-one errors in container handling
   
   Without unit tests verifying world state AFTER execute phase, lowering could have similar issues.

3. **Complex Behavior Delegation**: The capability dispatch pattern is new (ADR-090) and involves:
   - Finding the right trait
   - Getting the registered behavior
   - Passing sharedData through 4 phases
   - Converting effects to events
   
   Each step could fail silently if only testing with transcript (which only checks output text, not state).

4. **Transport Logic**: BasketLoweringBehavior transports the player - a complex operation that could:
   - Fail to move player
   - Move player to wrong room
   - Leave inventory behind
   - Not emit necessary "look" event
   
   Without unit tests checking the player entity's location AFTER execute, bugs go undetected.

5. **No Regression Tests for Capability System**: The generic capability tests in world-model are good, but don't verify that stdlib's lowering action integrates correctly with those abstractions.

### Example Bug That Could Exist:

```typescript
// Current code: line 102 in basket-elevator-behaviors.ts
trait.position = 'bottom';

// But what if execute() doesn't run? No test would catch it.
// What if position changes but player doesn't transport? No test checks.
// What if events are emitted with wrong targetId? Only output text is tested.
```

### Likelihood: MEDIUM-HIGH

- The capability dispatch system is well-designed
- But it's NEW code (ADR-090) with minimal test coverage
- Only integration tests via transcripts
- No unit-level verification of state changes
- No verification that behavior methods are actually called with correct parameters

## Summary Table

| Aspect | Status | Gap |
|--------|--------|-----|
| validate() phase | ✅ Implemented | ❌ Not unit tested |
| execute() phase | ✅ Implemented | ❌ No test verifies world state change |
| report() phase | ✅ Implemented | ❌ Not tested for correct events |
| blocked() phase | ✅ Implemented | ❌ Not tested |
| Four-phase pattern | ✅ Correct | ⚠️ Only integration tested |
| World state mutation | ✅ In behavior | ❌ No unit test verifies it happens |
| Event emission | ✅ Correct path | ❌ No unit test verifies events |
| Error handling | ✅ Has code | ❌ Not tested |
| Edge cases | ❌ Not covered | ❌ No unit tests |
| Transcript coverage | ⚠️ Basic | ⚠️ No state verification |

---

## Detailed Test Template Recommendations

To match the dropping-golden.test.ts pattern, lowering-golden.test.ts should include:

```typescript
// 1. Action Metadata Tests
- id is correct
- group is correct
- requiredMessages declared

// 2. Four-Phase Pattern Tests
- has validate, execute, report, blocked methods
- execute() actually mutates state

// 3. Precondition Tests
- no target -> blocked
- target lacks capability -> blocked
- behavior validation fails -> blocked

// 4. Success Tests
- valid target with behavior -> success
- verify trait state actually changed
- verify events contain correct data

// 5. Blocked Tests
- verify correct error messages
- verify behavior.blocked() is called

// 6. Integration Tests
- verify sharedData passes through phases
- verify behavior is found and called
- verify effects are converted to events correctly
```

---

This analysis shows that while the lowering action implementation is correct architecturally, the test coverage is critically insufficient and leaves the code vulnerable to the same class of bugs (state mutation failures) that have occurred before.
