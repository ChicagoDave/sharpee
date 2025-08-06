# ADR-029: Simple Query-Based Text Service Architecture

## Status
Accepted

## Context
The text service is responsible for generating human-readable output after each turn in the game. Initial designs were overly complex, featuring:
- Multiple package structure with base classes and implementations
- Turn history recording for every query
- Complex adapter patterns
- Extensive abstraction layers

After implementation experience, we realized a much simpler approach would be more maintainable and equally functional.

## Decision
We will implement a simple, query-based text service architecture where:

1. **Single Interface** - The `TextService` interface is defined in `@sharpee/if-domain`
2. **Query-Based Context** - Text service receives a context object with methods to query current state
3. **No Recording** - Queries are not recorded; debugging can be done with standard tools
4. **Flexible Output** - Support multiple output formats (text, JSON, channeled) for different clients

### Interface Design
```typescript
interface TextService {
  initialize(context: TextServiceContext): void;
  processTurn(): TextOutput;
  setLanguageProvider(provider: LanguageProvider): void;
  getLanguageProvider(): LanguageProvider | null;
  setOutputFormat?(format: 'text' | 'json' | 'channeled'): void;
}

interface TextServiceContext {
  currentTurn: number;
  getCurrentTurnEvents(): SemanticEvent[];
  getEventsByType(type: string): SemanticEvent[];
  getAllEvents(): SemanticEvent[];
  world: WorldModel;
  getPlayer(): IFEntity;
  getContents(locationId: string): IFEntity[];
  getLocation(entityId: string): string | null;
}
```

## Consequences

### Positive
- **Simplicity**: Easy to understand and implement
- **Flexibility**: Different implementations for different styles
- **Client-Agnostic**: Output format supports CLI, web, mobile
- **No Overhead**: No query recording means better performance
- **Clear Separation**: Text generation is completely separate from game logic

### Negative
- **No Built-in Replay**: Cannot replay text generation from recorded queries
- **Limited Debugging**: Must use standard debugging tools rather than query history
- **No Query Analysis**: Cannot analyze query patterns for optimization

### Mitigations
- Debugging can be done with breakpoints and logging
- Performance profiling can identify bottlenecks if needed
- Query recording could be added as an optional decorator pattern if truly needed

## Implementation Notes

### Text Service Implementations
Individual packages implement the interface:
- `@sharpee/text-service-template` - Uses language provider templates
- `@sharpee/text-service-direct` - Uses direct text from events
- Custom implementations for specific games

### Output Formats
- **Text**: Plain string for CLI clients
- **JSON**: Structured data for web clients with sections for room, inventory, etc.
- **Channeled**: Multiple named channels for complex UIs

### Engine Integration
The engine:
1. Executes the turn and processes all events
2. Creates a context object with query methods
3. Initializes the text service with the context
4. Calls `processTurn()` to generate output
5. Emits appropriate events based on output type

## Examples

### Simple Text Output
```typescript
class TemplateTextService implements TextService {
  processTurn(): string {
    const events = this.context.getCurrentTurnEvents();
    const texts = events
      .map(e => this.processEvent(e))
      .filter(t => t !== null);
    return texts.join('\n\n');
  }
}
```

### JSON Output for Web
```typescript
processTurn(): TextOutputJSON {
  return {
    type: 'json',
    main: this.generateMainText(),
    metadata: {
      turn: this.context.currentTurn,
      location: this.context.getPlayer().location
    },
    sections: {
      room: this.describeRoom(),
      inventory: this.listInventory(),
      exits: this.listExits()
    }
  };
}
```

## Rationale
The simpler architecture achieves all the necessary goals without the complexity of the original design. By trusting that we can add complexity later if needed (YAGNI principle), we avoid over-engineering and maintain a codebase that's easier to understand and modify.

The query-based approach ensures the text service never modifies game state and always works with the final, settled state after all events have been processed. This maintains the critical separation between game logic and presentation.
