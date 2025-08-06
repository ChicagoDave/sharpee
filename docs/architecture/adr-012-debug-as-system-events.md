# ADR-006: Debug Events as System Events

**Date:** 2025-06-29  
**Status:** Accepted
**Context:** Debug event architecture redesign

## Context

Initial implementation used debug events as SemanticEvents, which conflated story events (TAKEN, DROPPED) with system monitoring events. This violated the principle that semantic events represent story-meaningful occurrences.

## Decision

Separate debug events from semantic events:

1. **SemanticEvent** - Story-meaningful events (player actions, world changes)
2. **SystemEvent** - Debug/monitoring events (parser decisions, validation steps)

Use callback pattern for debug events to avoid coupling subsystems to event infrastructure.

## Consequences

### Positive
- Clear separation of concerns
- Story events remain pure domain events
- Debug infrastructure is optional
- No performance impact when debugging disabled
- Subsystems remain decoupled

### Negative
- Two different event types to manage
- Callback pattern less elegant than event sourcing
- Need to update existing debug implementation

## Implementation

### Debug Event Structure
```typescript
interface DebugEvent {
  id: string;
  timestamp: number;
  subsystem: 'parser' | 'validator' | 'executor' | 'world-model' | 'text-service';
  type: string;
  data: any;
}

type DebugEventCallback = (event: DebugEvent) => void;
```

### Integration Pattern
```typescript
class Parser {
  constructor(private onDebugEvent?: DebugEventCallback) {}
  
  private emitDebug(type: string, data: any) {
    this.onDebugEvent?.({
      id: generateId(),
      timestamp: Date.now(),
      subsystem: 'parser',
      type,
      data
    });
  }
}
```

## Alternatives Considered

1. **Debug events as SemanticEvents** - Rejected because conflates story with system
2. **Separate event source for debug** - Rejected as over-engineering for optional feature
3. **Always emit to console** - Rejected due to performance and flexibility concerns

## References
- ADR-001: Parser Debug Events Architecture
- Event-driven architecture pattern
