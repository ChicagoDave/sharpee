## Overview

This is a port of the 1981 version of mainframe Zork (aka Dungeon aka DUNGEO) with 616 points + 100 points for the end game.

## Changes from FORTRAN/MDL Source

- We implemented GDT (Game Debugging Tool), but some commands are specifically for the FORTRAN/MDL implementations (bit flags) and are not relevant to this port.
- We are adhering to all timers, counters, and randomization logic unless it's not feasible.
- The `docs/work/dungeo/map-connections.md` is the canonical source of truth for map connections.

## MDL Source Reference

The authoritative MDL source is at `docs/references/dungeon-81/patched_confusion/`. Key files:
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

The Low Room (`MAGNE`) is a separate room from the Round Room with its OWN magnetic behavior.
The single `CAROUSEL-FLIP!-FLAG` drives the two rooms **oppositely** (verified in MDL
`act1.254` `CAROUSEL-EXIT` and `act3.199` `MAGNET-ROOM-EXIT`):
- The flag starts **false**. `MAGNET-ROOM-EXIT`: when the flag is **false**, exits are
  deterministic (East → Machine Room, SE/OUT → Tea Room); when **true**, all exits randomly
  go to Machine Room or Tea Room (`<PROB 50>`).
- The triangular button (`TRBUT`) toggles the flag to **true**, which **fixes the Round Room
  but randomizes the Low Room**. So after the button push the player must bounce through the
  Low Room (bouncing until Tea Room) to get out — the bounce sequence in
  `wt-10-tea-room` is fixed at the chain's pinned seed.
- The robot starts in this room.
- (Randomization is replay-deterministic since ADR-293 Phase B: the draw is the
  `dungeo.low-room.exit` point on the session `RandomService` — like the Round Room's
  `dungeo.round-room.exit`. The old WHILE-loop retries are gone with the ADR-294
  rebuild; transcripts pin a `seed:` and write the fixed bounce sequence.)

## Project Structure

`src/` is organized by **geography, not by kind**: rooms and the objects placed in
them live together under `regions/{region}/`, so a room and its objects are edited
side by side. NPCs get a directory each under `npcs/{npc}/` splitting entity,
behavior, and messages. `actions/`, `handlers/`, and `scheduler/` hold the
story-specific action implementations, daemons/event handlers, and timed events.

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

Randomization is replay-deterministic (ADR-293): room-exit draws are named
points on the session `RandomService` (`dungeo.round-room.exit`,
`dungeo.low-room.exit`). Transcripts pin `seed:` in the header (ADR-294), so a
randomized exit goes to the SAME room on every run — write the fixed sequence
of moves for that seed and assert the actual destinations. The old
`[WHILE:]`/`[NAVIGATE TO:]` loop grammar is removed (ADR-294 D4) and now
raises a parse error.

To discover the sequence at a seed, probe with the bundle:

```
node dist/cli/sharpee.js --exec "cmd1/cmd2/..." --story stories/dungeo --seed 42
```

### Thief RNG

The thief's movements and thefts are draws on the same seeded stream, so at a
pinned seed they are deterministic — a failure at the pinned seed is real, not
flake. Only unpinned runs (`--vary`, or no `seed:` header) still vary.
