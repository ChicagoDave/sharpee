## Summary

The attacking action handles hostile actions against NPCs and objects. It supports both armed and unarmed attacks, with two distinct execution paths:
1. **CombatService path**: For NPCs with COMBATANT trait - skill-based combat with damage/health tracking
2. **AttackBehavior path**: For objects and entities without COMBATANT trait - handles destruction via BREAKABLE/DESTRUCTIBLE traits

### Implementation Analysis

**Four-Phase Pattern Compliance: YES**
- `validate()` - Checks preconditions (target exists, is visible/reachable, not self, weapon held)
- `execute()` - Performs actual world mutations (applies damage, tracks combat result, modifies entity health)
- `report()` - Generates semantic events based on execution results
- `blocked()` - Creates error events when validation fails

**Execute Phase World State Mutations: YES - MULTIPLE PATHS**

Path 1 (Combatants via CombatService):
- Line 186-192: `CombatService.resolveAttack()` is called
- Line 195: `applyCombatResult()` mutates target's health/status
- Side effects: Can reduce health, knock out, or kill target

Path 2 (Objects via AttackBehavior):
- Line 223: `AttackBehavior.attack()` delegates to trait-specific behaviors
- Downstream mutations (in world-model behaviors):
  - BreakableBehavior: Destroys entity, creates debris
  - DestructibleBehavior: Reduces HP, may destroy, may transform
  - CombatBehavior: Reduces health, kills target, drops items

**Event Emission: YES - COMPREHENSIVE**
- Line 305: `if.event.attacked` - Primary attack event
- Lines 375-387: `if.event.dropped` - Items dropped from killed combatants
- Lines 389-394: `if.event.exit_revealed` - For destructible objects that hide exits
- Lines 397-403: `if.event.death` - For killed combatants
- Lines 406-412: `if.event.knocked_out` - For knocked-out combatants
- Lines 368-372: `action.success` - Success message with result-specific messageId

---

### Test Coverage Analysis

**Tests Exist: 2 test files**
1. `attacking.test.ts` - 18 tests (unit tests)
2. `attacking-golden.test.ts` - Golden pattern reference

**Phase Coverage:**

✓ **Validate Phase**: 6 tests
- Line 112-120: no_target
- Line 122-136: not_visible
- Line 138-158: not_reachable
- Line 160-171: self-attack prevention
- Line 173-195: not_holding_weapon
- Line 197-220: valid cases

✓ **Execute Phase**: 5 tests
- Line 305-317: attack result in shared data
- Line 319-337: weapon used in shared data
- Line 339-358: custom message handling
- Lines 223-278: weapon inference (3 tests)

✓ **Report Phase**: 8 tests
- Line 362-387: attacked event generation
- Line 389-412: success event with message
- Line 414-424: error event on validation failure
- Line 426-451: weapon inclusion in attacked event
- Line 470-512: attack result type handling (broke, ineffective)

✓ **Blocked Phase**: 1 test
- Line 414-424: error event structure

**Action Metadata**: 4 tests
- Line 514-549: ID, group, scope, required messages

---

### CRITICAL GAP: World State Mutation Verification

**This is the major issue that mirrors the dropping bug:**

The tests verify that:
- ✓ `context.sharedData.attackResult` is set
- ✓ Events are generated
- ✓ `context.sharedData.weaponUsed` is populated

But they DO NOT verify:
- ✗ Target's health was actually reduced (CombatService path)
- ✗ Target's health trait was mutated
- ✗ Items were actually dropped from target's inventory
- ✗ Objects were actually destroyed (BREAKABLE/DESTRUCTIBLE)
- ✗ World entity count changed (for debris creation)
- ✗ Entities were actually removed from world
- ✗ Combat result was properly applied to target

**Example Missing Test Case:**
```typescript
test('should reduce target health after successful attack', () => {
  const target = world.createEntity('goblin', EntityType.ACTOR);
  target.add({ type: TraitType.COMBATANT, health: 100, maxHealth: 100 });
  world.moveEntity(target.id, room.id);
  
  const initialHealth = target.get(TraitType.COMBATANT).health;
  
  attackingAction.execute(context);
  
  const finalHealth = target.get(TraitType.COMBATANT).health;
  expect(finalHealth).toBeLessThan(initialHealth);  // THIS IS MISSING
});
```

---

### Edge Cases NOT Tested

1. **Multiple attacks**: Does health degrade correctly across multiple attacks?
2. **Target death**: When target health reaches 0, does target actually die?
3. **Item drops**: Do items from killed combatants actually appear in the room?
4. **Object destruction**: Does BREAKABLE object actually get removed from world?
5. **Debris creation**: Are debris entities actually created in the world?
6. **Weapon breaking**: Can weapons break after attacks (line 73)?
7. **Combat result application**: Does `applyCombatResult()` actually work?
8. **CombatService vs AttackBehavior paths**: No tests verify the selection logic works
9. **Peaceful game mode**: Golden test at line 209 doesn't actually verify blocking

---

### Gaps Summary

**HIGH-RISK GAPS:**
1. No verification that world state actually changes after execute
2. No verification that `applyCombatResult()` actually mutates target health
3. No verification that items are actually dropped
4. No verification that entities are actually destroyed/removed
5. No verification that combat service path is actually used

**MEDIUM-RISK GAPS:**
6. No tests for multiple consecutive attacks
7. No tests for weapon breaking
8. No integration tests combining execute + real world state checking
9. No tests for peaceful game blocking (just event expectations)

**LOW-RISK GAPS:**
10. Skipped golden tests (depends on scope logic, not action logic)
11. No performance tests for combat calculations

---

### Risk Level Assessment

**RISK: HIGH**

**Reasoning:**
The dropping action had a nearly identical gap - it passed all tests while not actually mutating world state. The attacking action has the same vulnerability:

1. Tests pass if events are generated ✓
2. Tests pass if shared data is populated ✓
3. But tests DON'T fail if world state changes don't happen ✗
4. `applyCombatResult()` is called (line 195) but never verified as working
5. `AttackBehavior.attack()` returns a result object, but we never verify objects are actually destroyed

**Likelihood of bugs going undetected: VERY HIGH**

Example bugs that would NOT be caught:
- `applyCombatResult()` function is broken/no-op
- Target health is never actually reduced
- Items from killed combatants aren't placed in the room
- Breakable objects remain in the world after breaking
- Debris entities are never created

---

### Recommendations

**PRIORITY 1 - Add World State Verification Tests:**

```typescript
describe('World State Mutations', () => {
  test('should reduce target health after successful attack on combatant', () => {
    const target = world.createEntity('goblin', EntityType.ACTOR);
    target.add({ type: TraitType.COMBATANT, health: 100, maxHealth: 100 });
    world.moveEntity(target.id, room.id);
    
    const initialHealth = target.get(TraitType.COMBATANT).health;
    
    attackingAction.execute(context);
    
    const finalHealth = target.get(TraitType.COMBATANT).health;
    expect(finalHealth).toBeLessThan(initialHealth);
    expect(context.sharedData.attackResult.damage).toBeGreaterThan(0);
  });

  test('should actually kill target when health reaches 0', () => {
    const target = world.createEntity('goblin', EntityType.ACTOR);
    target.add({ type: TraitType.COMBATANT, health: 5, maxHealth: 100 });
    world.moveEntity(target.id, room.id);
    
    attackingAction.execute(context);
    
    const finalHealth = target.get(TraitType.COMBATANT).health;
    expect(finalHealth).toBeLessThanOrEqual(0);
    expect(context.sharedData.attackResult.targetKilled).toBe(true);
  });

  test('should drop items from killed combatant into room', () => {
    const target = world.createEntity('goblin', EntityType.ACTOR);
    target.add({ type: TraitType.COMBATANT, health: 5, maxHealth: 100 });
    const gold = world.createEntity('gold coin', EntityType.OBJECT);
    world.moveEntity(target.id, room.id);
    world.moveEntity(gold.id, target.id);
    
    const initialGoldLocation = world.getLocation(gold.id);
    expect(initialGoldLocation).toBe(target.id);
    
    attackingAction.execute(context);
    
    const finalGoldLocation = world.getLocation(gold.id);
    expect(finalGoldLocation).toBe(room.id);
  });

  test('should destroy breakable object and remove from world', () => {
    const vase = world.createEntity('vase', EntityType.OBJECT);
    vase.add({ type: TraitType.BREAKABLE, broken: false });
    world.moveEntity(vase.id, room.id);
    
    const initialContents = world.getContents(room.id).length;
    
    attackingAction.execute(context);
    
    const finalContents = world.getContents(room.id).length;
    expect(finalContents).toBeLessThanOrEqual(initialContents);
    
    // Verify vase was destroyed
    const vaseAfter = world.getEntity(vase.id);
    if (vaseAfter) {
      expect(vaseAfter.get(TraitType.BREAKABLE)?.broken).toBe(true);
    }
  });

  test('should create debris entities when destructible is destroyed', () => {
    const crate = world.createEntity('crate', EntityType.OBJECT);
    crate.add({ type: TraitType.DESTRUCTIBLE, hitPoints: 5, maxHitPoints: 50 });
    world.moveEntity(crate.id, room.id);
    
    const initialCount = world.getContents(room.id).length;
    
    // Hit it enough times to destroy
    for (let i = 0; i < 10; i++) {
      attackingAction.execute(context);
    }
    
    const finalCount = world.getContents(room.id).length;
    // Should have debris or fewer items
    expect(finalCount).toBeGreaterThanOrEqual(0);
  });
});
```

**PRIORITY 2 - Add CombatService Integration Tests:**

```typescript
test('should use CombatService for combatant targets', () => {
  const target = world.createEntity('goblin', EntityType.ACTOR);
  target.add({ type: TraitType.COMBATANT, health: 100, maxHealth: 100 });
  world.moveEntity(target.id, room.id);
  
  attackingAction.execute(context);
  
  expect(context.sharedData.usedCombatService).toBe(true);
  expect(context.sharedData.combatResult).toBeDefined();
});
```

**PRIORITY 3 - Add Consecutive Attack Tests:**

```typescript
test('should handle multiple consecutive attacks', () => {
  const target = world.createEntity('goblin', EntityType.ACTOR);
  target.add({ type: TraitType.COMBATANT, health: 100, maxHealth: 100 });
  world.moveEntity(target.id, room.id);
  
  const command1 = createCommand(IFActions.ATTACKING, { entity: target });
  const context1 = createRealTestContext(attackingAction, world, command1);
  
  attackingAction.execute(context1);
  const health1 = target.get(TraitType.COMBATANT).health;
  
  const command2 = createCommand(IFActions.ATTACKING, { entity: target });
  const context2 = createRealTestContext(attackingAction, world, command2);
  
  attackingAction.execute(context2);
  const health2 = target.get(TraitType.COMBATANT).health;
  
  expect(health2).toBeLessThan(health1);
});
```

---

### Summary Table

| Aspect | Status | Coverage | Risk |
|--------|--------|----------|------|
| Validation phase | ✓ Complete | 6 tests | LOW |
| Execute phase | ⚠️ Partial | Events only, not mutations | HIGH |
| Report phase | ✓ Complete | 8 tests | LOW |
| Blocked phase | ✓ Complete | 1 test | LOW |
| World state mutations | ✗ MISSING | 0 tests | **HIGH** |
| CombatService integration | ⚠️ Partial | No explicit verification | **HIGH** |
| AttackBehavior integration | ⚠️ Partial | No explicit verification | **HIGH** |
| Debris/item creation | ✗ MISSING | 0 tests | **HIGH** |
| Object destruction | ✗ MISSING | 0 tests | **HIGH** |

---

This review shows the attacking action has solid event generation and validation logic, but mirrors the critical gap found in the dropping action: **no verification that actual world state mutations occur**. The tests would pass even if `applyCombatResult()`, `AttackBehavior.attack()`, and related mutations were completely non-functional.
