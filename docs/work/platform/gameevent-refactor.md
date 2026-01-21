# IGameEvent Deprecation and Consolidation

## Summary

Deprecate `IGameEvent` interface and consolidate all events to use `ISemanticEvent` with data in the standard `data` field. This eliminates the confusing `payload` vs `data` distinction and simplifies event handling throughout the platform.

## Problem Statement

Currently, the codebase has two event interfaces:

### ISemanticEvent (standard events)
```typescript
interface ISemanticEvent {
  id: string;
  type: string;
  timestamp: number;
  entities: Record<string, unknown>;
  data: Record<string, unknown>;  // Event payload here
}
```

### IGameEvent (game lifecycle events)
```typescript
interface IGameEvent extends ISemanticEvent {
  type: GameEventTypeValue;
  payload: {                       // Different field name!
    story?: { id, title, author, version };
    gameState?: 'initializing' | 'ready' | 'running' | 'ending' | 'ended';
    session?: { startTime, endTime, turns, moves };
    ending?: { type, reason };
    error?: { message, code, stack };
  };
}
```

### Issues

1. **Inconsistent data location**: `ISemanticEvent` uses `data`, `IGameEvent` uses `payload`
2. **Conversion overhead**: `emitGameEvent()` must convert `payload` to `data` for storage
3. **Handler confusion**: Text-service handlers must check both `event.data` and `(event as any).payload`
4. **Unnecessary complexity**: The `payload` structure doesn't provide benefits over typed `data`
5. **Type discrimination redundant**: Event type is already discriminated via `event.type` string

## Current Game Event Types

```typescript
const GameEventType = {
  // Game start events
  GAME_INITIALIZING: 'game.initializing',
  GAME_INITIALIZED: 'game.initialized',
  STORY_LOADING: 'game.story_loading',
  STORY_LOADED: 'game.story_loaded',
  GAME_STARTING: 'game.starting',
  GAME_STARTED: 'game.started',

  // Game end events
  GAME_ENDING: 'game.ending',
  GAME_ENDED: 'game.ended',
  GAME_WON: 'game.won',
  GAME_LOST: 'game.lost',
  GAME_QUIT: 'game.quit',
  GAME_ABORTED: 'game.aborted',

  // Session events
  SESSION_SAVING: 'game.session_saving',
  SESSION_SAVED: 'game.session_saved',
  SESSION_RESTORING: 'game.session_restoring',
  SESSION_RESTORED: 'game.session_restored',
} as const;
```

## Proposed Solution

### 1. Update createGame*Event() functions

Change all game event creator functions to return `ISemanticEvent` with data in `data` field:

```typescript
// BEFORE
export function createGameStartedEvent(
  story?: IGameEvent['payload']['story'],
  startTime?: number
): IGameEvent {
  return createGameEvent(GameEventType.GAME_STARTED, {
    story,
    gameState: 'running',
    session: { startTime: startTime || Date.now(), turns: 0, moves: 0 }
  });
}

// AFTER
export function createGameStartedEvent(
  story?: GameStartedData['story'],
  startTime?: number
): ISemanticEvent {
  return {
    id: `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: GameEventType.GAME_STARTED,
    timestamp: Date.now(),
    entities: {},
    data: {
      story,
      gameState: 'running',
      session: { startTime: startTime || Date.now(), turns: 0, moves: 0 }
    }
  };
}
```

### 2. Define typed data interfaces

Create interfaces for each game event's data structure:

```typescript
// Game event data types
interface GameStartedData {
  story?: { id?: string; title?: string; author?: string; version?: string };
  gameState: 'running';
  session: { startTime: number; turns: number; moves: number };
}

interface GameEndedData {
  gameState: 'ended';
  session: { startTime: number; endTime: number; turns: number; moves: number };
  ending: { type: 'victory' | 'defeat' | 'quit' | 'abort'; reason?: string };
}

interface GamePlayerDeathData {
  cause: string;
  deathType?: string;
  location?: string;
  deathCount?: number;
  canUndo?: boolean;
}

// Type guard
function isGameStartedEvent(event: ISemanticEvent): event is ISemanticEvent & { data: GameStartedData } {
  return event.type === GameEventType.GAME_STARTED;
}
```

### 3. Simplify emitGameEvent()

Remove payload-to-data conversion:

```typescript
// BEFORE (complex conversion)
private emitGameEvent(event: any): void {
  const existingData = typeof event.data === 'object' ? event.data : {};
  const gameEvent: GameEvent = {
    type: event.type,
    data: {
      ...existingData,
      id: event.id || `event-${Date.now()}`,
      timestamp: event.timestamp || Date.now(),
      entities: event.entities || {}
    }
  };
  // ... conversion of payload to data for storage
}

// AFTER (simple passthrough)
private emitGameEvent(event: ISemanticEvent): void {
  const sequencedEvent = eventSequencer.sequence(event, this.context.currentTurn);
  this.emit('event', sequencedEvent);

  if (this.context.currentTurn > 0) {
    const turnEvents = this.turnEvents.get(this.context.currentTurn) || [];
    turnEvents.push(event);
    this.turnEvents.set(this.context.currentTurn, turnEvents);
  }
}
```

### 4. Update text-service handlers

Handlers can now consistently read from `event.data`:

```typescript
// BEFORE (checking both locations)
export function handleGameStarted(event: ISemanticEvent, context: HandlerContext): ITextBlock[] {
  const eventData = event.data as any;
  const story = eventData?.story || eventData?.payload?.story;  // Confusing!
  // ...
}

// AFTER (single location)
export function handleGameStarted(event: ISemanticEvent, context: HandlerContext): ITextBlock[] {
  const data = event.data as GameStartedData;
  const story = data?.story;
  // ...
}
```

### 5. Deprecate IGameEvent

Mark `IGameEvent` as deprecated and remove over time:

```typescript
/**
 * @deprecated Use ISemanticEvent with appropriate data type instead.
 * Game events use event.data, not a separate payload field.
 * Will be removed in v1.0.0
 */
export interface IGameEvent extends ISemanticEvent {
  // ...
}
```

## Death and Restart Flow Example

With unified events, the death/restart flow becomes cleaner:

```typescript
// 1. Player dies
const deathEvent: ISemanticEvent = {
  id: 'death-123',
  type: 'game.player_death',
  timestamp: Date.now(),
  entities: { player: playerId },
  data: {
    cause: 'grue',
    deathType: 'eaten',
    location: 'Cellar',
    deathCount: 2,
    canUndo: true
  }
};

// 2. Prompt player for action
const promptEvent: ISemanticEvent = {
  id: 'prompt-124',
  type: 'client.query',
  timestamp: Date.now(),
  entities: {},
  data: {
    source: 'death_handler',
    type: 'choice',
    options: ['RESTART', 'RESTORE', 'UNDO', 'QUIT'],
    message: 'You have died. What would you like to do?'
  }
};

// 3. Player chooses (handled by platform)
// 4. Platform emits appropriate event
const restartEvent: ISemanticEvent = {
  id: 'restart-125',
  type: 'platform.restart_requested',
  timestamp: Date.now(),
  entities: {},
  data: { reason: 'player_death_choice' },
  requiresClientAction: true
};
```

## Migration Path

### Phase 1: Add compatibility (current work)
- Update `emitGameEvent()` to copy `payload` to `data`
- Update handlers to check `data` first, fall back to `payload`
- Fix ISSUE-028 (game banner through text-service)

### Phase 2: Update creators (future)
- Change all `createGame*Event()` to return `ISemanticEvent`
- Add typed data interfaces
- Update type guards to use `event.type` discrimination

### Phase 3: Clean up (future)
- Remove `payload` field usage
- Remove `IGameEvent` interface
- Remove compatibility code from handlers

## Files Affected

### Phase 2 Changes (core package)

| File | Change |
|------|--------|
| `packages/core/src/events/game-events.ts` | Update all createGame*Event functions |
| `packages/core/src/events/index.ts` | Add data type exports |
| `packages/core/src/types.ts` | Deprecate IGameEvent |

### Phase 2 Changes (engine package)

| File | Change |
|------|--------|
| `packages/engine/src/game-engine.ts` | Simplify emitGameEvent() |

### Phase 2 Changes (text-service package)

| File | Change |
|------|--------|
| `packages/text-service/src/handlers/game.ts` | Use typed data access |

## Benefits

1. **Consistency**: All events use `data` field
2. **Simplicity**: No payload-to-data conversion needed
3. **Type safety**: Typed data interfaces per event type
4. **Maintainability**: Single mental model for all events
5. **Reduced bugs**: No more "which field has the data?" confusion

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing code | Phased migration with deprecation warnings |
| Type safety loss | Add typed data interfaces for each event |
| External consumers | Major version bump when removing IGameEvent |

## Decision

Approved for implementation. Phase 1 (compatibility) is part of ISSUE-028 work. Phase 2-3 can be scheduled as a separate platform improvement task.

## Related

- ISSUE-028: Opening banner hardcoded in browser-entry.ts
- ADR-096: Text Service Architecture
- ADR-097: Simplified Event Pattern
