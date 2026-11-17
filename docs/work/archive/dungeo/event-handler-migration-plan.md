# Event Handler Migration Plan

## Background

During ADR-085 implementation, we discovered that `world.registerEventHandler()` handlers are **never called**. The engine uses `EventProcessor.processEvents()` which calls `storyHandlers`, not the `eventHandlers` Map in WorldModel.

**Fix**: Use `engine.getEventProcessor().registerHandler()` instead.

## Migration Status

### Completed
- [x] Trophy case scoring handler (ADR-085)
- [x] Balloon PUT handler (put_in, taken events)

### Remaining (14 handlers in 8 files)

#### Priority 1: Light Sources (critical for gameplay)
| File | Events | Purpose |
|------|--------|---------|
| lantern-fuse.ts | switched_on, switched_off | Lantern burn time tracking |
| candle-fuse.ts | switched_on, switched_off | Candle burn time tracking |

#### Priority 2: Puzzles (game completion)
| File | Events | Purpose |
|------|--------|---------|
| exorcism-handler.ts | game.message, read, switched_on | Bell/book/candle puzzle |
| glacier-handler.ts | thrown | Throw torch at glacier |
| ghost-ritual-handler.ts | dropped | Frame piece → ghost appears |
| endgame-laser-handler.ts | dropped, pushed | Laser puzzle mechanics |
| dam-fuse.ts | dungeo.button.yellow.pressed, dungeo.bolt.turned | Dam controls |

#### Priority 3: Cosmetic (nice to have)
| File | Events | Purpose |
|------|--------|---------|
| reality-altered-handler.ts | score_displayed | "Reality altered" message |

## Migration Pattern

Each handler needs:
1. Import `GameEngine` from `@sharpee/engine`
2. Change function signature to accept `engine: GameEngine`
3. Replace `world.registerEventHandler(type, fn)` with `engine.getEventProcessor().registerHandler(type, fn)`
4. Change handler return type from `void` to `ISemanticEvent[]` (return `[]` if no events)
5. Move registration call from `initializeWorld()` to `onEngineReady()`

Example:
```typescript
// Before
export function registerFooHandler(world: WorldModel): void {
  world.registerEventHandler('if.event.bar', (event, w) => {
    // handler logic
  });
}

// After
export function registerFooHandler(engine: GameEngine, world: WorldModel): void {
  engine.getEventProcessor().registerHandler('if.event.bar', (event): ISemanticEvent[] => {
    // handler logic (use captured `world` instead of `w` parameter)
    return [];
  });
}
```

## Work Estimate

~15 minutes per handler (14 handlers × 15 min = ~3.5 hours total)

## Notes

- This is a dungeo-specific fix, not a platform change
- A platform fix (wiring `world.registerEventHandler` to EventProcessor) would be cleaner but requires ADR discussion
- Tests may not catch these bugs since they don't exercise the specific game mechanics
