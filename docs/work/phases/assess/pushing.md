# Pushing Action - IF Logic Assessment

## Action Description
The PUSH command allows the player to push objects in the game world. It handles three distinct push scenarios: buttons/switches, heavy objects (scenery), and moveable objects that can be repositioned.

## What It Does in IF Terms
In Interactive Fiction, pushing enables:
- **Device Interaction**: Activating buttons, switches, and levers (with optional toggling effects)
- **Physical Manipulation**: Moving heavy scenery or pushable objects around the game world
- **Puzzle Mechanics**: Pushing objects to reveal hidden passages or trigger events
- **Environmental Feedback**: Describing whether objects move, stick, click, etc.

## Core IF Validations It Should Check

### Essential Validations (Present)
1. **Target Existence** - Object must exist ✓
2. **Visibility/Reachability** - Player must be able to reach the target (enforced by scope) ✓
3. **Pushability** - Object must have PUSHABLE trait ✓
4. **Worn Items** - Can't push objects the player is wearing ✓
5. **Scenery Distinction** - Non-pushable scenery gets different error than regular items ✓

### Missing or Questionable Validations
1. **Accessibility Check**: The validation phase doesn't explicitly call `context.canReach()` - it relies on scope level filtering. While this likely works via the scope metadata, it's implicit rather than explicit in validate.
2. **Strength Requirements**: The PUSHABLE trait stores `requiresStrength` but execute phase never checks if player meets the requirement. It stores the value in sharedData for reporting, but doesn't prevent the push from happening.
3. **State Dependency**: No check for object being locked if also LOCKABLE, though this may not apply to pushable objects.

## Current Implementation Coverage

### Does It Cover Basic IF Expectations?
**Yes, mostly.** The implementation handles the three fundamental push scenarios correctly:
- Buttons/switches toggle state and emit appropriate messages
- Heavy objects provide different feedback (nudged vs moved with effort)
- Moveable objects can shift position and reveal passages
- Proper distinction between fixed scenery and pushable objects

### Strengths
- Clear separation between push types (button, heavy, moveable)
- Distinguishes between nudging (no direction) and deliberate pushing (with direction)
- Handles both simple pushes (button clicks) and complex ones (toggle + reveal passage)
- Proper four-phase pattern with clean separation of concerns

## Obvious Gaps in Basic IF Logic

### Gap 1: Strength Requirement Not Enforced
**Issue**: The action stores `requiresStrength` from the trait but never validates against it. A player without sufficient strength can still push a "heavy" object that requires high strength.

**Impact**: Puzzles relying on strength requirements won't work as designed.

**Expected IF Behavior**: Should fail validation with a "too_heavy" or "requires_strength" error if player lacks required strength attribute.

### Gap 2: Worn Item Check May Be Incomplete
**Issue**: Checks if target is worn by checking `context.world.getLocation(target.id) === actor.id`, which relies on the assumption that wearing places entity in player's inventory container. This is implementation-specific.

**Impact**: Likely works but fragile if location model changes.

**Expected IF Behavior**: Should ideally check `target.has(TraitType.WEARABLE) && target.get(TraitType.WEARABLE).wornBy === actor.id` or similar explicit worn state.

### Gap 3: No Interaction with LOCKED State
**Issue**: If an object is both PUSHABLE and LOCKABLE, pushing a locked pushable doesn't check if it's locked first.

**Impact**: May allow pushing locked containers or devices when they shouldn't move.

**Expected IF Behavior**: Blocked objects (locked drawers with PUSHABLE trait) shouldn't push until unlocked.

### Gap 4: Reachability Not Explicitly Validated
**Issue**: Validation relies entirely on scope metadata rather than explicit `context.canReach()` check. The action lists `ScopeLevel.REACHABLE` in metadata, so parser filters before action runs.

**Impact**: Works in practice, but validation phase doesn't defend itself if scope filtering fails or is bypassed.

**Expected IF Behavior**: Should include explicit `if (!context.canReach(target))` check for robustness.

## Summary
The pushing action provides solid basic IF behavior for its three primary scenarios. However, it lacks enforcement of strength requirements (Gap 1) and doesn't account for locked objects blocking pushes (Gap 3), which could impact puzzle design. The worn item check and reachability validation work but use implicit assumptions rather than explicit checks.
