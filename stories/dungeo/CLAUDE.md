## Overview

This is a port of the 1981 version of mainframe Zork (aka Dungeon aka DUNGEO) with 616 points + 100 points for the end game.

## Changes from FORTRAN/MDL Source

- We implemented GDT (Game Debugging Tool), but some commands are specifically for the FORTRAN/MDL implementations (bit flags) and are not relevant to this port.
- We are adhering to all timers, counters, and randomization logic unless it's not feasible.
- The `docs/work/dungeo/dungeon-room-connections.md` is the canonical source of truth for map connections.

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

### Treasures
```typescript
import { TreasureTrait } from '@sharpee/world-model';

item.add(new TreasureTrait({
  treasureId: 'unique-id',
  treasureValue: 10,      // Points for taking (OFVAL)
  trophyCaseValue: 5,     // Points in trophy case (OTVAL)
}));
```

### Room Puzzle State
```typescript
(room as any).riddleSolved = false;    // For puzzles that modify room
(room as any).isFixed = true;          // For Round Room carousel
```

### Word Puzzles
Extended via SAY action in `src/actions/say/say-action.ts` - checks room identity and handles room-specific speech (Cyclops "Odysseus", Loud Room "echo", Riddle Room "well").
