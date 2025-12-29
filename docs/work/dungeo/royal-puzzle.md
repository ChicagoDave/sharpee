# Royal Puzzle Specification

## Mainframe Zork (616-point version)

**Original Design:** Bruce Daniels (1978)
**Source:** Fortran DUNGEON by Bob Supnik, CPVEC/CPGOTO/CPINFO routines

---

## Overview

The Royal Puzzle is an 8×8 sliding block puzzle. The player descends through a hole in the ceiling, must push sandstone blocks to reach a hidden treasure (the lore book), then reposition a ladder block to climb back out.

---

## Grid Layout

The puzzle is stored as a 64-element array (8×8, row-major, 0-indexed).

### Cell Values

| Value | Type      | Description                                             |
| ----- | --------- | ------------------------------------------------------- |
| 1     | MARBLE    | Immovable wall (perimeter + some interior)              |
| 0     | EMPTY     | Open corridor - player can walk/push into               |
| -1    | SANDSTONE | Pushable block                                          |
| -2    | LADDER    | Pushable block with ladder attached                     |
| -3    | BOOK      | Pushable block with depression containing the lore book |

### Initial State

```
     0   1   2   3   4   5   6   7
   +---+---+---+---+---+---+---+---+
 0 | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ |  Row 0: all marble
   +---+---+---+---+---+---+---+---+
 8 | ▓ | @ | ░ | · | · | ░ | · | ▓ |  @ = entry point (index 9)
   +---+---+---+---+---+---+---+---+
16 | ▓ | ░ | · | ▓ | · | ▲ | · | ▓ |  ▲ = ladder (index 21)
   +---+---+---+---+---+---+---+---+
24 | ▓ | · | · | · | · | ▓ | · | ▓ |
   +---+---+---+---+---+---+---+---+
32 | ▓ | ★ | · | · | ░ | ░ | · | ▓ |  ★ = book (index 33)
   +---+---+---+---+---+---+---+---+
40 | ▓ | · | · | ░ | · | · | · | ▓ |
   +---+---+---+---+---+---+---+---+
48 | ▓ | ▓ | ▓ | · | · | · | ▓ | ▓ |
   +---+---+---+---+---+---+---+---+
56 | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ | ▓ |  Row 7: all marble
   +---+---+---+---+---+---+---+---+

Legend:
  ▓ = marble (1)     ░ = sandstone (-1)
  · = empty (0)      ▲ = ladder (-2)
  @ = player start   ★ = book (-3)
```

### Grid as Array

```
Index:  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
Value:  1  1  1  1  1  1  1  1  1  0 -1  0  0 -1  0  1

Index: 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31
Value:  1 -1  0  1  0 -2  0  1  1  0  0  0  0  1  0  1

Index: 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47
Value:  1 -3  0  0 -1 -1  0  1  1  0  0 -1  0  0  0  1

Index: 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63
Value:  1  1  1  0  0  0  1  1  1  1  1  1  1  1  1  1
```

---

## Movement

### Direction Offsets

| Direction | Offset | Notes            |
| --------- | ------ | ---------------- |
| NORTH     | -8     | Up one row       |
| SOUTH     | +8     | Down one row     |
| EAST      | +1     | Right one column |
| WEST      | -1     | Left one column  |

### Movement Rules

1. Player can only move into EMPTY (0) cells
2. Prevent wraparound: check column boundaries for E/W movement
   - EAST from column 7 is invalid
   - WEST from column 0 is invalid
3. Movement into any non-zero cell is blocked

### Boundary Check

```
function canMoveEastWest(position, direction):
  column = position % 8
  if direction == EAST and column == 7: return false
  if direction == WEST and column == 0: return false
  return true
```

---

## Pushing Walls

### Push Commands

Player can push walls in cardinal directions:

- PUSH NORTH WALL
- PUSH SOUTH WALL
- PUSH EAST WALL
- PUSH WEST WALL

### Push Rules

1. **Target cell** = player position + direction offset
2. **Destination cell** = target position + direction offset (same direction)

3. Check target cell value:

   - If EMPTY (0): "The corridor is clear" (nothing to push)
   - If MARBLE (1): "The wall is immovable"
   - If pushable (<0): check if push is possible

4. For pushable walls (-1, -2, -3):

   - Check destination cell
   - If destination is EMPTY (0): push succeeds
   - Otherwise: "There is no room" / "The wall won't budge"

5. On successful push:
   - Move wall value from target to destination: `grid[dest] = grid[target]`
   - Clear target cell: `grid[target] = 0`
   - Move player into target cell: `playerPos = target`

### Push Pseudocode

```
function push(direction):
  target = playerPos + offset[direction]

  // Boundary check
  if not validPosition(target): return "No wall there"
  if crossesBoundary(playerPos, direction): return "No wall there"

  wallType = grid[target]

  if wallType == 0: return "Clear corridor"
  if wallType == 1: return "Immovable"

  // Pushable wall
  dest = target + offset[direction]

  if crossesBoundary(target, direction): return "No room"
  if not validPosition(dest): return "No room"
  if grid[dest] != 0: return "No room"

  // Execute push
  grid[dest] = wallType
  grid[target] = 0
  playerPos = target

  return "Wall slides forward"
```

---

## Special Locations

### Entry/Exit Point (Index 9)

- Player enters the puzzle here (descends from above)
- To exit: player must be at index 9, ladder block must be at index 10, and player goes UP

### Book Location (Index 33)

- Contains the "lore book" treasure
- Player can TAKE BOOK when adjacent to this cell
- After taking book, cell becomes regular sandstone (-1) for pushing purposes
- The book is worth points and needed for the endgame

### Ladder Block (Index 21 initially)

- Must be pushed to index 10 (east of entry) to enable exit
- Only way out of the puzzle

---

## Exit Conditions

```
function attemptExit():
  if playerPos != 9: return "No way to reach the ceiling"
  if grid[10] != -2: return "No ladder to climb"
  return SUCCESS - player exits puzzle
```

---

## State to Track

```
PuzzleState:
  grid: number[64]        // Current block positions
  playerPos: number       // Current player position (0-63)
  bookTaken: boolean      // Whether lore book has been taken
  hasExited: boolean      // Whether player has escaped
  pushCount: number       // Optional: for scoring/messages
```

---

## Room Descriptions

### Entry Room (Index 9)

> You are in a small square room, with a sandstone wall to the east, and a marble wall to the south. In the ceiling above you is a dark hole.

### Generic Corridor

> You are in a maze of sandstone walls. Narrow corridors lead [list open directions].

### With Ladder Visible (adjacent to ladder block)

> One of the sandstone walls has a wooden ladder attached to it.

### At Exit with Ladder in Place

> You can see daylight through the hole above. A ladder on the wall to the east reaches up to it.

### Book Location (adjacent to index 33, book not taken)

> Set into the floor is a small depression. Within it rests a beautifully illuminated book.

---

## Solution Path

Optimal solution from entry (position 9) to book and back out:

```
1. PUSH EAST WALL     (pushes block at 10 to 11)
2. S                  (move to 17)
3. S                  (move to 25)
4. SE                 (move to 34) -- or S then E
5. PUSH SOUTH WALL    (pushes block at 42 if present... actually need to verify)
...
```

The Fortran source includes this solution in invisiclues:

```
D. PUSH EAST WALL. S. S. SE. PUSH SOUTH WALL. N. NE. PUSH SOUTH WALL.
TAKE BOOK. PUSH SOUTH WALL. E. NE. PUSH WEST WALL. SW. NW. NE.
PUSH SOUTH WALL. SW. PUSH EAST WALL. NE. PUSH SOUTH WALL. NW. N. N. N.
PUSH EAST WALL. SW. S. SE. NE. N. PUSH WEST WALL.
```

Note: This solution uses diagonal movement (SE, NE, SW, NW). In the Fortran source, diagonal movement is allowed only if both orthogonal intermediate cells are empty.

---

## Diagonal Movement (Optional)

The Fortran version allows diagonal movement under specific conditions:

```
function canMoveDiagonal(from, to):
  rowDiff = floor(to/8) - floor(from/8)
  colDiff = (to % 8) - (from % 8)

  // Must be adjacent diagonal
  if abs(rowDiff) != 1 or abs(colDiff) != 1: return false

  // Check both orthogonal paths
  horizontal = from + colDiff
  vertical = from + (rowDiff * 8)

  return grid[horizontal] == 0 and grid[vertical] == 0 and grid[to] == 0
```

---

## Points

- Entering the puzzle: 0 points
- Taking the book: 6 points (OTVAL value in Fortran)
- Exiting the puzzle: triggers endgame continuation

---

## Connected Rooms

In mainframe Zork geography:

- **Above:** Puzzle Room (entrance in the End Game area)
- **West exit (index 52):** Alternative exit to a different area (CPOUTF flag)

The puzzle entrance is in the endgame section, accessible after completing the main treasure hunt.

---

## Implementation Notes

1. The puzzle is self-contained - no external objects can be brought in
2. Light is not an issue inside the puzzle
3. The thief cannot enter the puzzle
4. Save/restore should capture the full grid state
5. Dying in the puzzle (unlikely) would reset it

---

## References

- `nobjs.for` - Wall pushing logic (CPVEC, CPWL arrays)
- `dverb2.for` - Movement logic (FROBZF routine, section 14000)
- `dmain.for` - Initial CPVEC DATA statement
- `nrooms.for` - Room descriptions for puzzle area
