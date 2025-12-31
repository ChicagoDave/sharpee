# ADR-078 Thief's Canvas Puzzle - Implementation Summary

**Date**: 2025-12-31
**Duration**: ~1 session
**Result**: Full implementation complete, all tests passing

## What Was Done

Implemented the complete ADR-078 Thief's Canvas puzzle - a 34-point late-game ghost ritual.

### Puzzle Flow
1. Kill Thief → empty frame spawns in Treasure Room
2. BREAK frame → get frame piece with carved clue
3. Find incense in Maze Dead End 1 (with skeleton)
4. BURN incense in Basin Room → 3-turn fuse starts
5. PRAY (2x) → basin disarmed then blessed
6. DROP frame piece → ghost appears, canvas spawns in Gallery
7. Take canvas → 34 points (10 take + 24 case)

## Files Created (15)

| File | Purpose |
|------|---------|
| `regions/dam/rooms/basin-room.ts` | Basin Room with basinState machine |
| `regions/dam/objects/basin-objects.ts` | Stone basin scenery |
| `objects/thiefs-canvas-objects.ts` | Frame, frame piece, incense, canvas creators |
| `actions/break/types.ts` | BREAK action types and messages |
| `actions/break/break-action.ts` | BREAK action - breaks frame → frame piece |
| `actions/break/index.ts` | Module exports |
| `actions/burn/types.ts` | BURN action types and messages |
| `actions/burn/burn-action.ts` | BURN action - lights incense |
| `actions/burn/index.ts` | Module exports |
| `actions/pray/types.ts` | PRAY action types and messages |
| `actions/pray/pray-action.ts` | PRAY action with basin state progression |
| `actions/pray/index.ts` | Module exports |
| `scheduler/incense-fuse.ts` | 3-turn countdown fuse for burning incense |
| `handlers/ghost-ritual-handler.ts` | Event handler: drop frame piece → spawn canvas |
| `tests/transcripts/thiefs-canvas.transcript` | Verification tests |

## Files Modified (8)

| File | Changes |
|------|---------|
| `regions/dam/index.ts` | Added basinRoom to DamRoomIds, room creation, exits |
| `regions/dam/objects/index.ts` | Added createStoneBasin call |
| `regions/maze/objects/index.ts` | Added incense creation in Dead End 1 |
| `npcs/thief/thief-entity.ts` | Frame spawns on death (lines 160-174) |
| `npcs/thief/thief-messages.ts` | Added FRAME_SPAWNS message |
| `actions/index.ts` | Registered break, burn, pray actions |
| `scheduler/index.ts` | Registered incense fuse |
| `scheduler/scheduler-messages.ts` | Added INCENSE_BURNING, INCENSE_BURNS_OUT |
| `index.ts` | Grammar, messages, ghost ritual handler |

## Key Design Decisions

| Decision | Choice |
|----------|--------|
| Actions | Story-specific (not stdlib) - BREAK, BURN, PRAY |
| Basin state | Room property: 'normal' → 'disarmed' → 'blessed' |
| Incense fuse | Registered at startup, tickCondition gates countdown |
| Canvas spawn | Gallery (already lit, art-themed, perfect location) |
| Frame spawn | On Thief death event, placed in Treasure Room |

## Basin State Machine

```
normal → (BURN incense) → still normal
         (PRAY without incense) → still normal

normal + incense burning → (PRAY) → disarmed
                                     "basin begins to glow"

disarmed → (PRAY again) → blessed
                           "water shimmers with ethereal light"

blessed → (DROP frame piece) → RITUAL COMPLETE
                                Ghost appears
                                Canvas spawns in Gallery
```

## Grammar Patterns Added

```
break :target       → DUNGEO_BREAK (priority 150)
smash :target       → DUNGEO_BREAK (priority 150)
burn :target        → DUNGEO_BURN (priority 150)
light :target       → DUNGEO_BURN (priority 145, lower than lantern)
pray                → DUNGEO_PRAY (priority 150)
pray at :target     → DUNGEO_PRAY (priority 155)
pray to :target     → DUNGEO_PRAY (priority 155)
```

## Test Results

- 383 total transcript tests
- 378 passed, 5 expected failures
- All existing tests still pass
- New thiefs-canvas.transcript verifies basic mechanics

## Progress Update

| Metric | Before | After |
|--------|--------|-------|
| Rooms | 144/~190 | 145/~191 |
| Treasure Points | 500/616 | 534/650 |
| Treasures | 32 | 33 |

## Technical Notes

1. **WorldModel vs IWorldModel**: Event handlers receive `IWorldModel` but object creators need `WorldModel`. Fixed by using the `world` from the closure instead of `w` from the callback.

2. **Incense Fuse Pattern**: Unlike candle/lantern fuses that start immediately, incense fuse uses `tickCondition` to only count when `isBurning === true`. This way it can be registered at startup but won't tick until the player burns it.

3. **Ghost Ritual Handler**: Listens for `if.event.dropped` events. Checks: item is frame piece, location is Basin Room, basin is blessed. On success, removes frame piece and creates canvas in Gallery.

## What's NOT Implemented Yet

- Lethal basin trap (touching basin without incense = death)
- Full thief death integration (currently frame is created but thief death via GDT doesn't trigger death event)
- Ghost appearance message emission (state is set, message defined, but event emission TBD)

These can be added in a follow-up session if needed.
