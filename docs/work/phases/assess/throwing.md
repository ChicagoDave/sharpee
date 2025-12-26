# Throwing Action - IF Logic Assessment

## Action Name and Description
**Throwing Action** - Allows the player to throw objects at targets or in directions within the game world.

## What the Action Does in IF Terms

The throwing action implements a fundamental IF mechanic: the ability to propel held objects through space. This can manifest in three distinct ways:

1. **Targeted throw** - Throwing an object at a visible entity (actor or object) in the current location
2. **Directional throw** - Throwing an object in a cardinal direction (north, south, up, down, etc.)
3. **General throw** - Throwing an object without a specific target (lands in current location)

The action handles physics-like outcomes including hitting/missing targets, object fragility, target reactions, and final object placement.

## Core IF Validations It Should Check

1. **Item possession** - Player must be holding/carrying the item
2. **Item availability** - Item must exist and be identifiable
3. **Target accessibility** - For targeted throws, target must be in the same location as the player
4. **Target existence** - Prevent throwing at self
5. **Direction validity** - For directional throws, an exit must exist in that direction
6. **Item throwability** - Item must not be too heavy to throw (weight threshold check)
7. **Container states** - Containers being thrown at must be checked for openness

## Does Current Implementation Cover Basic IF Expectations?

**Mostly yes, with some gaps:**

### Strengths
- Validates item existence
- Checks target is in same location (prevents cross-room throws)
- Prevents self-targeting
- Validates direction exits exist
- Checks weight threshold (>10 units cannot be thrown)
- Handles target states (openable containers must be open to receive items)
- Differentiates throw types (at_target, directional, general)

### Coverage Assessment
The implementation covers the essential IF validations for a throw action. The validate phase correctly prevents the most problematic cases (missing items, unavailable targets, non-existent exits, excessive weight).

## Obvious Gaps in Basic IF Logic

### 1. **Missing: Require Item is Held**
The validation does NOT explicitly check that the item is in the player's inventory/carried. The metadata specifies `directObjectScope: ScopeLevel.CARRIED`, which delegates scope checking to the parser, but the action does not re-validate this. If an item is somehow in scope but not carried, it could be thrown without being held.

**Impact**: Low risk (parser should enforce), but violates principle of defense-in-depth.

### 2. **Missing: Check Item is Not Fixed/Scenery**
There is no validation that scenery items or unmovable objects cannot be thrown. The action only checks weight, not whether an item has traits that prevent movement (e.g., Scenery trait).

**Impact**: Medium - could allow throwing of obviously immovable objects if parser doesn't filter them.

### 3. **Missing: Validate Target is Not Secured/Locked**
For locked containers, the action does not prevent throwing items into them. A locked chest that is openable would reject items being "landed_in" based on openness check, but this is indirect.

**Impact**: Low - openness check handles most cases, but locked state could be more explicit.

### 4. **Missing: Check Player is Not Paralyzed/Disabled**
No validation that the player can physically perform the throw action (tied up, paralyzed, etc.). This would be an IF expectation in many systems.

**Impact**: High - this is a common IF validation that enables interesting story mechanics.

### 5. **Missing: Check Target is Not Protected/Immune**
No validation checking if a target has protective traits that would prevent being hit by thrown objects (shields, force fields, etc.). This could be future-proofed.

**Impact**: Low - may be desired for extensibility but not essential for basic throwing.

### 6. **Missing: Require Visibility for Targeted Throws**
The action does not require the target be visible when throwing at them. A player could throw at an invisible or unseeable target if it's in the same location. This is technically valid IF (blind throws can work), but the implementation doesn't distinguish.

**Impact**: Low - blind throws are legitimate IF mechanics, but messaging may be confusing.

## Summary

The throwing action implements **solid core IF logic**. It prevents the major categories of invalid throws (missing items, bad targets, unreachable exits, excessive weight). The three-phase structure properly separates validation, execution, and reporting.

The main gaps are minor and relate to edge cases or future extensibility (scenery items, player paralysis, protective effects). For basic interactive fiction expectations, the implementation is adequate.

**Assessment**: **ADEQUATE FOR BASIC IF** - Core validations are present. Consider future enhancement for scenery item handling and player-state checks.
