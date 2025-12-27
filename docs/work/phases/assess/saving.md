# Saving Action - IF Logic Assessment

## Action Name and Description
**Saving** - The meta-action for persisting game state to a save file, allowing the player to resume later from the same point.

## What the Action Does in IF Terms
The saving action captures the current game state (including score, move count, turn count) and stores it to a named save slot. This is a meta-action that operates outside the world model—it doesn't involve entity interactions but instead coordinates with the engine's persistence layer to write game state.

## Core IF Validations It Should Check

### Fundamental IF Constraints
1. **Saves not disabled** - The game may restrict saves in certain contexts (e.g., combat, scripted sequences)
2. **Save slot available** - There must be available storage for saves (slots, disk space, cloud quota)
3. **Save not already in progress** - Cannot start a new save while one is ongoing
4. **Valid save name** - Save names must be filesystem-safe and reasonable length (not too long, no invalid characters)
5. **Overwrite warning** - If overwriting an existing save, typically ask for confirmation (though core action can just validate)

### State Capture
6. **Game metadata captured** - Score, move count, and turn count should be included
7. **Timestamp recorded** - When the save was created

## Does the Current Implementation Cover Basic IF Expectations?

**PARTIALLY - Core validations present, but missing confirmation for overwrites:**

- ✓ Save disabled check (line 118-122)
- ✓ Save already in progress check (line 125-130)
- ✓ Save name validation: length and filesystem-unsafe characters (line 133-138)
- ✓ Metadata capture: score, moves, turnCount (line 36-39, 62-66)
- ✓ Timestamp recording (line 49, 61)
- ✓ Quick-save and auto-save tracking (line 42-43, 54, 66)
- ✓ Platform event emission for engine processing (line 170)
- **✗ No overwrite check** - Does not validate or warn about overwriting existing saves (line 107-110 just extracts name)

## Any Obvious Gaps in Basic IF Logic

**One notable gap:**

1. **Overwrite detection missing** - The action extracts the save name and passes it through, but does not check if a save with that name already exists. Standard IF practice is either to:
   - Silently overwrite (common in modern IF)
   - Ask for confirmation before overwriting (more careful UX)

   The current implementation provides no validation or notification about this. The engine may handle it, but the action should at least detect it to allow proper messaging.

**Other observations:**

- The action correctly uses `sharedData` for storing metadata rather than mutating world state
- The four-phase pattern is properly applied (validate → execute → report)
- Save slot/name extraction is consistent between validate and execute phases
- The action correctly emits both platform events (for engine) and IF events (for message system)

**Recommendation**: Add overwrite detection in validate phase to provide feedback to player about whether they're creating a new save or overwriting an existing one.
