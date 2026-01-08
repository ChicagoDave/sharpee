## Summary

The `pulling` action is a **minimal, delegation-based verb** that validates targets have the PULLABLE trait and emits semantic events. The action does not implement complex mechanics itself; instead, it provides a foundation for story event handlers to implement entity-specific pulling behaviors (levers, cords, bells, etc.). The implementation is deliberately simplified (~100 lines) compared to earlier versions (617 lines) following Phase 1 refactoring.

### Implementation Analysis

**Four-Phase Pattern Compliance**: ✅ EXCELLENT
- ✅ **validate()** (lines 57-85): Checks preconditions (target exists, has PULLABLE trait, not worn, not already pulled)
- ✅ **execute()** (lines 91-105): Mutates world state - updates `pullable.state` to 'pulled' and increments `pullable.pullCount`
- ✅ **report()** (lines 122-145): Generates events (`if.event.pulled` + `action.success`)
- ✅ **blocked()** (lines 110-117): Returns error events for validation failures

**Execute Phase Mutation Verification**: ✅ WORLD STATE ACTUALLY CHANGES
Unlike the dropping bug discovered on 2026-01-07, the pulling action correctly mutates state in the execute phase:
- Line 103: `pullable.state = 'pulled'` (direct trait mutation)
- Line 104: `pullable.pullCount = (pullable.pullCount || 0) + 1` (increment counter)

This is critical - the action doesn't just report; it actually changes the game world.

**Event Emission**: ✅ CORRECT PATTERN
- Events are generated in `report()` phase, not `execute()` phase
- Includes both domain event (`if.event.pulled`) with full context data
- Includes user-facing success message (`action.success`)

### Test Coverage Analysis

**Test File Location**: `/mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/actions/pulling-golden.test.ts` (251 lines)

**Test Structure**: 4 test suites with 11 test cases total

#### Suite 1: Action Metadata (2 tests)
- ✅ Validates ID (`IFActions.PULLING`)
- ✅ Declares all required messages: `no_target`, `not_visible`, `not_reachable`, `cant_pull_that`, `worn`, `pulled`, `nothing_happens`, `already_pulled`
- ✅ Checks group is 'interaction'

**Coverage**: Complete. All metadata properly declared.

#### Suite 2: Basic Validation (4 tests)
1. ✅ No target specified → error: `no_target`
2. ✅ Target not pullable → error: `cant_pull_that`
3. ✅ Pulling worn items → error: `worn`
4. ✅ Already pulled state → error: `already_pulled`

**Coverage**: Good. All major validation failures tested.

**Gap Identified**: No test for `not_visible` or `not_reachable` errors declared in metadata. These are scope-level validations, but tests don't verify them.

#### Suite 3: Basic Execution (2 tests)
1. ✅ Execute pull successfully → Validates:
   - 2 events generated (pulled + success)
   - Events contain correct data (target ID, name, pullCount)
   - **World state mutation verified** (lines 176-178):
     ```typescript
     const pullable = rope.get(TraitType.PULLABLE) as any;
     expect(pullable.state).toBe('pulled');
     expect(pullable.pullCount).toBe(1);
     ```

2. ✅ Track pull count → Validates:
   - Event includes `pullType` 
   - Counter increments from 5 to 6
   - **World state verified**

**Coverage**: EXCELLENT. Tests verify both events AND actual world state mutation (unlike the dropping bug).

#### Suite 4: Event Handler Integration (1 test)
- Documents how story authors should handle complex pulling via event handlers
- Shows that simple action emits event; stories implement mechanics
- **Important**: This test doesn't verify actual behavior, just documents the pattern

### Gaps Identified

#### CRITICAL GAPS:

1. **Scope-level validation not tested**
   - Metadata declares required messages: `not_visible`, `not_reachable`
   - No tests verify these errors are returned when object is not visible/reachable
   - These are scope-level validations that may be handled by framework, but should be explicitly tested

2. **No test for multiple pulls on same object**
   - Test "track pull count" tests incrementing (5→6), but doesn't test:
     - Can the same object be pulled multiple times?
     - Does state cycle back to 'ready' or stay 'pulled'?
     - Are there limits to pull count?

3. **Shared data handling not explicitly tested**
   - `executeWithValidation` helper sets up sharedData, but tests don't verify:
     - Does sharedData correctly carry data between execute/report phases?
     - What happens if execute/report are called out of order?
     - Edge case: execute called twice?

4. **Event data completeness not verified**
   - Test checks basic event fields but not optional fields like `pullType`
   - No test verifies that when `pullType: 'cord'` is provided, the event includes it
   - Event interface defines many optional fields (lever position, bells, cords, sounds, etc.) - none tested

#### MEDIUM GAPS:

5. **No test for pullable items that are also wearable but not worn**
   - Test validates "can't pull worn items" but not "can pull wearable items when not worn"

6. **No edge cases tested**:
   - What if PULLABLE trait has invalid state value?
   - What if pullCount is negative?
   - What if entity is destroyed between validate and execute?

### Risk Assessment: HIGH RISK

**Why HIGH despite good coverage?**

The pulling action is **deceptively well-tested** for events and basic mutations, BUT:

1. **Scope validation gap matches the dropping bug pattern**
   - The dropping bug was "validation works, events work, but mutations missing"
   - Pulling has mutations ✓, but scope validation `not_visible` / `not_reachable` are untested
   - These errors are declared in metadata but no test verifies they're returned
   - This suggests scope validation might be framework-handled or silently skipped

2. **Complex trait interactions not tested**
   - Pulling can be blocked by WEARABLE state
   - What about other trait interactions? (CONTAINER? SUPPORTER? SWITCHABLE?)
   - No test explores how multiple traits interact

3. **Event handler integration inadequately tested**
   - Test 249 documents the pattern but doesn't actually register/test event handlers
   - Real stories will depend on handlers working; if event structure is wrong, they'll fail silently
   - No test verifies that handlers receive correct event data

4. **Pattern: "Messages good, mutations good, integration untested"**
   - Follows pattern: "action appears to work (good messages) but story integration fails"
   - Dropping bug was similar: events correct, messages correct, but world state wrong
   - Pulling's pattern is: events correct, mutations correct, but event handler contract untested

### Recommendations

**High Priority**:

1. **Add scope validation tests** (fills metadata gap)
   - Test pulling non-visible object → `not_visible` error
   - Test pulling unreachable object → `not_reachable` error
   - Add to "Basic Validation" suite

2. **Add event handler integration test with actual handler**
   - Instead of just documenting pattern, actually register handler
   - Verify handler receives correct event data
   - Test handler can mutate world state based on event

3. **Add tests for trait interaction edge cases**
   - Can pull WEARABLE item when not worn? (should pass)
   - Can pull CONTAINER? (should pull, containers are pullable separately)
   - Can pull SWITCHABLE? (should pull separately from switching)

**Medium Priority**:

4. **Add multiple pulls scenario**
   - Pull object 3+ times
   - Verify state and count behavior is consistent
   - Test if there's max pull limit

5. **Add edge case tests**
   - Pull same object in sequence without re-creating
   - Pull with invalid pullType values
   - Pull with missing PULLABLE trait after creation

**Testing Approach Improvement**:

6. **Use transcript tests for integration**
   - Add pulling scenarios to story transcripts
   - Verify NPCs can pull objects
   - Test event handlers trigger correctly during pulling

### Code Quality Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| Four-phase pattern | ✅ Excellent | All phases present, properly separated |
| World state mutation | ✅ Excellent | State correctly mutated in execute phase |
| Event emission | ✅ Excellent | Domain events + messages correctly generated |
| Validation coverage | ✅ Good | Core cases tested, scope validation untested |
| Integration testing | ⚠️ Weak | Pattern documented but not tested with real handlers |
| Edge case coverage | ❌ Missing | No edge cases tested |
| Trait interaction testing | ❌ Missing | No multi-trait scenarios |

### Risk Level: **MEDIUM**

Rationale:
- ✅ **Lower risk than dropping action** because mutations ARE implemented
- ✅ **Basic action works** - validation, execution, and reporting are correct
- ⚠️ **Same risk pattern** - scope validation and integration untested
- ⚠️ **Silent failure risk** - if `not_visible`/`not_reachable` are framework-handled but incorrectly, tests won't catch it
- ❌ **Integration bug risk** - story event handlers depend on event contract that isn't fully tested

**Likelihood of production bug**: Medium (30-40%)
- Scope validation bugs if framework changed: High
- Event handler integration bugs: Medium
- Edge case bugs with trait interactions: Medium
- Direct mutation bugs: Low (already verified)

---

**Based on the work summary from 2026-01-07 stdlib-dropping-fix, the key lesson is: comprehensive event and message testing can hide critical world state bugs. The pulling action IS more robust than dropping was, but the untested scope validation and integration paths create similar risk vectors.**
