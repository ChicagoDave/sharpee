# ADR-041: Simplified Action Context Interface

Status: **Accepted** (amended 2026-07-30 — see Amendment 1). The decision below
holds; the interface name it uses does not. Read every `EnhancedActionContext` in
this document as `ActionContext`.

## Amendment 1 (2026-07-30, session deae34) — the context is `ActionContext`; `EnhancedActionContext` is retired

**What survives.** One method creates events: `event(type, data)`, returning a
single enriched `ISemanticEvent`. There is still no `emit()`, `emitSuccess()`,
`emitError()`, `emitMany()`, or `createEvent()`. That is the decision this ADR
made and it is unchanged.

**1. The name.** `ActionContext` and `EnhancedActionContext` were consolidated
into a single interface, `ActionContext`
(`packages/stdlib/src/actions/enhanced-types.ts`). `EnhancedActionContext`
survived only as an empty `extends ActionContext` alias marked `@deprecated`.
This amendment retires that alias: it carries no members of its own, and no
back-compat is owed. Deleting the export is mechanical follow-through, not a
further decision. The consolidation happened in code
without an ADR (the comment reads "Phase 2: Consolidates ActionContext and
EnhancedActionContext into one interface"); this amendment is that record.

**2. The surface is no longer minimal, and that is not a contradiction.**
`ActionContext` today also carries `world` / `player` / `currentLocation` /
`command` / `scopeResolver` / `random` (ADR-231 D6), the perception predicates
(`canSee`, `canReach`, `canTake`, `isInScope`, `getVisible`, `getInScope`), the
scope-requirement helpers (`getEntityScope`, `getSlotScope`, `requireScope`,
`requireSlotScope`, `requireCarriedOrImplicitTake`), the phase-plumbing fields
`sharedData` and `validationResult`, and `emitSound` (ADR-172 Phase 6). None of
those is a second way to create an event — they are world querying and
phase plumbing. What this ADR forbids is a *parallel event-creation path*, not a
context with more than one member.

**3. The phase pattern in the example is stale.** The Action Implementation
Pattern below shows `execute(context): SemanticEvent[]`. Actions are four-phase —
`validate` / `execute` / `report` / `blocked` — per ADR-058 (report phase) and
the lifecycle engine of ADR-228. `execute()` performs mutations; `report()` and
`blocked()` create the events. The `context.event(...)` calls in the example are
still correct in form; they belong in `report()`/`blocked()`.

**4. This ADR is not superseded by ADR-051.** `docs/proposals/tracker-low-hanging-fruit.md`
P-3 guessed ADR-051 as the successor. ADR-051 is *Action Behaviors for Complex
Action Handling*, is itself Superseded by ADR-052, and never touched the context
interface. Recorded here so the guess is not rediscovered.

**Consequence.** Removing the `EnhancedActionContext` export from
`@sharpee/stdlib` (#141, proposal item P-3) is now consistent with the record —
once it is gone, no ACCEPTED ADR describes a type that does not exist.

## Context

The current `EnhancedActionContext` interface has become confusing and inconsistent, with multiple methods that essentially do the same thing but with different return types and misleading names. This violates our core principle of simplicity.

### Issues with Current Implementation

1. **Inconsistent returns**: Some methods return arrays, others return single events
2. **Misleading names**: Methods like `emit()` suggest immediate emission but only create events
3. **Redundancy**: `emit()`, `createEvent()`, `emitSuccess()`, `emitError()` all create events
4. **Mixed concerns**: Success/error helpers mix message formatting with event creation
5. **Confusing API**: Developers unsure which method to use when

### Current Interface Problems

```typescript
// Current confusing interface:
interface EnhancedActionContext {
  emitSuccess(messageId: string, params?: Record<string, any>): SemanticEvent[]
  emitError(messageId: string, params?: Record<string, any>): SemanticEvent[]
  emit(type: string, data: any): SemanticEvent
  emitMany(events: Array<{ type: string; data: any }>): SemanticEvent[]
  createEvent<T>(type: string, eventData: Partial<T> | any): SemanticEvent
}
```

## Decision

We will simplify the `EnhancedActionContext` to have a single, clear method for event creation:

```typescript
interface EnhancedActionContext extends ActionContext {
  /**
   * Create event with automatic entity injection and metadata
   */
  event(type: string, data: any): SemanticEvent;
}
```

### Key Design Principles

1. **Single responsibility**: One method that does one thing well
2. **Clear naming**: `event()` clearly indicates creating an event, not emitting it
3. **Consistent behavior**: Always returns a single `SemanticEvent`
4. **Automatic enrichment**: Adds entities and metadata from context

### Action Implementation Pattern

```typescript
export const takingAction: Action = {
  id: IFActions.TAKING,
  
  execute(context: EnhancedActionContext): SemanticEvent[] {
    const noun = context.command.directObject?.entity;
    
    if (!noun) {
      return [context.event('action.error', {
        messageId: 'no_target',
        actionId: this.id
      })];
    }
    
    // Business logic checks...
    
    const events: SemanticEvent[] = [];
    
    // Create events as needed
    if (needsImplicitRemoval) {
      events.push(context.event('if.event.removed', {
        implicit: true
      }));
    }
    
    events.push(context.event('if.event.taken', {
      fromLocation: currentLocation,
      item: noun.name
    }));
    
    events.push(context.event('action.success', {
      messageId: 'taken',
      params: { item: noun.name }
    }));
    
    return events;
  }
};
```

### Architecture Preservation

This change maintains the existing architecture where:
- Actions return `SemanticEvent[]` arrays
- The game engine owns the event source
- Events are processed and sequenced by the engine
- The event processor applies events to the world model

## Implementation

1. Update `EnhancedActionContext` interface to have only the `event()` method
2. Update `EnhancedActionContextImpl` to implement the simplified interface
3. Refactor all existing actions to use `context.event()` instead of the old methods
4. Remove deprecated methods from the implementation
5. Update tests to use the new interface

### Migration Path

```typescript
// Old pattern
return context.emitError('no_target');

// New pattern
return [context.event('action.error', {
  messageId: 'no_target',
  actionId: context.action.id
})];

// Old pattern
return context.emitSuccess('taken', { item: noun.name });

// New pattern
return [context.event('action.success', {
  messageId: 'taken',
  params: { item: noun.name }
})];
```

## Consequences

### Positive

- **Clarity**: Single method with clear purpose
- **Consistency**: All event creation follows same pattern
- **Simplicity**: Reduced API surface area
- **Flexibility**: Actions have full control over event data
- **Maintainability**: Less code to maintain and test

### Negative

- **Migration effort**: All actions need updating
- **Verbosity**: Slightly more verbose for simple success/error cases
- **Learning curve**: Developers need to understand event types

## Alternatives Considered

1. **Event Store Pattern (ADR-039)**: Would require changing action signatures to return `void` and significantly alter the architecture
2. **Multiple Helper Methods**: Keep specialized methods but make them consistent - rejected as it maintains complexity
3. **Builder Pattern**: Use a fluent builder API - rejected as overly complex for the use case

## Related ADRs

- ADR-039: Action Event Emission Pattern (Replaced by this ADR)
- ADR-029: Text Service Architecture (since Superseded by ADR-174)
- ADR-035: Platform Event Architecture
- ADR-038: Language Agnostic Actions
- ADR-058: Action Report Function — moved event creation out of `execute()` into
  `report()`; see Amendment 1 §3
- ADR-228: Action lifecycle engine — the four-phase pattern and hook ordering
  actions follow today
- ADR-231 D6 / ADR-172 Phase 6: later additions to `ActionContext` (`random`,
  `emitSound`); see Amendment 1 §2
