# ADR-002: Debug Mode Meta Commands

**Date:** 2025-01-11
**Status:** Proposed
**Context:** In-game debugging and troubleshooting

## Context

Developers and testers need a way to enable debug information during gameplay without modifying code or using external tools. The debug information should appear inline with game output for easy correlation between commands and their processing.

## Decision

We will implement `DEBUG ON` and `DEBUG OFF` meta-commands that control whether debug events are collected and displayed during gameplay.

## Consequences

### Positive
- Debug mode can be toggled without restarting the game
- Debug information appears inline with game output
- No external tools or console access required
- Follows existing command processing pipeline

### Negative
- Debug commands could be discovered by players (can be disabled in production)
- Debug output might clutter the game interface
- Requires careful formatting to maintain readability

## Implementation

### Debug Mode State
```typescript
interface GameState {
  debugMode: boolean;
  debugEventSource?: DebugEventSource;
}
```

### Debug Commands
```typescript
class DebugOnAction implements IAction {
  id = 'DEBUG_ON';
  
  execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[] {
    // Enable debug mode
    context.gameState.setDebugMode(true);
    
    // Connect debug event sources
    context.parser.setDebugEventSource(context.debugEventSource);
    context.validator.setDebugEventSource(context.debugEventSource);
    context.executor.setDebugEventSource(context.debugEventSource);
    
    return [{
      type: 'DEBUG_MODE_CHANGED',
      payload: { enabled: true }
    }];
  }
}
```

### Debug Output Format
```
> take ball
[PARSER] Tokenized "take ball": 2 tokens, 0 unknown
[PARSER] Selected "TAKE" from 1 candidates (only_candidate)
[VALIDATOR] Resolved "ball" to entity#ball-1
[EXECUTOR] Executing TAKE action

You take the red ball.
```

## Alternatives Considered

1. **Configuration file toggle** - Rejected because it requires restart
2. **Environment variable** - Rejected because it's not dynamic
3. **Separate debug client** - Rejected as too complex for simple debugging

## Future Enhancements

- `DEBUG LEVEL [VERBOSE|NORMAL|MINIMAL]` - Control verbosity
- `DEBUG PARSER ON/OFF` - Subsystem-specific debugging
- `DEBUG LAST [n]` - Show recent debug events
- `DEBUG CLEAR` - Clear debug event buffer

## References
- ADR-001: Parser Debug Events Architecture
- Event-driven architecture decision
