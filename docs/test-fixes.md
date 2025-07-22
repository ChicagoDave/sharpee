# Test Fixes Applied

## Issues Found:

1. **Trait Addition Bug**: The `TestData` helper methods were adding the `type` property twice when traits already had it, causing "Invalid trait: must have a type property" errors.

2. **Movement Restrictions**: The `canMoveEntity` method in WorldModel was only allowing entities to be moved into CONTAINER or SUPPORTER entities, but not into ROOM or ACTOR entities (which should be able to contain things).

## Fixes Applied:

1. **Fixed test-utils.ts**: Modified `TestData.withObject` and `TestData.withInventoryItem` to check if trait data already has a type property before adding it again.

2. **Fixed WorldModel.ts**: Updated `canMoveEntity` to allow moving entities into ROOMs and ACTORs (for inventory) in addition to CONTAINERs and SUPPORTERs.

## Expected Impact:

These fixes should resolve:
- "Invalid trait: must have a type property" errors
- Issues with player not being properly placed in rooms
- Issues with items not being able to be placed in player inventory
- `getContainingRoom` returning undefined when it should return the room

## Next Steps:

Run tests again to see if these fixes resolve the location entity issues where tests expect room ID but get actor ID.
