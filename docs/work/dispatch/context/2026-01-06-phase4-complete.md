# Work Summary: ADR-090 Phase 4 Complete

**Date**: 2026-01-06
**Branch**: dispatch
**Status**: Phase 4 (Dungeo Migration) complete, Phase 5 remaining

## What Was Accomplished

### Phase 4: Dungeo Migration - Basket Elevator

Implemented the basket elevator in Project Dungeo using ADR-090 capability dispatch.

#### Files Created

1. **`stories/dungeo/src/traits/basket-elevator-trait.ts`**
   - `BasketElevatorTrait` class with `capabilities = ['if.action.lowering', 'if.action.raising']`
   - Stores position ('top' | 'bottom'), topRoomId, bottomRoomId
   - Type-safe configuration via `BasketElevatorConfig` interface

2. **`stories/dungeo/src/traits/basket-elevator-behaviors.ts`**
   - `BasketLoweringBehavior` - validates position, moves basket, handles player transport
   - `BasketRaisingBehavior` - same pattern for raising
   - `BasketElevatorMessages` - message IDs for success/failure events

3. **`stories/dungeo/src/traits/index.ts`**
   - Exports all basket elevator types and behaviors

4. **`stories/dungeo/tests/transcripts/basket-elevator.transcript`**
   - Integration test: lower/raise/lift commands, already-at-position errors

#### Files Modified

1. **`stories/dungeo/src/index.ts`**
   - Added import for `registerCapabilityBehavior`
   - Added import for basket trait and behaviors
   - Registered `BasketLoweringBehavior` and `BasketRaisingBehavior` in `initializeWorld()`
   - **Removed generic `lower/raise/lift :target` grammar patterns** (kept pole-specific patterns for Inside Mirror puzzle)

2. **`stories/dungeo/src/regions/coal-mine/objects/index.ts`**
   - Added `BasketElevatorTrait` import
   - Updated `createBasket()` to accept topRoomId and bottomRoomId
   - Replaced hacky `(basket as any).position` with proper trait

## Key Design Decisions

### Grammar Pattern Conflict Resolution

The story previously had generic patterns that conflicted with stdlib:
- Story: `lower :target` → `DUNGEO_LOWER` at priority 150
- Stdlib: `lower :target` → `if.action.lowering` at priority 100

**Solution**: Removed the generic story patterns and kept only pole-specific patterns:
```typescript
// Kept: specific patterns for Inside Mirror pole
grammar.define('lower pole').mapsTo(LOWER_ACTION_ID).withPriority(155).build();
grammar.define('lower short pole').mapsTo(LOWER_ACTION_ID).withPriority(156).build();

// Removed: generic patterns that conflicted with stdlib capability dispatch
// grammar.define('lower :target').mapsTo(LOWER_ACTION_ID).withPriority(150).build();
```

Now:
- "lower basket" → stdlib `if.action.lowering` → capability dispatch to `BasketLoweringBehavior`
- "lower pole" → story `DUNGEO_LOWER` → Inside Mirror puzzle logic

### Player Transport on Basket Move

When the basket moves and the player is inside:
1. Player's location is `basket.id`
2. Basket moves to new room
3. Since player's location IS the basket, they move with it automatically
4. Behavior emits `if.event.auto_look` to describe new location

## What's Next: Phase 5

### Cleanup Tasks
1. Remove any remaining type flags (`isBasketElevator`, etc.) - not applicable, never existed
2. Consider migrating other story-specific actions to capability dispatch (optional)

### Documentation Updates
1. Update `docs/reference/core-concepts.md` with capability dispatch pattern
2. Add more examples to ADR-090

### Testing
1. Run transcript test when dependencies are installed:
   ```bash
   node packages/transcript-tester/dist/cli.js stories/dungeo stories/dungeo/tests/transcripts/basket-elevator.transcript
   ```

## Build Status

Dependencies not installed (`node_modules` missing). Code compiles syntactically but needs full build verification.

## Implementation Notes

The basket elevator is now a proper proof-of-concept for capability dispatch:

1. **Trait declares capabilities**: `BasketElevatorTrait.capabilities = ['if.action.lowering', 'if.action.raising']`
2. **Behaviors implement 4-phase pattern**: validate/execute/report/blocked
3. **Story registers behaviors**: In `initializeWorld()` using `registerCapabilityBehavior()`
4. **Stdlib actions dispatch**: `loweringAction` finds trait, delegates to behavior
5. **One grammar pattern per verb**: No priority conflicts

This pattern can be extended to other story-specific mechanics like:
- Sceptre waving at Rainbow Falls
- Dial turning in Endgame
- Any other entity-specific verb behavior
