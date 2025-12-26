# Switching On Action - IF Logic Assessment

## Action Name and Description
**Switching On** - The action for activating devices, lights, and other electrical equipment in the game world.

The player uses the `switch on` command to turn on any object that has a switchable mechanism, such as lights, appliances, electronics, or other power-consuming devices.

## What the Action Does in IF Terms

The switching_on action activates a switchable device by:

1. Taking a target object as input
2. Validating that the object is switchable and capable of being turned on
3. Checking power requirements and current state
4. Delegating state mutation to SwitchableBehavior
5. Determining appropriate feedback based on device type (light source, device with sound, temporary activation, etc.)
6. Reporting the action with context-aware messages

Key IF semantics it handles:
- Light sources that illuminate dark rooms
- Devices with power requirements
- Devices that auto-turn-off after a duration (temporary activation)
- Devices that produce sounds when activated
- Special side effects (e.g., lights that open doors when turned on)

## Core IF Validations It Should Check

### Fundamental IF Constraints

1. **Target exists** - The referenced object must be provided and resolve to a valid entity
2. **Is switchable** - The target must have a SWITCHABLE trait to be eligible for this action
3. **Not already on** - A device already in the on state cannot be switched on again
4. **Power available** - If the device requires power, it must have power available (requiresPower and hasPower checks)

### Contextual Considerations (Handled)

5. **Light source tracking** - If turning on a light, the action should track that it's a light source with radius/intensity
6. **Same-room check** - Light illumination effects are contextual to whether the device and player are in the same room
7. **Other lights present** - When turning off a light, should check if other lights exist to determine darkness impact
8. **Temporary activation** - Some devices auto-turn-off; this timing should be tracked
9. **Power and sound data** - Devices may consume power and produce sounds; these should be captured
10. **Side effects** - Some devices may trigger secondary actions (e.g., door opening when light activates)

## Does the Current Implementation Cover Basic IF Expectations?

**YES - All fundamental validations are present:**

- ✓ Target existence check (line 76-78)
- ✓ Switchable trait validation (line 80-82)
- ✓ Already-on state check (line 84-88)
- ✓ Power requirement validation (line 89-91)
- ✓ Light source context analysis (line 131-140)
- ✓ Same-room determination (line 137-139)
- ✓ Temporary activation tracking (line 142-146)
- ✓ Power and sound data capture (line 148-160)
- ✓ Side effect detection (door opening when device activates, lines 163-170)
- ✓ Context-aware message selection (line 172-180)

The implementation properly delegates actual state mutation to SwitchableBehavior, following the separation of concerns pattern. The action coordinates the validation and collects context; the behavior performs the mutation.

## Any Obvious Gaps in Basic IF Logic

**No significant gaps found.** The implementation handles all fundamental IF expectations for switching on devices:

1. **Pre-conditions** are thoroughly validated before execution
2. **Context analysis** properly determines light source effects and room relationships
3. **Behavior coordination** correctly delegates mutations to SwitchableBehavior and handles both success and failure paths
4. **Message selection** is sophisticated - distinguishes between:
   - Lights that illuminate darkness vs. lights in already-lit rooms
   - Devices with special sounds
   - Temporary activation (auto-off timers)
   - Devices with side effects (door opening)
   - Generic devices vs. light sources
5. **Event reporting** captures all relevant device state (power consumption, sounds, light properties, side effects)
6. **Three-phase discipline** is maintained: minimal validation in execute, comprehensive context gathering, proper event generation in report

The implementation correctly models IF expectations where turning on a light can have contextual effects (illuminating a dark room) while generic device activation produces simpler feedback.

## Summary

The switching_on action is a **well-structured, complete implementation** that covers all fundamental Interactive Fiction expectations for device activation. It properly validates device state, checks power constraints, analyzes light source effects in context, and generates appropriate feedback. The delegation to SwitchableBehavior keeps the action clean and focused on coordination while preserving the three-phase pattern discipline.
