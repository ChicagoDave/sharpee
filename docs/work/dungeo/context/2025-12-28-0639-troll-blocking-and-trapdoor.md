# Work Summary: Troll Blocking and Trapdoor Puzzle

**Date**: 2025-12-28
**Duration**: ~1.5 hours
**Feature/Area**: Project Dungeo - Troll blocking and rug/trapdoor puzzle
**Branch**: dungeo

## Objective

Implement troll blocking in Troll Room and enable path to underground via Living Room trapdoor.

## What Was Accomplished

### 1. Troll NPC Setup

**Completed**:
- Registered standard NPC behaviors (`guardBehavior`, `passiveBehavior`) in game engine (`packages/engine/src/game-engine.ts`)
- Exported `NpcTrait` from world-model (`packages/world-model/src/index.ts`)
- Updated troll entity to use `NpcTrait` with `behaviorId: 'guard'` and `isHostile: true` (`stories/dungeo/src/objects/underground-objects.ts`)
- Blocked east exit in Troll Room using `RoomBehavior.blockExit()` (`stories/dungeo/src/regions/underground.ts`)

### 2. Push/Pull/Move Grammar

**Completed**:
- Added grammar patterns for push, pull, move, shove, drag to `core-grammar.ts` (`packages/parser-en-us/src/core-grammar.ts`)

### 3. Rug/Trapdoor Puzzle Analysis

**Discovered architectural gap**: The trapdoor puzzle requires entity-level event handlers (ADR-052) which are defined but not implemented.

**Zork rug/trapdoor mechanics**:
1. Rug covers trapdoor initially (trapdoor not in room)
2. "move rug" reveals trapdoor (moves it into room, adds DOWN exit)
3. DOWN exit uses `via: trapdoor.id` to gate passage
4. Player must open trapdoor to go down
5. Error messages vary based on state (no exit vs door closed)

**Current state**:
- Trapdoor entity exists but is placed in room (should be hidden)
- DOWN exit exists but doesn't reference trapdoor via `via` property
- No mechanism for rug push to reveal trapdoor

## Blocked By: ADR-052 Implementation

ADR-052 "Event Handlers and Custom Logic" describes the correct pattern:

```typescript
// Entity-level handler
rug.on = {
  'if.event.pushed': (event) => {
    world.moveEntity(trapdoor.id, livingRoomId);
    RoomBehavior.setExit(livingRoom, Direction.DOWN, cellar.id, trapdoor.id);
    return [/* semantic events for reveal message */];
  }
}
```

**Infrastructure that exists**:
- `IFEntity.on?: IEventHandlers` property (line 24 in if-entity.ts)
- `IEventHandlers` type with `[eventType: string]: EntityEventHandler`
- `EntityEventHandler` signature returning `void | ISemanticEvent[]`

**What's missing**:
- Entity handler invocation in `EventProcessor.processEvents()` or `processSingleEvent()`
- When processing an event like `if.event.pushed`, check if target entity has `on['if.event.pushed']` and call it
- Handler results (ISemanticEvent[]) should be added to reactions

## Files Changed

| File | Change |
|------|--------|
| `packages/engine/src/game-engine.ts` | Import and register guardBehavior, passiveBehavior |
| `packages/world-model/src/index.ts` | Export NpcTrait |
| `stories/dungeo/src/objects/underground-objects.ts` | Troll uses NpcTrait with guard behavior |
| `stories/dungeo/src/regions/underground.ts` | Import RoomBehavior, block east exit in Troll Room |
| `packages/parser-en-us/src/core-grammar.ts` | Add push/pull/move/shove/drag patterns |

## Test Files Created

- `stories/dungeo/tests/transcripts/troll-blocking.transcript` (not yet passing - needs trapdoor fix)
- `stories/dungeo/tests/transcripts/debug-down.transcript` (debug helper)

## Next Steps (Priority Order)

### 1. Implement ADR-052 Entity Handler Invocation
Location: `packages/event-processor/src/processor.ts`

In `processSingleEvent()`, after applying the event:
```typescript
// Check for entity handlers
if (event.entities?.target) {
  const target = this.world.getEntity(event.entities.target);
  if (target?.on?.[event.type]) {
    const handlerEvents = target.on[event.type](event);
    if (handlerEvents) {
      reactions.push(...handlerEvents);
    }
  }
}
```

### 2. Implement Rug/Trapdoor Puzzle
Once ADR-052 is working:
1. Don't place trapdoor in room initially (remove `world.moveEntity(trapdoor.id, livingRoomId)`)
2. Don't create DOWN exit initially in `connectUndergroundToHouse()`
3. Add `on['if.event.pushed']` handler to rug that:
   - Moves trapdoor to Living Room
   - Adds DOWN exit with `via: trapdoor.id`
   - Returns semantic event with reveal message
4. Make rug pushable with `PushableTrait({ pushType: 'moveable' })`

### 3. Test Full Flow
- move rug → trapdoor appears
- open trapdoor
- down → Cellar
- navigate to Troll Room
- east → blocked by troll

## Architecture Notes

The rug/trapdoor puzzle is a canonical example of why ADR-052 is needed. Story-specific puzzle logic cannot live in stdlib actions. The pattern is:

1. **Actions** handle mechanics (pushing updates state, emits event)
2. **Entity handlers** react to events with story-specific logic
3. **Story handlers** (daemons) handle multi-entity or time-based logic

This separation keeps stdlib generic while enabling complex game logic.

## Cleanup Needed

- Remove `test-exits.js` from repo root
- Remove `debug-down.transcript` after testing works
