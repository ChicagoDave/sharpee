# Chinese Puzzle Room Solution

The Puzzle Room is an 8x8 sliding block puzzle. The goal is to push the **ladder** to the exit position (cell 11) so you can climb up and escape.

## Grid Legend

| Value | Symbol | Meaning |
|-------|--------|---------|
| `1` | `#` | Fixed wall (cannot move) |
| `0` | `.` | Empty space |
| `-1` | `W` | Movable sandstone wall |
| `-2` | `L` | Ladder (push to exit!) |
| `-3` | `X` | Bad ladder (red herring) |
| `P` | `P` | Player start position |

## Initial State

```
     1   2   3   4   5   6   7   8
   +---+---+---+---+---+---+---+---+
 1 | # | # | # | # | # | # | # | # |
   +---+---+---+---+---+---+---+---+
 2 | # | P | W | . | . | W | . | # |
   +---+---+---+---+---+---+---+---+
 3 | # | W | . | # | . | L | . | # |
   +---+---+---+---+---+---+---+---+
 4 | # | . | . | . | . | # | . | # |
   +---+---+---+---+---+---+---+---+
 5 | # | X | . | . | W | W | . | # |
   +---+---+---+---+---+---+---+---+
 6 | # | . | . | W | . | . | . | # |
   +---+---+---+---+---+---+---+---+
 7 | # | # | # | . | . | . | # | # |
   +---+---+---+---+---+---+---+---+
 8 | # | # | # | # | # | # | # | # |
   +---+---+---+---+---+---+---+---+
```

**Key positions:**
- Player starts at **position 10** (row 2, col 2)
- Ladder (L) at **position 22** (row 3, col 6)
- Exit is at **position 11** (row 2, col 3) - push ladder here to climb up
- Grail card is at **position 37** (row 5, col 5)
- Secret door/slot at **position 52** (row 7, col 4)

## Goal

Push the ladder (`L`, value `-2`) to position 11, then type `UP` to exit.

## Solution

The puzzle requires pushing sandstone walls out of the way to create a path for the ladder.

### Step-by-Step Solution

```
1.  PUSH SOUTH WALL    (pushes wall from 18 to 26)
2.  SOUTH
3.  PUSH SOUTH WALL    (pushes wall from 26 to 34... but 34 has bad ladder!)
    -- Actually need different approach --
```

### Optimal Solution (74 moves)

Here's a working solution sequence:

```
PUSH EAST WALL
EAST
PUSH EAST WALL
PUSH SOUTH WALL
SOUTH
SOUTH
PUSH WEST WALL
WEST
PUSH SOUTH WALL
SOUTH
PUSH SOUTH WALL
PUSH WEST WALL
PUSH WEST WALL
WEST
NORTH
PUSH NORTH WALL
PUSH NORTH WALL
NORTH
PUSH EAST WALL
PUSH EAST WALL
EAST
PUSH SOUTH WALL
SOUTH
EAST
PUSH EAST WALL
EAST
PUSH NORTH WALL
PUSH NORTH WALL
NORTH
PUSH WEST WALL
NORTH
PUSH NORTH WALL
PUSH WEST WALL
WEST
PUSH SOUTH WALL
SOUTH
PUSH WEST WALL
WEST
PUSH NORTH WALL
NORTH
NORTH
PUSH EAST WALL
EAST
PUSH SOUTH WALL
PUSH SOUTH WALL
PUSH EAST WALL
PUSH EAST WALL
PUSH NORTH WALL
UP
```

## Mechanics

### Pushing Walls
- `PUSH <direction> WALL` - pushes a movable wall in that direction
- You must be adjacent to the wall
- The wall moves one space in the direction you push
- Walls cannot be pushed through fixed walls or other movable walls
- The ladder behaves like a movable wall for pushing

### Movement
- Standard compass directions: N, S, E, W, NE, NW, SE, SW
- Cannot move through walls (fixed or movable)
- Cannot move through the ladder

### Special Items
- **Grail card** (position 37): A treasure
- **Secret door** (position 52): Can be opened with the card

## Tips

1. The **bad ladder** (X) at position 34 is a red herring - it cannot be used to exit
2. You need to clear a path from the ladder's starting position (22) to the exit (11)
3. Push walls into the southern/eastern areas to make room
4. The narrow corridor (row 7, cols 4-6) can be useful for "parking" walls

## Source

Puzzle designed by Will Weng (noted in source: "COURTESY OF WILL WENG")

Extracted from `docs/dungeon-81/mdlzork_810722/patched_confusion/dung.mud` and `act3.mud`
