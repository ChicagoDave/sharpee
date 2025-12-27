# Exiting Action - IF Logic Assessment

## Action Overview
The exiting action allows the player to leave enterable containers, supporters, or other special locations. It's the inverse of the entering action and handles movement out of non-room locations back to their parent.

## What It Does in IF Terms
When a player is inside a container, on a supporter, or in another enterable object:
- **Exiting a container**: "exit the box" - player leaves from inside the container back to where it was located
- **Exiting a supporter**: "exit the table" - player steps off the object back to where it was located
- **Exiting a vehicle**: Player dismounts from any enterable object and returns to the previous room

## Core IF Validations

### 1. Player Location Check (PRESENT)
- Validates that `getLocation(actor)` returns something
- Without this, there's nowhere to exit from

### 2. Container Existence (PRESENT)
- Validates that the container entity exists in the world
- Prevents attempting to exit from deleted/invalid entities

### 3. Room Constraint (PRESENT)
- Prevents exiting from rooms (validation blocks if entity has ROOM trait)
- Players use GO action to move between rooms, not EXIT
- Correct separation of concerns

### 4. Parent Location Validation (PRESENT)
- Validates that the container itself has a parent location
- Without this, there's nowhere to exit to

### 5. Closed Container Check (PRESENT)
- If the container has OPENABLE trait, checks it must be open to exit
- Matches entering action requirement: can't exit a closed box

### 6. Preposition Selection (PRESENT)
- Correctly determines exit preposition based on entity type:
  - Containers: "out of"
  - Supporters: "off"
  - Other: "from"

## Does It Cover Basic IF Expectations?

**YES, with strong implementation.** The action correctly handles:

- **Semantic symmetry with entering**: Exiting is the proper inverse of entering
- **Closed container constraint**: You can't exit something that's closed (matches entering requirement)
- **Proper parent traversal**: Moves actor up one level in the containment hierarchy
- **Natural language prepositions**: Uses contextually appropriate exit language
- **Room isolation**: Correctly prevents exiting from rooms

## Obvious Gaps in Basic IF Logic

### Gap 1: Capacity/Size Checks (NOT PRESENT)
**Status**: No validation that the actor can physically fit through exit opening.
- Entering validates capacity (`ContainerBehavior.canAccept`, `SupporterBehavior.canAccept`)
- Exiting does NOT mirror this - assumes if you entered, you can exit
- **Assessment**: This is probably correct IF logic (if you fit entering, you fit exiting), but asymmetry with entering is notable

### Gap 2: Supporter vs Container Distinction in Capacity (MINOR)
**Status**: Supporters can have capacity limits in entering but exiting assumes no capacity check needed
- Entering checks both container AND supporter capacity
- Exiting only checks openable state, not capacity
- **Assessment**: Likely correct (exiting doesn't care about remaining space), but worth noting

### Gap 3: No Enterable Trait Check (POTENTIAL ISSUE)
**Status**: Exiting doesn't explicitly check if the container/supporter has `enterable: true`
- Entering validates: `containerTrait.enterable` and `supporterTrait.enterable`
- Exiting assumes if player is in it, it must be enterable
- **Assessment**: Logic is sound (player shouldn't be in non-enterable places), but could be more defensive

### Gap 4: No Removal Before Move (COSMETIC)
**Status**: Actor is directly moved without removing from parent first
- This works because `moveEntity` handles the mechanics
- But pattern differs from some traditional IF engines that do remove+add
- **Assessment**: Not a functional issue, engine-specific design choice

## Summary

**Overall Assessment: SOLID**

The exiting action implements correct fundamental IF behavior:
- ✓ Proper validation hierarchy (location → entity → room check → parent → openable)
- ✓ Correct preposition selection
- ✓ Enforces closed container constraint
- ✓ Proper inverse relationship with entering action
- ✓ Three-phase pattern properly applied

**Minor observations**: Asymmetry with entering on capacity checking appears intentional (you can exit what you entered), and the lack of explicit enterable trait check is acceptable since the player shouldn't be in non-enterable places. These are design choices, not gaps.
