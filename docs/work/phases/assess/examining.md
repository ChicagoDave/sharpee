# Examining Action - IF Logic Assessment

## Action Name and Description
**Examining** - A read-only action that allows the player to look at objects in detail to gain information about them.

## What It Does in IF Terms
The examining action lets players inspect specific objects to reveal:
- Detailed descriptions of the examined object
- The state of objects (open/closed, on/off, locked/unlocked, worn/not worn)
- Contents of containers and supporters
- Whether an object is readable and display its text
- General information about the object's capabilities

This is a fundamental IF action that bridges the gap between the brief room description (from LOOK) and detailed object inspection.

## Core IF Validations

The action should check:

1. **Target Existence** - An object must be specified (`validate` checks this)
2. **Visibility** - The player must be able to see the object (`validate` checks `context.canSee()`)
3. **Special Case: Self-Examination** - Player can examine themselves without visibility checks (`validate` allows this)
4. **Reachability** - Whether the player can physically access the object (NOT currently checked)
5. **Light/Darkness** - Some IF systems prevent examination in complete darkness (NOT checked)

## Current Implementation Coverage

The action implements a **four-phase pattern** with:

### Validate Phase
- ✓ Checks target exists
- ✓ Checks visibility (with self-examination exception)
- ✗ Does NOT check reachability
- ✗ Does NOT check environmental conditions (light)

### Execute Phase
- ✓ Correctly does nothing (read-only action)

### Report Phase
- ✓ Emits `if.event.examined` with comprehensive entity snapshot
- ✓ Provides trait-specific message selection (container, supporter, switchable, readable, wearable, door)
- ✓ Includes state information (open/closed, on/off, locked/unlocked, worn)
- ✓ Captures contents with full snapshots
- ✓ Adds description text from entity's identity trait

### Blocked Phase
- ✓ Generates error events when validation fails
- ✓ Includes context about what failed

## Does Current Implementation Meet Basic IF Expectations?

**YES - mostly solid for core IF behavior.**

The implementation covers the fundamental IF requirements:
- Objects must be visible to examine
- Examination reveals descriptions and state
- Special handling for self-examination
- Proper separation of concerns (no world mutations)
- Clear feedback on why examination fails

## Obvious Gaps in Basic IF Logic

### 1. Reachability Not Checked (Moderate Gap)
**Issue**: An object can be examined even if the player cannot physically reach it.

Example: A painting on a high shelf should not be examined by a player at ground level, yet the current validation allows it.

**IF Expectation**: Most IF systems allow examining distant objects (based on visibility alone), BUT some restrict based on distance/reachability.

**Assessment**: This appears intentional - the action validates `canSee()` only. If reachability should matter, it would need a `canReach()` check. This is a design choice, not necessarily a bug.

### 2. Environmental Constraints Not Checked (Minor Gap)
**Issue**: No check for complete darkness preventing examination.

**IF Expectation**: Some IF systems prevent examination when there's no light source.

**Assessment**: This is handled at a higher level (visibility check), so if the player can't see it, the visibility check fails. The current approach is simpler but less explicit.

### 3. No Reachability Metadata in Metadata (Minor Gap)
**Issue**: The metadata declares `directObjectScope: ScopeLevel.VISIBLE`, which is correct, but doesn't indicate whether reachability matters.

**Assessment**: This aligns with the validation logic, so there's consistency.

## Summary

The examining action is **well-implemented from an IF perspective**. It correctly:
- Enforces visibility as the primary constraint
- Allows self-examination (standard IF behavior)
- Reads state without mutating it
- Provides comprehensive information about examined objects
- Handles failure gracefully with appropriate error messages

The main philosophical question (not a gap) is whether examined objects should require reachability in addition to visibility - the current design answers "no," which is a valid IF choice that prioritizes information access over physical constraints.
