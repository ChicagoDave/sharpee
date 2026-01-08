## Summary

The stdlib "putting" action moves items onto supporters or into containers. The action validates that items are carried, that the destination can accept the item, and then delegates to `ContainerBehavior.addItem()` or `SupporterBehavior.addItem()` for the actual placement logic. Line 227 and 388 explicitly call `context.world.moveEntity(item.id, target.id)` to move the entity, which is the critical mutation required by the four-phase pattern.

## Implementation Analysis

**Four-Phase Pattern Compliance: YES**
- ✅ `validate()` (lines 322-348): Checks preconditions
- ✅ `execute()` (lines 350-389): Mutates world state AND calls `moveEntity()`
- ✅ `report()` (lines 391-445): Generates semantic events
- ✅ `blocked()` (lines 447-460): Handles validation failures

**World State Mutation in Execute Phase: YES**
The execute phase explicitly calls `context.world.moveEntity(item.id, target.id)` at:
- Line 227 (single-object path)
- Line 388 (multi-object path, in `executeSingleEntity` helper)

This is the **critical difference from the dropping bug**. The putting action does NOT assume that behaviors alone will handle movement.

**Event Emission: CORRECT**
- Events are emitted in the `report()` phase, not in `execute()`
- Uses `context.event()` to create semantic events (`if.event.put_in` and `if.event.put_on`)
- Properly distinguishes between container vs. supporter with the `preposition` field

## Test Coverage Analysis

**Test File**: `/mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/actions/putting-golden.test.ts` (835 lines)

**Test Count**: 26 tests organized into 7 describe blocks

### Four-Phase Pattern Tests:
1. ✅ Line 46-50: Methods exist (`validate`, `execute`, `report`)
2. ✅ Line 52-69: Events generated via `report()`, not elsewhere
3. ⚠️ ISSUE: **No direct world state verification in the tests**

### All Four Phases Covered:
- **Validate**: 10 tests (precondition checks, container closed, dual nature objects)
- **Execute**: 0 direct world state tests
- **Report**: 6 tests (event structure, event data)
- **Blocked**: Covered implicitly via validation tests

### Specific Test Coverage:

**Precondition Checks (Validate Phase)**:
- No target specified ✅
- No destination specified ✅
- Put item in itself ✅
- Put item on itself ✅
- Item already in destination ✅ (test exists but incomplete - lines 180-210)

**Container Placement**:
- Put in open container with explicit preposition ✅
- Auto-detect container without preposition ✅
- Fail when container closed ✅
- Fail with wrong preposition for container ✅

**Supporter Placement**:
- Put on supporter with explicit preposition ✅
- Auto-detect supporter without preposition ✅
- Fail with wrong preposition for supporter ✅

**Capacity Checks**:
- Respect item limit ✅
- Respect weight limit ✅
- Respect supporter item limit ✅
- Volume capacity ✅
- Items without weight/volume ✅

**Edge Cases**:
- Handle target that is neither container nor supporter ✅
- Handle alternative prepositions (onto, into, inside) ✅
- Handle container without capacity limits ✅
- Complex capacity calculation ✅

## CRITICAL GAP IDENTIFIED

**Missing Direct World State Verification:**

The test suite validates that EVENTS are created correctly, but does NOT verify that `moveEntity()` was actually called and that the item's location changed. This is exactly the bug pattern that was found in the dropping action.

Example: Test at line 214-252 verifies events are generated, but does NOT verify:
```typescript
// Missing assertions like:
const itemLocation = world.getLocation(gem.id);
expect(itemLocation).toBe(box.id);  // ← NOT TESTED
```

**Why This Matters:**

As documented in the dropping fix (`docs/work/dungeo/context/2026-01-07-stdlib-dropping-fix.md`):
> "Most tests verify reporting (messages), not actual world state"

The putting action *looks* correct because:
1. Events are generated ✅
2. Success messages appear ✅
3. But IF the `moveEntity()` call was removed, tests would still pass ✅

This is a **test coverage gap** that parallels the dropping bug.

## Recommendations

### High Priority: Add World State Verification Tests

Add tests that directly verify entity location changes. Template:

```typescript
test('should actually move item into container (world state)', () => {
  const { world, player, room } = setupBasicWorld();
  const gem = world.createEntity('ruby', 'object');
  const box = world.createEntity('jewel box', 'object');
  box.add({ type: TraitType.CONTAINER });
  
  world.moveEntity(gem.id, player.id);
  world.moveEntity(box.id, room.id);
  
  const command = createCommand(IFActions.PUTTING, {
    entity: gem,
    secondEntity: box,
    preposition: 'in'
  });
  const context = createRealTestContext(puttingAction, world, command);
  
  // BEFORE: gem is in player's inventory
  expect(world.getLocation(gem.id)).toBe(player.id);
  
  const events = executeAction(puttingAction, context);
  
  // AFTER: gem must be in the box
  expect(world.getLocation(gem.id)).toBe(box.id);  // ← CRITICAL
  
  // Verify events indicate success
  expectEvent(events, 'if.event.put_in', { itemId: gem.id, targetId: box.id });
});
```

Add similar tests for:
- Multi-object commands (put all in box) verify all items moved
- Putting on supporters verifies location change
- Capacity rejections verify NO movement occurred

### Medium Priority: Verify Behavior Results Match Movement

The execute phase calls `ContainerBehavior.addItem()` and `SupporterBehavior.addItem()` but does NOT verify these actually succeeded. Consider:

```typescript
// Lines 219-220 (single-object path)
const putResult: IAddItemResult = ContainerBehavior.addItem(target, item, context.world);
sharedData.putResult = putResult;
// Never checks if putResult.success === true
```

### Test Pattern Recommendations

1. **Always verify world state changes** - After execute(), query the world to confirm mutations
2. **Test both paths** - Single object AND multi-object commands
3. **Verify capacity checks prevent movement** - When validation fails, confirm item was NOT moved
4. **Use debug commands in transcripts** - As used in robot-commands.transcript, add `debug item-id` commands to verify state

## Risk Level

**MEDIUM-HIGH**

While the implementation appears correct and explicitly calls `moveEntity()`, the test suite has a dangerous gap: it validates messages and events without verifying actual world state mutation. This mirrors the exact pattern that allowed the dropping bug to exist for weeks undetected.

**Likelihood of undetected bugs:**
- Low for this specific action (moveEntity call is visible at line 227/388)
- High for refactoring (if someone removes/relocates moveEntity, tests still pass)
- High for similar actions (inserting, removing, taking may have same gap)

**Recommended Risk Mitigation:**
1. Add world state verification tests immediately
2. Apply same pattern to other "move-based" actions (taking, removing, inserting)
3. Update transcript tester to support world state assertions

## References

- Implementation: `/mnt/c/repotemp/sharpee/packages/stdlib/src/actions/standard/putting/`
- Tests: `/mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/actions/putting-golden.test.ts`
- Related Bug: `/mnt/c/repotemp/sharpee/docs/work/dungeo/context/2026-01-07-stdlib-dropping-fix.md`
- Four-Phase Pattern: `/mnt/c/repotemp/sharpee/docs/reference/core-concepts.md`
