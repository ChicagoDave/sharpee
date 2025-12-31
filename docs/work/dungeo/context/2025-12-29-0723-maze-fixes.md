# Work Summary: Maze Connection Fixes

**Date**: 2025-12-29
**Feature/Area**: Maze connections and tests

## Objective

Continue from previous maze restructure work to fix remaining connection issues and update tests.

## What Was Accomplished

### 1. Fixed Troll Room Connection

**Bug**: `connectMazeToTrollRoom()` was setting Troll Room SOUTH → Maze-1, but:
- This overwrote the existing SOUTH → Narrow Passage connection
- Per Troll Room description ("forbidding hole leading west"), the maze is WEST not SOUTH

**Fix**: Changed `regions/maze/index.ts` to set Troll Room WEST → Maze-1

### 2. Updated Transcript Tests

Rewrote both maze transcript tests to match the new maze structure:

| Test | Changes |
|------|---------|
| `maze-navigation.transcript` | Updated paths using correct connections per map-connections.md |
| `maze-loops.transcript` | Renamed to "Maze Dead Ends", tests all 5 dead ends |

### 3. Added Numbered Aliases to Maze/Dead End Rooms

Added numbered aliases for GDT teleportation support:

| Room Type | New Aliases |
|-----------|-------------|
| Maze N | `['maze', 'maze N', 'mazeN']` |
| Dead End N | `['dead end', 'dead end N', 'deadendN']` |

Files modified:
- `dead-end.ts` - Added template for numbered aliases
- `maze1.ts` through `maze15.ts` - Added numbered aliases

### 4. Updated map-connections.md

Added missing `NE:Round Room` connection to Maze-1 entry.

## Test Results

```
Total: 205 tests in 12 transcripts
204 passed, 1 expected failures
Duration: 99ms
✓ All tests passed!
```

## Connection Summary

**Troll Room connections (fixed):**
- SOUTH → Narrow Passage (to Cellar)
- EAST → E/W Passage (troll-blocked initially)
- WEST → Maze-1 ("forbidding hole")

**Round Room connections (existing):**
- WEST → East/West Passage
- SOUTHWEST → Maze-1
- NORTH → Loud Room (via dam region connection)

**Note**: Round Room still needs additional rooms to be created before full connections:
- NW: Deep Canyon (exists but routed through Loud Room)
- NE: North/South Passage (not created yet)
- E: Grail Room (not created yet)
- SE: Winding Passage (not created yet)
- S/N: Engravings Cave (not created yet)

## Files Modified

- `stories/dungeo/src/regions/maze/index.ts` - Fixed Troll Room direction
- `stories/dungeo/src/regions/maze/rooms/dead-end.ts` - Added numbered aliases
- `stories/dungeo/src/regions/maze/rooms/maze*.ts` (15 files) - Added numbered aliases
- `stories/dungeo/tests/transcripts/maze-navigation.transcript` - Rewritten
- `stories/dungeo/tests/transcripts/maze-loops.transcript` - Rewritten
- `docs/work/dungeo/map-connections.md` - Added Maze-1 NE connection
