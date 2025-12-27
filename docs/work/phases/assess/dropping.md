# Dropping Action - IF Logic Assessment

## Action Name and Description

**Dropping** - The fundamental action for releasing held objects and placing them at the player's current location (floor, container, or supporter).

## What the Action Does in IF Terms

The dropping action transfers an object from the player's inventory to a location. In standard IF, this is the inverse of taking: instead of acquiring an item, the player relinquishes it. The item can be dropped on the current room's floor, into an accessible container, or onto an accessible supporter (surface). This is essential for managing inventory constraints and world state changes.

## Core IF Validations It Should Check

### Fundamental IF Constraints

1. **Target exists** - The referenced object must be provided and resolve to a valid entity
2. **Object is held** - Only items in the player's inventory can be dropped (core IF assumption)
3. **Object is not worn** - If the item is being worn, it must be removed first; dropping doesn't implicitly remove worn items
4. **Drop location exists** - The player must be in a valid location capable of receiving items
5. **Drop location can accept item** - If dropping into a container/supporter, capacity and state constraints must be checked
6. **Container is open** - If dropping into a container with openable trait, it must be open (though messages suggest this is checked)
7. **Capacity limits** - Containers and supporters should not exceed item count limits

## Does the Current Implementation Cover Basic IF Expectations?

**YES - All fundamental validations are present:**

- ✓ Target existence check (line 54-56)
- ✓ Object-is-held check via ActorBehavior.isHolding() (line 59-64)
- ✓ Worn item check preventing drop (line 68-74)
- ✓ Drop location existence check (line 77-82)
- ✓ Container/supporter capacity check via ContainerBehavior.canAccept() (line 86-100)
- ✓ Capacity-specific error message for full containers (line 88-96)
- ✓ Drop action delegated to ActorBehavior (line 110)
- ✓ Location-sensitive success messages (dropped vs dropped_in vs dropped_on) (dropping-data.ts lines 105-123)

## Any Obvious Gaps in Basic IF Logic?

### Observation: Container Openability Not Explicitly Validated

The requiredMessages array includes 'container_not_open' (line 40) but this validation is **not present** in the validate() function. The implementation delegates capacity checking to ContainerBehavior.canAccept() but does not explicitly check if a container is open before allowing a drop into it.

This appears to be an **intentional design choice** - many IF systems allow dropping items into closed containers (they simply fall in), so this may be correct. However, the presence of the error message constant suggests the action was designed to check openability. If the design intent is to prevent dropping into closed containers, this check is missing.

### Coverage Assessment

- **Object validation**: 100% complete (exists, held, not worn)
- **Location validation**: Present but incomplete (existence checked, openability not explicitly checked)
- **Capacity constraints**: Delegated to behavior classes (correct architecture)
- **Error messaging**: Comprehensive for success cases; mostly complete for error cases

**Minor gap**: If the design requires containers to be open for dropping, add an explicit openability check before line 86. Otherwise, the implementation meets basic IF expectations.
