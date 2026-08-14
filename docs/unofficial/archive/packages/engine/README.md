# @sharpee/engine

Runtime engine for the Sharpee IF Platform. This package provides the core game loop, command execution, and turn management.

## Overview

The engine package brings together all the Sharpee components into a running game:

- **GameEngine**: Main runtime that manages game state and turn execution
- **CommandExecutor**: Orchestrates the flow from input → parser → actions → events → world changes
- **EventSequencer**: Ensures events are properly ordered within turns (1.1, 1.2, 1.3...)

## Architecture

```
User Input
    ↓
[GameEngine]
    ↓
[CommandExecutor]
    ├─→ [Parser] → ParsedCommand (syntax only)
    ├─→ [Validator] → ValidatedCommand (with resolved entities)
    ├─→ [Actions] → Events
    └─→ [EventProcessor] → World Changes
    ↓
Turn Result
```

### Three-Phase Command Processing

1. **Parse Phase**: Converts raw text to structured command using grammar only (no world knowledge)
2. **Validate Phase**: Resolves entities, checks visibility/scope, finds action handlers
3. **Execute Phase**: Runs business logic to generate semantic events

## Basic Usage

```typescript
import { createStandardEngine } from '@sharpee/engine';
import { WorldModel } from '@sharpee/world-model';

// Create a game engine
const engine = createStandardEngine();

// Set language (NEW: automatic parser and language provider loading)
await engine.setLanguage('en-US');

// Or use a story with language configuration
const story = {
  config: {
    id: 'my-story',
    title: 'My Adventure',
    author: 'Me',
    version: '1.0.0',
    language: 'en-US'  // Language automatically loaded
  },
  initializeWorld: (world) => { /* ... */ },
  createPlayer: (world) => { /* ... */ }
};

await engine.setStory(story); // Automatically sets up language

// Start the engine
engine.start();

// Execute turns
const result = await engine.executeTurn('take sword');
console.log(`Turn ${result.turn}: ${result.success ? 'Success' : 'Failed'}`);

// Access game state
const context = engine.getContext();
console.log(`Current turn: ${context.currentTurn}`);

// Access parser and language provider if needed
const parser = engine.getParser();
const languageProvider = engine.getLanguageProvider();
```

## Custom Game Engine

```typescript
import { GameEngine, EngineConfig } from '@sharpee/engine';
import { IWorldModel, IFEntity } from '@sharpee/world-model';

// Create your world
const world: IWorldModel = createMyWorld();
const player: IFEntity = createPlayer();

// Configure engine
const config: EngineConfig = {
  maxHistory: 50,
  collectTiming: true,
  onEvent: (event) => console.log(`Event: ${event.type}`),
  onError: (error, context) => console.error(`Error at turn ${context.currentTurn}:`, error)
};

// Create engine
const engine = new GameEngine(world, player, config);

// Listen to engine events
engine.on('turn:complete', (result) => {
  console.log(`Turn ${result.turn} complete with ${result.events.length} events`);
});

engine.on('game:over', (context) => {
  console.log('Game over!');
});
```

## Event Sequencing

Events are automatically sequenced within turns:

```typescript
// Turn 1
1.1 - TAKING action initiated
1.2 - TAKEN event (main action)
1.3 - INVENTORY_CHANGED event (consequence)

// Turn 2
2.1 - GOING action initiated
2.2 - EXITED event (leaving current room)
2.3 - ENTERED event (entering new room)
2.4 - LOOK event (auto-look in new room)
```

## Language Management

The engine automatically loads language providers and parsers based on language codes:

```typescript
// Set language directly
await engine.setLanguage('en-US');  // Loads @sharpee/lang-en-us and @sharpee/parser-en-us

// Change language at runtime
await engine.setLanguage('es');     // Switches to Spanish

// Language from story config
const story = {
  config: { language: 'ja', /* ... */ }
};
await engine.setStory(story);      // Automatically uses Japanese
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

```typescript
// Save game state
const saveData = engine.saveState();
localStorage.setItem('save', JSON.stringify(saveData));

// Load game state
const loadData = JSON.parse(localStorage.getItem('save'));
engine.loadState(loadData);
```

## Integration with Story Files

The engine is designed to work with TypeScript story files:

```typescript
// my-story.ts
import { Story } from '@sharpee/forge';

export default new Story()
  .title('My Adventure')
  .author('Me')
  .room('start', room => room
    .name('Starting Room')
    .description('You are in a small room.')
    .exit('north', 'hallway')
  )
  .build();
```

## API Reference

### GameEngine

- `start()`: Start the engine
- `stop()`: Stop the engine
- `executeTurn(input: string)`: Execute a turn with user input
- `getContext()`: Get current game context
- `getWorld()`: Get world model
- `saveState()`: Save game state
- `loadState(state)`: Load game state
- `getHistory()`: Get turn history
- `getRecentEvents(count)`: Get recent events
- `setLanguage(languageCode: string)`: Set language (automatically loads parser and language provider)
- `setStory(story: Story)`: Set story (automatically configures language from story config)
- `getParser()`: Get current parser instance
- `getLanguageProvider()`: Get current language provider instance

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
  command: ParsedCommand;
  events: SequencedEvent[];
  worldChanges: WorldChange[];
  success: boolean;
  error?: Error;
  timing?: TimingInfo;
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
- `text-service.test.ts` - Text output formatting
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
