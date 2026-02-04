# Event Data Design

## Overview

Each action owns its event data types, keeping related code together for better modularity.

## Structure

Actions that need multiple files use a folder structure:

```
/actions/standard/closing/
├── closing.ts                    // Action logic
├── closing-event-data.ts         // Success event data type
├── closing-error-no-target.ts    // Error data when no target
├── closing-error-not-closable.ts // Error data when not closable
└── index.ts                      // Exports
```

## Event Data Types

Event data is what goes in the `payload` field of SemanticEvents:

```typescript
// closing-event-data.ts
export interface ClosedEventData {
  targetId: EntityId;
  targetName: string;
  isContainer: boolean;
  // ... other fields
}
```

## Usage

Actions emit events using the context helpers:

```typescript
// Success event
context.emit('if.event.closed', {
  actionId: IFActions.CLOSING,
  data: eventData
});

// Error event (simplified)
context.emitError('not_closable', { item: noun.name });
```

## Design Principles

1. **Action owns its types** - Each action defines its own event data
2. **Explicit files** - Clear file names show all possible outcomes  
3. **No central registry** - Add new actions without touching shared files
4. **Use core structure** - Don't duplicate what SemanticEvent provides
5. **Type safety** - Full TypeScript support for event data

## Benefits

- **Modularity**: Actions are self-contained
- **Discoverability**: File structure documents behavior
- **Extensibility**: Third-party actions work the same way
- **Maintainability**: Related code stays together
