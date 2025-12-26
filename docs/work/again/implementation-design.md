# Again Action - Implementation Design

## Overview
The `again` action (aliases: `g`) allows players to repeat their last meaningful command. This is a meta-action that interacts with command history to re-execute the previously entered command text.

## Architecture Principles

### Command History Storage
- **What**: Store raw command text as entered by the player
- **Where**: Platform/Engine level (not in world state)
- **Format**: Simple string array with metadata

```typescript
interface CommandHistoryEntry {
  text: string;           // Raw command as typed
  timestamp: number;      // When it was entered
  turnNumber: number;     // Game turn when executed
  actionId?: string;      // What action it resolved to (if any)
  status: 'success' | 'failed' | 'error';  // Execution result
}
```

### History Exclusion Rules
Commands that should NOT be added to history:
- `again`, `g` - Would create recursion
- `oops` - References previous state
- `undo` - Reverses previous command

### The Standard IF Flow
1. Player types command
2. Platform/Engine adds to history (if not excluded)
3. Command processes normally
4. Player types "again" or "g"
5. Again action retrieves last command from history
6. Command text is re-executed through full pipeline

## Three-Phase Implementation

### Phase 1: Validate
```typescript
validate(context: ActionContext): ValidationResult {
  // Get the command history service
  const history = context.services.commandHistory;
  
  // Get last meaningful command (non-meta)
  const lastCommand = history.getLastCommand();
  
  if (!lastCommand) {
    return { 
      valid: false, 
      error: 'no_command_to_repeat' 
    };
  }
  
  // Check if it's repeatable
  if (!this.isRepeatable(lastCommand)) {
    return { 
      valid: false, 
      error: 'cant_repeat_that',
      params: { command: lastCommand.text.split(' ')[0] }
    };
  }
  
  // Store in sharedData for report phase
  context.sharedData.set('commandToRepeat', lastCommand.text);
  context.sharedData.set('originalTurn', lastCommand.turnNumber);
  
  return { valid: true };
}

private isRepeatable(entry: CommandHistoryEntry): boolean {
  // Some meta-commands shouldn't be repeated
  const nonRepeatable = [
    'save', 'restore',      // Game state operations
    'quit', 'restart',      // Game flow control  
    'script', 'unscript',   // Transcript control
    'version', 'about'      // Info commands (debatable)
  ];
  
  const firstWord = entry.text.toLowerCase().split(' ')[0];
  return !nonRepeatable.includes(firstWord);
}
```

### Phase 2: Execute
```typescript
execute(context: ActionContext): void {
  // No world mutations
  // This is a pure meta-action
}
```

### Phase 3: Report
```typescript
report(context: ActionContext): ISemanticEvent[] {
  const commandText = context.sharedData.get('commandToRepeat');
  const originalTurn = context.sharedData.get('originalTurn');
  
  return [
    {
      type: 'if.action.again.repeating',
      data: {
        command: commandText,
        originalTurn,
        currentTurn: context.world.getTurnNumber()
      }
    },
    {
      type: 'if.system.execute_command',
      data: {
        text: commandText,
        isRepeat: true,
        skipHistory: false  // The repeated command SHOULD be added to history
      }
    }
  ];
}
```

## Platform/Engine Integration

### Command History Service
```typescript
class CommandHistoryService {
  private history: CommandHistoryEntry[] = [];
  private maxSize: number = 100;
  
  addCommand(text: string, metadata: Partial<CommandHistoryEntry>): void {
    // Skip excluded commands
    if (this.shouldExclude(text)) {
      return;
    }
    
    const entry: CommandHistoryEntry = {
      text,
      timestamp: Date.now(),
      turnNumber: metadata.turnNumber || 0,
      actionId: metadata.actionId,
      status: metadata.status || 'success'
    };
    
    this.history.push(entry);
    
    // Trim to max size
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }
  }
  
  getLastCommand(): CommandHistoryEntry | null {
    // Get the most recent non-excluded command
    return this.history[this.history.length - 1] || null;
  }
  
  private shouldExclude(text: string): boolean {
    const excluded = ['again', 'g', 'oops', 'undo'];
    const firstWord = text.trim().toLowerCase().split(' ')[0];
    return excluded.includes(firstWord);
  }
}
```

### Engine Event Handler
```typescript
// In the engine
eventBus.on('if.system.execute_command', async (event) => {
  const { text, isRepeat } = event.data;
  
  // Visual feedback for repeats
  if (isRepeat) {
    await output.write(`[Repeating: ${text}]`, { style: 'meta' });
  }
  
  // Re-execute through normal pipeline
  await processCommand(text);
});
```

## Client UI Considerations

### Arrow Key Navigation
The client should implement local command history navigation:
```typescript
class CommandInput {
  private localHistory: string[] = [];
  private historyIndex: number = -1;
  
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowUp') {
      this.navigateHistory(-1);  // Go back
    } else if (event.key === 'ArrowDown') {
      this.navigateHistory(1);   // Go forward
    }
  }
  
  navigateHistory(direction: number) {
    // Update index
    this.historyIndex = Math.max(0, 
      Math.min(this.localHistory.length - 1, 
        this.historyIndex + direction));
    
    // Update input field
    this.inputField.value = this.localHistory[this.historyIndex] || '';
  }
}
```

## Message Requirements

### Error Messages
- `no_command_to_repeat`: "There's nothing to repeat."
- `cant_repeat_that`: "You can't repeat '{command}'."

### Success Messages  
- `repeating_command`: "[Repeating: {command}]" (optional, style choice)

## Testing Scenarios

1. **Basic Repetition**
   - Enter "take lamp"
   - Enter "g"
   - Verify "take lamp" executes again

2. **Multiple Repetitions**
   - Enter "go north"
   - Enter "g" 
   - Enter "g"
   - Both should repeat "go north"

3. **Exclusion Rules**
   - Enter "save"
   - Enter "g"
   - Should fail with "can't repeat that"

4. **Again Not Added**
   - Enter "take lamp"
   - Enter "g"
   - Enter "g"
   - Should repeat "take lamp" both times, not "g"

5. **Empty History**
   - Start fresh game
   - Enter "g"
   - Should fail with "nothing to repeat"

## Design Decisions

### Why Store Raw Text?
- **Simplicity**: No complex serialization
- **Debugging**: Easy to see what was entered
- **Flexibility**: Parser changes don't break history
- **Standard**: This is how most IF systems work

### Why Re-parse?
- **Current Context**: World state may have changed
- **Vocabulary Updates**: New words might be available
- **Natural Failures**: If "take lamp" no longer makes sense, it fails naturally

### Why Platform-Level History?
- **UI Navigation**: Up/down arrows need access
- **Persistence**: Could save/restore across sessions
- **Debugging**: Can log all commands for bug reports
- **Separation**: Not part of game world state

## Future Enhancements

1. **Numbered History**: "again 3" to repeat 3 commands back
2. **Pattern Matching**: "again take" to repeat last take command
3. **Macro Recording**: Record multiple commands as one "again" unit
4. **Context Preservation**: Store and restore more context with commands

## Summary

The `again` action is fundamentally simple:
1. Store command text (excluding meta-commands)
2. Retrieve last command when "again" is used
3. Re-execute the text through the normal pipeline

This design maintains IF conventions while fitting cleanly into Sharpee's three-phase architecture.