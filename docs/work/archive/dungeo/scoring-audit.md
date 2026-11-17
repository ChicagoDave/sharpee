# Dungeo Scoring Audit

## Summary

Comparing Mainframe Zork (FORTRAN) scoring with Dungeo implementation.

**FORTRAN Source**: `docs/dungeon-ref/dindx.dat` decoded values
**Dungeo Source**: `stories/dungeo/src/**/*.ts` treasure definitions

## Score Breakdown

| Category | FORTRAN | Dungeo | Status |
|----------|---------|--------|--------|
| MXSCOR (main game) | 616 | 716? | ❌ Dungeo shows 716 in victory message |
| EGMXSC (endgame) | 100 | 100 | ✅ Match |
| Main RVAL (rooms) | 115 | TBD | ❌ Not implemented |
| Main OFVAL (take) | 260 | ~230 | ❌ Missing points |
| Main OTVAL (case) | 231 | ~100 | ❌ Many missing |
| LTSHFT | 10 | 0 | ❌ Not implemented |

## Complete Treasure List (FORTRAN)

All treasures identified from dindx.dat with descriptions from dtext.dat:

| ID | Name | OFVAL | OTVAL | TOTAL | Dungeo Status |
|----|------|-------|-------|-------|---------------|
| 6 | **Jade Figurine** | 5 | 5 | 10 | ✅ coal-mine: 5+0=5 |
| 8 | Diamond | 10 | 6 | 16 | ✅ coal-machine: 10+6=16 |
| 25 | Bag of Coins | 10 | 5 | 15 | ⚠️ maze: 10+5=15 |
| 26 | Platinum Bar | 12 | 10 | 22 | ❌ temple: 10+0=10 |
| 27 | **Pearl Necklace** | 9 | 5 | 14 | ⚠️ well: 15+0=15 |
| 31 | **Ruby** | 15 | 8 | 23 | ✅ volcano: 15+8=23 |
| 32 | **Crystal Trident** | 4 | 11 | 15 | ❓ Not found |
| 33 | Gold Coffin | 3 | 7 | 10 | ⚠️ volcano: 10+0=10 |
| 34 | Torch | 14 | 6 | 20 | ❌ underground: 6+0=6 |
| 37 | **Sapphire Bracelet** | 5 | 3 | 8 | ⚠️ coal-mine: 5+0=5 |
| 40 | Stradivarius (violin) | 10 | 10 | 20 | ❓ Not found |
| 43 | **Grail** | 2 | 5 | 7 | ✅ temple: 2+5=7 |
| 45 | Trunk (jewels) | 15 | 8 | 23 | ❌ dam: 15+0=15 |
| 59 | Chalice | 10 | 10 | 20 | ✅ maze: 10+10=20 |
| 60 | **Painting** | 4 | 7 | 11 | ✅ underground: 4+7=11 |
| 85 | Pot of Gold | 10 | 10 | 20 | ❌ frigid: 10+0=10 |
| 86 | Statue | 10 | 13 | 23 | ✅ frigid: 10+13=23 |
| 95 | **Large Emerald** | 5 | 10 | 15 | ⚠️ frigid: 5+0=5 |
| 104 | Zorkmid Coin | 10 | 12 | 22 | ❌ bank: 5+0=5 |
| 108 | **Crown** | 15 | 10 | 25 | ❓ Not found |
| 118 | **Stamp (volcano)** | 4 | 10 | 14 | ⚠️ volcano: 4+10=14 |
| 126 | White Crystal Sphere | 6 | 6 | 12 | ✅ well: 6+6=12 |
| 134 | Saffron (spices) | 5 | 5 | 10 | ❓ Not found |
| 148 | Pile of Bills | 10 | 15 | 25 | ❌ bank: 15+0=15 |
| 149 | Portrait | 10 | 5 | 15 | ❌ bank: 10+0=10 |
| 154 | Egg | 5 | 5 | 10 | ⚠️ forest: 5+0=5 |
| 156 | Bauble | 1 | 1 | 2 | ✅ wind-action: 2+0=2 |
| 157 | Canary | 6 | 2 | 8 | ❌ forest: 6+0=6 |
| 188 | Gold Card | 15 | 10 | 25 | ✅ royal-puzzle: 10+15=25 |
| 196 | Stamp (brochure) | 0 | 1 | 1 | ⚠️ send-action: 1+0=1 |
| 206 | Blue Crystal Sphere | 10 | 5 | 15 | ✅ coal-mine: 10+5=15 |
| 209 | Red Crystal Sphere | 10 | 5 | 15 | ❓ Endgame? Not found |

**FORTRAN Totals: OFVAL=260, OTVAL=231, Combined=491**

### Legend
- ✅ Correct or close
- ⚠️ Total matches but split differently
- ❌ Missing significant points
- ❓ Not found in Dungeo

## Missing Treasures in Dungeo

1. **Crystal Trident** (15 pts) - Not implemented
2. **Stradivarius Violin** (20 pts) - Not implemented
3. **Crown** (25 pts) - Not implemented
4. **Saffron/Spices** (10 pts) - Not implemented
5. **Red Crystal Sphere** (15 pts) - Endgame item, not implemented

**Total missing: 85 points in treasures alone**

## Point Discrepancies

### Treasures with Wrong Values

| Treasure | FORTRAN | Dungeo | Diff |
|----------|---------|--------|------|
| Platinum Bar | 22 | 10 | -12 |
| Torch | 20 | 6 | -14 |
| Trunk | 23 | 15 | -8 |
| Pot of Gold | 20 | 10 | -10 |
| Zorkmid Coin | 22 | 5 | -17 |
| Pile of Bills | 25 | 15 | -10 |
| Portrait | 15 | 10 | -5 |
| Canary | 8 | 6 | -2 |
| Emerald | 15 | 5 | -10 |

**Total discrepancy: -88 points**

### Treasures Missing Trophy Case Bonus

Many Dungeo treasures have `treasureValue` but no `trophyCaseValue`:
- Coffin (missing 7 pts)
- Jade Figurine (missing 5 pts)
- Pearl Necklace (missing 5 pts)
- Bracelet (missing 3 pts)
- Egg (missing 5 pts)
- etc.

## Room Values (RVAL) - Not Implemented in Dungeo

Main game rooms with first-visit points:

| Room ID | Name | Points | Dungeo |
|---------|------|--------|--------|
| 1 | West of House | 5 | ❌ |
| 6 | Kitchen | 10 | ❌ |
| 9 | Cellar | 25 | ❌ |
| 94 | Land of Living Dead | 30 | ❌ |
| 102 | Back of Living Room | 10 | ❌ |
| 103 | Thief's Treasury | 25 | ❌ |
| 142 | Top of Well | 10 | ❌ |
| **Total** | | **115** | **0** |

## LTSHFT (Light Shaft) - Not Implemented

10 points for completing the light shaft puzzle (rooms.for:210).

## Endgame Room Values (EGMXSC=100)

| Room ID | Name | Points | Dungeo |
|---------|------|--------|--------|
| 157 | Crypt | 5 | ❌ |
| 158 | Top of Stairs | 10 | ❌ |
| 166 | Front Door | 15 | ❌ |
| 177 | Inside Mirror | 15 | ❌ |
| 178 | South Corridor | 20 | ⚠️ awardsPointsOnEntry=20 |
| 187 | Treasury | 35 | ⚠️ awardsPointsOnEntry=35 |
| **Total** | | **100** | **~55** |

## Summary of Issues

1. **Max Score Wrong**: Dungeo shows 716 but FORTRAN MXSCOR=616
2. **Missing Treasures**: 5 treasures not implemented (85 pts)
3. **Wrong Values**: Many treasures have incorrect point values (-88 pts)
4. **Missing Trophy Case Bonus**: Most treasures lack OTVAL (~80 pts)
5. **No Room Points**: RVAL system not implemented (115 pts main, 45 pts endgame)
6. **No LTSHFT**: Light shaft bonus not implemented (10 pts)

## Recommended Fixes

### Priority 1: Correct Treasure Values
Add `trophyCaseValue` to all treasures that have OTVAL in FORTRAN.

### Priority 2: Add Missing Treasures
- Crystal Trident (15 pts)
- Stradivarius Violin (20 pts)
- Crown (25 pts)
- Saffron/Spices (10 pts)

### Priority 3: Implement Room Points
Add RVAL system to award points on first room visit.

### Priority 4: Fix Max Score Display
Change victory message from 716 to 616.
