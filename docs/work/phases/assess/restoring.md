# IF Logic Assessment: Restoring Action

## Action Overview
**Name:** Restoring
**Brief Description:** Meta-action that restores a previously saved game state by signaling the engine to load game data.

## What the Action Does in IF Terms
The restoring action implements game save restoration - allowing players to load a previously saved game state and resume play from that point. In traditional IF, this is a fundamental meta-command that:
- Allows players to recover from failures or dead-ends
- Enables replay from earlier decision points
- Provides a fallback when progress is lost or unsatisfactory

## Core IF Validations It Should Check

### Essential Validations
1. **Saves Must Exist** ✓
   - Current implementation checks: `saveCount === 0` returns error `'no_saves'`
   - Critical: Can't restore if no saves exist

2. **Restore Must Be Allowed**  ✓
   - Current implementation checks: `restoreRestrictions.disabled` returns error `'restore_not_allowed'`
   - IF context: Some games restrict restoration (e.g., ironman mode, specific story moments)

3. **Save Must Be Valid/Accessible** ✗
   - Current implementation: Does NOT validate that the specified save exists
   - Gap: If player specifies a save name/slot that doesn't exist, action succeeds but restore may fail downstream
   - Would expect: `'save_not_found'` error if named save doesn't exist

### Desirable But Not Essential
4. **Save Format/Compatibility** ✗
   - Not checked: Version compatibility, file corruption detection
   - Note: Listed in `requiredMessages` but not validated
   - These are typically handled by engine, not the action

## Does Current Implementation Cover Basic IF Expectations?

**Partially - 60% coverage**

### What Works
- Validates that saves exist (primary use case)
- Respects restore restrictions (meta-game control)
- Correctly emits platform event to engine for actual restore
- Uses four-phase pattern appropriately
- Stores restore context (available saves, last save) for engine

### What's Missing
- **No validation of specified save** - Action doesn't check if the named/slotted save actually exists in `existingSaves` before passing to engine
- **No corruption/compatibility checks** - Though these may belong in engine, not action
- **Ambiguous "default" handling** - If player just types "restore" with no argument, action uses `'default'` save name, but there's no validation that a 'default' save exists

## Gaps in Basic IF Logic

1. **Save-Specific Validation Gap** (Medium Priority)
   - `execute()` extracts save name from command extras but never validates it exists
   - If `saveName = 'slot5'` but only `slot1-3` exist, action still succeeds
   - Proper behavior: `validate()` should check if the specified save exists OR `execute()` should not pass invalid slots to platform event

2. **Implicit "Default" Assumption** (Minor Priority)
   - When no save is specified, uses hardcoded `'default'` without checking it exists
   - Inconsistent with the explicit "saves must exist" validation
   - Should either require explicit save selection or validate default exists

3. **Missing Error Messages** (Minor Priority)
   - `requiredMessages` includes `'save_not_found'`, `'corrupt_save'`, `'incompatible_save'` but these errors are never returned from `validate()`
   - These message codes are defined but unreachable in current logic

## Recommendations for Basic IF Correctness
1. Add `validate()` check: If save name is specified, ensure it exists in `availableSaves`
2. Either validate default save exists OR require explicit save selection
3. Return `'save_not_found'` error if specified save doesn't exist
