## Summary

The showing action allows the player to show objects to NPCs or other actors without transferring ownership. It's a social interaction action useful for puzzles where NPCs react to seeing specific items. The action follows the four-phase pattern (validate/execute/report/blocked) but differs from transfer actions like dropping in that it has **no world state mutations** - it's purely a messaging/event action.

## Implementation Analysis

### Four-Phase Pattern Compliance
- **✅ validate()**: Checks item exists, viewer exists, viewer is an actor, viewer is in same location, and prevents showing to self
- **✅ execute()**: Analyzes the show action - examines item traits (wearable status, identity), checks viewer's reaction preferences, stores analysis in sharedData
- **✅ report()**: Generates two events: `if.event.shown` (semantic event) and `action.success` (message event)
- **✅ blocked()**: Returns `action.blocked` events when validation fails

### World State Mutation
**None intentional.** The showing action correctly implements social behavior:
- `execute()` does NOT call `world.moveEntity()` - correct, as no ownership transfer should occur
- `execute()` only performs analysis and stores data in sharedData for reporting
- No traits are modified, no inventory changes, no container/supporter updates

This is fundamentally different from actions like TAKING, DROPPING, PUTTING that MUST mutate world state. Showing is correctly designed as a pure social/informational action.

### Event Emission
- ✅ Events are emitted correctly in `report()` phase, not `execute()`
- ✅ `if.event.shown` event includes item ID, viewer ID, worn status, and reaction flags
- ✅ `action.success` event includes messageId and display params
- ✅ blocked() returns proper error events with messageIds

## Test Coverage Analysis

### Tests That Exist (10 PASSING tests)
1. **Action metadata** (3 tests)
   - Correct action ID
   - All 14 required messages declared
   - Social group classification

2. **Precondition validation** (2 REAL, 7 SKIPPED)
   - ✅ No item specified → fails with 'no_item'
   - ✅ No viewer specified → fails with 'no_viewer'
   - ⏭️ SKIPPED: Not carrying item
   - ⏭️ SKIPPED: Showing worn item
   - ⏭️ SKIPPED: Viewer not visible
   - ⏭️ SKIPPED: Viewer too far away
   - ⏭️ SKIPPED: Viewer is not an actor

3. **No viewer reaction tests** (6 SKIPPED tests)
   - ⏭️ SKIPPED: Recognize specific items
   - ⏭️ SKIPPED: Impressed by certain items
   - ⏭️ SKIPPED: Unimpressed by certain items
   - ⏭️ SKIPPED: Examine certain items
   - ⏭️ SKIPPED: Nod at unspecified items
   - ⏭️ SKIPPED: Show to NPC with no reactions

4. **Successful showing** (0 REAL tests, 2 SKIPPED)
   - ⏭️ SKIPPED: Show item normally
   - ⏭️ SKIPPED: Show to NPC with no reactions

### Test Coverage Assessment

| Aspect | Coverage | Status |
|--------|----------|--------|
| Metadata | 100% | ✅ Complete |
| Basic validation (2 of 7) | 29% | ⚠️ CRITICAL |
| Viewer reactions | 0% | ❌ NONE |
| Success scenarios | 0% | ❌ NONE |
| Event structure | 0% | ❌ SKIPPED |
| Edge cases | 0% | ❌ SKIPPED |

**Key finding**: All meaningful tests are marked `.skip()` because they "depend on scope logic". However, the first two tests DON'T use scope logic - they work and pass.

## Gaps Identified

### CRITICAL GAPS

1. **No successful showing test**
   - Zero tests verify that showing actually generates correct events
   - Cannot verify `if.event.shown` event structure in success case
   - Cannot verify message selection logic works
   - Cannot verify worn item detection works
   - Cannot verify reaction analysis works

2. **No viewer reaction tests at all**
   - The most complex part of the action (reaction analysis) is completely untested
   - Lines 71-102 in showing.ts check viewer reactions but have no tests
   - Cannot verify reaction priority order (recognizes > impressed > unimpressed > examines > nods)
   - Cannot verify substring matching for reactions

3. **No world state verification** (though not needed for this action)
   - Tests verify events are emitted but don't verify event DATA is correct
   - Compare: dropping test verifies `itemName: 'red ball'`, showing tests only check message ID
   - Tests use `expect.stringContaining()` for messageId instead of exact matches

4. **All complex scenarios marked SKIPPED**
   - Wearing worn items
   - Different viewer locations
   - Different viewer types
   - Multiple sequential shows
   - Proper name item handling

### WHY TESTS ARE SKIPPED

The comment says: "Skip: depends on scope logic"

However:
- The first TWO precondition tests work WITHOUT scope logic (they just check entity existence)
- The core reaction analysis doesn't require scope logic - only validation does
- The `.skip()` markers appear to be **overly cautious placeholders** rather than blocked by real dependencies

## Recommendations

### Priority 1: Add Minimal Passing Tests (Low-Risk)

Add 4 simple tests that don't require scope logic:

```
Test 1: "Should emit if.event.shown with correct data"
  - Setup: Player with item, NPC in room
  - Execute: Show item to NPC
  - Verify: Event contains item.id, viewer.id, itemName, viewerName, isWorn: false

Test 2: "Should detect worn items"
  - Setup: Player wearing wearable item
  - Execute: Show worn item to NPC
  - Verify: Event contains isWorn: true, messageId includes 'wearing_shown'

Test 3: "Should check viewer reactions"
  - Setup: NPC with reaction for 'sword'
  - Execute: Show sword to NPC
  - Verify: messageId is 'viewer_recognizes', event.recognized = true

Test 4: "Should default to nod when no reactions match"
  - Setup: NPC with reactions for ['gold', 'crown']
  - Execute: Show 'iron sword' to NPC
  - Verify: messageId is 'viewer_nods'
```

### Priority 2: Enable Skipped Tests

Un-skip and implement the 7 validation tests that actually work without scope:
- They only check entity existence, not command parsing scope
- Re-enable: wearing worn item, viewer not visible, viewer too far, not an actor, showing to self

### Priority 3: Add Reaction Priority Test

Test the reaction priority order isn't reversed:
- NPC with reactions for both 'crown' AND 'impressive items'
- Show crown, verify it uses 'recognizes' (higher priority) not 'impressed'

### Priority 4: Add Edge Cases

- Empty reactions object on NPC
- Null reactions on NPC
- Item with proper name vs common name
- Case-insensitive matching

## Risk Level: **MEDIUM**

### Why MEDIUM (not HIGH):

✅ **Mitigating factors:**
1. The action has NO world state mutations, so it can't cause the "silent failure" bug from dropping
2. The logic is relatively simple (trait checks + substring matching)
3. Error cases ARE tested (at least the first 2)
4. The core action pattern (validate→execute→report) is correctly implemented

❌ **Risk factors:**
1. **Zero tests for the core feature** - showing reactions is completely untested
2. **Reaction priority logic is untested** - if priority order was reversed, we'd never know
3. **No verification of event data** - if event structure is wrong, tests won't catch it
4. **Similar to the dropping bug pattern** - that bug existed for months in tests that only checked messages, not behavior
5. **This action is event-driven** - if event data is wrong, downstream systems (NPCs, event handlers) will fail silently

### Likelihood of Undetected Bugs:

**HIGH** if:
- NPC reaction system depends on exact event data format (item name, recognized flag, etc.)
- Reaction priority matters for story puzzles
- Item identity checking is case-sensitive vs case-insensitive

**MEDIUM** if:
- Reaction system is flexible about data format
- Reaction priority is rarely used

**LOW** if:
- Showing is only used for flavor/cosmetic interactions with no game logic consequences

### Historical Context:

The dropping action had a nearly identical test structure:
- ✅ Metadata tests passed
- ✅ Basic "no item" validation passed
- ❌ Complex scenarios marked `.skip()`
- ❌ No world state verification
- **RESULT**: Critical bug (missing moveEntity) went undetected for months

The showing action follows the same pattern. While it can't have a "missing mutation" bug (mutations aren't needed), it CAN have:
- Wrong event data structure
- Broken reaction detection logic
- Incorrect message selection

## Summary Table

| Aspect | Implementation | Testing | Risk |
|--------|-----------------|---------|------|
| Metadata | ✅ Complete | ✅ Full | LOW |
| Validation | ✅ Complete | ⚠️ Partial (29%) | MEDIUM |
| Reaction Logic | ✅ Implemented | ❌ Zero tests | HIGH |
| Event Emission | ✅ Correct | ⚠️ Structure not verified | MEDIUM |
| World Mutations | ✅ Correctly absent | N/A | N/A |

**Overall Risk Level: MEDIUM** (could be HIGH if reaction logic is critical to story puzzles)
