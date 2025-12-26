# ADR-064: World Events and Action Events

## Status
Accepted (December 2025)

## Context

Currently, when actions need to track state changes (like where an item was taken from), they resort to context pollution:

```typescript
// Current anti-pattern in taking.ts
(context as any)._previousLocation = previousLocation;
(context as any)._implicitlyRemoved = true;
```

This happens because:
1. Actions need to know what changed during execution to emit proper events
2. The `execute` phase modifies world state but returns void
3. The `report` phase needs to know what happened to emit semantic events
4. There's no clean way to pass this information between phases

Additionally, the world model tracks state changes but only emits platform events (meant for debugging/tracing), not semantic events that the system can use.

## Decision

We will implement a two-layer event system:

1. **World Events** - Low-level, factual events about state changes
2. **Action Events** - High-level, semantic events about player intent

### World Events

The world model will emit events for all state mutations:

```typescript
// When moveEntity is called
world.emit('world.entity.moved', {
  entityId: string,
  fromLocation: EntityId | null,
  toLocation: EntityId | null,
  fromContainer?: boolean,
  fromSupporter?: boolean,
  toContainer?: boolean,
  toSupporter?: boolean
});

// When entity properties change
world.emit('world.entity.changed', {
  entityId: string,
  trait: TraitType,
  property: string,
  oldValue: any,
  newValue: any
});
```

### Action Events

Actions continue to emit semantic events that represent player intent:

```typescript
// Taking action emits
context.event('if.event.taken', {
  item: string,
  itemSnapshot: EntitySnapshot,
  actorSnapshot: EntitySnapshot,
  fromContainer?: boolean,
  fromSupporter?: boolean,
  container?: string
});
```

### Movement Context Tracking

After further analysis, we've determined a simpler approach that maintains the current world API:

1. **World mutations keep simple return types**:
   - `world.moveEntity()` continues to return `boolean`
   - `world.createEntity()` continues to return the entity
   - No complex result objects needed

2. **Actions capture context before mutations**:
```typescript
execute(context: ActionContext): void {
  // Capture context BEFORE mutation
  const previousLocation = context.world.getLocation(item.id);
  const wasWorn = item.has(TraitType.WEARABLE) && item.wearable.worn;
  
  // Store in ActionContext.sharedData for report phase
  context.sharedData.previousLocation = previousLocation;
  context.sharedData.wasWorn = wasWorn;
  
  // Perform mutation
  context.world.moveEntity(item.id, actor.id);
}
```

3. **ActionContext.sharedData enables clean data passing**:
```typescript
interface ActionContext {
  // ... existing properties ...
  
  /**
   * Shared data store for passing information between action phases.
   * Eliminates need for context pollution.
   */
  sharedData: Record<string, any>;
}
```

4. **Report phase accesses shared data**:
```typescript
report(context: ActionContext, validationResult?: ValidationResult): ISemanticEvent[] {
  // Access data stored during execute
  const { previousLocation, wasWorn } = context.sharedData;
  
  // Build rich events with captured context
  if (wasWorn) {
    events.push(context.event('if.event.removed', { /* ... */ }));
  }
  // ...
```

## Consequences

### Positive
- **Rich Events**: Actions can emit detailed events with full context
- **No Context Pollution**: Clean data passing via ActionContext.sharedData
- **Separation of Concerns**: World handles state, actions handle semantics  
- **Extensibility**: Systems can listen to world events for low-level changes
- **Witness System**: Can use world events to track what actors observe
- **Debugging**: World events provide detailed trace of all changes
- **Simple API**: World methods keep their simple return types
- **No Breaking Changes**: ActionContext extension is backward compatible

### Negative
- **More Events**: Two events for each action (world + semantic)
- **Manual Context Capture**: Actions must remember to capture state before mutations
- **Migration**: Existing actions need updates to use sharedData
- **Performance**: More events means more processing

### Neutral
- **ActionContext Change**: Adding sharedData property (non-breaking)
- **Event Naming**: Need clear conventions for world vs action events
- **Type Safety**: sharedData is untyped (Record<string, any>)

## Implementation Notes

### Phase 1: Add ActionContext.sharedData
1. Update ActionContext interface to include sharedData property
2. Initialize sharedData as empty object in createActionContext
3. No changes needed to command-executor

### Phase 2: Update World Model
1. Add event emission to world mutations (keeping simple returns)
2. Emit world events for state changes  
3. Remove platform.world.* events (replaced by world.* events)

### Phase 3: Migrate Taking Action
1. Capture context before mutations in execute()
2. Store in context.sharedData instead of context pollution
3. Access sharedData in report() to build rich events

### Phase 4: Migrate Other Actions
1. Search for context pollution patterns
2. Update each action to use sharedData
3. Remove all `(context as any)._*` patterns

## Examples

### Taking Action (Using sharedData)
```typescript
execute(context: ActionContext): void {
  const actor = context.player;
  const item = context.command.directObject!.entity!;
  
  // Capture context BEFORE mutations
  context.sharedData.previousLocation = context.world.getLocation(item.id);
  context.sharedData.wasWorn = item.has(TraitType.WEARABLE) && item.wearable.worn;
  
  // Handle worn items
  if (context.sharedData.wasWorn) {
    const wearer = context.world.getEntity(context.sharedData.previousLocation);
    if (wearer) {
      WearableBehavior.remove(item, wearer);
      // World emits: world.entity.changed (worn: true -> false)
    }
  }
  
  // Move the item (simple boolean return)
  context.world.moveEntity(item.id, actor.id);
  // World emits: world.entity.moved with full context
}

report(context: ActionContext, validationResult?: ValidationResult): ISemanticEvent[] {
  const item = context.command.directObject!.entity!;
  
  // Access shared data from execute phase
  const { previousLocation, wasWorn } = context.sharedData;
  
  // Build rich event data
  const events: ISemanticEvent[] = [];
  
  if (wasWorn) {
    events.push(context.event('if.event.removed', {
      item: item.name,
      wearer: context.world.getEntity(previousLocation)?.name
    }));
  }
  
  const fromContainer = previousLocation ? 
    context.world.getEntity(previousLocation) : null;
  
  events.push(context.event('if.event.taken', {
    item: item.name,
    fromContainer: fromContainer?.name
  }));
  
  events.push(context.event('action.success', { 
    messageId: fromContainer ? 'taken_from' : 'taken',
    params: { item: item.name, container: fromContainer?.name }
  }));
  
  return events;
}
```

## Related

- ADR-051: Three-Phase Action Pattern
- ADR-052: Event Handler System
- ADR-061: Snapshot Code Smell

## References

- Current taking action implementation showing context pollution
- Witness system needing to track state changes
- Text service needing rich event data for message generation