# Work Summary: ADR-086 Event Handler Unification

**Date**: 2026-01-04 04:00
**Branch**: `events-issues`
**Status**: Ready for merge

## Problem

`world.registerEventHandler()` handlers were never called because:
- WorldModel stores handlers in `eventHandlers` Map
- Engine uses `EventProcessor.processEvents()` which calls `storyHandlers`
- `WorldModel.applyEvent()` (which calls `eventHandlers`) was never invoked

This caused 16 handlers across 10 files in Dungeo to silently fail.

## Solution (ADR-086)

Wire `world.registerEventHandler()` through to `EventProcessor` automatically:

1. **if-domain**: Added `IEventProcessorWiring` interface and `EventProcessorRegisterFn` type
2. **world-model**:
   - Added `connectEventProcessor(wiring)` method to IWorldModel
   - `registerEventHandler()` now also wires to EventProcessor if connected
   - Private `wireHandlerToProcessor()` adapts handler signatures
3. **engine**:
   - Creates wiring object that delegates to `eventProcessor.registerHandler()`
   - Calls `world.connectEventProcessor(wiring)` during initialization

## Handler Signature Adaptation

```typescript
// WorldModel handler (void return)
(event: ISemanticEvent, world: IWorldModel) => void

// EventProcessor handler (Effect[] return)
(event: IGameEvent, query: WorldQuery) => Effect[]

// Adapter wraps WorldModel handler, returns []
```

## Test Results

```
Total: 675 tests in 39 transcripts
670 passed, 5 expected failures
Duration: 340ms
✓ All tests passed!
```

Trophy case scoring test specifically verified - uses the now-fixed API.

## Files Changed

```
docs/architecture/adrs/adr-086-event-handler-unification.md (new)
packages/if-domain/src/events.ts
packages/world-model/src/world/WorldModel.ts
packages/engine/src/game-engine.ts
```

## Impact

All 14 remaining handlers that use `world.registerEventHandler()` now work without code changes:
- lantern-fuse.ts (switched_on/off)
- candle-fuse.ts (switched_on/off)
- exorcism-handler.ts (message, read, switched_on)
- glacier-handler.ts (thrown)
- ghost-ritual-handler.ts (dropped)
- endgame-laser-handler.ts (dropped, pushed)
- dam-fuse.ts (custom events)
- reality-altered-handler.ts (score_displayed)

## Follow-up

The `event-handler-migration-plan.md` from ADR-085 is now obsolete - handlers don't need migration.
