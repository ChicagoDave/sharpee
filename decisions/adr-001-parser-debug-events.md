# ADR-001: Parser Debug Events Architecture

**Date:** 2025-06-11
**Status:** Accepted
**Context:** Parser troubleshooting and development

## Context

During development and testing of interactive fiction games, it's crucial to understand how the parser interprets player input. Without visibility into the parser's internal workings, debugging parsing issues becomes a guessing game.

## Decision

We will implement a debug event system that allows subsystems (parser, validator, executor) to emit structured debug events that can be collected and displayed when debug mode is enabled.

## Consequences

### Positive
- Developers can trace exactly how commands are parsed
- Debug events follow the existing event-driven architecture
- No performance impact when debug mode is disabled
- Debug information can be displayed in-game without external tools

### Negative
- Adds complexity to subsystem implementations
- Requires each subsystem to be updated to emit debug events
- Debug events consume memory (mitigated by ring buffer)

## Implementation

### Debug Event Structure
```typescript
interface DebugEvent extends SemanticEvent {
  type: 'DEBUG';
  tags: ['debug', ...string[]];
  narrate: false;
  payload: {
    subsystem: 'parser' | 'validator' | 'executor' | 'world-model' | 'text-service';
    debugType: string;
    [key: string]: any;
  };
}
```

### Parser Debug Events
- `tokenize`: Token generation details
- `pattern_match`: Grammar pattern matching attempts
- `candidate_selection`: How the best candidate was chosen
- `parse_error`: Details about parsing failures

### Integration Pattern
```typescript
interface Parser extends IParser {
  setDebugEventSource?(eventSource: EventSource): void;
}
```

## Alternatives Considered

1. **Console logging** - Rejected because it requires external console access
2. **Separate debug API** - Rejected because it duplicates the event system
3. **Always-on debugging** - Rejected due to performance concerns

## References
- Event-driven architecture decision
- Parser-validation refactor decision
