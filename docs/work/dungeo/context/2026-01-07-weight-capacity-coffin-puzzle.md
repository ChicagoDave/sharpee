# Work Summary: Weight/Capacity Research & Coffin Puzzle

**Date**: 2026-01-07
**Branch**: dungeo

## Summary

Researched the Fortran source code (dindx.dat) to understand object weights and player carrying capacity for the coffin puzzle. Created a parser script and discovered that no weight system implementation is needed - the coffin puzzle works out of the box with existing dam mechanics.

## Key Findings

### Weight System (from Fortran dindx.dat)

- **Player max load (MXLOAD)**: 100 units
- **Coffin weight**: 10 units (only 10% of capacity - very portable!)
- **Sceptre weight**: 10 units
- **Non-portable objects**: weight = 10000 (scenery/fixed)

Created `docs/work/dungeo/weights-capacities.md` with full reference of all object weights, capacities, and treasure values.

### Coffin Puzzle

The puzzle requires:
1. Drain dam (turn bolt) → unblock reservoir exits
2. Navigate to Egyptian Room → take coffin
3. Return to Living Room → put in trophy case

No special weight mechanics needed - coffin is easily portable.

### PRAY Action Discovery

Discovered the current PRAY action incorrectly implements "Basin Room" logic (ghost ritual). Per Fortran source (`sverbs.for` line 10000):
- PRAY at TEMP2 (Altar) should teleport player + inventory to FORE1 (Forest)
- Elsewhere: show joke message (rspeak 340)

The Basin Room / incense / blessing mechanic appears to be incorrect or from a different game.

## Files Changed

### New Files
- `stories/dungeo/tests/transcripts/coffin-puzzle.transcript` - 16 tests verifying coffin can be taken and stored
- `docs/work/dungeo/weights-capacities.md` - Reference doc with all object weights/capacities
- `docs/dungeon-ref/parse-dindx.js` - Parser for Fortran data file

### Modified Files
- `docs/work/dungeo/implementation-plan.md` - Updated coffin puzzle status, PRAY action status, priority next steps

## Test Results

```
Total: 777 tests in 48 transcripts
772 passed, 5 expected failures
✓ All tests passed!
```

The new coffin-puzzle.transcript passes all 16 assertions:
- Coffin is portable (can be taken)
- Sceptre inside coffin can be taken
- Both items can be put in trophy case
- Score correctly shows 14 points (coffin 10 + sceptre 4)

## Next Steps

1. **PRAY action fix**: Implement Altar→Forest teleportation instead of Basin Room logic
2. The coffin puzzle is functionally complete via GDT navigation; full walkthrough would require PRAY teleportation shortcut

## Technical Notes

### Fortran Data Format

The `dindx.dat` file contains ASCII integers in 6-character fields:
- Header: version, scores
- Room data: RLNT + 5 arrays of RMAX(200) elements
- Exit data: XLNT + TRAVEL array of XMAX(900) elements
- Object data: OLNT + 14 arrays of OMAX(220) elements including OSIZE (weight) and OCAPAC (capacity)

### Parser Location

The parser script is at `docs/dungeon-ref/parse-dindx.js` and outputs markdown format when run with `node parse-dindx.js`.
