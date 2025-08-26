# Again Action Design

## Overview
The Again action (also known as "G" in traditional IF) allows players to repeat their last command. It demonstrates command history tracking, action filtering, and meta-command execution patterns.

## Action Metadata
- **ID**: `IFActions.AGAIN`
- **Group**: `meta`
- **Direct Object**: Not required
- **Indirect Object**: Not required
- **Aliases**: "G", "REPEAT"

## Core Concepts

### Command History System
- **Capability-Based**: Uses world model capabilities
- **Turn Tracking**: Records turn numbers
- **Full Context**: Preserves parsed command structure
- **Size Limited**: Configurable history depth

### Repeatability Rules
Not all commands should be repeatable:
- Meta commands (save, restore, quit)
- The again command itself
- System commands (version, verify)

## Core Components

### 1. Main Action File (`again.ts`)

#### Required Messages
- `no_command_to_repeat` - No history available
- `cant_repeat_that` - Generic non-repeatable
- `cant_repeat_again` - Can't repeat AGAIN itself
- `cant_repeat_meta` - Can't repeat meta commands
- `repeated_command` - Success feedback
- `repeating` - Announcing repeat
- `repeating_action` - Action-specific repeat

#### Non-Repeatable Actions
```typescript
const nonRepeatable = [
  IFActions.AGAIN,       // Prevent infinite loop
  IFActions.SAVING,      // Avoid accidental saves
  IFActions.RESTORING,   // Prevent restore loops
  IFActions.QUITTING,    // Don't accidentally quit
  IFActions.RESTARTING,  // Prevent accidental restart
  IFActions.VERSION,     // No point repeating
  IFActions.VERIFYING    // No point repeating
];
```

### 2. Event Types (`again-events.ts`)

#### Event Data Structures

**RepeatingCommandEventData**
```typescript
{
  originalCommand: string,    // "take lamp"
  actionId: string,           // "if.action.taking"
  turnNumber: number          // When originally executed
}
```

**ExecuteCommandEventData**
```typescript
{
  command: ParsedCommand,     // Full parsed structure
  originalText: string,       // Original input
  isRepeat: boolean          // Flag for special handling
}
```

### 3. Command History Capability (`command-history.ts`)

#### History Entry Structure
```typescript
interface CommandHistoryEntry {
  actionId: string,           // Action identifier
  originalText: string,       // Raw user input
  parsedCommand: {            // Parsed structure
    verb: string,
    directObject?: string,
    indirectObject?: string,
    preposition?: string
  },
  turnNumber: number,         // Game turn
  timestamp: number           // Real time
}
```

#### Capability Configuration
```typescript
interface CommandHistoryData {
  entries: CommandHistoryEntry[],
  maxEntries?: number  // Default: 100
}
```

## Validation Phase

### Validation Sequence

#### 1. History Availability
```typescript
const historyData = context.world.getCapability(
  StandardCapabilities.COMMAND_HISTORY
);
if (!historyData || historyData.entries.length === 0) {
  return { valid: false, error: 'no_command_to_repeat' };
}
```

#### 2. Get Last Command
```typescript
const lastEntry = historyData.entries[
  historyData.entries.length - 1
];
```

#### 3. Check Repeatability
```typescript
if (nonRepeatable.includes(lastEntry.actionId)) {
  if (lastEntry.actionId === IFActions.AGAIN) {
    return { valid: false, error: 'cant_repeat_again' };
  }
  return { 
    valid: false, 
    error: 'cant_repeat_meta',
    params: { action: actionVerb }
  };
}
```

#### 4. Prepare Event Data
Even in validation, the action prepares event data:
```typescript
const repeatingData: RepeatingCommandEventData = {
  originalCommand: lastEntry.originalText,
  actionId: lastEntry.actionId,
  turnNumber: lastEntry.turnNumber
};
```

## Execution Phase

### State Reconstruction
Execute phase re-validates to ensure consistency:
```typescript
// Re-fetch history in case of state changes
const historyData = context.world.getCapability(
  StandardCapabilities.COMMAND_HISTORY
);
```

### Event Generation Sequence

#### 1. Notification Event
```typescript
context.event('if.event.repeating_command', {
  originalCommand: lastEntry.originalText,
  actionId: lastEntry.actionId,
  turnNumber: lastEntry.turnNumber
})
```

#### 2. Success Message
```typescript
context.event('action.success', {
  actionId: context.action.id,
  messageId: 'repeating',
  params: { command: lastEntry.originalText }
})
```

#### 3. Execution Request
```typescript
context.event('if.event.execute_command', {
  command: lastEntry.parsedCommand,
  originalText: lastEntry.originalText,
  isRepeat: true
})
```

### Engine Integration
The `if.event.execute_command` event tells the game engine to:
1. Re-parse the command
2. Re-validate in current context
3. Execute the action
4. Update command history

## World Model Integration

### Capability System
```typescript
// Accessing command history
const historyData = context.world.getCapability(
  StandardCapabilities.COMMAND_HISTORY
) as CommandHistoryData;
```

### History Management
- Engine maintains history
- Circular buffer pattern
- Configurable max entries
- Turn-based indexing

### History Updates
After successful execution:
1. New entry added to history
2. Oldest entry removed if at limit
3. Turn number incremented
4. Timestamp recorded

## Design Patterns

### Capability Pattern
**Advantages:**
- Decoupled from world state
- Optional feature
- Clean interface
- Testable

**Implementation:**
```typescript
world.getCapability(StandardCapabilities.COMMAND_HISTORY)
```

### Event-Driven Execution
**Flow:**
```
Again Action → Events → Engine → Target Action
     ↑                              ↓
     └──── Command History ←────────┘
```

### Filter Pattern
Non-repeatable actions filtered by:
- Action ID matching
- Category classification
- Safety considerations

### Delegation Pattern
Again doesn't execute commands directly:
- Emits execution event
- Engine handles re-execution
- Maintains separation of concerns

## Error Handling

### Specific Error Messages

#### Self-Reference
```typescript
if (lastEntry.actionId === IFActions.AGAIN) {
  return 'cant_repeat_again'; // "You can't repeat AGAIN."
}
```

#### Meta Commands
```typescript
return {
  error: 'cant_repeat_meta',
  params: { action: 'save' } // "You can't repeat SAVE."
}
```

#### Empty History
```typescript
if (!historyData || historyData.entries.length === 0) {
  return 'no_command_to_repeat'; // "There's nothing to repeat."
}
```

## Special Cases

### Command History Limits
When limit reached:
- Oldest entries removed (FIFO)
- Maintains recent history
- Prevents memory growth
- Configurable maximum

### Turn Boundary
- Commands from same turn repeatable
- Cross-turn repetition allowed
- Turn number preserved in history
- Timestamp for ordering

### State Dependencies
Repeated commands validated in current state:
- Object may have moved
- Doors may have closed
- Conditions may have changed
- New obstacles may exist

### Parser Evolution
If parser changes between original and repeat:
- Parsed structure preserved
- Original text maintained
- Re-parsing may differ
- Original intent preserved

## Performance Considerations

### History Storage
- Limited entry count (default 100)
- Shallow command copies
- No entity snapshots
- Minimal memory footprint

### Lookup Efficiency
- O(1) last command access
- No searching required
- Direct array indexing
- Immediate retrieval

### Event Processing
- Three events generated
- Minimal data payload
- No world queries
- Fast execution

## Testing Considerations

### Test Scenarios

#### Basic Repetition
- Simple commands (look, inventory)
- Commands with objects (take lamp)
- Commands with prepositions (put lamp in box)
- Multi-object commands

#### Error Cases
- No history available
- Non-repeatable commands
- Self-reference (again again)
- Meta-command attempts

#### State Changes
- Object moved between commands
- Conditions changed
- Different room context
- Inventory changes

#### History Management
- History at capacity
- Multiple repeats
- Cross-turn repeats
- History persistence

### Verification Points
- Correct command retrieved
- Events generated properly
- Non-repeatables filtered
- History maintained
- Turn numbers accurate
- Error messages appropriate

## Extension Points

### Custom Repeatability
Stories can extend non-repeatable list:
```typescript
const storyNonRepeatable = [
  ...standardNonRepeatable,
  'if.action.custom_save_state',
  'if.action.special_command'
];
```

### History Enrichment
Additional history data:
- Command success/failure
- State snapshots
- Undo capability
- Branch points
- Effect tracking

### Alternative Implementations
- Stack-based history (multiple undos)
- Named command macros
- Conditional repetition
- Pattern-based repetition

## Security Considerations

### Command Injection
- Parsed structure preserved
- No re-interpretation
- Safe from injection
- Original validation maintained

### State Validation
- Commands re-validated
- Current state checked
- No blind execution
- Safety preserved

## Future Enhancements

### Potential Features

#### 1. Numbered Repetition
```
> AGAIN 3
[Repeating "take coin" 3 times]
```

#### 2. Partial Repetition
```
> AGAIN WITH LAMP
[Repeating "take" with "lamp"]
```

#### 3. History Navigation
```
> AGAIN -2
[Repeating command from 2 turns ago]
```

#### 4. Macro Recording
```
> BEGIN MACRO
> north
> take key
> unlock door
> END MACRO
> AGAIN MACRO
```

#### 5. Smart Repetition
- Skip failed commands
- Adapt to state changes
- Suggest alternatives
- Learn patterns

## Design Philosophy

### User Experience Focus
- Reduces typing
- Speeds gameplay
- Prevents frustration
- Maintains flow

### Safety First
- No dangerous repeats
- Clear error messages
- Predictable behavior
- User protection

### Flexibility
- Configurable history
- Extensible filtering
- Custom messages
- Story control
