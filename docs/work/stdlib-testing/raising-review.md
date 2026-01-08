## Summary

The raising action is a **capability-dispatch action** (ADR-090) that delegates to trait-specific behaviors instead of having fixed semantics. It's used for entities like basket elevators, drawbridges, and blinds where "raising" means different things depending on what's being raised.

---

## Implementation Analysis

### Four-Phase Pattern Compliance: **PASS**

The raising action correctly implements all four phases through the capability dispatch factory:

1. **validate()** - ✅ Checks:
   - Target entity exists (directObject)
   - Trait with `if.action.raising` capability exists on target
   - Behavior is registered for the trait+capability
   - Delegates to behavior's validate() method
   - Returns ValidationResult with data payload

2. **execute()** - ✅ Mutation phase:
   - Retrieves behavior and shared data from validation result
   - Delegates to behavior.execute(entity, world, playerId, sharedData)
   - Actual mutations happen in behavior (e.g., `trait.position = 'top'`)

3. **report()** - ✅ Event generation:
   - Calls behavior.report() which returns CapabilityEffect[]
   - Converts effects to semantic events via `effectsToEvents()`
   - Returns ISemanticEvent[] for reporting service

4. **blocked()** - ✅ Failure handling:
   - Calls behavior.blocked() for validation failures
   - Falls back to generic error event if no behavior
   - Converts effects to events

### State Mutation Verification: **PARTIAL**

The raising action factory itself only delegates - actual mutations happen in trait behaviors. The `BasketRaisingBehavior` correctly mutates world state:

```typescript
execute(entity, world, actorId, sharedData): void {
  const trait = entity.get(BasketElevatorTrait);
  if (!trait) return;
  
  // ✅ Direct mutation: changes trait state
  trait.position = 'top';
  
  // ✅ World mutation: moves player
  const playerTransported = transportPlayerIfInBasket(entity, world, trait.topRoomId);
  sharedData.playerTransported = playerTransported;
}
```

The behavior **does mutate world state properly**, but tests don't always verify the mutations occurred.

---

## Test Coverage Analysis

### Unit Tests for Capability Dispatch Infrastructure

**File:** `/mnt/c/repotemp/sharpee/packages/world-model/tests/unit/capabilities/capability-dispatch.test.ts`

**Test cases covering raising:**
1. ✅ `traitHasCapability` - Finds raising capability on TestLowerableTrait
2. ✅ `getEntityCapabilities` - Returns raising among capabilities
3. ✅ `buildEntity` - Tracks claimed capabilities including raising
4. ✅ Generic `CapabilityBehavior` tests - validate/execute/report/blocked phases tested with lowering behavior

**CRITICAL GAP:** These infrastructure tests use `TestLowerableTrait` which declares both `if.action.lowering` AND `if.action.raising`, but:
- Only **lowering behavior is registered and tested** (lines 259-263)
- **Raising is never tested**, only mentioned in capability declarations
- No test exercises the raising behavior path in capability dispatch

### Integration Tests

**File:** `/mnt/c/repotemp/sharpee/stories/dungeo/tests/transcripts/basket-elevator.transcript`

Test cases:
1. ✅ Setup (GDT, lantern, navigate to Shaft Room)
2. ✅ Examine basket
3. ✅ Lower basket (success)
4. ✅ Lower basket again (already at bottom - blocked)
5. ✅ Raise basket (success)
6. ✅ Raise basket again (already at top - blocked)
7. ✅ Alternate verb: lift basket (synonym for raise)
8. ✅ State tracking across operations

**Strengths:**
- Tests both success and blocked paths
- Verifies "already up" constraint works
- Tests verb aliases (lift = raise)
- Tests state persistence (can't raise twice)

**Weaknesses:**
- Uses message matching patterns like `[OK: contains "raise"]` - very loose
- Does **NOT verify actual world state changes** (e.g., basket position, player location)
- Does **NOT test player transportation** (the basket should move the player between rooms)
- Does **NOT test error messages** - only checks that responses contain keywords

### Missing Unit Tests for Raising Action

**NO unit tests exist for `raisingAction` itself.** The action is only tested via:
- Integration transcript tests (loose message matching)
- Infrastructure tests that don't cover raising behavior

Compare to dropping action which has 513 lines of unit tests in `dropping-golden.test.ts`. The raising action has **zero dedicated unit tests**.

---

## Gaps Identified

### 1. **No Dedicated Unit Test File** (HIGH RISK)

Unlike other stdlib actions (dropping, taking, etc.), there is no:
- `packages/stdlib/tests/unit/actions/raising-golden.test.ts`
- Unit tests for the raisingAction factory function directly

### 2. **Behavior Validation Not Tested** (HIGH RISK)

The capability dispatch infrastructure tests only test the lowering behavior. The raising behavior in `BasketRaisingBehavior` is never unit tested for:
- ✅ validate() with position='top' → error 'already_up'
- ✅ validate() with position='bottom' → valid
- ✅ execute() mutates trait.position to 'top'
- ✅ execute() transports player via world.moveEntity()
- ✅ report() emits 'if.event.raised' event
- ✅ blocked() returns appropriate error events

### 3. **World State Mutations Not Verified** (MEDIUM RISK)

The transcript test doesn't verify:
- Entity trait position actually changed (could be bug in execute())
- Player was actually moved (could be bug in transportation logic)
- Events contain correct entity IDs and parameters

This is the **exact pattern that led to the dropping bug** - execute() wasn't called, but tests passed because they only checked messages.

### 4. **Entity References in Events Not Validated** (MEDIUM RISK)

Similar to dropping tests, the raising action should verify:
- Event payloads have correct targetId, targetName
- Event entities include actor, target, location IDs
- The "if.event.raised" event has correct structure

### 5. **Scope Validation Not Tested** (LOW RISK)

The raisingAction uses `ScopeLevel.REACHABLE` (default). No tests verify:
- Can raise items only in scope
- Can't raise invisible items
- Can't raise items in dark locations (without light)

---

## Recommendations

### Critical (Must Add)

1. **Create unit test file: `packages/stdlib/tests/unit/actions/raising-golden.test.ts`**
   
   Should include:
   - Action metadata tests (ID, group, requiredMessages)
   - Precondition tests (no_target, cant_raise_that)
   - Behavior integration tests that:
     - Setup entity with BasketRaisingBehavior
     - Call validate() → verify position check
     - Call execute() → verify trait.position changed
     - Call execute() + report() → verify events emitted
     - Test blocked() path for already_up error

2. **Add unit test for BasketRaisingBehavior specifically**
   
   Should verify:
   - validate(): position='top' returns already_up error
   - validate(): position='bottom' returns valid
   - execute(): trait.position changes to 'top'
   - execute(): playerTransported stored in sharedData
   - report(): emits if.event.raised with correct payload
   - report(): emits auto_look if player transported
   - blocked(): emits action.blocked with messageId

3. **Add infrastructure test for raising behavior in capability-dispatch.test.ts**
   
   Similar to the lowering behavior test (lines 49-73) but testing:
   - Register raising behavior for TestLowerableTrait
   - Test raising validation/execute/report/blocked cycle
   - Verify position changes from 'bottom' to 'up'

### Important (Should Add)

4. **Enhance basket-elevator.transcript to verify state changes**
   
   Add verification patterns like:
   - `[STATE: basket.position = 'bottom']` after lowering
   - `[STATE: basket.position = 'top']` after raising
   - `[STATE: player.location = bottom-of-shaft-room-id]` for transportation

5. **Test entity transportation in transcript or unit tests**
   
   Setup where player is in basket, then raise/lower, verify:
   - Player moved to destination room
   - Player no longer in basket
   - Auto-look event triggered

---

## Risk Level: **MEDIUM**

**Reasoning:**

- **Positive factors:**
  - Capability dispatch factory is well-tested (infrastructure tests pass)
  - Concrete BasketRaisingBehavior correctly implements 4-phase pattern
  - Integration test exists and covers basic happy path
  - No hardcoding errors detected in implementation

- **Risk factors:**
  - ⚠️ **No unit tests for the action itself** (unlike all other stdlib actions)
  - ⚠️ **Tests don't verify world state mutations**, only messages
  - ⚠️ **Behavior tests are missing** - raising behavior never tested in isolation
  - ⚠️ **This is the pattern that caught the dropping bug** - loose message checking while execute() might be broken
  - ⚠️ **Player transportation logic is complex** but not unit tested

**Unlike CRITICAL for dropping bug**, this would only manifest if:
1. The raising action somehow bypassed calling behavior.execute() (unlikely given factory implementation)
2. The basket position trait mutation failed silently
3. The player transportation logic was broken

However, **the pattern that enables bugs (loose test coverage) is present here**. The raising action deserves the same rigor as other stdlib actions.

---

This review identifies a systematic test coverage gap: capability-dispatch actions get less scrutiny than fixed-semantics actions, but they're more complex (they delegate to behaviors). The raising action is well-implemented but under-tested.
