# Going Action - IF Logic Assessment

## Action Name and Description
**Going** - Movement between rooms through cardinal directions and named exits.

The player uses cardinal directions (north, south, east, west, up, down) or custom exit names (e.g., "through door", "down tunnel") to navigate between connected rooms in the game world.

## What the Action Does in IF Terms

The going action handles spatial navigation - moving the actor from one room (currentLocation) to an adjacent room via a configured exit. It:

1. Takes a direction/exit name as input
2. Resolves that direction to an exit configuration in the current room
3. Checks various blocking conditions (doors, locks, visibility)
4. Moves the actor to the destination room
5. Tracks first visits to rooms
6. Reports the movement with before/after snapshots

## Core IF Validations Expected

### Required Validations
1. **Direction provided** - Player must specify a direction or exit name
2. **Player in a room** - Player must be directly in a room (not inside a container/supporter)
3. **Exit exists** - The direction must lead somewhere from current room
4. **Doorway passability** - If an exit has a door:
   - Door must not be locked
   - Door must not be closed
5. **Destination exists** - The target room must exist in the world
6. **Darkness handling** - Cannot enter a dark room without a light source

### Spatial Constraints
- Player location validation: Check player is in room as direct container, not nested inside another object
- Exit blocking: Support blocked exits with custom messages
- Portal via entities: Handle exits connected through specific door/portal entities

## Does Current Implementation Cover Basic IF Expectations?

### YES - All Core Validations Present

The implementation comprehensively validates:

1. **Direction parsing** (lines 79-95) - Handles both extras and directObject sources
2. **Player containment** (lines 97-107) - Prevents movement while inside objects
3. **Exit existence** (lines 117-133) - Differentiates between no exits at all vs. no exit in that direction
4. **Exit blockage** (lines 135-143) - Checks for blocked exits with messages
5. **Door state** (lines 145-173) - Validates locked and closed state separately
6. **Destination validity** (lines 176-187) - Ensures destination exists
7. **Darkness/light** (lines 189-196) - Prevents entering dark rooms without light sources
8. **First visit tracking** (lines 223-236) - Marks rooms as visited
9. **Proper event reporting** (lines 243-262) - Three movement events (exited/moved/entered) plus success message

## Any Obvious Gaps in Basic IF Logic?

### No Critical Gaps - Implementation is Sound

The action correctly handles all fundamental IF expectations for movement:

- **Spatial modeling** is correct - uses room containment properly
- **State checking** is thorough - validates all preconditions before movement
- **Mutation discipline** is clean - only moves entity and marks visited in execute phase
- **Event generation** is complete - captures exit, movement, and entry
- **Light mechanics** are implemented - respects dark rooms
- **Portal support** is present - handles doors/portals via exit config

### Potential Enhancement (Not a Gap)
The implementation could optionally track which direction the player came FROM in shared data for more sophisticated reporting (e.g., "You came from the south"), but this is not a core IF requirement and the current event system likely captures this elsewhere.

## Summary

The going action is a **well-structured, complete implementation** that covers all fundamental Interactive Fiction expectations for movement mechanics. It properly validates spatial constraints, door states, lighting, and destination availability. The three-phase pattern is correctly applied with minimal execute logic and proper event reporting.
