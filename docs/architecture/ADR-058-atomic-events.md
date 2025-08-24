# ADR-058: Atomic Events Implementation

## Status
IMPLEMENTED - August 24, 2025

## Context
The Sharpee IF engine originally relied on querying the world model during text generation and event processing. This created tight coupling between components and made it impossible to accurately replay historical game states without maintaining the full world state at each point in time.

## Decision
We implemented an **Atomic Events** architecture where each event contains complete snapshots of all entities involved, making events self-contained and eliminating the need for world model queries during text generation.

## Implementation Details

### Three-Phase Action Pattern
Actions now follow a three-phase execution pattern:

1. **Validate**: Check preconditions, return validation result
2. **Execute**: Perform state changes only (minimal logic)
3. **Report**: Generate ALL events (success and error) with complete entity snapshots

```typescript
interface Action {
  validate(context: ActionContext): ValidationResult;
  execute(context: ActionContext): void;
  report(
    context: ActionContext,
    validationResult?: ValidationResult,
    executionError?: Error
  ): ISemanticEvent[];
}
```

### Entity Snapshots
Events now contain complete entity data instead of just IDs:

```typescript
// Before
{
  type: 'if.event.taken',
  data: {
    itemId: 'lamp-001',
    actorId: 'player-001'
  }
}

// After
{
  type: 'if.event.taken',
  data: {
    item: {
      id: 'lamp-001',
      name: 'brass lamp',
      description: 'A tarnished brass lamp',
      traits: { /* complete trait data */ }
    },
    actor: {
      id: 'player-001',
      name: 'You',
      inventory: [ /* items */ ]
    }
  }
}
```

### Event Processing Pipeline
The engine now processes all events through a pipeline:

1. **Migration**: Convert legacy events (payload → data)
2. **Normalization**: Ensure consistent structure
3. **Enrichment**: Add context (turn, player, location)

```typescript
// Event adapter pipeline
export function processEvent(event: any, context?: EventContext): ISemanticEvent {
  const migrated = migrateLegacyEvent(event);
  const normalized = normalizeEvent(migrated);
  const enriched = enrichEvent(normalized, context);
  return enriched;
}
```

### Function Serialization
For save/load functionality, functions in event data are handled specially:

```typescript
// Serialization marks functions
serializeEventData(data) {
  if (typeof value === 'function') {
    return { __type: 'function', __marker: '[Function]' };
  }
  // ... handle other types
}

// Deserialization creates placeholder functions
deserializeEventData(data) {
  if (data.__type === 'function') {
    return () => '[Serialized Function]';
  }
  // ... handle other types
}
```

## Components Modified

### Phase 1-3: Core & Actions
- Updated `ISemanticEvent` interface to use `data?: unknown`
- Migrated 10 core actions to three-phase pattern
- Created snapshot utility functions
- Refactored CommandExecutor to thin orchestrator

### Phase 4: Text Service
- Removed world model dependencies
- Uses entity snapshots from events
- Supports provider functions for dynamic content

### Phase 5: Stories
- Updated Cloak of Darkness to use event data
- Event handlers use snapshots instead of world queries

### Phase 6: Engine
- Added event processing pipeline
- Function serialization for save/load
- Event enrichment with context

## Benefits

1. **Historical Accuracy**: Events contain complete state at time of occurrence
2. **Loose Coupling**: Text service doesn't need world model access
3. **Testability**: Events are self-contained and easily testable
4. **Save/Load**: Events can be serialized without losing information
5. **Debugging**: Complete event data makes debugging easier

## Trade-offs

1. **Event Size**: Events are larger due to entity snapshots
2. **Memory Usage**: Storing complete snapshots uses more memory
3. **Migration Effort**: Existing actions need updating to new pattern

## Migration Guide

### For Action Authors

1. Split your `execute()` method into three phases:
```typescript
// Old pattern
execute(context: ActionContext): SemanticEvent[] {
  // Validation
  if (!isValid) {
    return [createErrorEvent()];
  }
  
  // State changes
  doStateChanges();
  
  // Event generation
  return [createSuccessEvent()];
}

// New pattern
validate(context: ActionContext): ValidationResult {
  if (!isValid) {
    return { valid: false, error: 'error_code' };
  }
  return { valid: true };
}

execute(context: ActionContext): void {
  // Only state changes
  doStateChanges();
}

report(context: ActionContext, validationResult?: ValidationResult): ISemanticEvent[] {
  if (!validationResult?.valid) {
    return [createErrorEvent(validationResult.error)];
  }
  
  // Capture snapshots
  const item = captureEntitySnapshot(context.world, itemId);
  return [createSuccessEvent({ item })];
}
```

2. Use snapshot utilities:
```typescript
import { captureEntitySnapshot, captureRoomSnapshot } from '@sharpee/stdlib';

const itemSnapshot = captureEntitySnapshot(world, itemId);
const roomSnapshot = captureRoomSnapshot(world, roomId);
```

### For Story Authors

Use event data instead of world queries:
```typescript
// Old pattern
eventProcessor.on('if.event.put_on', (event, context) => {
  const item = context.world.getEntity(event.data.itemId);
  if (item?.name === 'cloak') {
    // ...
  }
});

// New pattern
eventProcessor.on('if.event.put_on', (event) => {
  const item = event.data.item; // Complete snapshot
  if (item?.name === 'cloak') {
    // ...
  }
});
```

## Future Considerations

1. **Event Compression**: Consider compressing large events for storage
2. **Selective Snapshots**: Allow actions to specify which data to snapshot
3. **Event Versioning**: Version events for backward compatibility
4. **Performance Monitoring**: Track event sizes and processing times

## References

- ADR-051: Action Validate/Execute Pattern
- ADR-052: Event Handler System
- ADR-057: Rules System (postponed)
- ADR-060: CommandExecutor Refactor
- ADR-062: Direction Language Decoupling