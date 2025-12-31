# Work Summary: Entity Handler Implementation and Rug/Trapdoor Puzzle

**Date**: 2025-12-28
**Duration**: ~3 hours
**Feature/Area**: Event System (ADR-052) & Dungeo Phase 1 Puzzles

## Objective

Implement entity-level event handlers (ADR-052 Phase 1) to enable reactive entity behavior, and use this capability to create the iconic Zork rug/trapdoor puzzle where pushing the rug reveals a hidden trapdoor to the cellar.

## What Was Accomplished

### Files Created/Modified

#### Event Processor Package
- `packages/event-processor/src/processor.ts` - Added `invokeEntityHandlers()` method
- `packages/event-processor/tests/unit/entity-handlers.test.ts` - Created 8 unit tests for entity handler invocation

#### Engine Package
- `packages/engine/src/command-executor.ts` - Updated to include reaction events from entity handlers in TurnResult

#### Text Services Package
- `packages/text-services/src/standard-text-service.ts` - Fixed `translateGameMessage()` to handle messageId

#### Transcript Tester Package
- `packages/transcript-tester/src/reporter.ts` - Added verbose output showing actual game text

#### Dungeo Story
- `stories/dungeo/src/objects/house-interior-objects.ts` - Implemented rug with push handler that reveals trapdoor
- `stories/dungeo/src/regions/underground.ts` - Modified cellar connection logic
- `stories/dungeo/src/index.ts` - Added message registration and cellarId parameter
- `stories/dungeo/tests/transcripts/rug-trapdoor.transcript` - Created dedicated test for puzzle
- `stories/dungeo/tests/transcripts/troll-blocking.transcript` - Updated to include rug/trapdoor steps

#### Documentation
- `docs/architecture/adrs/adr-052-event-handlers-custom-logic.md` - Updated status to "Implemented (Phase 1)"

### Features Implemented

#### 1. Entity Handler System (ADR-052 Phase 1)
Implemented the first phase of the event handler system where entities can react to events:

```typescript
// In event-processor
private invokeEntityHandlers(events: readonly ISemanticEvent[]): ISemanticEvent[] {
  const reactions: ISemanticEvent[] = [];

  for (const event of events) {
    if (!event.entityId) continue;

    const entity = this.world.getEntityById(event.entityId);
    if (!entity?.on) continue;

    const handler = entity.on[event.type];
    if (typeof handler === 'function') {
      const result = handler(event, this.world);
      if (result) {
        reactions.push(...result);
      }
    }
  }

  return reactions;
}
```

Flow:
1. After events are applied to world state, check each event for entity handlers
2. Look up `entity.on[event.type]` handler function
3. If handler exists, invoke it with `(event, world)`
4. Handler can return `ISemanticEvent[]` as reactions
5. Reaction events are included in TurnResult and processed by command executor

#### 2. Rug/Trapdoor Puzzle
Classic Zork puzzle implemented using entity handlers:

**Setup**:
- Rug is `PushableTrait({ pushType: 'moveable' })`
- Trapdoor exists but is NOT initially placed in Living Room (hidden)
- Cellar has UP exit via trapdoor, but Living Room has no DOWN exit initially

**Mechanism**:
```typescript
rug.on = {
  'if.event.pushed': (event, world) => {
    // Move trapdoor into Living Room
    const trapdoor = world.getEntityById(trapdoorId);
    if (trapdoor && trapdoor.location !== livingRoomId) {
      trapdoor.location = livingRoomId;

      // Add DOWN exit to cellar
      const livingRoom = world.getEntityById(livingRoomId);
      if (livingRoom && isRoomTrait(livingRoom)) {
        livingRoom.exits.down = { to: cellarId, via: trapdoorId };
      }

      // Return message event
      return [
        game.message({
          messageId: 'dungeo.rug.moved.reveal_trapdoor',
        }),
      ];
    }
    return [];
  },
};
```

**Result**: When player pushes rug, trapdoor appears and DOWN exit becomes available.

### Tests Written

#### Entity Handler Tests (`entity-handlers.test.ts`)
- Should invoke entity handler when entity has handler for event type
- Should pass event and world to handler
- Should return reaction events from handler
- Should handle multiple handlers on different entities
- Should not error when entity has no handlers
- Should not error when entity has handlers but not for this event type
- Should handle handler returning empty array
- Should handle handler returning undefined

#### Transcript Tests
- `rug-trapdoor.transcript` - Tests complete puzzle sequence:
  - Look at rug
  - Push rug
  - Verify trapdoor message
  - Open trapdoor
  - Go down to cellar

- `troll-blocking.transcript` - Updated to include rug/trapdoor as part of larger test scenario

## Key Decisions

### 1. Handler Invocation After Event Application
**Decision**: Entity handlers are invoked AFTER events are applied to world state, not before.

**Rationale**:
- Events represent state changes that have already been validated
- Handlers can inspect current world state and make decisions
- Clear separation between validation (action phase) and reaction (handler phase)
- Prevents handlers from interfering with event application

### 2. Handler Return Type: ISemanticEvent[]
**Decision**: Handlers return arrays of semantic events, not direct mutations.

**Rationale**:
- Maintains event-driven architecture
- All state changes flow through event system
- Enables proper event history and potential undo/replay
- Handlers can trigger multiple events (e.g., message + state change)

### 3. Trapdoor Hidden Until Rug Pushed
**Decision**: Trapdoor entity exists in world but has no location until rug is pushed.

**Rationale**:
- More authentic to original Zork (trapdoor is truly hidden)
- Handler adds trapdoor to room dynamically
- Cleaner than having trapdoor present but "hidden" with flags
- Exit connection uses `via: trapdoorId` to gate on trapdoor state

### 4. Message ID in Language Layer
**Decision**: Rug handler returns `game.message({ messageId })` and message is registered in story's `extendLanguage()`.

**Rationale**:
- Follows language layer separation principle
- Story-specific messages belong in story code
- Handler emits semantic event, language layer provides text
- Enables future localization

## Challenges & Solutions

### Challenge: Message Not Appearing in Output
After implementing the handler, the reveal message wasn't showing up when rug was pushed.

**Solution**:
1. Fixed `standard-text-service.ts` to handle `messageId` property in game messages
2. Added verbose mode to transcript tester to debug actual output
3. Confirmed message registration in story's `extendLanguage()` function

### Challenge: Exit Connection Ordering
Initially unclear whether to add DOWN exit when trapdoor appears or when it's opened.

**Solution**:
- Added DOWN exit when rug is pushed (trapdoor appears)
- Exit has `via: trapdoorId` which gates on trapdoor being open
- UP exit from cellar also has `via: 'trapdoor'` for consistency
- This matches Zork behavior: trapdoor visible but must be opened to use

### Challenge: Passing Cellar ID to Object Creation
Rug handler needs to know cellarId to create exit.

**Solution**:
- Modified `createHouseInteriorObjects()` signature to accept `cellarId` parameter
- Updated call in `stories/dungeo/src/index.ts` to pass cellarId from underground region
- Captures cellarId in closure for handler function

## Code Quality

- All event processor tests passing (8 new tests)
- TypeScript compilation successful
- Entity handler invocation tested in isolation
- Transcript tests verify end-to-end behavior
- Follows event-driven architecture principles
- Maintains language layer separation

## Next Steps

1. [ ] Rebuild dungeo and test rug/trapdoor puzzle manually
2. [ ] Run all dungeo transcript tests to verify no regressions
3. [ ] Consider implementing global handlers (ADR-052 Phase 2) for ambient events
4. [ ] Continue with other Phase 1 dungeo features (sword, lamp, thief, etc.)
5. [ ] Document entity handler pattern in core-concepts.md
6. [ ] Add more transcript tests for edge cases (pushing rug twice, etc.)

## References

- ADR: `docs/architecture/adrs/adr-052-event-handlers-custom-logic.md`
- Implementation Plan: `docs/work/dungeo/implementation-plan.md`
- Core Concepts: `docs/reference/core-concepts.md`
- Phase 1 Progress: See dungeo implementation plan

## Notes

**Entity Handler Pattern**: This implementation establishes a clean pattern for entity reactivity:
1. Entities can define `on` property with event type keys
2. Handlers receive `(event, world)` and return `ISemanticEvent[]`
3. Handlers are invoked after event application
4. Reactions flow back through event system

**Puzzle Design**: The rug/trapdoor implementation demonstrates how entity handlers enable sophisticated puzzle mechanics without polluting the action system. The handler is local to the rug entity and only concerns itself with the specific logic of revealing the trapdoor.

**Testing Strategy**: Combination of unit tests (handler invocation mechanics) and transcript tests (end-to-end behavior) provides good coverage. Verbose transcript output proved valuable for debugging message display issues.

**Future Work**: Global handlers (Phase 2) will enable ambient events like "the troll blocks your path" without requiring entity-specific handlers. This will be useful for NPCs and environmental effects.
