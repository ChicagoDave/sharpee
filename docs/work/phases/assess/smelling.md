# IF Logic Assessment: Smelling Action

## Action Name and Description

**Action**: SMELLING
**Brief Description**: Allows players to smell specific objects in the environment or detect scents in their current location.

## What the Action Does in IF Terms

Smelling is a **sensory query action** that lets players gather olfactory information about the game world without making changes to state. The player can either:

1. **Smell a specific object** - "smell the food", "smell the candle"
2. **Smell the environment** - "smell" (no object specified)

In both cases, the engine analyzes what scents should be detectable and provides feedback about what odors are present.

## Core IF Validations It Should Check

1. **Room Presence Check**: If smelling a specific object, verify the object is in the same room as the player
   - Correctly implemented: Checks `getContainingRoom()` for both target and actor
   - Rejects with `too_far` error if in different rooms

2. **Object Reachability**: Objects should be detectable/smellable
   - Currently: No specific reachability check beyond room presence
   - IF expectation: Smelling should work on objects visible in the room (not hidden)

3. **Environment Scent Discovery**: When no target specified, detect all smellable things in current location
   - Correctly implemented: Scans location contents for EDIBLE and lit LIGHT_SOURCE items

## Current Implementation Coverage

### Validates Correctly:
- ✓ Room-level proximity (rejects if target in different room)
- ✓ Requires direct object OR allows environment smell (flexible syntax)
- ✓ Four-phase pattern properly implemented (validate/execute/blocked/report)

### Scope System Integration:
- **Potential Issue**: Metadata defines `requiresDirectObject: true` but logic allows `null` target (environment smell)
  - The scope level is set to `DETECTABLE` which is appropriate for sensory actions
  - However, the metadata says the action requires a direct object, which conflicts with the ability to smell the environment with no target

### Execute Phase Analysis:
- ✓ Pure query operation (no world mutations)
- ✓ Analyzes scents based on entity traits (EDIBLE, LIGHT_SOURCE, OPENABLE+CONTAINER)
- ✓ Properly stores analysis in `sharedData` for report phase

### Scent Detection Logic:
- ✓ Recognizes EDIBLE items as food/drink scents
- ✓ Detects lit LIGHT_SOURCE items as burning scent
- ✓ Peeks into open containers to detect contents
- ✓ Provides fallback "no scent" messages when nothing detectable

## Obvious Gaps in Basic IF Logic

1. **Metadata/Syntax Conflict**:
   - Metadata declares `requiresDirectObject: true`
   - But implementation supports environment smelling with no target
   - This creates ambiguity in command parsing and validation flow
   - **Decision needed**: Is smelling the environment a separate command or variant of the same action?

2. **Missing Visibility Check**:
   - The action checks room proximity but doesn't verify the target is actually perceivable/visible
   - IF standard: You should only be able to smell what you can sense/reach
   - Current code doesn't call `context.canSee()` or similar for target validation
   - Note: Container scent detection reads contents when open, which is correct

3. **Container Smell Logic Question**:
   - Only detects scents from OPEN containers
   - This is correct IF behavior (sealed box shouldn't emit smell)
   - However, the validation doesn't prevent trying to smell a closed container
   - Should fail gracefully rather than just reporting "no scent"

4. **Missing Documentation**:
   - Action doesn't document which traits make something smellable
   - Custom objects can't easily be made smellable (no general SCENT trait)
   - Only EDIBLE and LIGHT_SOURCE items are detected

## Summary

The smelling action implements the core IF mechanics correctly at the four-phase structural level. It properly isolates sensory analysis from world state. The main concern is a contradiction between the metadata definition (`requiresDirectObject: true`) and the actual implementation (allows environment smelling). The scent detection logic itself is reasonable but lacks a visibility validation that would be expected in standard IF practice.

**Readiness**: Structurally sound, but needs clarification on:
1. Direct object requirement vs. environment smell syntax
2. Addition of visibility/reachability validation for targeted smells
3. Graceful handling of smelling sealed containers
