# Again Implementation - Summary

## What We Changed

### 1. Removed Again Action
- Deleted `/packages/stdlib/src/actions/standard/again/` directory
- Removed `IFActions.AGAIN` constant from constants.ts
- Removed again action from standard action exports
- Deleted test file `/packages/stdlib/tests/actions/standard/again.test.ts`

### 2. Added Engine-Level Command Substitution
In `game-engine.ts`:
- Added command substitution logic at the start of `executeTurn()`
- When input is 'g' or 'again', substitute with last command from history
- Return error event if no command history exists
- Simplified `updateCommandHistory()` to exclude 'again', 'g', 'oops', 'undo'

## The New Flow

1. User types "take lamp"
   - Added to command history
   - Processed normally

2. User types "g" or "again"
   - Engine detects this before parsing
   - Looks up last command in history
   - Substitutes "take lamp" for "g"
   - Processes "take lamp" normally

3. If no history exists:
   - Returns `if.error` event with 'no_command_to_repeat' message
   - Text service handles the error display

## Benefits

- **Simpler**: ~15 lines of code instead of 180+ lines
- **No action needed**: Removed entire action implementation
- **Standard IF pattern**: Matches how most IF systems handle 'again'
- **Cleaner architecture**: Command repetition is purely an engine concern

## Edge Cases Handled

- Empty history at game start
- Excluded commands not added to history
- Multiple 'g' commands work correctly (each repeats last real command)

## Testing

Both packages compile successfully:
- `@sharpee/engine` - builds with new substitution logic
- `@sharpee/stdlib` - builds without again action

The implementation follows the standard IF convention where 'again' is handled at the input layer rather than as a discrete action.