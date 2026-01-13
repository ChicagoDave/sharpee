# Mazes Audit: 1981 MDL vs Sharpee Implementation

**Date**: 2026-01-12
**Status**: ✅ FIXED (2026-01-12)
**Sources**:
- 1981 MDL: `docs/dungeon-81/mdlzork_810722/original_source/dung.355`
- Sharpee: `stories/dungeo/src/regions/maze.ts`, `stories/dungeo/src/regions/coal-mine.ts`

## Summary

Both mazes had significant discrepancies from the 1981 MDL source. **All issues have been fixed.**

### Fixes Applied:
1. **Twisty Maze** (`maze.ts`): Complete rewrite of `connectMazeRooms()` to match 1981 MDL
2. **Dead End 5 removed**: Only 4 dead ends in original (DEAD1-4)
3. **Objects moved**: Skeleton, coins, key, knife moved from Dead End 1 to Maze 5
4. **Rusty knife added**: Was missing from original implementation
5. **Self-loops added**: 5 intentional navigation traps restored
6. **Coal Mine Maze** (`coal-mine.ts`): Fixed all 7 mine room connections
7. **Ladder Top**: Fixed UP connection to MINE7 (was incorrectly pointing to MINE6)

---

## 1. Twisty Little Passages Maze ("all alike")

### 1981 MDL Source (Canonical)

```
MAZE1:  W→MTROL(Troll), N→MAZE1(loop), S→MAZE2, E→MAZE4
MAZE2:  S→MAZE1, N→MAZE4, E→MAZE3
MAZE3:  W→MAZE2, N→MAZE4, UP→MAZE5
MAZE4:  W→MAZE3, N→MAZE1, E→DEAD1
MAZE5:  E→DEAD2, N→MAZE3, SW→MAZE6  [contains: skeleton, coins, keys, knife]
MAZE6:  DOWN→MAZE5, E→MAZE7, W→MAZE6(loop), UP→MAZE9
MAZE7:  UP→MAZ14, W→MAZE6, NE→DEAD1, E→MAZE8, S→MAZ15
MAZE8:  NE→MAZE7, W→MAZE8(loop), SE→DEAD3
MAZE9:  N→MAZE6, E→MAZ11, DOWN→MAZ10, S→MAZ13, W→MAZ12, NW→MAZE9(loop)
MAZ10:  E→MAZE9, W→MAZ13, UP→MAZ11
MAZ11:  NE→MGRAT, DOWN→MAZ10, NW→MAZ13, SW→MAZ12
MAZ12:  W→MAZE5, SW→MAZ11, E→MAZ13, UP→MAZE9, N→DEAD4
MAZ13:  E→MAZE9, DOWN→MAZ12, S→MAZ10, W→MAZ11

MAZ14:  W→MAZ15, NW→MAZ14(loop), NE→MAZE7, S→MAZE7
MAZ15:  W→MAZ14, S→MAZE7, NE→CYCLO

DEAD1:  S→MAZE4
DEAD2:  W→MAZE5
DEAD3:  N→MAZE8
DEAD4:  S→MAZ12

MGRAT (Grating Room): SW→MAZ11, UP→CLEAR(grating)
CYCLO (Cyclops Room): W→MAZ15, N→BLROO(conditional), UP→TREAS(conditional)
```

**Key features:**
- 4 dead ends (DEAD1-4)
- 3 self-loops (MAZE1→N, MAZE6→W, MAZE8→W, MAZE9→NW, MAZ14→NW)
- Entry from Troll Room (W from MAZE1)
- Exit to Cyclops Room (NE from MAZ15)
- Grating Room connects to MAZ11

### Current Sharpee Implementation

```
MAZE1:  E→maze2, S→maze3 [external: W→Troll, NE→RoundRoom]
MAZE2:  N→maze1, W→maze4, E→deadEnd1
MAZE3:  S→maze1, N→maze2, E→maze4
MAZE4:  N→maze2, W→maze3, UP→maze15
MAZE5:  NE→deadEnd3, SE→deadEnd4
MAZE6:  D→maze15, E→maze7, UP→maze11
MAZE7:  W→maze6
MAZE8:  S→deadEnd3, W→maze9
MAZE9:  S→deadEnd3, W→maze8, NE→cyclopsRoom
MAZE10: N→deadEnd5, UP→maze11, W→maze15
MAZE11: N→maze6, E→maze12, W→maze10, S→maze14, D→maze13
MAZE12: NW→maze14, D→maze13, NE→gratingRoom
MAZE13: E→maze11, UP→maze12, W→maze14
MAZE14: E→maze11, S→maze13, W→maze12, D→maze10
MAZE15: N→maze4, SW→maze6, E→deadEnd3

DEAD END 1: S→maze2
DEAD END 2: S→deadEnd1
DEAD END 3: W→maze15, NE→deadEnd2, E→maze5, S→maze9, UP→maze8
DEAD END 4: N→maze5
DEAD END 5: S→maze10

GRATING ROOM: SW→maze12
CYCLOPS ROOM: SW→maze9, UP→treasureRoom
```

### Discrepancies

| Room | 1981 MDL | Sharpee | Status |
|------|----------|---------|--------|
| MAZE1 | N→MAZE1, S→MAZE2, E→MAZE4 | E→maze2, S→maze3 | ❌ WRONG - missing loop, wrong E |
| MAZE2 | S→MAZE1, N→MAZE4, E→MAZE3 | N→maze1, W→maze4, E→deadEnd1 | ❌ WRONG - directions swapped |
| MAZE3 | W→MAZE2, N→MAZE4, UP→MAZE5 | S→maze1, N→maze2, E→maze4 | ❌ WRONG - completely different |
| MAZE4 | W→MAZE3, N→MAZE1, E→DEAD1 | N→maze2, W→maze3, UP→maze15 | ❌ WRONG - missing E→DEAD1 |
| MAZE5 | E→DEAD2, N→MAZE3, SW→MAZE6 | NE→deadEnd3, SE→deadEnd4 | ❌ WRONG - completely different |
| MAZE6 | DOWN→MAZE5, E→MAZE7, W→MAZE6, UP→MAZE9 | D→maze15, E→maze7, UP→maze11 | ❌ WRONG - missing loop |
| MAZE7 | UP→MAZ14, W→MAZE6, NE→DEAD1, E→MAZE8, S→MAZ15 | W→maze6 | ❌ WRONG - missing 4 exits |
| MAZE8 | NE→MAZE7, W→MAZE8, SE→DEAD3 | S→deadEnd3, W→maze9 | ❌ WRONG - missing loop |
| MAZE9 | N→MAZE6, E→MAZ11, DOWN→MAZ10, S→MAZ13, W→MAZ12, NW→MAZE9 | S→deadEnd3, W→maze8, NE→cyclopsRoom | ❌ WRONG - completely different |
| MAZ10-15 | (see above) | (see above) | ❌ All WRONG |
| DEAD ENDS | 4 dead ends | 5 dead ends | ❌ WRONG count |

**Verdict: Twisty maze is almost entirely incorrect and needs complete rewrite.**

---

## 2. Coal Mine Maze ("non-descript part of a coal mine")

### 1981 MDL Source (Canonical)

```
MINE1:  N→MINE4, SW→MINE2, E→TUNNE
MINE2:  S→MINE1, W→MINE5, UP→MINE3, NE→MINE4
MINE3:  W→MINE2, NE→MINE5, E→MINE5
MINE4:  UP→MINE5, NE→MINE6, S→MINE1, W→MINE2
MINE5:  DOWN→MINE6, N→MINE7, W→MINE2, S→MINE3, UP→MINE3, E→MINE4
MINE6:  SE→MINE4, UP→MINE5, NW→MINE7
MINE7:  E→MINE1, W→MINE5, DOWN→TLADD, S→MINE6
```

### Current Sharpee Implementation

```
MINE1:  E→woodenTunnel, N→mineMaze4, SW→mineMaze2
MINE2:  S→mineMaze1, W→mineMaze5, UP→mineMaze3
MINE3:  W→mineMaze2, NE→mineMaze5, E→mineMaze5
MINE4:  S→mineMaze1, NE→mineMaze7, UP→mineMaze5
MINE5:  W→mineMaze2, NE→mineMaze3, S→mineMaze3, DOWN→mineMaze7, N→mineMaze6, E→mineMaze4
MINE6:  W→mineMaze5, S→mineMaze7, DOWN→ladderTop, E→mineMaze1
MINE7:  UP→mineMaze5, SE→mineMaze4, NW→mineMaze6
```

### Discrepancies

| Room | 1981 MDL | Sharpee | Status |
|------|----------|---------|--------|
| MINE1 | N→MINE4, SW→MINE2, E→TUNNE | E→tunnel, N→mine4, SW→mine2 | ✅ OK |
| MINE2 | S→MINE1, W→MINE5, UP→MINE3, NE→MINE4 | S→mine1, W→mine5, UP→mine3 | ⚠️ Missing NE→MINE4 |
| MINE3 | W→MINE2, NE→MINE5, E→MINE5 | W→mine2, NE→mine5, E→mine5 | ✅ OK |
| MINE4 | UP→MINE5, NE→MINE6, S→MINE1, W→MINE2 | S→mine1, NE→mine7, UP→mine5 | ⚠️ NE wrong (MINE7 not MINE6), missing W→MINE2 |
| MINE5 | DOWN→MINE6, N→MINE7, W→MINE2, S→MINE3, UP→MINE3, E→MINE4 | W→mine2, NE→mine3, S→mine3, DOWN→mine7, N→mine6, E→mine4 | ⚠️ DOWN wrong (mine7 not mine6), N wrong (mine6 not mine7), NE should be UP |
| MINE6 | SE→MINE4, UP→MINE5, NW→MINE7 | W→mine5, S→mine7, DOWN→ladderTop, E→mine1 | ❌ WRONG - all exits different |
| MINE7 | E→MINE1, W→MINE5, DOWN→TLADD, S→MINE6 | UP→mine5, SE→mine4, NW→mine6 | ❌ WRONG - all exits different |

**Verdict: Coal mine maze has several errors, especially MINE4-7.**

---

## 3. Objects in Maze

### 1981 MDL Source - MAZE5 Objects

From dung.355 line 1844:
```
MAZE5 contains: BONES, BAGCO (bag of coins), KEYS, BLANT (rusty knife)
```

### Current Sharpee - Dead End 1 Objects

```typescript
// In Dead End 1: skeleton, bag of coins, skeleton key, incense
```

**Discrepancy**: Objects should be in MAZE5, not Dead End 1.

---

## 4. Recommendations

### Priority 1: Fix Twisty Maze (High Impact)

The twisty maze needs a complete rewrite. Replace `connectMazeRooms()` in `maze.ts` with the canonical 1981 MDL connections.

### Priority 2: Fix Coal Mine Maze (Medium Impact)

Fix the connection errors in MINE2, MINE4, MINE5, MINE6, MINE7.

### Priority 3: Move Maze Objects (Low Impact)

Move skeleton, bag of coins, and key from Dead End 1 to MAZE5.

### Priority 4: Add Missing Self-Loops

The 1981 maze has 5 self-loops that confuse players:
- MAZE1 N→MAZE1
- MAZE6 W→MAZE6
- MAZE8 W→MAZE8
- MAZE9 NW→MAZE9
- MAZ14 NW→MAZ14

These are intentional navigation traps and must be preserved.

---

## 5. Corrected Connection Tables

### Twisty Maze (1981 MDL Canonical)

```typescript
// MAZE1: W→MTROL(external), N→MAZE1, S→MAZE2, E→MAZE4
setExits(maze1, {
  [Direction.NORTH]: roomIds.maze1,  // self-loop!
  [Direction.SOUTH]: roomIds.maze2,
  [Direction.EAST]: roomIds.maze4,
});

// MAZE2: S→MAZE1, N→MAZE4, E→MAZE3
setExits(maze2, {
  [Direction.SOUTH]: roomIds.maze1,
  [Direction.NORTH]: roomIds.maze4,
  [Direction.EAST]: roomIds.maze3,
});

// MAZE3: W→MAZE2, N→MAZE4, UP→MAZE5
setExits(maze3, {
  [Direction.WEST]: roomIds.maze2,
  [Direction.NORTH]: roomIds.maze4,
  [Direction.UP]: roomIds.maze5,
});

// MAZE4: W→MAZE3, N→MAZE1, E→DEAD1
setExits(maze4, {
  [Direction.WEST]: roomIds.maze3,
  [Direction.NORTH]: roomIds.maze1,
  [Direction.EAST]: roomIds.deadEnd1,
});

// MAZE5: E→DEAD2, N→MAZE3, SW→MAZE6 [objects here!]
setExits(maze5, {
  [Direction.EAST]: roomIds.deadEnd2,
  [Direction.NORTH]: roomIds.maze3,
  [Direction.SOUTHWEST]: roomIds.maze6,
});

// MAZE6: DOWN→MAZE5, E→MAZE7, W→MAZE6, UP→MAZE9
setExits(maze6, {
  [Direction.DOWN]: roomIds.maze5,
  [Direction.EAST]: roomIds.maze7,
  [Direction.WEST]: roomIds.maze6,  // self-loop!
  [Direction.UP]: roomIds.maze9,
});

// MAZE7: UP→MAZ14, W→MAZE6, NE→DEAD1, E→MAZE8, S→MAZ15
setExits(maze7, {
  [Direction.UP]: roomIds.maze14,
  [Direction.WEST]: roomIds.maze6,
  [Direction.NORTHEAST]: roomIds.deadEnd1,
  [Direction.EAST]: roomIds.maze8,
  [Direction.SOUTH]: roomIds.maze15,
});

// MAZE8: NE→MAZE7, W→MAZE8, SE→DEAD3
setExits(maze8, {
  [Direction.NORTHEAST]: roomIds.maze7,
  [Direction.WEST]: roomIds.maze8,  // self-loop!
  [Direction.SOUTHEAST]: roomIds.deadEnd3,
});

// MAZE9: N→MAZE6, E→MAZ11, DOWN→MAZ10, S→MAZ13, W→MAZ12, NW→MAZE9
setExits(maze9, {
  [Direction.NORTH]: roomIds.maze6,
  [Direction.EAST]: roomIds.maze11,
  [Direction.DOWN]: roomIds.maze10,
  [Direction.SOUTH]: roomIds.maze13,
  [Direction.WEST]: roomIds.maze12,
  [Direction.NORTHWEST]: roomIds.maze9,  // self-loop!
});

// MAZ10: E→MAZE9, W→MAZ13, UP→MAZ11
setExits(maze10, {
  [Direction.EAST]: roomIds.maze9,
  [Direction.WEST]: roomIds.maze13,
  [Direction.UP]: roomIds.maze11,
});

// MAZ11: NE→MGRAT, DOWN→MAZ10, NW→MAZ13, SW→MAZ12
setExits(maze11, {
  [Direction.NORTHEAST]: roomIds.gratingRoom,
  [Direction.DOWN]: roomIds.maze10,
  [Direction.NORTHWEST]: roomIds.maze13,
  [Direction.SOUTHWEST]: roomIds.maze12,
});

// MAZ12: W→MAZE5, SW→MAZ11, E→MAZ13, UP→MAZE9, N→DEAD4
setExits(maze12, {
  [Direction.WEST]: roomIds.maze5,
  [Direction.SOUTHWEST]: roomIds.maze11,
  [Direction.EAST]: roomIds.maze13,
  [Direction.UP]: roomIds.maze9,
  [Direction.NORTH]: roomIds.deadEnd4,
});

// MAZ13: E→MAZE9, DOWN→MAZ12, S→MAZ10, W→MAZ11
setExits(maze13, {
  [Direction.EAST]: roomIds.maze9,
  [Direction.DOWN]: roomIds.maze12,
  [Direction.SOUTH]: roomIds.maze10,
  [Direction.WEST]: roomIds.maze11,
});

// MAZ14: W→MAZ15, NW→MAZ14, NE→MAZE7, S→MAZE7
setExits(maze14, {
  [Direction.WEST]: roomIds.maze15,
  [Direction.NORTHWEST]: roomIds.maze14,  // self-loop!
  [Direction.NORTHEAST]: roomIds.maze7,
  [Direction.SOUTH]: roomIds.maze7,
});

// MAZ15: W→MAZ14, S→MAZE7, NE→CYCLO
setExits(maze15, {
  [Direction.WEST]: roomIds.maze14,
  [Direction.SOUTH]: roomIds.maze7,
  [Direction.NORTHEAST]: roomIds.cyclopsRoom,
});

// DEAD1: S→MAZE4
setExits(deadEnd1, { [Direction.SOUTH]: roomIds.maze4 });

// DEAD2: W→MAZE5
setExits(deadEnd2, { [Direction.WEST]: roomIds.maze5 });

// DEAD3: N→MAZE8
setExits(deadEnd3, { [Direction.NORTH]: roomIds.maze8 });

// DEAD4: S→MAZ12
setExits(deadEnd4, { [Direction.SOUTH]: roomIds.maze12 });

// GRATING ROOM: SW→MAZ11
setExits(gratingRoom, { [Direction.SOUTHWEST]: roomIds.maze11 });

// CYCLOPS ROOM: W→MAZ15 (external UP and N are conditional)
setExits(cyclopsRoom, { [Direction.WEST]: roomIds.maze15 });
```

### Coal Mine Maze (1981 MDL Canonical)

```typescript
// MINE1: N→MINE4, SW→MINE2, E→TUNNE
setExits(mineMaze1, {
  [Direction.NORTH]: roomIds.mineMaze4,
  [Direction.SOUTHWEST]: roomIds.mineMaze2,
  [Direction.EAST]: roomIds.woodenTunnel,
});

// MINE2: S→MINE1, W→MINE5, UP→MINE3, NE→MINE4
setExits(mineMaze2, {
  [Direction.SOUTH]: roomIds.mineMaze1,
  [Direction.WEST]: roomIds.mineMaze5,
  [Direction.UP]: roomIds.mineMaze3,
  [Direction.NORTHEAST]: roomIds.mineMaze4,  // MISSING in current
});

// MINE3: W→MINE2, NE→MINE5, E→MINE5
setExits(mineMaze3, {
  [Direction.WEST]: roomIds.mineMaze2,
  [Direction.NORTHEAST]: roomIds.mineMaze5,
  [Direction.EAST]: roomIds.mineMaze5,
});

// MINE4: UP→MINE5, NE→MINE6, S→MINE1, W→MINE2
setExits(mineMaze4, {
  [Direction.UP]: roomIds.mineMaze5,
  [Direction.NORTHEAST]: roomIds.mineMaze6,  // Currently wrong (mine7)
  [Direction.SOUTH]: roomIds.mineMaze1,
  [Direction.WEST]: roomIds.mineMaze2,  // MISSING in current
});

// MINE5: DOWN→MINE6, N→MINE7, W→MINE2, S→MINE3, UP→MINE3, E→MINE4
setExits(mineMaze5, {
  [Direction.DOWN]: roomIds.mineMaze6,  // Currently wrong (mine7)
  [Direction.NORTH]: roomIds.mineMaze7,  // Currently wrong (mine6)
  [Direction.WEST]: roomIds.mineMaze2,
  [Direction.SOUTH]: roomIds.mineMaze3,
  [Direction.UP]: roomIds.mineMaze3,  // Currently NE
  [Direction.EAST]: roomIds.mineMaze4,
});

// MINE6: SE→MINE4, UP→MINE5, NW→MINE7
setExits(mineMaze6, {
  [Direction.SOUTHEAST]: roomIds.mineMaze4,
  [Direction.UP]: roomIds.mineMaze5,
  [Direction.NORTHWEST]: roomIds.mineMaze7,
});

// MINE7: E→MINE1, W→MINE5, DOWN→TLADD, S→MINE6
setExits(mineMaze7, {
  [Direction.EAST]: roomIds.mineMaze1,
  [Direction.WEST]: roomIds.mineMaze5,
  [Direction.DOWN]: roomIds.ladderTop,
  [Direction.SOUTH]: roomIds.mineMaze6,
});
```

---

## 6. Note on "All Different" Maze

The 1981 MDL source has only ONE maze type: "twisty little passages, all alike."

There is **no "all different" maze** in the 1981 mainframe Zork. This was likely added in later versions (Infocom Zork I or the FORTRAN port).

If the current Sharpee implementation has an "all different" maze, it's not authentic to the 1981 source and should be reviewed.
