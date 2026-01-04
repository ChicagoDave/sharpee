# ADR-086: Event Handler Unification

## Status

Proposed

## Context

During ADR-085 implementation, we discovered a critical bug: **`world.registerEventHandler()` handlers are never called**.

### The Problem

The engine has two separate event handler systems that don't communicate:

1. **WorldModel.eventHandlers** (Map)
   - Registered via `world.registerEventHandler(eventType, handler)`
   - Stored in `WorldModel.eventHandlers`
   - Called by `WorldModel.applyEvent()`
   - **Bug: `applyEvent()` is never called by the engine**

2. **EventProcessor.storyHandlers** (Map of arrays)
   - Registered via `engine.getEventProcessor().registerHandler(eventType, handler)`
   - Stored in `EventProcessor.storyHandlers`
   - Called by `EventProcessor.processEvents()`
   - **This is what actually runs during gameplay**

### Impact

Any code using `world.registerEventHandler()` silently fails. In Dungeo alone, we found 16 handlers across 10 files that are non-functional:

| File | Handler Count | Purpose |
|------|---------------|---------|
| lantern-fuse.ts | 2 | Lantern burn tracking |
| candle-fuse.ts | 2 | Candle burn tracking |
| exorcism-handler.ts | 3 | Bell/book/candle puzzle |
| glacier-handler.ts | 1 | Torch → glacier puzzle |
| ghost-ritual-handler.ts | 1 | Ghost ritual |
| endgame-laser-handler.ts | 2 | Laser puzzle |
| dam-fuse.ts | 2 | Dam controls |
| reality-altered-handler.ts | 1 | Score reveal |
| balloon-handler.ts | 2 | Balloon inflation (migrated in ADR-085) |
| index.ts | 1 | Trophy case scoring (migrated in ADR-085) |

### API Differences

The two APIs have different signatures:

```typescript
// WorldModel API (broken)
world.registerEventHandler(eventType: string,
  handler: (event: ISemanticEvent, world: IWorldModel) => void
): void;

// EventProcessor API (working)
engine.getEventProcessor().registerHandler(eventType: string,
  handler: (event: ISemanticEvent) => ISemanticEvent[]
): void;
```

Key differences:
- WorldModel handlers receive `world` parameter; EventProcessor handlers capture it in closure
- WorldModel handlers return `void`; EventProcessor handlers return `ISemanticEvent[]`
- WorldModel handlers are registered on WorldModel; EventProcessor requires engine access

## Decision

**Unify the event handler systems** by wiring `WorldModel.registerEventHandler()` through to `EventProcessor`.

### Implementation

1. **Keep the WorldModel API** - it's more convenient for story authors
2. **Wire it to EventProcessor** - when engine initializes, connect the two systems
3. **Adapt signatures** - wrap WorldModel handlers to match EventProcessor interface
4. **Deprecate direct EventProcessor registration** - stories should use `world.registerEventHandler()`

### New Architecture

```
Story Code
    │
    ▼
world.registerEventHandler(type, handler)
    │
    ▼
WorldModel stores handler in eventHandlers Map
    │
    ▼
Engine.initialize() calls world.wireHandlersToEventProcessor(eventProcessor)
    │
    ▼
EventProcessor.storyHandlers now includes all WorldModel handlers
    │
    ▼
EventProcessor.processEvents() calls handlers (both sources)
```

### API Changes

**WorldModel** (world-model package):
```typescript
interface IWorldModel {
  // Existing - keep as-is
  registerEventHandler(
    eventType: string,
    handler: (event: ISemanticEvent, world: IWorldModel) => void
  ): void;

  // New - called by engine during initialization
  wireHandlersToEventProcessor(eventProcessor: IEventProcessor): void;
}
```

**Engine** (engine package):
```typescript
// In GameEngine.initialize() or similar:
const eventProcessor = this.getEventProcessor();
world.wireHandlersToEventProcessor(eventProcessor);
```

### Handler Adapter

The wiring creates adapter functions:

```typescript
wireHandlersToEventProcessor(eventProcessor: IEventProcessor): void {
  for (const [eventType, handler] of this.eventHandlers) {
    eventProcessor.registerHandler(eventType, (event: ISemanticEvent): ISemanticEvent[] => {
      // Call the WorldModel-style handler
      handler(event, this);
      // WorldModel handlers don't return events
      return [];
    });
  }
}
```

### Late Registration

Handlers registered after engine initialization also need to work:

```typescript
registerEventHandler(eventType: string, handler: HandlerFn): void {
  this.eventHandlers.set(eventType, handler);

  // If already wired to EventProcessor, register there too
  if (this.eventProcessor) {
    this.eventProcessor.registerHandler(eventType, this.adaptHandler(handler));
  }
}
```

## Implementation Plan

### Phase 1: Core Wiring
1. Add `wireHandlersToEventProcessor()` to WorldModel
2. Add `eventProcessor` reference to WorldModel for late registration
3. Update Engine to call wiring during initialization
4. Add adapter function for handler signature conversion

### Phase 2: Verify Existing Handlers
1. All 14 remaining Dungeo handlers should now work without code changes
2. Run full transcript test suite
3. Add specific tests for handler functionality (lantern, candles, etc.)

### Phase 3: Cleanup
1. Update documentation
2. Consider deprecating direct `EventProcessor.registerHandler()` for stories
3. Remove `world.applyEvent()` if no longer needed

## Consequences

### Positive
- **All existing handlers work** - no migration needed for the 14 broken handlers
- **Simpler API for authors** - just use `world.registerEventHandler()`
- **Single source of truth** - EventProcessor handles all events
- **No breaking changes** - existing code continues to work

### Negative
- **Slight complexity** - WorldModel now has reference to EventProcessor
- **Adapter overhead** - minimal, just function wrapping
- **Two registration paths** - EventProcessor.registerHandler still exists (for internal use)

### Neutral
- **Handler return values** - WorldModel handlers can't emit events; if needed, use EventProcessor directly

## Alternatives Considered

### 1. Remove WorldModel.registerEventHandler()
- **Pros**: Single API, no confusion
- **Cons**: Breaking change, requires migrating all handlers, less convenient API

### 2. Keep Both Separate
- **Pros**: No changes needed
- **Cons**: Confusing for authors, broken API remains

### 3. Make WorldModel.applyEvent() Work
- **Pros**: Both systems work independently
- **Cons**: Events processed twice, order unclear, complexity

## References

- ADR-085: Event-Based Scoring System (discovered this bug)
- `docs/work/dungeo/event-handler-migration-plan.md` (list of affected handlers)
