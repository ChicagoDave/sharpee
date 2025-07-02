# Text Service Implementation

The text service is responsible for converting game events into human-readable text that's displayed to the player.

## Overview

The text service architecture consists of:

1. **TextService Interface** - Defines how to process turns and format events
2. **TextChannel Interface** - Where text is output (stdout, file, web socket, etc.)
3. **AllEventsTextService** - Our first implementation that outputs all events

## Basic Usage

```typescript
import { createBasicTextService } from '@sharpee/engine';

// Create text service with stdout output
const { service, channels } = createBasicTextService();

// Process turn results
service.processTurn(turnResult, channels, {
  includeEventTypes: true,
  includeSystemEvents: false,
  verbose: false
});
```

## Output Example

With the AllEventsTextService, a turn might produce output like:

```
=== Turn 1 ===
> look

[room_described]
Foyer of the Opera House
You are standing in a spacious hall, splendidly decorated in red and gold, with glittering chandeliers overhead.
Exits: north, south, west
You can see: a cloak

[entity_examined] You examined the cloak
A handsome cloak, of velvet trimmed with satin.
```

## Text Channels

Different output channels can be used:

- **StdoutChannel** - Prints to console (default)
- **FileChannel** - Writes to a file (not implemented yet)
- **WebSocketChannel** - Sends to connected clients (not implemented yet)
- **BufferChannel** - Stores text in memory for testing (not implemented yet)

## Future Enhancements

1. **Template-based formatting** - Use templates from language providers
2. **Context-aware text** - Vary descriptions based on game state
3. **Style support** - Bold, italic, colors for rich terminals
4. **Multiple language support** - Use IFLanguageProvider for localization
5. **Smart aggregation** - Combine related events into single sentences

## Configuration Options

```typescript
interface TextFormatOptions {
  includeTimestamps?: boolean;    // Show event timestamps
  includeEventTypes?: boolean;    // Show [event_type] labels
  includeSystemEvents?: boolean;  // Show system/debug events
  verbose?: boolean;              // Show all event details
}
```

## Integration with Engine

The game engine automatically calls the text service after each turn:

```typescript
// In game-engine.ts
this.textService.processTurn(result, this.textChannels, {
  includeEventTypes: this.config.debug || false,
  includeSystemEvents: this.config.debug || false,
  verbose: this.config.debug || false
});
```

This ensures all game events are converted to text and displayed to the player.
