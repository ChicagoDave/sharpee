# ADR-029: Turn History Data Store

## Status
Proposed

## Context
The text service needs to query the event source, world model, and spatial index to generate text after each turn. Currently, there's no record of what data was queried to produce the text output. This makes it difficult to:
- Debug text generation issues
- Replay or recreate text output
- Test text service implementations
- Analyze query patterns for optimization
- Generate alternative transcripts from the same game state

## Decision
We will implement a Turn History Data Store that records all queries made by the text service during text generation.

### Design
Every query the text service makes to the event source, world model, or spatial index will be recorded along with:
- The query parameters
- The query results
- Timestamp of the query
- Source system queried

This creates a complete snapshot of the information used to generate text for each turn.

### Structure
```typescript
interface TurnHistory {
  turnNumber: number;
  timestamp: Date;
  queries: QueryRecord[];
  generatedText: TextOutput;
  metadata?: Record<string, any>;
}

interface QueryRecord {
  queryType: 'event' | 'entity' | 'spatial' | 'relation';
  timestamp: number;
  query: QueryDetails;
  result: any;
  source: 'eventSource' | 'worldModel' | 'spatialIndex';
}
```

## Consequences

### Positive
- **Complete Audit Trail**: Every piece of data used in text generation is recorded
- **Debugging Support**: Can trace exactly what data produced specific text
- **Replay Capability**: Can recreate text generation from historical data
- **Testing**: Can verify text services query the expected data
- **Analysis**: Can identify query patterns and optimization opportunities
- **Multiple Transcripts**: Can generate different style transcripts from same history
- **Extension Development**: Developers can examine what data is available

### Negative
- **Storage Requirements**: Turn history could grow large for long games
- **Performance Impact**: Recording queries adds overhead to text generation
- **Complexity**: Text service implementations must use recording query methods

### Mitigations
- Make history recording optional/configurable
- Implement history pruning strategies
- Use efficient storage format
- Provide base class with recording built-in

## Implementation Notes
- Turn history store should be separate from text service
- Base text service class provides recording query methods
- History can be stored in-memory, file system, or database
- Consider compression for long-term storage
