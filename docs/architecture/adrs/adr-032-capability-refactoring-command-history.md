# ADR-032: Capability Refactoring and Command History Implementation

## Status
Implemented

## Context

### Current Situation
- All capability schemas are defined in a single file (`stdlib/src/capabilities/index.ts`)
- The file is growing large and will continue to grow as we add more capabilities
- We need to add a new Command History capability to support the AGAIN/G action
- The AGAIN action needs to repeat the last executed command

### Problem
1. **File Organization**: The single capabilities file is becoming unwieldy
2. **Command Repetition**: We need a way to track and repeat the last command for the AGAIN action
3. **Integration**: The engine needs to update command history after successful command execution

### Current Capability System
- Capabilities store game state that doesn't fit naturally in the entity-relationship model
- Examples: scoring, save/restore, conversation state, game metadata
- Capabilities are registered with schemas and accessed via `world.getCapability()`

## Decision

### 1. Refactor Capabilities into Individual Files

Break out each capability into its own file:

```
/packages/stdlib/src/capabilities/
├── index.ts              // Main export and registration
├── scoring.ts            // Scoring capability
├── save-restore.ts       // Save/Restore capability  
├── conversation.ts       // Conversation capability
├── game-meta.ts          // Game meta capability
└── command-history.ts    // NEW: Command history capability
```

Each file will contain:
- The capability schema
- The TypeScript interface for the capability data
- Any related types or constants

### 2. Add Command History Capability

Create a new capability to track executed commands:

```typescript
// command-history.ts
export const CommandHistoryCapabilitySchema: CapabilitySchema = {
  entries: {
    type: 'array',
    default: [],
    required: true
  },
  maxEntries: {
    type: 'number',
    default: 100,
    required: false
  }
};

export interface CommandHistoryEntry {
  actionId: string;           // 'if.action.taking'
  originalText: string;       // 'take the brass lamp'
  parsedCommand: {
    verb: string;
    directObject?: string;
    indirectObject?: string;
    preposition?: string;
  };
  turnNumber: number;
  timestamp: number;
}

export interface CommandHistoryData {
  entries: CommandHistoryEntry[];
  maxEntries?: number;
}
```

### 3. Update StandardCapabilities

Add the new capability to the constants in `world-model`:

```typescript
export const StandardCapabilities = {
  SCORING: 'scoring',
  SAVE_RESTORE: 'saveRestore',
  CONVERSATION: 'conversation',
  GAME_META: 'gameMeta',
  COMMAND_HISTORY: 'commandHistory', // NEW
} as const;
```

### 4. Implement AGAIN Action

Create the AGAIN action that uses the command history:

```typescript
export const againAction: Action = {
  id: IFActions.AGAIN,
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const historyData = context.world.getCapability(StandardCapabilities.COMMAND_HISTORY);
    
    if (!historyData || historyData.entries.length === 0) {
      return context.emitFailure('no_command_to_repeat');
    }
    
    const lastEntry = historyData.entries[historyData.entries.length - 1];
    
    // Don't repeat certain meta commands
    const nonRepeatable = [
      IFActions.AGAIN,
      IFActions.SAVE,
      IFActions.RESTORE,
      IFActions.QUIT
    ];
    
    if (nonRepeatable.includes(lastEntry.actionId)) {
      return context.emitFailure('cant_repeat_that');
    }
    
    // Re-execute the command
    return context.world.executeCommand(lastEntry.parsedCommand);
  }
};
```

### 5. Engine Integration

The engine will be responsible for updating command history after successful execution:

```typescript
// In the engine, after successful command execution
if (result.success && parsedCommand.verb !== 'again') {
  const historyData = world.getCapability(StandardCapabilities.COMMAND_HISTORY);
  if (historyData) {
    const entry: CommandHistoryEntry = {
      actionId: result.actionId,
      originalText: originalCommand,
      parsedCommand: parsedCommand,
      turnNumber: gameMeta?.turnCount || 0,
      timestamp: Date.now()
    };
    
    historyData.entries.push(entry);
    
    // Trim to maxEntries if needed
    if (historyData.maxEntries && historyData.entries.length > historyData.maxEntries) {
      historyData.entries.shift();
    }
  }
}
```

## Consequences

### Positive
- **Better Organization**: Each capability is self-contained and easy to find
- **Easier Maintenance**: Changes to one capability don't affect others
- **Clear Responsibility**: Each file has a single purpose
- **Command History**: Enables the AGAIN action and potentially other features (UNDO, REPLAY)
- **Save/Restore Compatible**: Command history is automatically saved/restored as part of world state
- **Limited Memory**: maxEntries prevents unbounded growth

### Negative
- **More Files**: More files to manage (mitigated by clear naming)
- **Import Changes**: Existing code importing capabilities needs updating
- **Engine Coupling**: Engine needs to know about command history capability

### Neutral
- Command history is stored in world state, so it persists across save/restore
- The 100-command default limit should be sufficient for most games
- Non-repeatable commands are hardcoded in the action (could be made configurable later)

## Implementation Details

### 1. Capability Refactoring Completed

Refactored all capabilities into individual files:
- `/packages/stdlib/src/capabilities/scoring.ts`
- `/packages/stdlib/src/capabilities/save-restore.ts`
- `/packages/stdlib/src/capabilities/conversation.ts`
- `/packages/stdlib/src/capabilities/game-meta.ts`
- `/packages/stdlib/src/capabilities/command-history.ts`
- `/packages/stdlib/src/capabilities/index.ts` (main export)

### 2. Command History Capability Added

```typescript
export const CommandHistoryCapabilitySchema: CapabilitySchema = {
  entries: {
    type: 'array',
    default: [],
    required: true
  },
  maxEntries: {
    type: 'number',
    default: 100,
    required: false
  }
};
```

### 3. AGAIN Action Implemented

- Created `/packages/stdlib/src/actions/standard/again.ts`
- Added to action constants and exports
- Emits events for engine to handle command repetition
- Prevents repeating non-repeatable commands

### 4. Engine Integration

#### Enhanced Data Flow
- Extended `TurnResult` interface with `actionId` and `parsedCommand`
- Modified `CommandExecutor` to pass action information through
- Clean access to executed action without event inspection

#### Command History Tracking
- Added `updateCommandHistory` method to `GameEngine`
- Automatically tracks successful commands after execution
- Filters non-repeatable commands (AGAIN, SAVE, RESTORE, etc.)
- Handles both old and new ParsedCommand structures
- Respects maxEntries limit with automatic trimming

#### AGAIN Command Execution
- Engine detects `if.event.execute_command` events from AGAIN
- Re-executes the original command through `executeTurn`
- AGAIN commands themselves are not recorded in history

### 5. Test Coverage

Created comprehensive tests:
- Unit tests for capability refactoring
- Unit tests for AGAIN action behavior
- Integration tests for command history in engine
- Edge cases: missing capability, empty history, limits

## Implementation Decisions

### Event-Driven Repetition
The AGAIN action emits an `if.event.execute_command` event rather than directly calling the engine. This maintains the event-driven architecture and keeps the action layer independent of the engine implementation.

### Graceful Degradation
The system works without the command history capability registered. Games that don't need AGAIN functionality can omit the capability without any errors.

### Parsed Command Preservation
The engine preserves the full parsed command structure from the parser, enabling accurate command repetition with all components (verb, objects, prepositions).

## Future Enhancements

1. **Undo Support**: The command history structure could support UNDO by storing world state snapshots
2. **Command Shortcuts**: Could add numbered repetition ("AGAIN 3" to repeat 3 commands ago)
3. **Pattern Matching**: Could add pattern-based repetition ("AGAIN TAKE" to repeat last take command)
4. **Transcript Integration**: Command history could be used for game transcripts

## References
- ADR-007: Event-Driven Architecture
- ADR-029: Text Service Architecture (separation of concerns)
- Issue: "we don't have a sleep action" led to discovering need for AGAIN/G
