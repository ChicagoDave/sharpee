# Royal Puzzle Implementation Plan

**Date**: 2025-12-30
**Status**: Research Complete - Ready for Implementation

---

## Version Discrepancies

The Royal Puzzle exists in multiple Zork versions with differences:

| Aspect | Mainframe Zork (616-pt) | Zork III (Commercial) |
|--------|-------------------------|----------------------|
| Grid Size | 8x8 (64 cells) | 6x6 (36 cells) |
| Treasure | Gold card (25 pts) | Lore book (6 pts) |
| Entry | East of Treasure Room | End Game area |
| Source | Fortran (DUNGEON) | ZIL |

**We are implementing Mainframe Zork** - using the 8x8 grid with Gold card treasure.

### Source Verification (2025-12-30)

**CONFIRMED** from [Fortran source](https://github.com/videogamepreservation/zork-fortran/blob/master/dmain.for):

```fortran
DATA CPVEC/1,1,1,1,1,1,1,1,
     &1,0,-1,0,0,-1,0,1,
     &1,-1,0,1,0,-2,0,1,
     &1,0,0,0,0,1,0,1,
     &1,-3,0,0,-1,-1,0,1,
     &1,0,0,-1,0,0,0,1,
     &1,1,1,0,0,0,1,1,
     &1,1,1,1,1,1,1,1/
```

This matches our `royal-puzzle.md` spec exactly. The 8x8 grid with -3 at index 33 (gold card) is authoritative.

---

## Canonical Walkthrough (User-Provided)

Entry path (from map-connections.md):
```
Treasure Room → E → Square Room → D → Puzzle Room (entrance) → D → Inside Puzzle
```

Walkthrough from inside puzzle:
```
D, PUSH EAST WALL, S, SW, PUSH SOUTH WALL, E, E, PUSH SOUTH WALL,
N, N, E, PUSH SOUTH WALL, TAKE CARD, PUSH SOUTH WALL, E, NE,
PUSH WEST WALL (x4), NE, NE, N, PUSH EAST WALL, SW, S, SE, NE, N,
PUSH WEST WALL, NW, PUSH SOUTH WALL (x2), W, NW, NW, PUSH SOUTH WALL,
SE (x3), NE, PUSH WEST WALL (x2), SW, PUSH NORTH WALL (x3), NW, U
```

Key observations:
- Uses 8 compass directions + U/D
- Many push operations
- Card is taken mid-puzzle
- Must position ladder to escape

---

## Grid Layout (8x8)

From `docs/work/dungeo/royal-puzzle.md`:

```
     0   1   2   3   4   5   6   7
   +---+---+---+---+---+---+---+---+
 0 | M | M | M | M | M | M | M | M |  Row 0: all marble (boundary)
   +---+---+---+---+---+---+---+---+
 8 | M | @ | S | · | · | S | · | M |  @ = entry (index 9)
   +---+---+---+---+---+---+---+---+
16 | M | S | · | M | · | L | · | M |  L = ladder (index 21)
   +---+---+---+---+---+---+---+---+
24 | M | · | · | · | · | M | · | M |
   +---+---+---+---+---+---+---+---+
32 | M | B | · | · | S | S | · | M |  B = book/card (index 33)
   +---+---+---+---+---+---+---+---+
40 | M | · | · | S | · | · | · | M |
   +---+---+---+---+---+---+---+---+
48 | M | M | M | · | · | · | M | M |
   +---+---+---+---+---+---+---+---+
56 | M | M | M | M | M | M | M | M |  Row 7: all marble (boundary)
   +---+---+---+---+---+---+---+---+

Legend: M=marble(1), S=sandstone(-1), ·=empty(0), L=ladder(-2), B=book/card(-3)
```

Cell values:
- `1` = MARBLE (immovable)
- `0` = EMPTY (walkable)
- `-1` = SANDSTONE (pushable)
- `-2` = LADDER (pushable, needed for exit)
- `-3` = CARD (pushable block with Gold card)

---

## Movement Rules

### Cardinal Movement (N/S/E/W)
```
Direction  Offset  Boundary Check
NORTH      -8      row > 0
SOUTH      +8      row < 7
EAST       +1      col < 7
WEST       -1      col > 0
```

### Diagonal Movement (NE/NW/SE/SW)

**From Fortran source (dverb2.for):** Diagonal allowed if destination is empty AND at least ONE orthogonal path is clear:

```
Condition: (CPVEC(CPHERE+K).EQ.0).OR.(CPVEC(NXT-K).EQ.0)
```

- NE (-7): requires cell[dest]=0 AND (cell[pos+1]=0 OR cell[pos-8]=0)
- NW (-9): requires cell[dest]=0 AND (cell[pos-1]=0 OR cell[pos-8]=0)
- SE (+9): requires cell[dest]=0 AND (cell[pos+1]=0 OR cell[pos+8]=0)
- SW (+7): requires cell[dest]=0 AND (cell[pos-1]=0 OR cell[pos+8]=0)

This is more lenient than requiring BOTH orthogonal paths clear.

---

## Push Wall Mechanics

### Command Syntax
```
PUSH NORTH WALL
PUSH SOUTH WALL
PUSH EAST WALL
PUSH WEST WALL
```

### Algorithm
```typescript
function pushWall(direction: Direction): PushResult {
  const offset = DIRECTION_OFFSETS[direction];
  const target = playerPos + offset;
  const dest = target + offset;

  // Boundary checks
  if (!isValidPosition(target)) return "No wall there";
  if (crossesBoundary(playerPos, direction)) return "No wall there";

  const wallType = grid[target];

  if (wallType === 0) return "The corridor is clear in that direction.";
  if (wallType === 1) return "The marble wall is immovable.";

  // Pushable wall (< 0)
  if (!isValidPosition(dest)) return "There is no room on the other side.";
  if (crossesBoundary(target, direction)) return "There is no room.";
  if (grid[dest] !== 0) return "There is no room on the other side.";

  // Execute push
  grid[dest] = wallType;
  grid[target] = 0;
  playerPos = target;

  return "The ${wallTypeName(wallType)} wall slides forward.";
}
```

---

## Special Interactions

### Entry (Index 9)
- Player enters via "DOWN" from Puzzle Entrance room
- Sets player position to 9

### Exit (Index 9 + Ladder at 10)
- Player at index 9 attempts "UP"
- Check: `grid[10] === -2` (ladder block east of player)
- Success: Player exits puzzle, returns to Puzzle Entrance
- Failure: "There is no way to reach the hole in the ceiling."

### Gold Card (Index 33)
- Block type -3 contains the Gold card treasure
- Adjacent player can "TAKE CARD" from the niche/depression
- After taking: block becomes regular sandstone (-1)
- Worth 25 points (10 take + 15 trophy case)

---

## State Management

```typescript
interface RoyalPuzzleState {
  grid: number[];           // 64-element array
  playerPos: number;        // Current position (0-63)
  cardTaken: boolean;       // Has gold card been taken?
  hasExited: boolean;       // Has player escaped?
  inPuzzle: boolean;        // Is player currently in puzzle?
  pushCount?: number;       // Optional: for messages/scoring
}
```

Store as entity property on a "puzzle-controller" entity or as room state.

---

## Room Descriptions

### Puzzle Entrance (above puzzle)
```
You are standing on a small ledge. Below you is a hole too
small to fit through, but your light illuminates a sandstone
room below. A warning note lies on the ground.
```

### Inside Puzzle - Generic
```
You are in a maze of sandstone walls. Passages lead [directions].
```

Dynamic: list open directions based on adjacent empty cells.

### With Ladder Visible
```
One of the sandstone walls has a wooden ladder attached to it.
```

### At Exit Point (pos 9) with Ladder in Place
```
Above you is the hole in the ceiling. A wooden ladder on the
eastern wall reaches up to it.
```

### Near Gold Card (adjacent to -3 block, card not taken)
```
Set into one wall is a small depression. Within it rests a
gold card, embossed with the royal crest.
```

---

## Implementation Steps

### Phase 1: Infrastructure
1. [ ] Create puzzle state entity type
2. [ ] Create Puzzle Entrance room (east of Treasure Room)
3. [ ] Create "Room in a Puzzle" virtual room
4. [ ] Create Gold card treasure object

### Phase 2: Core Mechanics
5. [ ] Implement PUSH WALL action (story-specific)
6. [ ] Add parser grammar for "PUSH [direction] WALL"
7. [ ] Implement grid-based movement within puzzle
8. [ ] Implement diagonal movement with validation

### Phase 3: Special Cases
9. [ ] Implement entry mechanic (DOWN into puzzle)
10. [ ] Implement exit mechanic (UP with ladder check)
11. [ ] Implement TAKE CARD when adjacent to -3 block
12. [ ] Dynamic room descriptions based on state

### Phase 4: Polish
13. [ ] Add warning note object
14. [ ] ASCII grid visualization (optional LOOK variant)
15. [ ] Test with canonical walkthrough
16. [ ] Save/restore puzzle state correctly

---

## File Structure

```
stories/dungeo/src/
├── regions/royal-puzzle/
│   ├── index.ts                 # Region setup & connections
│   ├── rooms/
│   │   ├── square-room.ts       # E of Treasure Room, D to Puzzle Room
│   │   ├── side-room.ts         # S of Square Room (optional exit?)
│   │   ├── puzzle-room.ts       # Entry room above puzzle (Puzzle Entrance)
│   │   └── room-in-puzzle.ts    # Virtual room inside puzzle
│   ├── objects/
│   │   └── index.ts             # Gold card, warning note
│   └── puzzle-state.ts          # State management
├── actions/
│   └── push-wall/
│       ├── push-wall.ts         # Story-specific action
│       ├── push-wall-events.ts
│       └── push-wall-data.ts
```

**Connection to existing map:**
- Treasure Room (maze region) → E → Square Room (new)
- Square Room → D → Puzzle Room (new) → D → Inside Puzzle

---

## Technical Decisions Needed

### Q1: How to represent "Room in a Puzzle"?
**Options:**
A. Single room with dynamic exits (recomputed each move)
B. 64 virtual rooms (expensive, complex)
C. Single room + puzzle overlay system

**Recommendation:** Option A - single room with state-driven exits. The puzzle is self-contained; we don't need 64 separate room entities.

### Q2: Where does puzzle state live?
**Options:**
A. On the Room in a Puzzle entity as a property
B. On a separate "puzzle-controller" entity
C. In a global/world-level state object

**Recommendation:** Option B - separate controller entity allows clean separation and easier save/restore.

### Q3: How to handle movement inside puzzle?
**Options:**
A. Override GO action with puzzle-specific handler
B. Create separate MOVE action for inside puzzle
C. Use event handlers to intercept movement

**Recommendation:** Option C - event handlers (like Bank puzzle). Check if in puzzle room, handle movement via grid logic instead of normal exits.

---

## Dependencies

- Standard GOING action (intercept with handlers)
- Standard TAKING action (for gold card)
- Parser extension for "PUSH [DIR] WALL"
- Event handler system (ADR-052)

---

## Testing Strategy

### Unit Tests
- Grid initialization
- Movement validation (cardinal + diagonal)
- Push validation and execution
- Exit condition checking

### Integration Tests
- Full walkthrough execution
- Save/restore mid-puzzle
- Taking card updates grid correctly

### Transcript Test
Create `stories/dungeo/tests/transcripts/royal-puzzle.transcript`:
```
> e
Puzzle Entrance

> down
Room in a Puzzle
You are in a maze of sandstone walls...

> push east wall
The sandstone wall slides forward.

... (full walkthrough) ...

> up
Puzzle Entrance
```

---

## References

- `docs/work/dungeo/royal-puzzle.md` - Original specification
- `docs/work/dungeo/bank-puzzle-plan.md` - Similar spatial puzzle implementation
- ZIL Source: https://github.com/historicalsource/zork3
- Fortran Source: CPVEC/CPGOTO routines in nobjs.for, dverb2.for

---

## Research Sources

- [Zork III Part 2 - Digital Antiquarian](https://www.filfre.net/2012/09/zork-iii-part-2/)
- [Zork Wikipedia - Royal Puzzle](https://en.wikipedia.org/wiki/Royal_Puzzle)
- [Gunkies Computer History Wiki - Zork hints](https://gunkies.org/wiki/Zork_hints)
- [GitHub - historicalsource/zork3](https://github.com/historicalsource/zork3)
