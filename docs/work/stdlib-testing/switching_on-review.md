## Summary

The `switchingOnAction` turns on switchable devices like lights, appliances, and machines. It delegates state mutations to `SwitchableBehavior.switchOn()` which modifies the `isOn` property and resets the `autoOffCounter`. The action also coordinates with `LightSourceBehavior.light()` for light sources and determines contextual messages based on device properties (light, sound, temporary, side effects).

## Implementation Analysis

**Four-Phase Pattern:** Yes, fully implemented
- `validate()` - Lines 73-95: Checks for target, switchable trait, already-on state, and power availability
- `execute()` - Lines 97-186: Calls `SwitchableBehavior.switchOn()`, stores results in sharedData, analyzes context
- `report()` - Lines 192-252: Generates semantic events from sharedData
- `blocked()` - Lines 258-265: Generates error events for validation failures

**World State Mutation:** Yes, confirmed
- `SwitchableBehavior.switchOn()` (line 106) mutates:
  - `switchable.isOn = true` (line 79 in behavior)
  - `switchable.autoOffCounter = switchable.autoOffTime` (line 83 in behavior)
- `LightSourceBehavior.light()` (line 110) mutates:
  - `trait.isLit = true` (line 29 in behavior)

**Event Emission:** Yes, proper structure
- Line 245: `if.event.switched_on` with comprehensive event data
- Line 246: `action.success` with messageId and params
- Events include all relevant metadata (target, sound, light data, etc.)

## Test Coverage Analysis

**Existing Tests:** 1 file with ~67 test cases in `switching_on-golden.test.ts`

**Test Distribution:**
1. **Metadata tests** (3 cases):
   - Correct action ID
   - Required messages declared
   - Device manipulation group

2. **Precondition/Validation tests** (4 cases):
   - No target specified
   - Not switchable entity
   - Already on
   - No power available

3. **Basic device switching** (2 cases):
   - Simple device switching
   - Device with custom sound

4. **Temporary activation** (1 case):
   - Auto-off timer handling

5. **Light source handling** (3 cases):
   - Basic light source
   - Illuminate dark room
   - Not illuminating when other lights present

6. **Power requirements** (1 case):
   - Available power scenario

7. **Side effects** (2 cases):
   - Opens automatic door
   - Already open door not affected

8. **Device properties** (1 case):
   - Continuous sound inclusion

9. **Event structure** (1 case):
   - Entity references in events

10. **Pattern examples** (5 cases):
   - Device categories (non-functional, just validation)
   - Power system integration (non-functional)
   - Light propagation (non-functional)
   - Activation sounds (non-functional)
   - Temporary devices (non-functional)

## Gaps Identified

**CRITICAL - World State Verification Missing:**
- Tests check that events are emitted and messages are correct
- Tests do NOT verify that world state actually changed
- Example: Test "should switch on simple device" verifies the event was emitted, but never checks that `fan.get(TraitType.SWITCHABLE).isOn === true`
- This is the same pattern that allowed the dropping bug to slip through

**Specific Missing Tests:**

1. **World state mutation verification** (CRITICAL)
   - After switching on a device, verify `switchable.isOn` property is actually true
   - After switching on a light, verify `lightTrait.isLit` is actually true
   - After switching on a temporary device, verify `autoOffCounter` equals `autoOffTime`

2. **Power consumption tracking**
   - Test power consumption value is correctly captured in event
   - Test device with both power requirement and custom sound
   - Test power consumption with temporary activation

3. **Light radius and intensity edge cases**
   - Light with custom radius/intensity values
   - Light where trait has defaults that differ from expected

4. **Behavior failure scenarios** (Defensive code path)
   - Lines 114-124 in action have defensive code for when behavior returns success=false
   - No test exercises this error handling path

5. **LightSourceBehavior.light() integration**
   - Tests don't verify LightSourceBehavior.light() was actually called
   - No test checks if it fails (out of fuel scenario not tested)

6. **Validation edge cases**
   - Test that canSwitchOn() check (line 84) catches all required conditions
   - Test object that is both Switchable AND OpenableTrait (side effect path)

7. **Multi-state entities**
   - Device that is switchable, openable, container AND light source together
   - Verify side-effect flag (willOpen) combined with light source data

8. **Auto-off counter initialization**
   - Verify autoOffCounter is set to zero for devices without auto-off
   - Verify it's set correctly for temporary devices

## Recommendations

1. **Add world state verification tests** (HIGHEST PRIORITY)
   ```
   After executeWithValidation:
   - const switchable = fan.get(TraitType.SWITCHABLE);
   - expect(switchable.isOn).toBe(true);
   - expect(switchable.autoOffCounter).toBe(expected_value);
   ```

2. **Add LightSourceBehavior verification**
   ```
   For light sources:
   - const lightTrait = lamp.get(TraitType.LIGHT_SOURCE);
   - expect(lightTrait.isLit).toBe(true);
   ```

3. **Add defensive code path test**
   - Mock SwitchableBehavior.switchOn to return {success: false, wasOn: true}
   - Verify action.error event with 'already_on' message

4. **Add complex entity tests**
   - Device that's switchable + openable + container + light
   - Verify all side effects in event data

5. **Add power + temporary device tests**
   - Device with requiresPower=true, hasPower=true, autoOffTime=100
   - Verify both powerConsumption and autoOffTime in event

6. **Add light source fuel test**
   - Light with fuelRemaining=0
   - Verify LightSourceBehavior.light() returns false
   - Verify either event is marked as failed or light doesn't actually light

## Risk Level

**HIGH**

The switching_on action has the same structural vulnerability that caused the dropping bug: the tests verify that the action produces correct events and messages, but don't verify that the underlying world state actually mutated. A bug where `SwitchableBehavior.switchOn()` was never called, or was called but failed silently, would pass all current tests. The defensive code path (lines 114-124) is completely untested, making it a mutation hazard.
