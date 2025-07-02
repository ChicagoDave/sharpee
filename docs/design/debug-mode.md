# Debug Mode Design

## Overview

Debug mode is controlled by meta-commands `DEBUG ON` and `DEBUG OFF` that enable/disable debug event recording and reporting across all subsystems.

## Architecture

### 1. Debug Meta-Commands
```typescript
// In @sharpee/stdlib or game-specific actions
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
      id: generateId(),
      type: 'DEBUG_MODE_CHANGED',
      timestamp: Date.now(),
      entities: { actor: context.player.id },
      payload: { enabled: true }
    }];
  }
}
```

### 2. Debug Event Source
```typescript
// Central debug event collector
class DebugEventSource implements EventSource {
  private events: DebugEvent[] = [];
  private maxEvents = 1000; // Ring buffer
  
  addEvent(event: SemanticEvent): void {
    if (isDebugEvent(event)) {
      this.events.push(event);
      if (this.events.length > this.maxEvents) {
        this.events.shift(); // Remove oldest
      }
    }
  }
  
  getRecentEvents(count: number = 10): DebugEvent[] {
    return this.events.slice(-count);
  }
  
  clear(): void {
    this.events = [];
  }
}
```

### 3. Debug Text Formatter
```typescript
// Formats debug events for display
class DebugTextFormatter {
  format(event: DebugEvent): string {
    const timestamp = new Date(event.timestamp).toISOString();
    const subsystem = event.payload.subsystem.toUpperCase();
    const type = event.payload.debugType;
    
    switch (event.payload.subsystem) {
      case 'parser':
        return this.formatParserEvent(event as ParserDebugEvent);
      case 'validator':
        return this.formatValidatorEvent(event);
      case 'executor':
        return this.formatExecutorEvent(event);
      default:
        return `[${timestamp}] ${subsystem} ${type}: ${JSON.stringify(event.payload.data)}`;
    }
  }
  
  private formatParserEvent(event: ParserDebugEvent): string {
    const { debugType, input, data } = event.payload;
    
    switch (debugType) {
      case 'tokenize':
        return `[PARSER] Tokenized "${input}": ${data.tokens.length} tokens, ${data.unknownWords.length} unknown`;
        
      case 'pattern_match':
        const matched = data.patternsAttempted.filter(p => p.matched);
        return `[PARSER] Patterns for "${input}": ${matched.length}/${data.patternsAttempted.length} matched, ${data.totalCandidates} candidates`;
        
      case 'candidate_selection':
        const selected = data.candidates.find(c => c.selected);
        return `[PARSER] Selected "${selected?.action}" from ${data.candidates.length} candidates (${data.selectionReason})`;
        
      case 'parse_error':
        return `[PARSER] Error parsing "${input}": ${data.errorType} - ${data.errorDetails.message}`;
        
      default:
        return `[PARSER] ${debugType}: ${JSON.stringify(data)}`;
    }
  }
}
```

### 4. Debug Event Handler
```typescript
// Handles DEBUG_MODE_CHANGED events
class DebugEventHandler implements EventHandler {
  canHandle(event: SemanticEvent): boolean {
    return event.type === 'DEBUG_MODE_CHANGED';
  }
  
  handle(event: SemanticEvent, context: GameContext): TextEvent[] {
    const enabled = event.payload?.enabled;
    
    if (enabled) {
      return [{
        id: generateId(),
        channel: 'main',
        text: '[DEBUG MODE ENABLED]',
        style: 'system'
      }];
    } else {
      // Show recent debug events before disabling
      const debugEvents = context.debugEventSource.getRecentEvents(5);
      const formatter = new DebugTextFormatter();
      
      const texts = debugEvents.map(e => ({
        id: generateId(),
        channel: 'debug',
        text: formatter.format(e),
        style: 'debug'
      }));
      
      texts.push({
        id: generateId(),
        channel: 'main',
        text: '[DEBUG MODE DISABLED]',
        style: 'system'
      });
      
      return texts;
    }
  }
}
```

## Usage Flow

1. **Player types**: `DEBUG ON`
2. **System**:
   - Enables debug mode in game state
   - Connects debug event sources for all subsystems
   - Shows "[DEBUG MODE ENABLED]"

3. **Player types**: `take ball`
4. **System processes normally, but also**:
   - Parser emits debug events
   - Validator emits debug events
   - Executor emits debug events
   - Events are collected in DebugEventSource

5. **After command execution**:
   - Debug events are formatted and displayed
   - Example output:
     ```
     > take ball
     [PARSER] Tokenized "take ball": 2 tokens, 0 unknown
     [PARSER] Patterns: 1/5 matched, 1 candidates
     [PARSER] Selected "TAKE" from 1 candidates (only_candidate)
     [VALIDATOR] Resolved "ball" to entity#ball-1 (red ball)
     [VALIDATOR] Visibility check passed for entity#ball-1
     [EXECUTOR] Executing TAKE action on entity#ball-1
     
     You take the red ball.
     ```

6. **Player types**: `DEBUG OFF`
7. **System**:
   - Shows last few debug events
   - Disables debug mode
   - Disconnects debug event sources
   - Shows "[DEBUG MODE DISABLED]"

## Benefits

1. **In-game troubleshooting** - No need to check logs
2. **Selective debugging** - Turn on/off as needed
3. **Educational** - Players can learn how parser works
4. **Testing** - Verify behavior during play testing
5. **Performance** - No overhead when disabled

## Implementation Notes

- Debug mode state should persist in GameState
- Debug events should use a ring buffer to limit memory
- Consider debug levels (VERBOSE, NORMAL, MINIMAL)
- Maybe add `DEBUG CLEAR` to clear event buffer
- Could add `DEBUG LAST [n]` to show recent events
- Consider filtering: `DEBUG PARSER ON`, `DEBUG VALIDATOR OFF`
