# ADR-035: Platform Event Architecture

## Status
Implemented

## Context
The Sharpee engine needs to handle operations that require intervention from the client/host platform, such as:
- Saving game state (file I/O)
- Restoring saved games
- Quitting the application
- Restarting the game

Currently, actions attempt to handle these operations directly, which creates problems:
1. Actions become async when they should be synchronous
2. The engine has direct dependencies on platform capabilities
3. Platform operations happen during turn execution rather than after

This violates our core principle that "all text is sent through events to an event source data store and after a turn is completed (all world model changes are completed) a text service uses templates."

## Decision
Implement a platform event system where:

1. **Actions emit intent**: Actions emit semantic events indicating platform operations are requested
2. **Engine queues operations**: The engine collects platform operation events during turn execution
3. **Post-turn execution**: After turn completion but before text service, the engine processes platform operations
4. **Completion events**: Platform operations emit completion events that the text service can report

### Event Flow
```
1. Player: "save"
2. Save action emits: platform.save_requested
3. Turn completes, world model updates finish
4. Engine processes pending platform operations
5. Engine calls client save hook
6. Engine emits: platform.save_completed
7. Text service runs, sees both events
8. Output: "Game saved."
```

### Platform Event Structure
```typescript
interface PlatformEvent extends SemanticEvent {
  type: PlatformEventTypeValue;
  requiresClientAction: true;
  payload: {
    context?: SaveContext | RestoreContext | QuitContext | RestartContext;
    success?: boolean;
    error?: string;
    [key: string]: unknown;
  };
}

// Event types include both requests and completions
const PlatformEventType = {
  // Request events
  SAVE_REQUESTED: 'platform.save_requested',
  RESTORE_REQUESTED: 'platform.restore_requested',
  QUIT_REQUESTED: 'platform.quit_requested',
  RESTART_REQUESTED: 'platform.restart_requested',
  
  // Completion events
  SAVE_COMPLETED: 'platform.save_completed',
  RESTORE_COMPLETED: 'platform.restore_completed',
  QUIT_CONFIRMED: 'platform.quit_confirmed',
  RESTART_COMPLETED: 'platform.restart_completed',
  
  // Error events
  SAVE_FAILED: 'platform.save_failed',
  RESTORE_FAILED: 'platform.restore_failed',
  QUIT_CANCELLED: 'platform.quit_cancelled',
  RESTART_CANCELLED: 'platform.restart_cancelled'
} as const;
```

## Consequences

### Positive
- **Clean separation**: Platform operations are clearly separated from game logic
- **Synchronous actions**: All actions remain synchronous
- **Event visibility**: Platform operations appear in event history
- **Client flexibility**: Clients implement operations appropriately for their platform
- **Proper timing**: Operations happen after world model updates complete

### Negative
- **Additional complexity**: Another event type to handle
- **Delayed execution**: Platform operations don't happen immediately
- **State management**: Need to track pending operations

### Neutral
- Platform operations are now two-phase (request + completion)
- Clients must handle platform events appropriately
- Text service sees both request and completion events

## Implementation Details

### Core Package (`@sharpee/core`)
- `events/platform-events.ts`: Defines all platform event types, contexts, and helper functions
- Extended `SaveRestoreHooks` interface to include optional `onQuitRequested` and `onRestartRequested`
- Context interfaces provide rich information for each operation type

### Engine Changes (`@sharpee/engine`)
- Added `pendingPlatformOps: PlatformEvent[]` to track operations during turn
- In `executeTurn()`: Platform events are detected and queued
- Added `processPlatformOperations()`: Processes all pending operations after turn completion
- Operations emit completion/error events based on hook results
- Default behavior when hooks not provided (quit succeeds, restart re-initializes)

### Action Updates (`@sharpee/stdlib`)
- `saving.ts`: Emits `platform.save_requested` with SaveContext
- `restoring.ts`: Emits `platform.restore_requested` with RestoreContext  
- `quitting.ts`: Emits `platform.quit_requested` with QuitContext
- `restarting.ts`: New action that emits `platform.restart_requested`
- All actions validate input but don't perform operations

### Query System Integration
- `QuitQueryHandler`: Updated to emit platform events based on user response
- `RestartQueryHandler`: New handler for restart confirmations
- Handlers support save-and-quit/restart options

### Text Service Updates
- `TemplateTextService`: Added `processPlatformEvent()` method
- Only displays messages for completion events (not requests)
- Platform messages added to language files
- Fallback messages when no language provider

### Hook Interface Extensions
```typescript
interface SaveRestoreHooks {
  onSaveRequested: (data: SaveData) => Promise<void>;
  onRestoreRequested: () => Promise<SaveData | null>;
  onQuitRequested?: (context: QuitContext) => Promise<boolean>;
  onRestartRequested?: (context: RestartContext) => Promise<boolean>;
}
```

## Related Decisions
- ADR-018: Conversational State Management (query system integration)
- ADR-033: Save/Restore Architecture (defines hooks)
- ADR-034: Event Sourcing (future compatibility)

## Testing

Comprehensive test suites added:
- Platform event creation and type guards
- Engine platform operation processing
- Action platform event emission
- Query handler integration
- Text service message handling
- Error cases and edge conditions

## Future Considerations
- Could extend to other platform operations (audio, graphics)
- Might want platform capability discovery
- Could add platform operation priorities
- May need cancellation support
- Consider adding operation timeouts
- Could batch related operations
