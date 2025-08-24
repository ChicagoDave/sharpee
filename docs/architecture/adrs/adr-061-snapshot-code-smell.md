# ADR-061: Entity Snapshot Code Smell

## Status
Proposed

## Context

During Phase 3 of the atomic events refactor, we introduced `captureEntitySnapshot()` to capture entity state for events. However, this has revealed several code smells:

### Current Pattern
```typescript
// In every action's report() method:
const itemSnapshot = captureEntitySnapshot(item, context.world, true);
const actorSnapshot = captureEntitySnapshot(actor, context.world, false);

// In validation errors:
if (context.command.directObject?.entity) {
  errorParams.targetSnapshot = captureEntitySnapshot(
    context.command.directObject.entity,
    context.world,
    false
  );
}
```

### Code Smells Identified

1. **Data Clumping**: The parameters `(entity, world, includeContents)` always appear together
2. **Feature Envy**: Actions are reaching into entities and world to build snapshots
3. **Primitive Obsession**: The boolean `includeContents` flag is unclear and error-prone
4. **Violation of DRY**: Every action has nearly identical snapshot capture logic
5. **Mixed Concerns**: Actions handle both business logic AND event data structure
6. **Inconsistent Depth**: Different actions make different decisions about snapshot depth

### Problems This Causes

- **Maintenance burden**: Changes to snapshot structure require updating all actions
- **Inconsistency risk**: Each action might capture slightly different data
- **Testing complexity**: Need to test snapshot logic in every action
- **Cognitive load**: Action authors must understand snapshot requirements
- **Performance concerns**: Potential for redundant or unnecessary snapshots

## Decision

We should refactor the snapshot mechanism to address these code smells. However, we should **defer this refactoring** until after the core atomic events work is complete.

## Considered Alternatives

### Option 1: Entity Owns Its Snapshot (Rejected for now)
```typescript
interface IFEntity {
  toSnapshot(options?: SnapshotOptions): EntitySnapshot;
}

// Usage:
const snapshot = entity.toSnapshot({ includeContents: true });
```
**Pros:** Encapsulation, entity knows its own structure
**Cons:** Couples world-model to event structure, entities become "fat"

### Option 2: Context Provides Snapshots (Rejected for now)
```typescript
interface ActionContext {
  snapshot(entity: IFEntity, options?: SnapshotOptions): EntitySnapshot;
}

// Usage:
const snapshot = context.snapshot(item, { deep: true });
```
**Pros:** Centralized logic, context already has world access
**Cons:** Context becomes a god object, still manual in each action

### Option 3: Event Builder Pattern (Rejected for now)
```typescript
class ActionEventBuilder {
  withEntity(role: string, entity: IFEntity): this;
  withSnapshot(role: string, options: SnapshotOptions): this;
  build(): ISemanticEvent;
}

// Usage:
return new ActionEventBuilder('taken')
  .withEntity('item', item)
  .withSnapshot('item', { deep: true })
  .withEntity('actor', actor)
  .build();
```
**Pros:** Fluent API, separates event construction from action logic
**Cons:** More complex, requires significant refactoring

### Option 4: Declarative Snapshot Requirements (Preferred, future)
```typescript
interface Action {
  snapshotRequirements?: {
    directObject?: SnapshotOptions;
    indirectObject?: SnapshotOptions;
    actor?: SnapshotOptions;
    location?: SnapshotOptions;
  };
}

// Action declares what it needs:
const takingAction = {
  snapshotRequirements: {
    directObject: { includeContents: true },
    actor: { includeContents: false }
  },
  // ... rest of action
};
```
**Pros:** Declarative, automatic, consistent
**Cons:** Requires framework changes, less flexible for special cases

### Option 5: Lazy Snapshots in Events (Interesting alternative)
```typescript
interface ISemanticEvent {
  data?: unknown | (() => unknown);  // Can be a provider function
}

// Event with lazy snapshot:
context.event('taken', {
  item: () => captureEntitySnapshot(item, world, true),
  actor: () => captureEntitySnapshot(actor, world, false)
});
```
**Pros:** Defers snapshot until needed, could optimize performance
**Cons:** Complicates event consumption, timing issues

## Consequences

### Positive (when we refactor)
- Cleaner action code focused on business logic
- Consistent snapshot behavior across all actions
- Easier to test and maintain
- Better performance potential
- Clearer separation of concerns

### Negative (current state)
- Technical debt accumulating
- Repeated code across actions
- Risk of inconsistency
- Higher maintenance burden

### Migration Path
1. **Phase 1** (Current): Document the smell, continue with current pattern
2. **Phase 2** (Next): Implement declarative requirements in a few actions
3. **Phase 3**: Migrate all actions to new pattern
4. **Phase 4**: Remove captureEntitySnapshot from action code

## Related Decisions
- ADR-058: Atomic Events Architecture
- ADR-051: Action Patterns
- ADR-060: CommandExecutor Refactor

## Notes

The snapshot code smell is real and should be addressed, but not at the cost of delaying the atomic events refactor. The current pattern, while repetitive, is:
- Working correctly
- Type-safe
- Testable
- Understandable

We should complete the atomic events refactor first, then circle back to clean up this technical debt with a proper abstraction.

The declarative approach (Option 4) seems most promising because it:
- Removes snapshot logic from actions entirely
- Ensures consistency
- Could be implemented in the framework layer
- Allows for optimization (e.g., batch snapshots, caching)

For now, we accept this technical debt in favor of forward progress.