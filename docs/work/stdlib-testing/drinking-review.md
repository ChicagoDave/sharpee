## Summary

The **drinking action** allows actors to consume drinkable items (beverages with the `isDrink` property set) or drink from containers with liquids. The action handles implicit taking (if the drink is in the room), supports multi-serving beverages, tracks liquid amounts, and accommodates various drink properties (taste, effects, nutrition, thirst satisfaction).

## Implementation Analysis

### Four-Phase Pattern: PARTIALLY INCOMPLETE

**Validate Phase**: ✅ Complete
- Checks for item existence
- Validates drinkable trait (isDrink=true or containsLiquid=true)
- Checks if already consumed
- Validates container is open (if applicable)

**Execute Phase**: ⚠️ **CRITICAL GAP - No world state mutation**
The execute phase only reads state and prepares event data:
```typescript
execute(context: ActionContext): void {
  // Only reads state, never mutates world
  const itemLocation = context.world.getLocation(item.id);
  const isHeld = itemLocation === actor.id;
  
  // Stores data for reporting, not mutations
  sharedData.itemId = item.id;
  sharedData.messageId = messageId;
  sharedData.eventData = eventData;
}
```

**This is suspicious** - compare to eating action which calls `EdibleBehavior.consume(item, actor)` to actually decrement servings. The drinking action generates event data but doesn't modify entity state.

**Report Phase**: ✅ Complete
- Emits if.event.taken if item wasn't held
- Emits if.event.drunk with drink data
- Returns success message with appropriate ID

**Blocked Phase**: ✅ Complete
- Returns action.blocked event with error message

## Test Coverage Analysis

### Test Cases Exist (37 tests total)

**Precondition Tests (5 tests)**:
- no_item, not_drinkable, already_consumed, container_closed ✅

**Successful Drinking (14 tests)**:
- drink from inventory, implicit take from room
- portions handling (some drunk, all drunk)
- taste variations (refreshing, bitter, sweet, strong/alcoholic)
- magical, healing, thirst-quenching drinks
- container drinking, emptying container
- container without tracked amount
- nutrition tracking ✅

**Verb Variations (3 tests)**:
- sip, quaff, swallow verbs ✅

**Event Structure (1 test)**:
- entity relationships in events ✅

**Pattern Examples (14 tests)**:
- Complex beverage system, container liquid system, drink effects, taste spectrum ✅

### CRITICAL GAP: **World State Mutations NOT Verified**

**No tests verify actual state changes after drinking:**
- No tests check if item location changes after drinking
- No tests verify if portions/servings actually decrease on the item
- No tests verify if liquid amounts actually decrease in containers
- No tests verify the consumed flag is set
- All tests only verify events and messages were emitted

Example gap in test:
```typescript
test('should drink item from inventory', () => {
  // ... setup and execute
  const events = executeWithValidation(drinkingAction, context);
  
  // Only checks events emitted
  expectEvent(events, 'if.event.drunk', { ... });
  expectEvent(events, 'action.success', { ... });
  
  // MISSING: Verification that:
  // - item.getTrait(EDIBLE).servings decreased
  // - item location changed to inventory
  // - consumed flag was set
});
```

## Gaps Identified

### 1. **No World State Mutations in Execute Phase** (SEVERITY: CRITICAL)
- The action should decrement portions/servings like eating does
- The action should decrement liquid amounts in containers
- The action should set consumed flag or similar
- **Currently**: Only event data is prepared, no entity mutation occurs
- **Risk**: Actions appear to work (good messages) but items remain unchanged, similar to the dropping bug

### 2. **Missing State Verification Tests**
- Tests only verify events/messages, not actual world state
- No `world.getEntity()` queries after execution
- No trait mutations verified (servings, liquidAmount, portions)
- No location changes verified
- **Risk**: Bugs like the dropping action can hide for months

### 3. **Unclear Item Removal Semantics**
- Does drinking remove the item from inventory? (Or just mark as consumed?)
- Does the item disappear from the room?
- Tests create items but never verify their final state
- The implicit take event suggests the item is taken, but then what?

### 4. **No Tests for Multi-Serve Consumption Sequence**
- Tests verify portions data in event, but not actual trait mutations
- Similar to eating action which tests `EdibleBehavior.consume()` across multiple calls
- Drinking should decrement portions each time, but no test verifies this

### 5. **Missing Error Cases**
- No test for item not visible/reachable (metadata says REACHABLE scope)
- No test for item in locked container
- No test for actor in location that doesn't support drinking

## Recommendations

1. **Add world state verification tests**:
   ```typescript
   test('should decrement portions after drinking', () => {
     const { world, item } = TestData.withInventoryItem('pot of tea', {
       [TraitType.EDIBLE]: {
         isDrink: true,
         portions: 4
       }
     });
     
     const events = executeWithValidation(drinkingAction, context);
     
     // VERIFY: World state changed
     const edible = item.getTrait(TraitType.EDIBLE);
     expect(edible.portions).toBe(3); // Decreased
   });
   ```

2. **Add liquid amount decrement tests**:
   ```typescript
   test('should decrement liquid amount in containers', () => {
     const { world, item } = TestData.withInventoryItem('flask', {
       [TraitType.CONTAINER]: {
         containsLiquid: true,
         liquidAmount: 5
       }
     });
     
     executeWithValidation(drinkingAction, context);
     
     const container = item.getTrait(TraitType.CONTAINER);
     expect(container.liquidAmount).toBe(4); // Decreased
   });
   ```

3. **Add sequential consumption tests**:
   ```typescript
   test('should properly track multi-serve consumption', () => {
     const drink = createDrink(portions: 3);
     
     // First drink
     executeWithValidation(drinkingAction, context);
     expect(drink.getTrait(EDIBLE).portions).toBe(2);
     
     // Second drink
     executeWithValidation(drinkingAction, context);
     expect(drink.getTrait(EDIBLE).portions).toBe(1);
     
     // Third drink - should mark consumed
     executeWithValidation(drinkingAction, context);
     expect(drink.getTrait(EDIBLE).consumed).toBe(true);
   });
   ```

4. **Implement actual mutations in execute phase** (if not already delegated):
   - Either call a DrinkingBehavior similar to EdibleBehavior.consume()
   - Or add mutations directly in execute phase

5. **Add reachability tests** (scope says REACHABLE):
   - Test drinking item in closed container
   - Test drinking item not visible to player

## Risk Level

**HIGH**

This action exhibits the exact same pattern as the dropping bug:
- ✅ Comprehensive reporting (events, messages)
- ✅ All validation checks
- ❌ **No verified world state mutations**
- ❌ **Tests only verify messages, not state**

The drinking action could have been silently broken for months because:
1. Tests pass (events are emitted correctly)
2. Human players see proper messages
3. No easy way to detect items never actually get consumed
4. The "consumed" property isn't actually being set, so drinking multiple times might work unexpectedly

**Likelihood of bugs going undetected**: Very High - Same as dropping bug

## References

- Dropping bug analysis: `/docs/work/dungeo/context/2026-01-07-stdlib-dropping-fix.md`
- Four-phase pattern: `/docs/reference/core-concepts.md`
- Eating action (correct pattern): `/packages/stdlib/src/actions/standard/eating/eating.ts` (calls EdibleBehavior.consume)
