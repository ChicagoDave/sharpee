# Sleeping Action - IF Logic Assessment

## Action Name and Description
**Sleeping** - A meta-action that allows the player character to sleep or doze off, passing time without performing any other activities.

## What the Action Does in IF Terms
The sleeping action advances game time (by one turn) while simulating the player character resting. Unlike the waiting action (which is similar), sleeping implies the character is unconscious and unaware, allowing NPCs and daemons to act during the sleep period. This is a fundamental meta-action in interactive fiction that provides narrative time passage and game state transitions (such as healing, NPC movement, or time-based events).

## Core IF Validations It Should Check

### Fundamental IF Constraints
1. **Sleep is allowed at current location** - Some locations (e.g., on a dangerous cliff, in combat) should prevent sleeping
2. **Player is not already resting** - If the player just woke from sleep, redundant sleeping should be caught
3. **Player is in a valid state** - Cannot sleep while in certain conditions (e.g., being attacked, held, constrained)
4. **Location is safe/suitable** - Some games distinguish between "can sleep here" vs "can only doze here" based on comfort
5. **Time passage mechanism** - Sleep should advance game time (currently defaults to 1 turn)
6. **Character state modification** - Sleep may affect character state (fatigue, health, wounds) via event handlers

### Secondary Considerations (For Game Customization)
7. **Fatigue/rest system** - If the game implements fatigue, sleeping might require being "tired enough"
8. **Comfortable sleeping locations** - Some locations provide restful sleep vs restless sleep
9. **Danger during sleep** - Event handlers could allow interruptions (nightmares, disturbances, wake-ups)

## Does the Current Implementation Cover Basic IF Expectations?

**PARTIALLY - Core structure is present, but validation is minimal:**

- ✓ Action advances game time (1 turn, line 46)
- ✓ Tracks sleep location (lines 53-64)
- ✓ Four-phase pattern properly implemented
- ✓ Events emitted for world model and success reporting (lines 139-149)
- ✗ **No location validation** - Currently no check if sleep is allowed at current location (line 62 comment acknowledges this)
- ✗ **No player state checks** - Doesn't validate player can actually sleep (unconscious, paralyzed, etc.)
- ✗ **Always succeeds** - Every sleep attempt succeeds with same message (line 50: always returns 'slept')
- ✗ **Fatigue system absent** - No tracking of whether player is tired/exhausted

## Any Obvious Gaps in Basic IF Logic

**YES - Significant gaps in IF semantics:**

1. **No location safety validation** - The implementation has placeholder traits commented out (line 60): "These traits don't exist in the current trait system." Sleeping anywhere should be at least validated against some minimum requirements (can't sleep in water, on fire, etc.).

2. **No conditional success** - All sleep attempts succeed identically. Standard IF allows for:
   - "You can't sleep here" - unsafe location
   - "You're not tired" - fatigue system
   - "Someone/something interrupts" - event-driven wake-up

   Currently only returns one 'slept' message (line 49).

3. **No player state validation** - Doesn't check if player is:
   - Already sleeping/resting
   - In danger (being attacked)
   - Physically unable to sleep (bound, paralyzed, etc.)

4. **Generic fatigue support** - While the implementation acknowledges event handlers can handle fatigue (line 67 comment), the core action provides no baseline check. The wakeRefreshed flag is always false (line 68) and never set based on actual conditions.

5. **Missing from error handling** - The requiredMessages list (lines 81-95) includes condition-specific messages ('cant_sleep_here', 'too_dangerous_to_sleep', 'already_well_rested') but the validation never returns them. These messages have no path to execution.

**Summary:** The implementation provides the skeleton of a sleep action but delegates nearly all game logic to event handlers. This works architecturally, but leaves the basic action without the foundational IF validation that distinguishes "sleeping is always possible" from "sleeping has contextual constraints."
