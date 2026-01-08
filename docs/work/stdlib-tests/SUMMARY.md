# Stdlib Action Test Coverage Summary

Generated from 46 action reviews on 2026-01-07.

## Critical Finding: The Dropping Bug Pattern

The dropping bug revealed a **systemic testing gap**: all stdlib action tests verify **events and messages** but not **actual world state mutations**. This means actions can appear to work (good messages) while failing to actually change the game state.

## Actions Requiring World State Verification Tests

### HIGH PRIORITY - Movement/Location Actions
These actions call `moveEntity()` and MUST verify item locations change:

| Action | Mutation | Current Test Gap |
|--------|----------|------------------|
| **taking** | Move item to inventory | No `getLocation(item)===player` check |
| **dropping** | Move item to room | **FIXED** - was missing `moveEntity` call entirely |
| **putting** | Move item to container/supporter | No `getLocation()` verification |
| **inserting** | Move item into container | No container contents check |
| **removing** | Move item out of container | No location change verification |
| **giving** | Move item to NPC | No `getLocation(item)===npc` check |
| **throwing** | Move item to room/target | No destination verification |

### HIGH PRIORITY - Player Movement Actions
| Action | Mutation | Current Test Gap |
|--------|----------|------------------|
| **going** | Move player to new room | No `getLocation(player)` check |
| **entering** | Move player into object | No containment verification |
| **exiting** | Move player out of object | No location change check |

### MEDIUM PRIORITY - Property Mutations
These actions change entity properties and should verify trait state:

| Action | Mutation | Current Test Gap |
|--------|----------|------------------|
| **opening** | Set `isOpen=true` | No trait property check |
| **closing** | Set `isOpen=false` | No trait property check |
| **locking** | Set `isLocked=true` | No trait property check |
| **unlocking** | Set `isLocked=false` | No trait property check |
| **switching_on** | Set `isOn=true` | No trait property check |
| **switching_off** | Set `isOn=false` | No trait property check |
| **wearing** | Set `worn=true, wornBy=actor` | No dual property check |
| **taking_off** | Set `worn=false, wornBy=null` | No property verification |

### MEDIUM PRIORITY - Consumption Actions
These actions remove/consume entities:

| Action | Mutation | Current Test Gap |
|--------|----------|------------------|
| **eating** | Remove/consume entity | No entity removal verification |
| **drinking** | Remove/consume entity | **CRITICAL**: execute phase has no mutation! |

## Recommended Test Pattern

For EVERY action that mutates world state:

```typescript
test('should actually perform mutation', () => {
  const { world, player, room } = setupBasicWorld();
  const item = world.createEntity('test item', 'object');

  // Arrange: set up initial state
  world.moveEntity(item.id, room.id);

  // VERIFY PRECONDITION
  expect(world.getLocation(item.id)).toBe(room.id);

  // Act: execute the action
  const context = createRealTestContext(action, world, command);
  executeAction(action, context);

  // VERIFY POSTCONDITION - THE CRITICAL MISSING TEST
  expect(world.getLocation(item.id)).toBe(player.id);
});
```

## Systemic Recommendations

1. **Add world state assertions to all mutation tests** - Don't rely on events/messages
2. **Consider a `verifyWorldState()` helper** - Standardize state checking
3. **Add mutation verification to transcript tests** - Use debug commands
4. **Create test template** - Ensure new actions include state verification

## Risk Assessment

| Risk Level | Actions |
|------------|---------|
| **HIGH** | taking, dropping (fixed), wearing, drinking |
| **MEDIUM** | putting, inserting, removing, giving, throwing, going, entering, exiting |
| **MEDIUM** | opening, closing, locking, unlocking, switching_on, switching_off |
| **LOW** | Non-mutation actions (looking, examining, inventory, etc.) |

## Next Steps

1. [ ] Add world state verification to taking tests (highest risk after dropping)
2. [ ] Verify drinking action has actual mutation (may be broken like dropping was)
3. [ ] Add location checks to all movement action tests
4. [ ] Add property checks to all property-mutation action tests
5. [ ] Consider automated mutation verification in test framework
