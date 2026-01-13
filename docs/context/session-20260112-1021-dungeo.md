# Work Summary: Maze Topology Audit and Complete Fix

**Date**: 2026-01-12
**Time**: 10:21 AM
**Branch**: dungeo
**Duration**: ~3 hours
**Feature/Area**: Maze topology, Coal Mine maze, Transcript validation

## Objective

Audit and fix maze topology in Project Dungeo by comparing against the canonical 1981 MDL source code, ensuring accurate maze connections, self-loops, dead ends, and object placement.

## What Was Accomplished

### 1. Fetched 1981 MDL Source Code

**Repository Setup:**
- Cloned `heasm66/mdlzork` repository into `docs/dungeon-81/`
- Renamed existing `docs/dungeon-ref/` to `docs/dungeon-94/` (FORTRAN version)
- Identified `mdlzork_810722` as the canonical final July 1981 mainframe Zork

**Key Discovery:**
The "all different" maze does NOT exist in 1981 mainframe Zork - only the "twisty maze all alike" exists. This is a critical reference point for topology validation.

### 2. Maze Audit and Analysis

**Created Documentation:**
- `docs/work/dungeo/mazes-audit.md` - Comprehensive comparison of 1981 MDL vs. our implementation

**Audit Findings:**

**Twisty Maze (15 rooms + 4 dead ends):**
- Missing 5 self-loops (rooms that exit to themselves)
- Incorrect connections throughout
- Wrong objects placement (items in Dead End 1 should be in Maze 5)
- Extra Dead End 5 (should only be 4 dead ends)
- Missing rusty knife object
- Cyclops Room exit was SW→MAZE9 (should be W→MAZ15)

**Coal Mine Maze (7 rooms):**
- All connections were incorrect
- Ladder top exit was UP→MINE6 (should be UP→MINE7)

### 3. Fixed Twisty Maze Implementation

**File Modified:** `stories/dungeo/src/regions/maze.ts`

**Changes:**
1. Complete rewrite of `connectMazeRooms()` with correct 1981 MDL connections
2. Added 5 self-loops:
   - MAZE1 N→MAZE1
   - MAZE6 W→MAZE6
   - MAZE8 W→MAZE8
   - MAZE9 NW→MAZE9
   - MAZ14 NW→MAZ14
3. Reduced dead ends from 5 to 4 (removed Dead End 5)
4. Moved objects from Dead End 1 to Maze 5:
   - Skeleton key
   - Skeleton
   - Pile of coins
5. Added rusty knife to Maze 5 (was missing entirely)
6. Fixed Cyclops Room exit: W→MAZ15 (was SW→MAZE9)

**Key Code Pattern:**
```typescript
// Self-loop example
maze1.setExit(Direction.NORTH, maze1.id);

// Correct connections from 1981 MDL
maze1.setExit(Direction.SOUTH, maze2.id);
maze1.setExit(Direction.EAST, maze3.id);
maze2.setExit(Direction.SOUTH, maze5.id);
maze2.setExit(Direction.EAST, maze11.id);
// ... (complete topology rewrite)
```

### 4. Fixed Coal Mine Maze Implementation

**File Modified:** `stories/dungeo/src/regions/coal-mine.ts`

**Changes:**
1. Fixed all 7 mine maze room connections per 1981 MDL
2. Fixed ladder top exit: UP→MINE7 (was incorrectly UP→MINE6)

**Connection Pattern:**
```typescript
mine1.setExit(Direction.WEST, mine2.id);
mine1.setExit(Direction.SOUTH, mine3.id);
mine2.setExit(Direction.SOUTH, mine4.id);
mine2.setExit(Direction.DOWN, mine5.id);
mine3.setExit(Direction.WEST, mine4.id);
mine3.setExit(Direction.UP, mine6.id);
mine4.setExit(Direction.UP, mine7.id);
mine5.setExit(Direction.WEST, mine6.id);
mine5.setExit(Direction.DOWN, mine3.id);
mine6.setExit(Direction.WEST, mine7.id);
mine7.setExit(Direction.UP, ladderTop.id);
```

### 5. Updated Maze Transcripts

**File:** `stories/dungeo/tests/transcripts/maze-loops.transcript`
- Complete rewrite to test all 5 self-loops
- Tests all 4 dead ends (removed Dead End 5 tests)
- **50/50 tests pass**

**File:** `stories/dungeo/tests/transcripts/maze-navigation.transcript`
- Updated all navigation paths per 1981 MDL topology
- **40/40 tests pass**

**File:** `stories/dungeo/tests/transcripts/wt-03-maze-cyclops-goal.transcript`
- Updated to get items from Maze 5 (not Dead End 1)
- Updated path to Cyclops Room with correct exits
- **28/28 tests pass**

### 6. Updated Documentation

**File:** `docs/work/dungeo/mazes-audit.md`
- Marked status as FIXED
- Documented all corrections made

**File:** `docs/work/dungeo/parser-regression.md`
- Updated pass rate to 94%
- Updated test counts for maze transcripts

## Test Results

### Individual Transcripts
- `maze-loops.transcript`: **50/50 pass** ✓
- `maze-navigation.transcript`: **40/40 pass** ✓
- `wt-03-maze-cyclops-goal.transcript`: **28/28 pass** ✓

### Chained Walkthrough
```bash
./scripts/fast-transcript-test.sh --chain \
  stories/dungeo/tests/transcripts/wt-01-get-torch-early.transcript \
  stories/dungeo/tests/transcripts/wt-02-bank-puzzle.transcript \
  stories/dungeo/tests/transcripts/wt-03-maze-cyclops-goal.transcript
```
**Result:** 87/87 pass (43+16+28) ✓

## Key Technical Decisions

### 1. Used 1981 MDL as Canonical Reference

**Decision:** Use `mdlzork_810722` (July 1981) as the authoritative source for maze topology.

**Rationale:**
- This is the final version of mainframe Zork before commercial Zork I
- More faithful to the original design than 1994 FORTRAN port
- No "all different" maze in 1981 version (clarifies implementation scope)

### 2. Complete Topology Rewrite vs. Incremental Fixes

**Decision:** Complete rewrite of `connectMazeRooms()` instead of incremental patches.

**Rationale:**
- Too many errors to fix incrementally
- Cleaner to match 1981 MDL structure exactly
- Reduces risk of missing connections
- Easier to verify against source

### 3. Self-Loops Are Intentional Design

**Decision:** Implement all 5 self-loops as specified in 1981 MDL.

**Rationale:**
- Part of the maze's difficulty/confusion
- Matches original game behavior
- Players expect this from mainframe Zork

### 4. Moved Objects to Maze 5

**Decision:** Move skeleton, key, and coins from Dead End 1 to Maze 5.

**Rationale:**
- Matches 1981 MDL source exactly
- Makes objects accessible without entering dead end
- Consistent with original game design

## Challenges & Solutions

### Challenge: Discrepancies Between 1981 MDL and 1994 FORTRAN

**Problem:** The 1994 FORTRAN port we were using had different maze topology than 1981 MDL.

**Solution:**
- Cloned original MDL source repository
- Used 1981 version as canonical reference
- Documented the differences in `mazes-audit.md`

### Challenge: Self-Loops Not Working in Engine

**Problem:** Initially unsure if engine supported rooms exiting to themselves.

**Solution:**
- Tested with simple self-loop pattern: `room.setExit(Direction.NORTH, room.id)`
- Engine handled it correctly - no changes needed
- Added comprehensive self-loop tests to `maze-loops.transcript`

### Challenge: Transcript Test Failures After Topology Changes

**Problem:** All maze transcripts failed after fixing topology.

**Solution:**
- Systematically walked through maze with `--play` mode
- Mapped actual connections vs. expected connections
- Updated transcripts to match corrected topology
- Verified all paths lead to expected destinations

## Code Quality

- ✓ All maze transcripts passing (90 tests total)
- ✓ Chained walkthrough wt-01→wt-03 passing (87 tests)
- ✓ TypeScript compilation successful
- ✓ No linting errors
- ✓ Topology verified against 1981 MDL source

## Files Created/Modified

### Created
- `docs/dungeon-81/` - 1981 MDL source code repository
- `docs/work/dungeo/mazes-audit.md` - Maze topology audit and findings

### Modified
- `stories/dungeo/src/regions/maze.ts` - Complete maze topology rewrite
- `stories/dungeo/src/regions/coal-mine.ts` - Fixed all mine connections
- `stories/dungeo/tests/transcripts/maze-loops.transcript` - 50 self-loop/dead-end tests
- `stories/dungeo/tests/transcripts/maze-navigation.transcript` - 40 navigation tests
- `stories/dungeo/tests/transcripts/wt-03-maze-cyclops-goal.transcript` - 28 walkthrough tests
- `docs/work/dungeo/parser-regression.md` - Updated pass rates and test counts

### Renamed
- `docs/dungeon-ref/` → `docs/dungeon-94/` - Clarified as FORTRAN version

## Statistics

**Test Coverage:**
- Maze transcripts: 90 tests (50 + 40)
- Walkthrough chain: 87 tests (43 + 16 + 28)
- Overall pass rate: 94% (251/267 tests passing)

**Topology Corrections:**
- Twisty maze: 19 rooms (15 maze + 4 dead ends) - all connections fixed
- Coal mine: 7 rooms - all connections fixed
- Self-loops: 5 added (MAZE1, MAZE6, MAZE8, MAZE9, MAZ14)
- Objects relocated: 3 (skeleton, key, coins) from Dead End 1 to Maze 5
- Objects added: 1 (rusty knife in Maze 5)

## Next Steps

1. **Coal Mine Transcripts**
   - Create transcripts for coal mine maze navigation
   - Test ladder climbing between Mine 7 and Ladder Top
   - Verify bucket/rope mechanics if implemented

2. **Remaining Failing Transcripts**
   - `egg-canary.transcript` - Canary and egg mechanics
   - `throw-torch-glacier.transcript` - Glacier melting puzzle
   - `endgame-laser-puzzle.transcript` - Mirror alignment endgame

3. **Comprehensive Walkthrough**
   - Create wt-04 for treasures/points after Cyclops
   - Create wt-05 for coal mine region
   - Create wt-06 for endgame sequence

4. **Source Verification**
   - Continue auditing other regions against 1981 MDL
   - Document any other discrepancies found
   - Update implementation to match original where appropriate

## References

- **1981 MDL Source**: `docs/dungeon-81/mdlzork/mdlzork_810722/`
- **1994 FORTRAN Source**: `docs/dungeon-94/`
- **Audit Document**: `docs/work/dungeo/mazes-audit.md`
- **ADR-073**: Transcript Testing
- **World Map**: `docs/work/dungeo/world-map.md`

## Notes

**Important Discovery:** The "all different" maze that appears in some Zork documentation does NOT exist in the 1981 mainframe version. Only the "twisty maze all alike" is present. This clarifies scope and prevents wasted effort implementing a non-canonical maze.

**Testing Methodology:** The `--chain` flag for transcript-tester was critical for verifying the walkthrough sequence. This allows testing multi-stage puzzles where game state must persist between transcripts (e.g., getting the torch, solving the bank puzzle, then using them in the maze).

**Build Performance:** Using `./scripts/fast-transcript-test.sh` with bundled `sharpee.js` made iteration much faster than rebuilding all packages. This was essential for the many test iterations required during maze topology fixes.
