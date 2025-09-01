# Again - Minimal Design (No Action Required)

## Overview
No action needed. Engine handles 'g' and 'again' by simple command substitution.

## Implementation in Engine

```typescript
// In engine
const commandHistory: string[] = [];
const EXCLUDED = ['again', 'g', 'oops', 'undo'];

function processCommand(input: string) {
  const normalized = input.trim().toLowerCase();
  
  // Check for again/g with no history
  if ((normalized === 'g' || normalized === 'again') && commandHistory.length === 0) {
    return [{
      type: 'if.error',
      data: {
        message: 'no_command_to_repeat',
        command: input
      }
    }];
  }
  
  // Substitute if needed
  if (normalized === 'g' || normalized === 'again') {
    input = commandHistory[commandHistory.length - 1];
  }
  
  // Add to history if not excluded
  const firstWord = normalized.split(' ')[0];
  if (!EXCLUDED.includes(firstWord)) {
    commandHistory.push(input);
  }
  
  // Continue with normal processing using (possibly substituted) input
  // ... parser → action → events
}
```

## That's It

- **No action file** - Delete `again.ts`, `again-events.ts`, `again-data.ts`
- **No action constant** - Remove `IFActions.AGAIN`
- **No tests** - Delete again test files
- **15 lines of code** - All in the engine

## Edge Cases Handled

1. **'g' at game start**: Returns `if.error` event
2. **Normal 'g'**: Substitutes and processes last command
3. **Multiple 'g' commands**: Each repeats the last real command

## What Gets Removed

- `/packages/stdlib/src/actions/standard/again/` - entire directory
- `/packages/stdlib/tests/actions/standard/again.test.ts`
- `IFActions.AGAIN` constant
- Any references to "again" action in action registry