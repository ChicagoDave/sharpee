# IF Logic Assessment: Putting Action

## Action Name and Description

**Putting** - The action of placing an object the player is holding into a container or onto a supporter (surface).

## What the Action Does in IF Terms

In Interactive Fiction, putting is a fundamental manipulation action that handles two related but distinct operations:

1. **Putting in (containers)**: Moving an object from the player's inventory into a container, typically with the phrasing "put X in Y" or "put X into Y"
2. **Putting on (supporters)**: Placing an object from the player's inventory onto a surface, typically with the phrasing "put X on Y"

The action must determine whether the target is a container or a supporter and apply the appropriate semantics.

## Core IF Validations It Should Check

### Mandatory Validations (All should be present)

1. **Object exists and is reachable** - The item being put must be explicitly specified and must be in the player's inventory (CARRIED scope)
2. **Destination exists and is reachable** - The target container/supporter must exist and be reachable (REACHABLE scope)
3. **Object is not the destination** - Prevent nonsensical "put X in X" scenarios
4. **Object not already in/on destination** - Prevent redundant operations
5. **Destination is a container OR supporter** - The target must have one of these traits
6. **Preposition matches destination type** - If user says "put X on Y", Y must be a supporter; if "put X in Y", Y must be a container
7. **Container is open** - If putting in a container with OPENABLE trait, it must be open
8. **Capacity check** - Both containers and supporters should have capacity limits
9. **Player can hold/manipulate** - Implicit (assumes CARRIED scope ensures this)

## Does Current Implementation Cover Basic IF Expectations?

**Yes, comprehensively.** The implementation covers all core IF validations:

- Lines 70-75: Direct object (item) existence ✓
- Lines 78-84: Indirect object (destination) existence ✓
- Lines 87-94: Self-reference prevention ✓
- Lines 97-108: Already-in-place detection ✓
- Lines 111-152: Container vs supporter determination and preposition matching ✓
- Lines 155-163: Container openability check ✓
- Lines 166-172: Container capacity validation via `ContainerBehavior.canAccept()` ✓
- Lines 177-183: Supporter capacity validation via `SupporterBehavior.canAccept()` ✓
- Metadata (lines 59-60): Scope restrictions (CARRIED for item, REACHABLE for destination) ✓

## Any Obvious Gaps in Basic IF Logic?

### Minor Observation (Not a Gap, but Design Note)

The implementation references a `NOT_HELD` message constant in the requiredMessages array (line 42), but this validation is **not explicitly performed** in the validate() function. The scope system (CARRIED scope for directObject) handles this implicitly at the command parsing level, so the check is delegated rather than missing. This is architecturally sound but worth noting - if scope validation ever becomes optional or configurable, this action would need explicit "item not held" validation.

### Coverage Assessment

- **Basic validations**: 100% complete
- **Capacity constraints**: Delegated to behavior classes (correct architecture)
- **State dependencies**: Openability state is checked (line 157)
- **Actor-relative constraints**: Scope metadata ensures reachability

The implementation properly follows the IF contract: you can put something on a surface only if you're holding it and can reach the surface, and you can put something in a container only if it's open and there's room.
