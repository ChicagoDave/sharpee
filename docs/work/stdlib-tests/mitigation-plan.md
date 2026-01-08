# Stdlib Testing Mitigation Plan

**Created**: 2026-01-07
**Updated**: 2026-01-08
**Status**: In Progress
**Branch**: `stdlib-testing`

## Problem Statement

The dropping bug revealed a systemic issue: stdlib action tests verify events/messages but not world state mutations. An action can appear to work (good messages, correct events) while failing to actually change the game state. This pattern exists across most stdlib actions.

Additionally, the **drinking action is broken** - its execute phase has zero mutations, identical to the dropping bug.

## Scope of Work

### Phase 1: Fix Broken Actions (Critical)

#### 1.1 Drinking Action Fix
**Priority**: HIGH
**Estimated Tests**: 10-15 test updates

The drinking action's execute phase does nothing. It needs:

```typescript
execute(context: ActionContext): void {
  // ... existing setup ...

  // ADD: Implicit take if not held
  if (!isHeld) {
    context.world.moveEntity(item.id, actor.id);
  }

  // ADD: Consume drinkable items with EdibleTrait
  if (edibleTrait && (edibleTrait as any).isDrink) {
    EdibleBehavior.consume(item, actor);
  }

  // ADD: Decrement liquid in containers
  if (containerTrait && (containerTrait as any).containsLiquid) {
    const liquidAmount = (containerTrait as any).liquidAmount;
    if (liquidAmount !== undefined && liquidAmount > 0) {
      (containerTrait as any).liquidAmount = liquidAmount - 1;
      if ((containerTrait as any).liquidAmount === 0) {
        (containerTrait as any).containsLiquid = false;
      }
    }
  }
  // ... rest of execute ...
}
```

**Test Updates Required**:
- Update tests to verify `EdibleBehavior.getServings()` decrements after drinking
- Update tests to verify `liquidAmount` decrements after drinking from container
- Add tests that verify entity is taken implicitly if not held
- Update event expectations to reflect actual consumption state

### Phase 2: Add World State Verification Tests

#### 2.1 Movement/Location Actions
**Priority**: HIGH

| Action | Test to Add |
|--------|-------------|
| taking | Verify `getLocation(item) === player.id` after take |
| putting | Verify `getLocation(item) === container.id` after put |
| inserting | Verify `getLocation(item) === container.id` after insert |
| removing | Verify `getLocation(item) !== container.id` after remove |
| giving | Verify `getLocation(item) === npc.id` after give |
| throwing | Verify `getLocation(item) === target/room` after throw |
| going | Verify `getLocation(player) === newRoom.id` after go |
| entering | Verify `getLocation(player) === object.id` after enter |
| exiting | Verify `getLocation(player) === room.id` after exit |

**Test Pattern**:
```typescript
test('should actually move item to player inventory', () => {
  const { world, player, room } = setupBasicWorld();
  const ball = world.createEntity('ball', EntityType.OBJECT);
  world.moveEntity(ball.id, room.id);

  // PRECONDITION
  expect(world.getLocation(ball.id)).toBe(room.id);

  const context = createRealTestContext(takingAction, world, command);
  executeWithValidation(takingAction, context);

  // POSTCONDITION - THE CRITICAL ASSERTION
  expect(world.getLocation(ball.id)).toBe(player.id);
});
```

#### 2.2 Property Mutation Actions
**Priority**: MEDIUM

| Action | Test to Add |
|--------|-------------|
| opening | Verify `OpenableTrait.isOpen === true` after open |
| closing | Verify `OpenableTrait.isOpen === false` after close |
| locking | Verify `LockableTrait.isLocked === true` after lock |
| unlocking | Verify `LockableTrait.isLocked === false` after unlock |
| switching_on | Verify `SwitchableTrait.isOn === true` after switch on |
| switching_off | Verify `SwitchableTrait.isOn === false` after switch off |
| wearing | Verify `WearableTrait.worn === true && wornBy === actor.id` |
| taking_off | Verify `WearableTrait.worn === false && wornBy === null` |

**Test Pattern**:
```typescript
test('should actually set isOpen to true', () => {
  const { world, item } = setupWithOpenable({ isOpen: false });

  // PRECONDITION
  expect(OpenableBehavior.isOpen(item)).toBe(false);

  const context = createRealTestContext(openingAction, world, command);
  executeWithValidation(openingAction, context);

  // POSTCONDITION
  expect(OpenableBehavior.isOpen(item)).toBe(true);
});
```

#### 2.3 Consumption Actions
**Priority**: MEDIUM

| Action | Test to Add |
|--------|-------------|
| eating | Verify `EdibleBehavior.getServings()` decrements |
| drinking | Verify servings decrement OR liquidAmount decrements |

### Phase 3: Test Infrastructure Improvements

#### 3.1 Create World State Verification Helper
```typescript
// packages/stdlib/tests/test-utils/world-state.ts

export function captureEntityState(world: WorldModel, entityId: string) {
  const entity = world.getEntity(entityId);
  return {
    location: world.getLocation(entityId),
    traits: entity ? Object.fromEntries(
      Array.from(entity.traits.entries()).map(([type, trait]) => [type, { ...trait }])
    ) : null
  };
}

export function expectLocationChanged(
  world: WorldModel,
  entityId: string,
  from: string,
  to: string
) {
  const location = world.getLocation(entityId);
  expect(location).not.toBe(from);
  expect(location).toBe(to);
}

export function expectTraitChanged<T>(
  entity: IFEntity,
  traitType: TraitType,
  property: keyof T,
  expectedValue: any
) {
  const trait = entity.get(traitType) as T;
  expect(trait[property]).toBe(expectedValue);
}
```

#### 3.2 Add Mutation Verification to Transcript Tester
Consider adding a `[verify location X is Y]` directive to transcript tests:
```
> take ball
You take the red ball.
[verify location ball is player]

> drop ball
You drop the red ball.
[verify location ball is room]
```

### Phase 4: Documentation

1. Update `docs/reference/core-concepts.md` with testing requirements
2. Add "Testing Stdlib Actions" section to CLAUDE.md
3. Create template for new action tests that includes state verification

## Implementation Order

1. ✅ **Drinking action fix** - Critical, blocking bug (COMPLETED 2026-01-08)
2. ✅ **Taking action tests** - Highest risk after dropping (COMPLETED 2026-01-08)
3. ⏳ **Movement actions** (putting ✅, inserting, removing, giving, throwing)
4. ⏳ **Player movement** (going ✅, entering, exiting)
5. **Property mutations** (opening, closing, locking, unlocking, etc.)
6. **Test helper infrastructure**
7. **Documentation updates**

## Estimated Effort

| Phase | Actions | Est. Test Changes | Complexity |
|-------|---------|-------------------|------------|
| 1 | 1 (drinking) | 10-15 | Medium |
| 2.1 | 9 actions | 2-3 per action = ~25 | Low |
| 2.2 | 8 actions | 2-3 per action = ~20 | Low |
| 2.3 | 2 actions | 2-3 per action = ~5 | Low |
| 3 | Infrastructure | N/A | Medium |
| 4 | Docs | N/A | Low |

**Total**: ~60-70 test additions/modifications

## Success Criteria

1. All mutation actions have at least one test verifying actual world state change
2. Drinking action correctly consumes items and decrements liquid
3. No action can "appear to work" while failing to mutate state
4. Test helper utilities available for future action development

## Risks

1. **Test breakage cascade** - Fixing drinking may reveal other test assumptions
2. **Behavior changes** - Some actions may have subtle bugs revealed by state verification
3. **Time investment** - This is foundational work that will slow Dungeo progress

## Decision Points

Before proceeding:
- [x] Confirm drinking fix approach (EdibleBehavior.consume vs custom logic) → **Using EdibleBehavior.consume()**
- [ ] Decide if transcript tester should support state verification directives
- [x] Prioritize which actions to fix first based on Dungeo usage → **Following mitigation plan order**

## Progress Log

### 2026-01-08: Phase 1 & 2 Progress

**Drinking Action Fix (Phase 1)** - COMPLETED
- Added implicit take via `context.world.moveEntity()`
- Added `EdibleBehavior.consume()` for EdibleTrait items
- Added `liquidAmount` decrement for containers
- Added 6 world state verification tests

**World State Tests Added (Phase 2)**
- `taking-golden.test.ts`: 4 new tests (room/container/supporter to inventory)
- `putting-golden.test.ts`: 4 new tests (into container/onto supporter)
- `going-golden.test.ts`: 4 new tests (player movement, visited flag)
- `drinking-golden.test.ts`: 6 new tests (consume, servings, liquid)

**Commit**: `79152f3` - fix(stdlib): Fix drinking action mutations + add world state tests
