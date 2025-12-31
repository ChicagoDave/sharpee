# ADR-078: Thief's Canvas Puzzle - Work Summary

**Date**: 2025-12-31
**Duration**: ~1 session
**Result**: Complete puzzle design documented in ADR-078

## What Was Done

Designed a new 34-point late-game puzzle involving a hidden painting by the Thief.

### The Puzzle Flow

1. **Kill the Thief** - Gate: frame only appears after Thief's death
2. **Find empty frame** in Treasure Room, turn it to see knife-carved clue: "Only devotion can reveal my location."
3. **Break frame** - get frame piece with the carved message
4. **Find incense** in maze (with skeleton/rusty knife)
5. **Go to Basin Room** (E through crack from Temple Dead End 2)
6. **Burn incense** - disarms lethal trap (3 turns only!)
7. **Pray** - blesses the water
8. **Drop frame piece** - Thief's ghost appears, directs player to Gallery
9. **Take rolled up canvas** from Gallery
10. **Trophy case** - 34 total points

### Key Design Decisions

| Decision | Choice |
|----------|--------|
| Treasure | "a rolled up canvas" - portrait of the Implementors |
| Location | Always Gallery (lit, no lamp needed) |
| Gate | Frame appears only after Thief killed |
| Disarm | Burn incense (3 turns, one-use, softlock potential) |
| Incense location | Maze, with skeleton/rusty knife |
| Zarf rating | **Nasty** - can softlock without warning |

### Room: Basin Room

Connected via narrow crack E from Temple Dead End 2.

**Description**: "This is clearly a room of spiritual darkness. An aura of suffering pervades the room, centered on a carved basin of gargoyles and snakes."

**Basin**: "The basin is filled with what can only be described as a mystical fog."

### Spirit Interactions

| Trigger | Response |
|---------|----------|
| Touch basin (no incense) | DEATH: "An angry spirit envelops the room and howls, 'Usurper! You have no rights here!'" |
| Burn incense | "The prevailing 'evil' within the room seems to be pressed back, but not disappear." |
| Incense expires (3 turns) | "The incense sputters out. The evil presence returns with a vengeance." |
| Drop wrong item | Spirit laughs: "As we said, you have no rights here!" (item destroyed) |
| Drop frame piece | Ghost becomes Thief in adventurer robes: "Well done my friend. You are nearing the end game. Look to the Gallery for your reward." |

The "end game" line is a Marvel reference.

### Thief's Canvas

- **Short**: "a rolled up canvas"
- **Examine**: "The thief apparently had a superior artistic streak, for this is one of the greatest creations in all of Zork. It is a faithful rendering of The Implementors, the mythical Gods remembered by all inhabitants."

## Files Created/Modified

| File | Changes |
|------|---------|
| `docs/architecture/adrs/adr-078-magic-paper-puzzle.md` | New ADR - complete puzzle design |
| `docs/work/dungeo/implementation-plan.md` | Added Basin Room, treasure #33, objects, puzzle entry, systems |

## Implementation Plan Updates

- **Room**: Basin Room added to Dam region
- **Treasure #33**: Thief's canvas (10 take + 14 case = 34 pts)
- **Objects**: Incense, Empty frame, Frame piece
- **Systems**: BURN action (3-turn timer), PRAY action
- **Priority #1**: ADR-078 implementation

## New Totals

| Category | Before | After |
|----------|--------|-------|
| Rooms | ~190 | ~191 |
| Treasures | 32 | 33 |
| Max Points | 616 | 650 |

## Design Evolution During Session

1. Started with "Frobozz Magic Paper" + WRITE action
2. Simplified to breaking frame, using frame piece (no WRITE needed)
3. Added lethal trap with angry spirit
4. Added incense as disarm mechanism (burn for 3 turns)
5. Changed from random room spawn to fixed Gallery location
6. Changed from "hollow voice" hint to Thief's ghost direct hint
7. Added skeleton backstory (devotee who died with incense)

## Next Steps

Implementation requires:
1. Basin Room + connection from Temple Dead End 2
2. Incense object in maze
3. Empty frame (spawns on Thief death)
4. Frame piece (from breaking frame)
5. BURN action with 3-turn daemon
6. PRAY action for basin blessing
7. Basin trap handler (armed/disarmed/blessed states)
8. Thief ghost reveal + canvas spawn
9. Canvas treasure in Gallery
