# Parser Debug Events Implementation

## Summary

Added comprehensive debug event support to the parser, allowing developers to trace the internal workings of the parsing process.

## Changes Made

### 1. Created Debug Event Types (`@sharpee/core`)
```typescript
// packages/core/src/events/debug-events.ts
- DebugEvent base interface
- ParserDebugEvent with four debug types:
  - 'tokenize': Token generation details
  - 'pattern_match': Grammar pattern matching attempts
  - 'candidate_selection': How the best candidate was chosen
  - 'parse_error': Details about parsing failures
```

### 2. Updated Parser Interface
```typescript
interface Parser extends IParser {
  tokenize(input: string): Token[];
  setDebugEventSource?(eventSource: EventSource): void;
}
```

### 3. Enhanced BasicParser Implementation
- Added `debugEventSource` property
- Implemented `setDebugEventSource()` method
- Emits debug events at four key points:

#### Tokenize Event
```typescript
{
  subsystem: 'parser',
  debugType: 'tokenize',
  input: 'take red ball',
  data: {
    tokens: [...],
    unknownWords: []
  }
}
```

#### Pattern Match Event
```typescript
{
  subsystem: 'parser',
  debugType: 'pattern_match',
  input: 'take red ball',
  data: {
    patternsAttempted: [
      { name: 'verb_noun', matched: true, candidatesProduced: 1 }
    ],
    totalCandidates: 1
  }
}
```

#### Candidate Selection Event
```typescript
{
  subsystem: 'parser',
  debugType: 'candidate_selection',
  input: 'take red ball',
  data: {
    candidates: [...],
    selectionReason: 'highest_confidence'
  }
}
```

#### Parse Error Event
```typescript
{
  subsystem: 'parser',
  debugType: 'parse_error',
  input: 'xyzzy plugh',
  data: {
    errorType: 'unknown_verb',
    errorDetails: {...},
    parserState: {...}
  }
}
```

## Usage Example

```typescript
import { basicParser } from '@sharpee/stdlib';
import { EventSystem } from '@sharpee/core';

// Create debug event source
const debugEvents = new EventSystem();

// Enable parser debugging
basicParser.setDebugEventSource(debugEvents);

// Parse something
const result = basicParser.parse('take red ball');

// Get debug events
const parserEvents = debugEvents.getEventsByTag('parser');
console.log('Parser debug events:', parserEvents);
```

## Benefits

1. **Debugging**: Trace exactly what the parser is doing
2. **Testing**: Verify parser behavior in tests
3. **Performance**: Measure time spent in each phase
4. **Learning**: Understand how commands are parsed
5. **Extensible**: Easy to add more debug event types

## Design Notes

- Debug events are opt-in (no performance impact unless enabled)
- Events are never narrated (narrate: false)
- Events include full context at each stage
- Can filter by subsystem, debugType, or tags
