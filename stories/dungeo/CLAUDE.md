## Overview

This is a port of the 1981 version of mainframe Zork (aka Dungeon aka DUNGEO) with 616 points + 100 points for the end game.

## Changes from FORTRAN/MDL Source

- We implemented GDT (Game Debugging Tool), but some commands are specifically for the FORTRAN/MDL implementations (bit flags) and are not relevant to this port.
- We are adhering to all timers, counters, and randomization logic unless it's not feasible.
- The `docs/work/dungeo/map-connections.md` is the canonical source of truth for map connections.

## MDL Source Reference

The authoritative MDL source is at `docs/internal/dungeon-81/patched_confusion/`. Key files:
- `dung.mud` — room definitions, object definitions, global flags
- `act1.mud` — room handlers and action functions (carousel, magnet room, etc.)
- `act2.mud`, `act3.mud` — additional action handlers

### Verifying Against MDL

**Always verify room connections against the MDL source**, not just the map-connections.md file. Past bugs found by checking MDL:
- Well Bottom was missing `WEST → Pearl Room` exit (MDL `BWELL` has `"WEST" "MPEAR"`)
- Round Room carousel incorrectly excluded the intended destination (MDL `CAROUSEL-OUT` picks any random exit)

Room definitions in MDL follow this pattern:
```
<ROOM "ROOMID"
       "description"
       "Short Name"
       <EXIT "DIR1" "DEST1" "DIR2" "DEST2" ...>
       (objects)
       optional-handler>
```

Conditional exits use `<CEXIT "FLAG" "DEST" "blocked-msg" <> HANDLER>` — when FLAG is true, go to DEST; when false, call HANDLER.

### Round Room Carousel (CAROU)

The Round Room (`CAROU` in MDL) has 8 compass exits. When `CAROUSEL-FLIP!-FLAG` is false (spinning):
- `CAROUSEL-EXIT` calls `CAROUSEL-OUT` which picks a random exit from all 8 (1/8 chance each)
- North AND South both point to Engravings Cave → 2/8 = 25% chance per attempt
- The carousel does NOT exclude the intended destination — it picks purely at random
- The triangular button (pushed by robot in Machine Room) sets `CAROUSEL-FLIP!-FLAG` to true (fixed)

### Low Room / Magnet Room (MAGNE)

The Low Room (`MAGNE`) is a separate room from the Round Room with its OWN magnetic behavior:
- When `CAROUSEL-FLIP!-FLAG` is false, all exits randomly go to either Machine Room or Tea Room (50/50)
- When fixed, East → Machine Room, SE/OUT → Tea Room
- The robot starts in this room

## Project Structure

```
src/
├── regions/           # Rooms organized by geographic area
│   └── {region}/
│       ├── index.ts   # Room creation, connections, exports
│       ├── rooms/     # One .ts file per room
│       └── objects/   # Objects placed in this region
├── npcs/              # NPCs with behavior systems
│   └── {npc}/
│       ├── {npc}-entity.ts    # Entity creation
│       ├── {npc}-behavior.ts  # NpcBehavior implementation
│       └── {npc}-messages.ts  # Message IDs
├── actions/           # Story-specific actions (say, ring, etc.)
├── handlers/          # Daemons and event handlers
└── scheduler/         # Timed events (lantern, candles, dam)
```

## Key References

- `docs/work/dungeo/implementation-plan.md` - Progress tracking, room/treasure/puzzle checklists
- `docs/work/dungeo/dungeon-catalog.md` - Complete inventory of rooms, objects, NPCs, puzzles
- `docs/work/dungeo/context/` - Session work summaries for context continuity

## Implementation Patterns

### Treasures (ADR-129)
```typescript
import { IdentityTrait } from '@sharpee/world-model';
import { TreasureTrait } from '../traits/treasure-trait';

// Take-scoring: points on IdentityTrait (OFVAL from MDL)
item.add(new IdentityTrait({ name: 'gold coin', points: 10, pointsDescription: 'Found the gold coin' }));

// Trophy case scoring: trophyCaseValue on story TreasureTrait (OTVAL from MDL)
item.add(new TreasureTrait({ trophyCaseValue: 5 }));
```

### Room Puzzle State
```typescript
(room as any).riddleSolved = false;    // For puzzles that modify room
(room as any).isFixed = true;          // For Round Room carousel
```

### Word Puzzles
Extended via SAY action in `src/actions/say/say-action.ts` - checks room identity and handles room-specific speech (Cyclops "Odysseus", Loud Room "echo", Riddle Room "well").

## Walkthrough Transcripts

### Never Use $teleport

`$teleport` masks real bugs — missing room connections, broken carousel logic, etc. Always use real navigation commands. If navigation seems impossible, check the MDL source for missing connections before resorting to `$teleport`.

### Handling Randomized Rooms (Carousel)

Use WHILE loops with NAVIGATE TO for rooms with random exits:

```
# Enter the randomized room first
> east
[OK: contains "Round Room"]

# Loop: try an exit, navigate back if wrong room
[WHILE: not location = "Engravings Cave"]
> south
[SKIP]
[IF: not location = "Engravings Cave"]
[NAVIGATE TO: "Round Room"]
[END IF]
[END WHILE]
```

Key points:
- Commands inside WHILE need `[SKIP]` or `[OK: ...]` assertions (parser rejects bare commands)
- The carousel picks any random exit — use NAVIGATE TO to return to Round Room on failure
- The IF guard prevents navigating away from Engravings Cave after successfully arriving

### Thief RNG

The thief randomly steals items and moves between rooms. Walkthrough failures caused by thief interference are expected — always run the chain twice before blaming a code change.
