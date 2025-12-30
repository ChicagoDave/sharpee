# ADR-075 Implementation - Effects-Based Handler Pattern

**Date**: 2025-12-30
**Status**: Complete (Core Implementation)
**Branch**: dungeo

## Summary

Implemented ADR-075's effects-based handler pattern to support multiple event handlers per event type. This unblocked the mirror room toggle handler which was previously broken because `world.registerEventHandler()` only supported one handler per event type.

## Changes Made

### New Files Created

1. **`packages/world-model/src/effects/types.ts`**
   - Effect union type with all effect variants
   - ScoreEffect, FlagEffect, MessageEffect, EmitEffect
   - MoveEntityEffect, UpdateEntityEffect, SetStateEffect
   - UpdateExitsEffect for room exit changes
   - BlockEffect, UnblockEffect, ScheduleEffect for future use

2. **`packages/world-model/src/effects/world-query.ts`**
   - WorldQuery interface (read-only view of WorldModel)
   - `createWorldQuery()` factory function

3. **`packages/world-model/src/effects/effect-processor.ts`**
   - EffectProcessor class with two-phase processing (validate all, then apply all)
   - Effect-specific apply methods for each effect type

4. **`packages/world-model/src/effects/index.ts`**
   - Module exports

### Modified Files

1. **`packages/world-model/src/events/types.ts`**
   - Updated `EntityEventHandler` to receive `WorldQuery` and return `Effect[]`
   - Added `StoryEventHandler` type for story-level handlers
   - Added `AnyEventHandler` union for migration period
   - Updated `IEventHandlers` to support arrays of handlers

2. **`packages/event-processor/src/processor.ts`**
   - Added `storyHandlers` Map for multiple handlers per event type
   - Added `registerHandler()` / `unregisterHandler()` methods
   - Updated `invokeEntityHandlers()` to:
     - Support multiple handlers per event type
     - Detect Effect[] vs ISemanticEvent[] returns (migration support)
     - Process effects through EffectProcessor

3. **`packages/engine/src/game-engine.ts`**
   - Added `getEventProcessor()` method for story access

4. **`packages/parser-en-us/src/core-grammar.ts`**
   - Added touch/rub/feel/pat/stroke/poke/prod grammar rules for touching action

5. **`stories/dungeo/src/handlers/mirror-room-handler.ts`**
   - Rewrote to use new Effect pattern
   - `createMirrorTouchHandler()` returns `StoryEventHandler`
   - Returns `Effect[]` instead of mutating world directly

6. **`stories/dungeo/src/index.ts`**
   - Updated to register mirror handler via `eventProcessor.registerHandler()`

## Architecture

```
Event → EventProcessor.invokeEntityHandlers()
         ↓
    Entity handlers (entity.on[eventType])
    Story handlers (eventProcessor.registerHandler)
         ↓
    Collect Effect[]
         ↓
    EffectProcessor.process(effects)
         ↓
    Validate all → Apply all (atomic)
```

## Test Results

- Mirror room toggle works correctly
- After `rub mirror`, exits change from State A (Grail Room area) to State B (Coal Mine area)
- Second rub toggles back to State A
- Both legacy handlers (returning ISemanticEvent[]) and new handlers (returning Effect[]) work

## Known Limitations

1. **Message effects don't appear in output**: The EffectProcessor's emitEvents callback processes events recursively but doesn't capture them in the turn's output. This is an enhancement for Phase 4.

2. **Transcript tester hanging**: Some test runs hang, possibly due to recursive event processing. Needs investigation.

## Next Steps

1. Migrate other handlers to Effect pattern
2. Fix message effect output capture
3. Implement remaining effect types (schedule, block/unblock)
4. Remove legacy handler support after full migration
