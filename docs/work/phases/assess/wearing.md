# Wearing Action - IF Logic Assessment

## Action Overview
The **wearing** action allows the player to put on clothing or wearable items. In interactive fiction terms, this represents the player equipping garments, accessories, or other wearable objects that can be worn on the body.

## What the Action Does (IF Perspective)
- Takes a wearable item from the player's inventory and puts it on
- Implicitly takes the item first if it's not already held
- Places the item in a body slot (e.g., torso, head, feet)
- Handles layering of items (wearing multiple items on the same body part)
- Prevents impossible wearable states (can't wear two non-layered items on same body part)

## Core IF Validations

### Basic Validations (Should Check)
1. **Item exists**: Player must specify a target item
2. **Item is wearable**: Only items with WEARABLE trait can be worn
3. **Item not already worn**: Cannot wear an item already being worn by the player
4. **No conflicting items**: Cannot wear an item that conflicts with already-worn items on same body part

### IF Expectations for Clothing/Wearables
- Player should be able to wear multiple items on different body parts
- Player should be able to layer items on the same body part (e.g., undershirt under shirt) if configured
- Non-layered items on the same body part should conflict (can't wear two hats at once)
- Layering rules should be enforced (can't wear outer layer under inner layer that's already worn)
- Item implicitly taken if not already in inventory (common IF behavior)

## Does Current Implementation Cover Basic IF Expectations?

### What It Covers Well
✓ **Validation phase** checks for missing item, non-wearable items, and already-worn items
✓ **Conflict detection** prevents wearing non-layered items on same body part
✓ **Layering logic** prevents wearing items under already-worn outer layers
✓ **Implicit take** automatically takes item if not held
✓ **Three-phase pattern** correctly separates validation, execution, and reporting
✓ **Defensive checks** in execute phase handles edge cases from behavior
✓ **Event generation** creates appropriate WORN and implicit TAKEN events

### What It Does NOT Check
- **Item reachability**: No validation that item is reachable/visible to player (relies on parser scope)
- **Actor ability**: No check that the actor can physically wear items (assumes all actors can wear)
- **Removal restrictions**: No validation of `canRemove` flag during wear (should you be able to wear items marked "can't remove"?)
- **Weight/bulk constraints**: No validation against carrying capacity while wearing
- **Item condition**: No validation that item is wearable in its current state (e.g., torn clothing)
- **Wearable-specific properties**: No validation of `wearableOver` flag - items that can't be worn over others

## Obvious Gaps in Basic IF Logic

### Gap 1: Removal Restriction Check
The WEARABLE trait has a `canRemove` property, but wearing doesn't validate this. Should you be able to wear an item that can't be removed? This is an edge case but IF games sometimes have cursed or permanently-wearable items.
- **Severity**: Low (edge case) - typically items you can't remove should already block removal, not wearing

### Gap 2: Wearable-Over Flag Not Validated
The `wearableOver` property exists on WEARABLE trait but isn't checked. This should prevent wearing an item over certain other items, but current implementation only checks layering by order.
- **Severity**: Low-Medium (incomplete feature) - partially implemented through layering system

### Gap 3: No Actor Capability Check
What if the actor doesn't have a hand/body part needed for a slot? No validation exists.
- **Severity**: Low (design assumption) - assumes all actors have all body parts; should be addressed in trait configuration

## Assessment Conclusion

The wearing action **covers essential IF expectations** for basic clothing operations. It validates wearability, prevents conflicting items, handles layering, and generates proper events. The implementation follows the three-phase pattern correctly.

**Primary limitation**: Some advanced wearable properties (`canRemove`, `wearableOver`) are defined in the trait but not enforced during wearing. These appear to be planned features (see TODO comments in WearableBehavior) rather than implementation gaps. The current scope is appropriate for basic IF wearing behavior.

**Overall**: **Good for basic IF** - handles core use case of putting on/removing clothes with proper conflict detection. Advanced wearable mechanics would require additional validation rules.
