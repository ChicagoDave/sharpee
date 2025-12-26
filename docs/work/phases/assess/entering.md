# Entering Action - IF Logic Assessment

## Action Name and Description

**Action:** Entering (move actor into/onto containers or supporters)

Allows a player to enter a container or get on top of a supporter. Core movement action in Interactive Fiction for spatial manipulation beyond basic room navigation.

## What the Action Does in IF Terms

The entering action handles two spatial scenarios in IF:

1. **Entering containers** - Player moves "inside" a box, chest, vehicle, building, or other containable space
2. **Getting on supporters** - Player moves "onto" a chair, table, bed, or other object that can be stood/sat on

The action uses different prepositions ("in" vs "on") based on the target type, which is fundamental to IF's spatial model where containment relationships are distinct from standing-on relationships.

## Core IF Validations the Action Should Check

An entering action fundamentally requires:

1. **Target must exist and be reachable** - Can't enter something you can't perceive
2. **Target must be enterable** - Not all containers/supporters allow entry (some are decorative/scenery)
3. **Target must be accessible** - If it's an openable container, it must be open
4. **Target must have capacity** - Both containers and supporters have size/weight limits
5. **Player must not already be inside** - Can't enter something you're already in
6. **Use correct preposition** - "In" for containers, "on" for supporters (affects output clarity)

## Does Current Implementation Cover Basic IF Expectations?

**YES, comprehensively.**

The entering action covers all fundamental IF validations:

- Checks target exists (lines 68-72)
- Validates target is not already the player's location (lines 76-83)
- Validates container targets are marked enterable (lines 86-94)
- Validates openable containers are actually open before entry (lines 97-103)
- Validates container capacity (lines 106-114)
- Validates supporter targets are marked enterable (lines 120-128)
- Validates supporter capacity (lines 131-139)
- Rejects targets that are neither container nor supporter (lines 145-149)
- Correctly determines preposition (lines 162-166)
- Properly executes movement via `world.moveEntity()` (line 169)
- Generates correct events with preposition data (lines 206-226)

## Any Obvious Gaps in Basic IF Logic?

**No significant gaps identified.**

The implementation is solid and complete for basic IF behavior:

- The four-phase pattern (validate/execute/blocked/report) is properly implemented
- Validation is thorough without being overly restrictive
- Execute phase is minimal (single `moveEntity()` call) with state stored in sharedData
- Report phase generates semantic events without direct text output
- Error messages are appropriately scoped (blocked phase)
- Preposition logic is correctly tied to trait type

The action respects core IF principles: containment relationships are properly modeled, capacity constraints are enforced, and state changes (open/closed) are checked before allowing entry.

### Minor Implementation Notes (Not Gaps)

1. The `CANT_ENTER` message is defined but never used (could be removed or reserved for future use)
2. The action doesn't validate reachability explicitly, relying on scope resolution upstream - this is consistent with the codebase pattern
3. No special handling for locked containers (they can still be entered if open) - this is acceptable IF behavior where openness matters but locks don't prevent entry once open
