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

## Solution (42 commands)

```
PUSH EAST WALL
S
S
SE
PUSH SOUTH WALL
N
NE
PUSH SOUTH WALL
TAKE BOOK
PUSH SOUTH WALL
E
NE
PUSH WEST WALL
SW
NW
NE
PUSH SOUTH WALL
SW
PUSH EAST WALL
NE
PUSH SOUTH WALL
NW
N
N
N
PUSH EAST WALL
SW
S
SE
NE
N
PUSH WEST WALL
NW
PUSH SOUTH WALL
PUSH SOUTH WALL
W
NW
NW
PUSH SOUTH WALL
SE
SE
SE
NE
PUSH WEST WALL
PUSH WEST WALL
SW
PUSH NORTH WALL
PUSH NORTH WALL
PUSH NORTH WALL
NW
UP
```

**Note:** `AGAIN` can be used to repeat the previous command, so `PUSH SOUTH WALL. AGAIN.` pushes twice.

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

1. The **bad ladder** (X) at position 34 is a red herring - it's "firmly attached to the wall" and cannot be used to exit
2. You need to clear a path from the ladder's starting position to the exit
3. The solution picks up the **book** along the way (a treasure)
4. The puzzle uses diagonal movement (NE, NW, SE, SW) which is key to the solution
5. Sandstone walls (SS) can be pushed; marble walls (MM) cannot

## Source

Puzzle designed by Will Weng (noted in source: "COURTESY OF WILL WENG")

Extracted from `docs/dungeon-81/mdlzork_810722/patched_confusion/dung.mud` and `act3.mud`
