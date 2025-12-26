# Reading Action - IF Logic Assessment

## Action Name and Description
**Reading** - An action that allows the player to read text content from readable objects such as books, notes, signs, and inscriptions in the game world.

## What the Action Does in IF Terms
Reading is a query action (no world state mutation) that displays text content to the player:
- Identifies and validates that the target is a readable object
- Retrieves the text associated with the readable object
- Handles multi-page readable objects by displaying the current page
- Tracks whether the object has been read before
- Distinguishes between different readable types (books, signs, notes, inscriptions) for presentation purposes

## Core IF Validations It Should Check

1. **Target existence and identifiability** - Is there a specific object to read?
   - The action requires a direct object or fails with `what_to_read`

2. **Target readability** - Is the object actually readable?
   - The object must have the READABLE trait
   - The object's `isReadable` flag must be true (not obscured, not locked away, etc.)

3. **Reachability of target** - Can the player physically perceive and access the text?
   - Objects in different rooms or hidden from view should not be readable
   - Objects inside closed containers should not be readable

4. **Ability/literacy requirements** - Does the player have necessary knowledge or items to read?
   - Some text might require special abilities (reading in darkness, deciphering codes, reading foreign languages)
   - The trait defines `requiresAbility` and `requiredAbility` but action does not validate player possesses it

## Does the Current Implementation Cover Basic IF Expectations?

**Partial - Missing critical IF reachability validation:**

The implementation checks if an object has the READABLE trait and if it's currently readable (`isReadable`), which covers basic readable object validation. However, it lacks a fundamental IF expectation:

- **No reachability/visibility check** - The action does not verify that the player can actually reach or see the readable object
  - An object in a closed container should not be readable
  - An object in a different room should not be readable
  - An object that is not in the player's scope should not be readable

Unlike similar query actions such as examining (which validates reachability), reading assumes the target must be reachable through the parser's scope resolution but does not perform its own validation.

## Obvious Gaps in Basic IF Logic

1. **Missing scope/reachability validation** - Core IF assumption that you cannot read text on objects you cannot access
   - The action should validate that the target is in the player's reachable scope
   - Example: A book inside a closed drawer should return a reachability error, not "that book isn't readable"
   - The action should check `context.canReach(target)` or validate the target is in the same location

2. **Incomplete ability/literacy requirements** - The `requiresAbility` pattern is defined but not enforced
   - The validate phase has a TODO comment for checking if player has required ability
   - Currently, the action accepts any readable object regardless of player capabilities
   - IF expectation: Reading foreign language text without translation ability should fail

3. **No distinction between "not readable" and "can't reach"** - Error messaging conflates two different problems
   - `cannot_read_now` is returned for both "object exists but can't be read" and accessibility issues
   - IF convention: These should be separate errors for better player feedback
   - Example: "You can't read that" (not readable) vs "You can't reach that" (location/container issue)

## Summary
The reading action correctly implements the three-phase pattern and handles readable object content retrieval, multi-page books, and readable type tracking. However, it has a critical gap: **it does not validate that the target is within the player's reachable scope before allowing the read**. Additionally, the `requiresAbility` validation is stubbed out and never implemented. These gaps create situations where players could appear to read objects they cannot actually access, violating fundamental IF conventions about percption and reachability.
