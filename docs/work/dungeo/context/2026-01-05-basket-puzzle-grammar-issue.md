# Work Summary: Basket Puzzle - Grammar/Parser Issue

**Date**: 2026-01-05
**Status**: BLOCKED - Awaiting ADR-090 acceptance

## Resolution

**ADR-090 (Entity-Centric Action Dispatch)** addresses this problem. The solution:
1. Create `BasketElevatorTrait` declaring capabilities `['if.action.lowering', 'if.action.raising']`
2. Create `BasketLoweringBehavior` and `BasketRaisingBehavior` implementing 4-phase CapabilityBehavior
3. Stdlib `lowering`/`raising` actions dispatch to trait behaviors via capability lookup

See: `docs/architecture/adrs/adr-090-entity-centric-action-dispatch.md`

---
## Original Problem (Historical)

## Objective

Implement the basket elevator puzzle in the Coal Mine shaft (puzzle #25/25).

## What Was Built

### Files Created
1. `stories/dungeo/src/handlers/basket-handler.ts` - Handler with:
   - `lowerBasket()` / `raiseBasket()` functions
   - `initializeBasketHandler()` to set up room IDs and VehicleTrait
   - `canOperateBasket()` to check if player can operate from current location
   - Basket position state management ('top' / 'bottom')

2. `stories/dungeo/src/actions/basket/` - Action definitions:
   - `lower-basket-action.ts`
   - `raise-basket-action.ts`
   - `types.ts` with action IDs and message constants

3. `stories/dungeo/tests/transcripts/basket-elevator.transcript` - Test file

### Files Modified
- `regions/coal-mine/objects/index.ts` - Added wheel mechanism entity
- `handlers/index.ts` - Export basket handler
- `actions/index.ts` - Export basket actions
- `index.ts` - Registered handler, added messages, attempted grammar patterns

## The Problem

When player types "lower basket":

1. Parser matches `lower :target` pattern (priority 150)
2. Resolves "basket" to the basket entity in scope
3. Maps to `DUNGEO_LOWER` action (Inside Mirror pole action)
4. Inside Mirror action validates → fails because player isn't in Inside Mirror room

**Result**: "dungeo.lower.not_in_mirror" error instead of basket lowering.

## Attempted Solutions (All Wrong)

### Attempt 1: Literal grammar patterns
```typescript
grammar.define('lower basket').mapsTo(LOWER_BASKET_ACTION_ID)
```
**Why wrong**: Parser uses `:target` slot patterns for entity resolution. Literal "basket" doesn't resolve the entity properly.

### Attempt 2: Command transformer
Intercept LOWER action when target is basket, redirect to basket action.
**Why wrong**: Parsing should consider scope, not arbitrary post-parse transformations.

### Attempt 3: Scope constraints with `.where()`
```typescript
grammar
  .define('lower :target')
  .where('target', scope => scope.visible().matching({ isBasketElevator: true }))
  .mapsTo(LOWER_BASKET_ACTION_ID)
```
**Why wrong**: User says we shouldn't need a where clause. Parser should resolve "basket" to the actual entity, and the system should find the right action.

## Open Question

The parser resolves:
- verb: "lower"
- directObject: basket entity (from world model)

**How does the system determine which action to invoke?**

Options discussed:
1. ONE "lower" action that checks directObject type and dispatches internally
2. Grammar patterns with constraints that match entity properties
3. Something else in the parser/action resolution system

User indicates option 1 may be correct - a single action that handles different entity types based on the resolved directObject.

## Current State

- Build passes (with warnings about case-sensitive file)
- Transcript tests fail (action maps to wrong handler)
- Grammar patterns in index.ts are incomplete/incorrect

## Files to Clean Up When Resuming

- `stories/dungeo/src/handlers/basket-handler.ts` - Has incomplete command transformer code to remove
- `stories/dungeo/src/index.ts` - Grammar patterns need correction
- May need to merge basket logic into existing LOWER action instead of separate action

## Next Steps (When Clarified)

1. Understand correct parser → action resolution mechanism
2. Either:
   - Modify existing LOWER/LIFT actions to handle basket as directObject, OR
   - Implement correct grammar pattern approach
3. Fix transcript tests
4. Update implementation-plan.md (25/25 puzzles complete)
