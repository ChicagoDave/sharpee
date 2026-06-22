# @sharpee/engine

Runtime engine for the Sharpee IF Platform. This package provides the core game loop, command execution, and turn management.

## Installation

```bash
npm install @sharpee/engine
```

> **Architecture note**: The CommandExecutor is a thin orchestrator. Actions own their complete event lifecycle through the four-phase pattern (validate/execute/report/blocked, ADR-051).

## Overview

The engine package brings together all the Sharpee components into a running game:

- **GameEngine**: Main runtime that manages game state and turn execution
- **CommandExecutor**: Thin orchestrator (177 lines) that coordinates the action pipeline
- **EventSequencer**: Ensures events are properly ordered within turns (1.1, 1.2, 1.3...)

## Architecture

```
User Input
    ↓
[GameEngine]
    ↓
[CommandExecutor] (Thin Orchestrator)
    ├─→ [Parser] → ParsedCommand
    ├─→ [Validator] → ValidatedCommand
    └─→ [Action] (Three-Phase Pattern)
         ├─→ validate() → ValidationResult
         ├─→ execute() → Mutations only
         └─→ report() → ISemanticEvent[]
    ↓
[EventProcessor] → World Changes
    ↓
Turn Result
```

### Action Four-Phase Pattern

Actions follow a strict four-phase pattern (ADR-051) for clean separation of concerns:

1. **Validate Phase**: Check if the action can be performed (no mutations)
2. **Execute Phase**: Perform state mutations only (no events)
3. **Report Phase**: Generate events based on final state (no mutations)
4. **Blocked Phase**: Generate events when validation fails

The CommandExecutor simply orchestrates these phases, delegating all responsibility to the appropriate components. Actions own their complete event lifecycle, including error events.

## Basic Usage

```typescript
import { GameEngine } from '@sharpee/engine';
import { EnglishParser } from '@sharpee/parser-en-us';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

// Build the world and player (typically via your story's setup)
const language = new EnglishLanguageProvider();
const parser = new EnglishParser(language);

const engine = new GameEngine({ world, player, parser, language });

// Register a story (configures world, player, grammar, channels)
engine.setStory(story);

// Start the engine
engine.start();

// Execute turns
const result = await engine.executeTurn('take sword');
console.log(`Turn ${result.turn}: ${result.success ? 'Success' : 'Failed'}`);

// Access game state
const context = engine.getContext();
console.log(`Current turn: ${context.currentTurn}`);

// Access parser and language provider if needed
const activeParser = engine.getParser();
const languageProvider = engine.getLanguageProvider();
```

> In most cases you don't construct the engine by hand — the build toolchain and
> the browser/CLI clients assemble the parser, language provider, and story for
> you from the story's config (`language: 'en-US'`).

## Engine Configuration

The optional `config` field on the constructor options tunes engine behavior:

```typescript
import { GameEngine, EngineConfig } from '@sharpee/engine';

const config: EngineConfig = {
  maxHistory: 50,
  collectTiming: true,
  validateEvents: true
};

const engine = new GameEngine({ world, player, parser, language, config });

// Listen to engine events
engine.on('turn:complete', (result) => {
  console.log(`Turn ${result.turn} complete with ${result.events.length} events`);
});

engine.on('game:over', (context) => {
  console.log('Game over!');
});
```

## Atomic Events Architecture

Events are self-contained with all necessary data embedded at creation time:

```typescript
// Example event from taking action
{
  type: 'if.event.taken',
  timestamp: 1692345678,
  data: {
    itemSnapshot: {         // Complete entity state
      id: 'sword',
      name: 'silver sword',
      description: 'A gleaming blade',
      location: 'player',
      traits: { /* ... */ }
    },
    actorSnapshot: { /* ... */ }
  }
}
```

This enables:
- **Historical Replay**: Events contain complete state at that moment
- **No World Queries**: The prose pipeline renders from embedded event data, not world lookups
- **Consistency**: Entity state is captured after all mutations complete

## Event Sequencing

Events are automatically sequenced within turns:

```typescript
// Turn 1
1.1 - action.started
1.2 - if.event.taken (main action)
1.3 - action.success

// Turn 2
2.1 - action.started
2.2 - if.event.exited (leaving room)
2.3 - if.event.entered (entering room)
2.4 - if.event.looked (auto-look)
2.5 - action.success
```

## Language Management

The parser and language provider are supplied to the engine at construction
time (see Basic Usage). A story declares which language it expects via its
config; the build toolchain and clients pick the matching packages by code.

```typescript
const story = {
  config: { id: 'my-story', title: '…', language: 'en-US', /* ... */ },
  // ...
};
```

### Naming Convention

Language packages follow a predictable naming pattern:
- Language Provider: `@sharpee/lang-{language-code}`
- Parser: `@sharpee/parser-{language-code}`

For example:
- English (US): `@sharpee/lang-en-us`, `@sharpee/parser-en-us`
- Spanish: `@sharpee/lang-es`, `@sharpee/parser-es`
- Japanese: `@sharpee/lang-ja`, `@sharpee/parser-ja`

## Save/Load

Save and restore are driven by platform events and host-supplied hooks rather
than direct method calls. The host (CLI, browser client, server) registers
hooks that persist and reload the engine's save data:

```typescript
engine.registerSaveRestoreHooks({
  onSaveRequested: async (saveData) => {
    localStorage.setItem('save', JSON.stringify(saveData));
  },
  onRestoreRequested: async () => {
    const raw = localStorage.getItem('save');
    return raw ? JSON.parse(raw) : null;
  }
});
```

The standard `save` / `restore` meta-actions emit the platform events that
trigger these hooks.

## Integration with Story Files

The engine works with TypeScript story files implementing the `Story` interface:

```typescript
// my-story.ts
import { Story, StoryConfig } from '@sharpee/engine';

export const story: Story = {
  config: {
    id: 'my-story',
    title: 'My Adventure',
    author: 'Me',
    version: '1.0.0',
    language: 'en-US'
  },
  initializeWorld(world) { /* create rooms, objects, NPCs */ },
  createPlayer(world) { /* create and place the player */ }
};
```

## API Reference

### GameEngine

- `start()`: Start the engine
- `stop(reason?)`: Stop the engine
- `executeTurn(input: string)`: Execute a turn with user input (async)
- `getContext()`: Get current game context
- `getWorld()`: Get world model
- `getHistory()`: Get turn history
- `getRecentEvents(count)`: Get recent events
- `setStory(story: Story)`: Register a story (configures world, player, grammar, channels)
- `getParser()`: Get current parser instance
- `getLanguageProvider()`: Get current language provider instance
- `registerSaveRestoreHooks(hooks)`: Register save/restore persistence hooks

### Events

The engine emits these events:

- `turn:start`: Turn is starting
- `turn:complete`: Turn completed successfully
- `turn:failed`: Turn failed with error
- `event`: Individual event processed
- `state:changed`: Game state changed
- `game:over`: Game has ended

### Turn Results

Each turn returns:

```typescript
interface TurnResult {
  turn: number;
  input: string;
  events: SequencedEvent[];
  success: boolean;
  error?: string;
  actionId?: string;
  parsedCommand?: IParsedCommand;
  timing?: TimingData;
}
```

Where SequencedEvent includes:
```typescript
interface SequencedEvent {
  type: string;
  data: any;
  sequence: number;
  timestamp: Date;
  turn: number;
  scope: 'turn' | 'global' | 'system';
  source?: string;
}
```

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Watch mode for tests
pnpm test:watch
```

## Testing

The engine package includes comprehensive test coverage:

### Unit Tests
- `game-engine.test.ts` - Core game engine functionality
- `command-executor.test.ts` - Command parsing and execution
- `event-sequencer.test.ts` - Event ordering and utilities
- `story.test.ts` - Story interface and configuration
- `types.test.ts` - Type definitions and contracts

### Integration Tests
- `integration.test.ts` - Full game flow and component interaction

### Test Fixtures
- `fixtures/index.ts` - Reusable test utilities and mocks

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test game-engine

# Generate coverage report
pnpm test:coverage
```

## License

MIT
