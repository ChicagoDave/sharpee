# IF Logic Assessment: Switching Off Action

## Action Name and Description
**switching_off** - Turns off devices and lights

Handles the interactive fiction semantics of powering down switchable entities, managing light sources, audio feedback, and side effects.

## What the Action Does in IF Terms

The switching off action performs these IF operations:
1. **State Mutation**: Changes device from "on" to "off" state via SwitchableBehavior
2. **Clears Auto-off Timer**: Resets autoOffCounter to 0 (prevents timed auto-off)
3. **Light Source Handling**: Detects if device is a light source and whether room will darken
4. **Sound Effects**: Captures any sound played on switch-off and clears running sounds
5. **Side Effects**: Checks if device auto-closes when switched off (e.g., refrigerator)
6. **Power Management**: Tracks power freed by switching off device
7. **Temporary Device Handling**: Notes if device was on a timer before manual switch-off

## Core IF Validations It Should Check

1. **Target Exists**: Does the command have a direct object? (VALIDATED)
2. **Target is Switchable**: Does the target have the Switchable trait? (VALIDATED)
3. **Target is Currently On**: Can only switch off if already on (VALIDATED)
   - Checked by `SwitchableBehavior.canSwitchOff()` which returns `switchable.isOn`
4. **Target is Visible/Reachable**: Can only switch off what the player can reach (VALIDATED via ScopeLevel.REACHABLE)
5. **Device Has Power** (if required): For power-dependent devices (NOT EXPLICITLY CHECKED IN ACTION)
   - The behavior checks this for switch-on, but switch-off doesn't validate power requirement
   - A device that requires power should still be switchable off when power-depleted

## Does Current Implementation Cover Basic IF Expectations?

**Yes, mostly.** The implementation correctly handles the fundamental IF behavior:

- Validates target existence and switchability (blocking validation)
- Validates "already off" state (blocking)
- Delegates state mutation to SwitchableBehavior (proper separation)
- Captures all contextual data for reporting (light sources, sounds, side effects)
- Appropriately messages based on device type and context
- Uses three-phase pattern correctly (validate → execute → report)

## Obvious Gaps in Basic IF Logic

### 1. **Power-Dependent Device Check**
The action assumes any switchable device can be turned off, but there's a logical gap:
- A device that `requiresPower: true` but `hasPower: false` should still be turnable off
- The current code doesn't explicitly validate this scenario
- **Reality**: SwitchableBehavior.switchOff() doesn't check power state, so this isn't a practical problem
- **Better**: Should document that switching off is always allowed, regardless of power state

### 2. **Already Off Detection (Defensive Only)**
Lines 109-116 have defensive checks for "already off" and "not switchable" after calling behavior:
- These should never trigger because validation already passed
- This is appropriate defensive programming, not a gap

### 3. **Missing Context Validation**
The action doesn't validate whether the target is visible to the player before attempting to switch it off:
- Scope validation (ScopeLevel.REACHABLE) is metadata-level
- No explicit visibility check during execute phase
- This is acceptable because scope validation is pre-validated

## Summary

The switching_off action demonstrates solid IF logic design. It correctly:
- Validates preconditions (target exists, is switchable, is on, is reachable)
- Separates concerns (behavior owns mutation, action coordinates)
- Captures contextual IF data (light sources, darkness, sounds, side effects)
- Generates appropriate messages based on device type and context
- Uses three-phase pattern consistently

No significant IF logic gaps identified. The implementation handles all fundamental "turning off a device" semantics in Interactive Fiction.
