# Test Fixes Applied - Complete Summary

## Issues Found and Fixed:

### 1. **Trait Addition Bug** 
- **Issue**: The `TestData` helper methods were adding the `type` property twice when traits already had it
- **Fix**: Modified `TestData.withObject` and `TestData.withInventoryItem` to check if trait data already has a type property before adding it again

### 2. **Movement Restrictions**
- **Issue**: The `canMoveEntity` method only allowed entities to be moved into CONTAINER or SUPPORTER entities, not ROOM or ACTOR entities
- **Fix**: Updated `canMoveEntity` to allow moving entities into ROOMs and ACTORs (for inventory)

### 3. **Examining Self Issue**
- **Issue**: When examining self, the action was returning `{ self: true }` but tests expected `{ targetId, targetName }`
- **Fix**: Updated examining action to include targetId and targetName when examining self

### 4. **Asking Action Distance Check**
- **Issue**: The asking action was checking if target is in exact same location, not considering containment hierarchy
- **Fix**: Changed to use `context.canReach()` which properly checks if entities are in the same room

### 5. **Inserting Action Command Structure**
- **Issue**: The inserting action was incorrectly modifying the command structure when delegating to putting action
- **Fix**: Updated to properly set the preposition in the command structure

## Expected Impact:

These fixes should resolve:
- "Invalid trait: must have a type property" errors
- Issues with player not being properly placed in rooms
- Issues with items not being able to be placed in player inventory
- `getContainingRoom` returning undefined when it should return the room
- Location entity mismatches in events (expecting room ID but getting actor ID)
- Examining self not including expected data
- Asking action incorrectly reporting targets as "too far"
- Inserting action failing to delegate properly to putting action

## Design Issues Noted:

1. **Room/Actor Containment**: The original design didn't account for rooms and actors being natural containers. This is now fixed but may need further design consideration.

2. **Event Structure**: The enhanced context automatically adds entities (actor, target, location) to events, which is good for consistency but means actions need to be aware of this automatic behavior.

3. **Preposition Handling**: The command structure for prepositions is nested in `parsed.structure.preposition.text` which makes it somewhat complex to work with.

## Next Steps:

1. Run the tests again to verify these fixes resolve the issues
2. Look for any remaining test failures that might indicate other systemic issues
3. Consider adding integration tests that specifically test these edge cases
