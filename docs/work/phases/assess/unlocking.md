# Unlocking Action - IF Logic Assessment

## Action Name and Description
**Unlocking** - The action for unlocking lockable objects such as doors, containers, and other secured items that can have keys applied to them.

## What the Action Does in IF Terms
The unlocking action changes a lockable object from a locked state to an unlocked state. This typically requires either no key (for keyless locks) or the correct key object. In interactive fiction, unlocking is fundamental to progression—locked doors and containers gate access to areas and items, and the player must find and use appropriate keys to unlock them.

## Core IF Validations It Should Check

### Fundamental IF Constraints
1. **Target exists** - The referenced object must be provided and resolve to a valid entity
2. **Target is lockable** - The object must have the Lockable trait (doors, containers, etc. can be lockable; books, food, etc. cannot)
3. **Target is currently locked** - Cannot unlock something already unlocked
4. **Key availability** - If the target requires a key, the player must possess it
5. **Correct key** - If a key is provided, it must be the right key for this lock
6. **Player holds the key** - The key must be in the player's inventory, not dropped elsewhere

### Secondary Considerations
7. **Auto-open behavior** - Some unlocked containers/doors might automatically open; this should be tracked and reported
8. **Contents awareness** - For containers, knowing if they have contents affects messaging and player expectation

## Does the Current Implementation Cover Basic IF Expectations?

**YES - All fundamental validations are present:**

- ✓ Target existence check (line 74-79)
- ✓ Lockable trait check (line 82-88)
- ✓ Already-locked check via LockableBehavior.canUnlock() (line 91-97)
- ✓ Key requirement validation via validateKeyRequirements() (line 100-103)
  - ✓ Key presence check if required
  - ✓ Player possession check via context.world.getLocation()
  - ✓ Key correctness check via LockableBehavior.canUnlockWith()
- ✓ Auto-open detection (line 170-175)
- ✓ Container content tracking (line 149-153)

## Any Obvious Gaps in Basic IF Logic

**No significant gaps found.** The implementation handles all fundamental IF expectations for the unlocking action:

1. **Reach constraints** - Properly scoped to REACHABLE items via metadata (line 276)
2. **Validation delegation** - Correctly delegates to LockableBehavior for lock state checks
3. **Key validation** - Uses shared lock validation helper ensuring consistent key handling across lock/unlock
4. **State mutation safety** - Uses three-phase pattern to ensure behavior validates before any world changes
5. **Message generation** - Properly distinguishes between unlocking with/without key for messaging (line 178)
6. **Error handling** - Maps behavior failures back to appropriate error messages (line 132-138)

The implementation follows the three-phase pattern correctly and maintains proper IF semantics throughout.
