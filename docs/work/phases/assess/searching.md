# IF Logic Assessment: Searching Action

## Action Overview

**Action Name:** Searching (SEARCHING)

**Brief Description:** Allows players to search objects, containers, supporters, or the current location to discover hidden or concealed items.

## What It Does in IF Terms

Searching is a fundamental sensory action that extends the player's ability to discover items beyond simple visibility. It enables:

- **Looking inside/under things**: Search containers (boxes, drawers) and supporters (tables, shelves)
- **Discovering concealed items**: Items marked as hidden are revealed when searched
- **Exploring locations**: Search the current room to find items present there
- **Detailed inspection**: Different message feedback for different target types

## Core IF Validations

The action should check that:

1. **Target exists and is reachable** - Player can physically access what they're searching
2. **Containers must be open** - Can't search a closed box or locked drawer (physical constraint)
3. **Target is searchable** - Some objects may not be valid search targets (though current implementation allows any object)
4. **Player can perceive the target** - Must be visible/aware of what they're searching

## Current Implementation Coverage

### What It Covers (✓)

- **Container validation**: Correctly checks if a container is openable AND open before allowing search
- **Concealed item revelation**: Properly reveals hidden items via IdentityBehavior.reveal()
- **Content differentiation**: Distinguishes between containers, supporters, and generic objects with appropriate messages
- **Empty vs. full feedback**: Returns different messages for empty containers vs. those with contents
- **Message precision**: Uses different message IDs for different scenarios (found_concealed, empty_container, container_contents, supporter_contents, etc.)
- **Location searching**: Allows searching current room without specifying a target (no target = search location)
- **Four-phase pattern**: Properly implements validate/execute/blocked/report phases
- **SharedData pattern**: Correctly uses context.sharedData to pass execution results to report phase

### What It Doesn't Cover (✗)

1. **Reachability validation**: The action doesn't validate that the target is reachable. It accepts any entity that the parser provides but doesn't check canReach() in validation phase.

2. **Visibility requirement**: Searching something you can't see seems problematic from an IF perspective. No check for canSee() or visibility.

3. **Target type validation**: The implementation allows searching any object. Some objects (scenery, walls, abstract things) shouldn't be searchable - only containers, supporters, and furniture-like objects.

4. **Supporter validation**: Unlike containers, supporters aren't checked for open/closed state. If a supporter (table) could theoretically be "blocked" or covered, there's no validation for this.

## Gap Analysis: Basic IF Logic

| IF Expectation | Implementation | Status |
|---|---|---|
| Must reach target to search it | No reachability check in validation | **Gap** |
| Must see target to search it | No visibility check in validation | **Gap** |
| Closed containers block search | Checked for openable AND open | **Covered** |
| Can search generic locations | Location search without target works | **Covered** |
| Hidden items are revealed | revealConcealedItems() called | **Covered** |
| Can't search non-searchable things | No validation of searchability | **Gap** |
| Appropriate feedback messages | Message selection logic is good | **Covered** |

## Key Observations

**Strengths:**
- The concealment/reveal mechanism is clean and well-integrated
- Message determination logic elegantly handles all object types
- Four-phase pattern properly separates concerns
- Helpers (analyzeSearchTarget, buildSearchEventData) are well-factored

**Concerns:**
- **Reachability gap**: Players could search items in other rooms if parser allows it
- **Visibility gap**: Searching invisible items feels wrong ("search the ghost?")
- **Searchability assumption**: Implementation assumes everything is searchable, which contradicts IF conventions where not all objects can be meaningfully searched

## Recommendations for Consideration

1. Add `context.canReach(target)` check in validate phase
2. Consider adding `context.canSee(target)` check in validate phase (or document why visibility isn't required for searching)
3. Add optional SEARCHABLE trait or check container/supporter type to restrict what can be searched
4. Document the design decision about why/how location search works without a target

## Conclusion

The searching action implements the core IF mechanic (reveal concealed items) correctly and follows proper architectural patterns. However, it has observable gaps in basic spatial and perception validation that could allow edge cases like searching unreachable or invisible objects. These should be addressed for robust IF semantics.
