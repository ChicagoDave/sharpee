# Listening Action - IF Logic Assessment

## Action Name and Description
**Listening** - A sensory action that allows the player to listen for sounds from specific objects or detect ambient sounds in their current environment.

## What the Action Does in IF Terms
Listening is a perception action that provides audio feedback about the game world:
- When targeting a specific object: Reports what sounds that object makes (if any)
- When used without a target: Reports what sounds are present in the current room
- Primarily detects sounds from active devices (switchable items that are on) and sounds from containers (liquid sloshing, etc.)

## Core IF Validations It Should Check

1. **Reachability of target** (if specified) - Can the player perceive the target auditorily?
   - Objects in different rooms should be unaudible
   - Objects outside containers should be audible if switchable/device-like

2. **Target existence** - Is the target a valid object in the world?

3. **Distance/Location** - Can sounds travel that distance?
   - Listening to objects in the same room: Yes
   - Listening to objects in different rooms: No (too far away)

## Does the Current Implementation Cover Basic IF Expectations?

**Partial - Missing critical validation for distance/reachability:**

The implementation is missing a fundamental IF expectation:
- **No distance validation**: Unlike smelling (which checks if target is in a different room), listening validates that the target is in the same location as the player
- The action always validates as `{ valid: true }` with no preconditions
- This means players can "listen to" objects that are in completely different rooms

For comparison, the smelling action (a similar sensory action) validates:
```typescript
// Smelling checks room distance
if (targetRoom && actorRoom && targetRoom.id !== actorRoom.id) {
  return { valid: false, error: 'too_far', ... }
}
```

## Obvious Gaps in Basic IF Logic

1. **Missing distance/location check** - Core IF assumption that you cannot hear objects that are in other rooms
   - A listening target should be in the same room as the player (or at least the same location scope)
   - The `not_visible` message in requiredMessages suggests distance checking was intended but not implemented

2. **No validation of audible objects** - The action has `directObjectScope: ScopeLevel.AUDIBLE` but never validates that the target is actually audible
   - A target could have no sound-making traits and still validate as reachable
   - IF expectation: listening to something should only fail if unreachable, but the action should still report clearly what is heard (or not heard)

3. **Inconsistency with smelling pattern** - Smelling validates distance upfront; listening does not
   - Both are sensory actions that require environmental proximity
   - They should follow the same validation pattern for consistency

## Summary
The listening action correctly handles the "no-mutation" sensory pattern and sound analysis logic, but lacks a critical IF validation: **it does not check if the target is within audible range (same room)**. This is a gap compared to both IF conventions and the parallel smelling action implementation.
