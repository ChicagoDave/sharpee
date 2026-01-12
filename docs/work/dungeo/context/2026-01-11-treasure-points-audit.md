# Work Summary: Treasure Points Audit and Fixes

**Date**: 2026-01-11
**Duration**: ~1 hour
**Feature/Area**: Dungeo Story - Treasure Scoring System

## Objective

Update all treasure point values to match the Mainframe Zork FORTRAN source code. The scoring audit revealed many treasures had incorrect values or were missing trophy case bonus points.

## What Was Accomplished

### New Treasure Added

- **Crystal Trident** (4 take + 11 case = 15 pts) - Added to Atlantis Room in `dam.ts`

### Treasures Fixed (20 total)

| Treasure | Old | New | File |
|----------|-----|-----|------|
| Jade Figurine | 5+0 | 5+5 | coal-mine.ts |
| Sapphire Bracelet | 5+0 | 5+3 | coal-mine.ts |
| Trunk of Jewels | 15+0 | 15+8 | dam.ts |
| Platinum Bar | 10+0 | 12+10 | temple.ts |
| Pearl | 15+0 | 9+5 | well-room.ts |
| Gold Coffin | 10+0 | 3+7 | volcano.ts |
| Large Emerald (volcano) | 5+0 | 5+10 | volcano.ts |
| Ivory Torch | 6+0 | 14+6 | underground.ts |
| Pot of Gold | 10+0 | 10+10 | frigid-river.ts |
| Buoy Emerald | 5+0 | 5+10 | frigid-river.ts |
| Portrait | 10+0 | 10+5 | bank-of-zork.ts |
| Zorkmid Bills | 15+0 | 10+15 | bank-of-zork.ts |
| Zorkmid Coin | 5+0 | 10+12 | bank-of-zork.ts |
| Egg | 5+0 | 5+5 | forest.ts |
| Canary | 6+0 | 6+2 | forest.ts |
| Bauble | 2+0 | 1+1 | wind-action.ts |
| Stamp (brochure) | 1+0 | 0+1 | send-action.ts |

### Treasures Already Correct (no changes needed)

- Diamond (10+6) - coal-machine-handler.ts
- Ruby (15+8) - volcano.ts
- Flathead Stamp (4+10) - volcano.ts
- Grail (2+5) - temple.ts
- Bag of Coins (10+5) - maze.ts
- Chalice (10+10) - maze.ts
- White Crystal Sphere (6+6) - well-room.ts
- Red Crystal Sphere (10+5) - coal-mine.ts
- Statue (10+13) - frigid-river.ts
- Painting (4+7) - underground.ts
- Gold Card (10+15) - royal-puzzle.ts

### Dungeo-Specific Treasures (not in FORTRAN)

- Thief's Canvas (10+24) - thiefs-canvas-objects.ts
- Candles (5+0) - temple.ts (no FORTRAN points)
- Silver Chalice (10+0) - well-room.ts

### Transcript Tests

- Created `coffin-trident.transcript` - Tests retrieving coffin and trident treasures
- Deleted `debug-boat.transcript` and `coffin-transport.transcript` (superseded)

## Key Decisions

### 1. Trophy Case Scoring Not Implemented Yet

The `trophyCaseValue` property is now set on all treasures, but the actual bonus points are not awarded when items are placed in the trophy case. This requires a separate handler to listen for `if.event.put_in` events on the trophy case.

**Current behavior**: Only `treasureValue` (take points) are awarded
**Expected behavior**: Both take points AND case points should be awarded

### 2. FORTRAN as Source of Truth

All values were taken from the FORTRAN `dindx.dat` file analysis in `docs/work/dungeo/scoring-audit.md`. The format is OFVAL (take) + OTVAL (case) = total.

### 3. Dungeo-Specific Treasures Unchanged

Items like Thief's Canvas and Candles that aren't in FORTRAN were left as-is since they're intentional additions to this port.

## Files Modified

### Story Code (11 files)
- `stories/dungeo/src/regions/coal-mine.ts` - Jade Figurine, Bracelet
- `stories/dungeo/src/regions/dam.ts` - Trunk, Crystal Trident (new)
- `stories/dungeo/src/regions/temple.ts` - Platinum Bar
- `stories/dungeo/src/regions/well-room.ts` - Pearl
- `stories/dungeo/src/regions/volcano.ts` - Coffin, Emerald
- `stories/dungeo/src/regions/underground.ts` - Torch
- `stories/dungeo/src/regions/frigid-river.ts` - Pot of Gold, Emerald
- `stories/dungeo/src/regions/bank-of-zork.ts` - Portrait, Bills, Coin
- `stories/dungeo/src/regions/forest.ts` - Egg, Canary
- `stories/dungeo/src/actions/wind/wind-action.ts` - Bauble
- `stories/dungeo/src/actions/send/send-action.ts` - Stamp

### Transcript Tests (3 files)
- `stories/dungeo/tests/transcripts/coffin-trident.transcript` - Created
- `stories/dungeo/tests/transcripts/debug-boat.transcript` - Deleted
- `stories/dungeo/tests/transcripts/coffin-transport.transcript` - Deleted

## Remaining Work

### High Priority
1. **Trophy Case Scoring Handler** - Award trophyCaseValue when items placed in case
2. **Missing Treasures**:
   - Stradivarius Violin (10+10 = 20 pts)
   - Crown (15+10 = 25 pts)
   - Saffron/Spices (5+5 = 10 pts)

### Medium Priority
3. **Room Points (RVAL)** - First-visit scoring for 7 rooms (115 pts total)
4. **Light Shaft Bonus (LTSHFT)** - 10 pts for puzzle completion

### Low Priority
5. **Max Score Display** - Victory message shows 716, should be 616

## Test Results

```
coffin-trident.transcript: 19 passed (83ms)
```

## References

- `docs/work/dungeo/scoring-audit.md` - Full FORTRAN vs Dungeo comparison
- `docs/work/dungeo/scoring-fix-plan.md` - Original fix plan
- `docs/dungeon-ref/dindx.dat` - FORTRAN data file
