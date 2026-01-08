## Summary

The `switching_off` action turns off switchable devices and handles side effects like light source extinguishing, sound cessation, and automatic door closure. The action follows the four-phase pattern (validate/execute/report/blocked) and properly delegates state changes to `SwitchableBehavior`.

## Implementation Analysis

### Four-Phase Pattern Compliance
- ✅ **Validate** (lines 71-87): Checks for target existence, switchable trait, and already-off state
- ✅ **Execute** (lines 89-179): Calls `SwitchableBehavior.switchOff()` which mutates `isOn` to `false`, stores analysis data in `sharedData`
- ✅ **Report** (lines 185-243): Emits `if.event.switched_off` and `action.success` events with collected data
- ✅ **Blocked** (lines 249-256): Returns `action.blocked` events for validation failures

### World State Mutation
- ✅ `SwitchableBehavior.switchOff()` correctly sets `switchable.isOn = false` (line 111 in behavior)
- ✅ Also resets `autoOffCounter = 0` (line 112)
- ✅ `LightSourceBehavior.extinguish()` is called for light sources (line 110 in action)
- ✅ Side effects like automatic door closure are flagged but NOT mutated in execute phase (this is correct - side effects are handled by event handlers elsewhere)

### Event Emission
- ✅ Emits `if.event.switched_off` with comprehensive data structure including:
  - Target ID and name
  - Light source flags
  - Power freed
  - Sound information
  - Side effects (willClose)
- ✅ Emits `action.success` with appropriate message ID and params
- ✅ Emits `action.blocked` on validation failure

## Test Coverage Analysis

### Test File Location
`/mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/actions/switching_off-golden.test.ts`

### Test Suite Breakdown

**Action Metadata (5 tests)**
- Verifies action ID and required messages
- Verifies group classification

**Precondition Checks (3 tests)**
- No target specified → blocked with `no_target`
- Non-switchable target → blocked with `not_switchable`  
- Already off device → blocked with `already_off`

**Basic Device Switching (4 tests)**
- Simple device off → emits `device_stops` message
- Device with custom off sound → emits `with_sound` message with sound param
- Device with running sound → emits `silence_falls` message, captures stopped sound
- Temporary device (timer) → captures remaining time, emits `was_temporary`

**Light Source Handling (3 tests)**
- Only light source in room → `light_off` message, `willDarkenLocation = true`
- Multiple lights in room → `light_off_still_lit` message
- Carried lights present → correctly considers carried items for darkness calculation

**Power Management (1 test)**
- Device with power consumption → captures `powerFreed` in event

**Side Effects (3 tests)**
- Automatic door with `autoCloseOnOff` → flags `willClose` and emits `door_closes`
- Door without `autoCloseOnOff` → no `willClose` flag
- Already closed door → no `willClose` flag

**Event Structure (1 test)**
- Verifies entities (actor, target, location) in all events

**Pattern Examples (5 tests)**
- Documentation of potential shutdown sequences, sound cessation, light extinguishing, power effects, and temporary devices

**Total: 25 distinct test cases**

## Gaps Identified

### CRITICAL GAP: No World State Verification
**The tests do NOT verify that `isOn` was actually changed to `false` after execution.**

Example of the gap:
```typescript
// Current test - only checks messages and event data
const fan = world.createEntity('ceiling fan', 'object');
fan.add({ type: TraitType.SWITCHABLE, isOn: true });
// ... execute action ...
expectEvent(events, 'action.success', { messageId: 'device_stops' });
// ❌ Missing: expect(fan.get(TraitType.SWITCHABLE).isOn).toBe(false);
```

This is **exactly the type of bug that went undetected in the dropping action** - comprehensive reporting but missing world state mutation verification.

### Additional Gaps

1. **No verification of autoOffCounter reset**
   - Tests verify `wasTemporary` flag in events but not that `autoOffCounter = 0`

2. **No verification of LightSourceBehavior coordination**
   - Tests verify light source detection but not that `LightSourceBehavior.extinguish()` was actually called
   - Can't verify the light state was extinguished beyond the action's own flags

3. **No multi-trait entity scenarios**
   - No tests for devices that are BOTH switchable and containers with autoCloseOnOff
   - Only test light sources with switchable (3 tests), never light + switchable + container

4. **No power mutation tests**
   - Power tests verify `powerFreed` is captured in events, but don't verify actual power state changes
   - No test that power consumption is actually cleared from power pool

5. **No rapid state changes**
   - No tests for on→off→on sequences to verify state isn't corrupted
   - No test for multiple devices off in sequence

6. **No interaction with handlers**
   - Tests don't verify actual handler dispatch for complex effects
   - Side effects are only flagged, not verified to execute

### Pattern Examples Section Problem

Lines 502-653 have 5 "pattern example" tests that only define data structures and don't actually test anything:
```typescript
test('pattern: shutdown sequences', () => {
  const shutdownTypes = [...];
  shutdownTypes.forEach(({ sequence }) => {
    expect(sequence).toBeDefined();  // ❌ Useless assertion
  });
});
```

These tests add no coverage value and should be removed or replaced with actual test scenarios.

## Recommendations

### High Priority (Before Release)

1. **Add world state mutation verification**
   ```typescript
   test('should actually turn off device (isOn state)', () => {
     const fan = world.createEntity('ceiling fan', 'object');
     fan.add({ type: TraitType.SWITCHABLE, isOn: true });
     world.moveEntity(fan.id, room.id);
     
     const context = createRealTestContext(switchingOffAction, world, 
       createCommand(IFActions.SWITCHING_OFF, { entity: fan }));
     
     executeWithValidation(switchingOffAction, context);
     
     // Verify actual state changed
     const switchable = fan.get(TraitType.SWITCHABLE) as any;
     expect(switchable.isOn).toBe(false);  // ← CRITICAL
     expect(switchable.autoOffCounter).toBe(0);  // ← Also critical
   });
   ```

2. **Add multi-trait complex device tests**
   ```typescript
   test('should handle device with all traits (light + switchable + container + openable)', () => {
     // Device that is: light source + switchable + container + auto-closes
     // Verify all state changes: isOn, auto-close state, light extinguished
   });
   ```

3. **Add power state verification**
   ```typescript
   test('should clear power consumption from global power pool', () => {
     // Set world power limit
     // Turn device on (consumes power)
     // Verify power consumed
     // Turn device off
     // Verify power is freed
   });
   ```

4. **Remove useless pattern tests (lines 502-653)**
   - Replace with actual test scenarios or delete entirely

### Medium Priority

5. Add rapid state change tests
   ```typescript
   test('should handle rapid on→off→on cycles', () => {
     // Verify state consistency through multiple toggles
   });
   ```

6. Add test for device that is light source + switchable + container + autoCloseOnOff
   - This stress-tests all features together

### Low Priority

7. Add integration test with event handlers
   - Verify complex side effects actually execute via handler dispatch

## Risk Level: **HIGH**

### Why This is High Risk

1. **Identical bug pattern to dropping action**: The dropping action had comprehensive reporting and event emission but was missing world state mutation (`moveEntity`). This switching_off action has comprehensive reporting but **doesn't verify** that `isOn` was actually changed.

2. **Hidden by good messages**: The tests are checking event messages and flags, which all work correctly. But the underlying world state mutation could fail silently. An NPC or complex puzzle that depends on `isOn === false` would break.

3. **No automated safeguard**: Unlike the dropping bug (which was caught by NPC testing), there's no automated test checking the actual `isOn` value after switching off. NPCs might not be used with lights in early testing.

4. **Complex trait interactions**: The action interacts with three separate behaviors (SwitchableBehavior, LightSourceBehavior, container auto-close), creating multiple potential failure points.

5. **State cleanup**: The action resets `autoOffCounter = 0` but this is never verified. If this mutation fails silently, devices might have incorrect remaining time states.

### Likelihood of Hidden Bug

**MEDIUM-HIGH**: The `SwitchableBehavior.switchOff()` method is simple and appears correct (line 111 sets `isOn = false`). However:
- If behavior delegation was accidentally removed, tests wouldn't catch it
- If side effects broke behavior chain, tests wouldn't catch it  
- If refactoring accidentally bypassed behavior, tests wouldn't catch it

The dropping bug teaches us that **comprehensive reporting masks missing mutations**.

## References

- **Dropping Bug**: `docs/work/dungeo/context/2026-01-07-stdlib-dropping-fix.md`
- **Action Pattern**: `docs/reference/core-concepts.md`
- **SwitchableBehavior**: `packages/world-model/src/traits/switchable/switchableBehavior.ts`
- **Four-Phase Pattern**: ADR-051

---

**Note**: This review cannot be written to file due to read-only mode restrictions. The analysis above represents the complete findings that would be written to `docs/work/stdlib-tests/switching_off-review.md`.
