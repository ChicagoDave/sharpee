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

// Start the engine
engine.start();

// Execute turns
const result = await engine.executeTurn('take sword');
console.log(`Turn ${result.turn}: ${result.success ? 'Success' : 'Failed'}`);

// Access game state
const context = engine.getContext();
console.log(`Current turn: ${context.currentTurn}`);
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
