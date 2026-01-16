# @sharpee/engine - Critical Architecture Assessment

**Date**: 2026-01-16
**Assessor**: Claude (TypeScript + IF Design Review)
**Package Version**: 0.9.3-beta.1
**Verdict**: Functional but architecturally compromised. Needs significant cleanup.

---

## Executive Summary

The engine works, but the codebase shows signs of rapid iteration without refactoring. Type safety has been abandoned in favor of `any` casts. There's dead code, misleading comments, broken serialization, and a god object problem. The "thin orchestrator" claim is false advertising.

**Maturity Score**: 5/10 (Functional prototype, not production-quality)

---

## Critical Issues

### 1. GameEngine is a God Object (2060 lines)

`game-engine.ts` has grown into an unmaintainable monolith:

- **50+ methods** handling unrelated concerns
- Turn execution, save/restore, event dispatch, vocabulary management, serialization, undo, platform operations, NPC ticks, scheduler ticks all in one class
- Private methods that should be separate services
- State management scattered across 20+ instance variables

**Evidence**:
```typescript
// Lines 76-100: 25 private fields
private world: WorldModel;
private sessionStartTime?: number;
private sessionTurns: number = 0;
private sessionMoves: number = 0;
private context: GameContext;
private config: EngineConfig;
private commandExecutor!: CommandExecutor;
private eventProcessor: EventProcessor;
private platformEvents: ISemanticEventSource;
// ... 16 more fields
```

**Impact**: Any change risks breaking unrelated functionality. Testing is difficult. New developers can't understand the flow.

---

### 2. Type Safety Abandoned

The codebase is littered with `any` casts, defeating TypeScript's purpose:

**GameEngine examples**:
```typescript
// Line 119: Parser duck-typing
(this.parser as any).setWorldContext(world, player.id, playerLocation);

// Line 197-199: More duck-typing
(this.parser as any).setPlatformEventEmitter((event: any) => {

// Line 565: Pronoun context
(this.parser as any).updatePronounContext(result.validatedCommand, turn);

// Line 650-651: Event casting
this.config.onEvent(event as any);
this.emit('event', event as any);

// Line 828, 839: Language provider
const actorTrait = player.get<any>('actor');
(this.languageProvider as any).setNarrativeSettings(narrativeContext);

// Line 1082: Parser reset
(this.parser as any).resetPronounContext();
```

**CommandExecutor**:
```typescript
// Line 119: More duck-typing
(this.parser as any).setWorldContext(world, player.id, playerLocation);

// Line 212-214: Polluting sharedData with any
(inferredContext.sharedData as any).inferencePerformed = true;
(inferredContext.sharedData as any).originalTarget = directObject.entity;
```

**types.ts**:
```typescript
// Line 19: GameEvent.data is any
data?: any;

// Line 86: parsedCommand is any
parsedCommand?: any;

// Line 189: Serialized world is unknown
world: unknown;
```

**Impact**: Runtime errors that TypeScript should catch. No IDE assistance. Refactoring is dangerous.

---

### 3. Misleading Documentation

**CommandExecutor header comment**:
```typescript
/**
 * Command Executor - Thin Orchestrator (~100 lines)
```

**Reality**: 334 lines. Not "thin" by any measure. The comment is from an older version and was never updated.

---

### 4. Broken Serialization

**`deserializeWorld()` does nothing**:
```typescript
// Lines 1667-1670
private deserializeWorld(data: unknown): void {
  // Simple implementation - override for better deserialization
  console.warn('World deserialization not fully implemented');
}
```

This is called by `loadState()` which is a public API. Anyone using save/restore with the deprecated API gets silently broken behavior.

**`serializeWorld()` is incomplete**:
```typescript
// Lines 1654-1662
private serializeWorld(): unknown {
  // Simple implementation - override for better serialization
  return {
    entities: this.world.getAllEntities().map((e: IFEntity) => ({
      id: e.id,
      traits: Array.from(e.traits.entries())  // Doesn't serialize trait data properly
    }))
  };
}
```

---

### 5. Race Condition in Constructor

```typescript
// Lines 216-219
setTimeout(() => {
  const initializedEvent = createGameInitializedEvent();
  this.emitGameEvent(initializedEvent);
}, 0);
```

Using `setTimeout(..., 0)` to "ensure all listeners are attached" is a race condition. If something registers a listener after construction but before the microtask runs, timing is unpredictable.

---

### 6. Deprecated Code Not Removed

```typescript
// Lines 1092-1121
/**
 * @deprecated Use save() instead
 */
saveState(): GameState { ... }

/**
 * @deprecated Use restore() instead
 */
loadState(state: GameState): void { ... }
```

Dead code increasing maintenance burden. If deprecated, remove it.

---

### 7. Magic Strings and Hardcoded Lists

```typescript
// Lines 428-433
const nonUndoableCommands = [
  'undo', 'save', 'restore', 'restart', 'quit',
  'score', 'version', 'about', 'help',
  'look', 'l', 'examine', 'x', 'inventory', 'i',
  'verbose', 'brief', 'superbrief', 'notify'
];
```

This should use `MetaCommandRegistry.isMeta()` which exists and is used elsewhere (line 557). Inconsistent.

---

### 8. Copy-Paste Code (NPC vs Scheduler Processing)

Lines 604-659 (NPC processing) and 661-717 (scheduler processing) are nearly identical:

```typescript
// NPC processing
const npcEvents = this.npcService.tick({...});
if (npcEvents.length > 0) {
  let npcSemanticEvents = npcEvents.map(e => processEvent(e, enrichmentContext));
  if (this.perceptionService) {
    npcSemanticEvents = this.perceptionService.filterEvents(...);
  }
  const existingEvents = this.turnEvents.get(turn) || [];
  this.turnEvents.set(turn, [...existingEvents, ...npcSemanticEvents]);
  for (const event of npcSemanticEvents) {
    this.eventSource.emit(event);
    if (isPlatformRequestEvent(event)) { this.pendingPlatformOps.push(...); }
  }
  // ... emit events
}

// Scheduler processing (nearly identical)
const schedulerResult = this.scheduler.tick(...);
if (schedulerResult.events.length > 0) {
  let schedulerSemanticEvents = schedulerResult.events.map(e => processEvent(...));
  // ... exact same pattern
}
```

This is textbook violation of DRY.

---

### 9. Dead Code Paths

```typescript
// Lines 545-548
// Check if this is a client.query event
if (semanticEvent.type === 'client.query') {
  // The handleClientQuery will be called by the event listener
}
```

Empty if block. Does nothing. Either implement or remove.

---

### 10. TODO Comments in Production

```typescript
// Line 768
// TODO: Get score from story or scoring capability

// Line 2012
// TODO: Serialize other relationships
```

TODOs are fine in development, but this is supposedly production code.

---

### 11. Orphaned Event Source in action-context-factory

```typescript
// action-context-factory.ts line 70
const eventSource = createSemanticEventSource();
```

Created but never used. Dead allocation.

---

### 12. event-adapter.ts is Architectural Debt

See previous discussion, but to summarize:
- "Legacy" migration code in a greenfield project
- Hidden underscore→dot transformation
- Entry point takes `any`
- Input mutation in one function, immutable in others
- Platform event properties handled via `any` casts

---

### 13. Inconsistent Error Handling

Three different error patterns in use:

1. **Throw exceptions** (CommandExecutor):
```typescript
throw new Error(`Parse failed: ${(parseResult.error as any).code}`);
```

2. **Return error events** (GameEngine):
```typescript
const errorEvent = eventSequencer.sequence({
  type: 'if.error',
  data: { message: 'no_command_to_repeat', command: input }
}, turn);
return { turn, input, success: false, events: [errorEvent] };
```

3. **Console.error and continue** (throughout):
```typescript
console.error(`Error in event listener for ${event}:`, error);
console.error(`Error processing platform operation ${platformOp.type}:`, error);
```

No consistent strategy.

---

### 14. processPlatformOperations is a 220-line Switch Statement

Lines 1311-1540 contain a massive switch statement handling 5 different platform operations with extensive copy-paste error handling.

Should use Strategy pattern or command pattern.

---

## Moderate Issues

### 15. sharedData Pollution

`ActionContext.sharedData` is typed as `Record<string, any>` and used as a grab-bag for passing data between phases:

```typescript
// CommandExecutor
(inferredContext.sharedData as any).inferencePerformed = true;
(inferredContext.sharedData as any).originalTarget = directObject.entity;
(inferredContext.sharedData as any).inferredTarget = inferenceResult.inferredTarget;

// action-context-factory
sharedData.implicitTakeEvents = [];
sharedData.implicitTakeEvents.push(...implicitTakeEvents);
```

No type safety, no documentation of expected keys.

---

### 16. Vocabulary Update Inefficiency

```typescript
// Lines 1174-1186
updateScopeVocabulary(): void {
  const inScope = this.world.getInScope(this.context.player.id);

  // Mark all entities as out of scope first
  for (const entity of this.world.getAllEntities()) {
    this.updateEntityVocabulary(entity, false);
  }

  // Mark in-scope entities
  for (const entity of inScope) {
    this.updateEntityVocabulary(entity, true);
  }
}
```

Iterates all entities twice per turn. For Dungeo with 500+ entities, this is O(n) overhead every turn.

---

### 17. Connection Extraction Hack

```typescript
// Lines 2017-2023
const name = entity.name?.toLowerCase() || '';
if (name.includes('north')) connections.north = otherRoom;
else if (name.includes('south')) connections.south = otherRoom;
// ...
else connections.door = otherRoom; // Generic door connection
```

Parsing direction from entity names? This is fragile heuristic code.

---

## What Works

To be fair, these things function correctly:

1. **Turn cycle ordering** - NPC→Scheduler→Platform is correct for IF
2. **Implicit take flow** - ADR-104 implementation is sound
3. **Event sequencing** - Events within turns are properly ordered
4. **Undo snapshots** - Circular buffer approach is appropriate
5. **Scheduler system** - Daemon/fuse implementation is complete
6. **Four-phase action pattern** - When used correctly, works well

---

## Recommendations

### Immediate (Before Next Feature)

1. **Remove deprecated `saveState()`/`loadState()`** - Dead code
2. **Fix the setTimeout race condition** - Use proper initialization pattern
3. **Remove empty if blocks and TODO comments** - Clean up cruft
4. **Use MetaCommandRegistry consistently** - Remove hardcoded list

### Short Term (Next Sprint)

5. **Define interfaces for parser capabilities** - Replace duck-typing with `IEngineAwareParser`
6. **Extract event processing helper** - DRY up NPC/scheduler code
7. **Type sharedData properly** - Define interface for known keys
8. **Remove event-adapter legacy code** - Pick one event format and use it

### Medium Term (Technical Debt Sprint)

9. **Extract services from GameEngine**:
   - `SaveRestoreService`
   - `PlatformOperationHandler`
   - `TurnEventProcessor`
   - `VocabularyManager`

10. **Fix serialization** - Either implement properly or remove public API

### Long Term (Architecture)

11. **Audit all `any` usage** - Replace with proper types
12. **Refactor processPlatformOperations** - Strategy pattern
13. **Consider event sourcing properly** - Current implementation is half-hearted

---

## Conclusion

The engine functions but has accumulated significant technical debt. The type system has been bypassed rather than fixed. The god object problem will make future changes increasingly risky. The "thin orchestrator" architecture exists in comments but not in code.

This needs a dedicated cleanup effort before adding more features. Each new feature on this foundation increases the eventual refactoring cost.

**Honest Assessment**: This is prototype-quality code that works. It's not production-quality code that's maintainable. The difference matters for a project intending to ship.
