# Points/Scoring Audit: 1981 MDL vs Our Implementation

**Date**: 2026-01-12
**Status**: ✅ COMPLETE - All scoring implemented (treasures, room entry, LIGHT-SHAFT)

## MDL Scoring Terminology

- **OTVAL** = Object Take VALue (points when first taking the treasure)
- **OFVAL** = Object Final VALue (points when placing in trophy case)
- **RVAL** = Room VALue (points for first entering a room)
- **LIGHT-SHAFT** = Special achievement (10 points)

Our equivalent:
- `treasureValue` = OTVAL
- `trophyCaseValue` = OFVAL

---

## CRITICAL ISSUES FOUND

### 1. Wrong Items Marked as Treasures

| Item | MDL Status | Our Status | Issue |
|------|-----------|------------|-------|
| Candles | NOT a treasure (no OTVAL/OFVAL) | treasureValue=5 | **REMOVE treasure status** |
| Gold Card | Does NOT exist in MDL | treasureValue=10, trophyCaseValue=15 | **REMOVE - wrong item** |
| Golden Chalice | Does NOT exist in MDL | treasureValue=10, trophyCaseValue=10 | **REMOVE - wrong item** |

In MDL:
- CARD is just a warning note about explosives (not a treasure)
- There is only ONE chalice (CHALI = silver chalice)
- Candles are a light source tool, not a treasure

### 2. Missing Treasures

| Treasure | MDL OTVAL | MDL OFVAL | Total | Location in MDL |
|----------|-----------|-----------|-------|-----------------|
| Crown (Lord Dimwit's) | 10 | 15 | 25 | Inside SAFE in Bank |
| Stradivarius (violin) | 10 | 10 | 20 | Inside steel box in Round Room |
| Saffron (tin of spices) | 5 | 5 | 10 | Atlantis Room |

### 3. Values SWAPPED (treasureValue ↔ trophyCaseValue)

These items have the take/case values backwards:

| Treasure | MDL OTVAL | MDL OFVAL | Our Take | Our Case | Fix Needed |
|----------|-----------|-----------|----------|----------|------------|
| Bag of Coins | 5 | 10 | 10 | 5 | Swap |
| Trident | 11 | 4 | 4 | 11 | Swap |
| Coffin | 7 | 3 | 3 | 7 | Swap |
| Grail | 5 | 2 | 2 | 5 | Swap |
| Diamond | 6 | 10 | 10 | 6 | Swap |
| Emerald (large/volcano) | 10 | 5 | 5 | 10 | Swap |
| Painting | 7 | 4 | 4 | 7 | Swap |
| Pearl Necklace | 5 | 9 | 9 | 5 | Swap |
| Platinum Bar | 10 | 12 | 12 | 10 | Swap |
| Zorkmid Coin | 12 | 10 | 10 | 12 | Swap |
| Ruby | 8 | 15 | 15 | 8 | Swap |
| Sapphire Bracelet | 3 | 5 | 5 | 3 | Swap |
| Stamp (volcano) | 10 | 4 | 4 | 10 | Swap |
| Statue | 13 | 10 | 10 | 13 | Swap |
| Ivory Torch | 6 | 14 | 14 | 6 | Swap |
| Trunk of Jewels | 8 | 15 | 15 | 8 | Swap |
| Cancelled Stamp | 1 | 0 | 0 | 1 | Swap |
| Stack of Bills | 15 | 10 | 10 | 15 | Swap |
| Portrait | 5 | 10 | 10 | 5 | Swap |
| Canary | 2 | 6 | 6 | 2 | Swap |
| Crystal Ball (palantir) | 5 | 10 | 10 | 5 | Swap (3 instances) |

### 4. Missing trophyCaseValue

| Treasure | MDL OTVAL | MDL OFVAL | Our Take | Our Case | Issue |
|----------|-----------|-----------|----------|----------|-------|
| Silver Chalice | 10 | 10 | 10 | (missing) | Add trophyCaseValue=10 |

---

## Complete Treasure Comparison

| Treasure | MDL OTVAL | MDL OFVAL | MDL Total | Our Take | Our Case | Our Total | Status |
|----------|-----------|-----------|-----------|----------|----------|-----------|--------|
| Bag of Coins | 5 | 10 | 15 | 10 | 5 | 15 | **SWAP** |
| Silver Chalice | 10 | 10 | 20 | 10 | - | 10 | **ADD CASE** |
| Crown | 10 | 15 | 25 | - | - | - | **MISSING** |
| Crystal Sphere | 6 | 6 | 12 | 6 | 6 | 12 | OK |
| Trident | 11 | 4 | 15 | 4 | 11 | 15 | **SWAP** |
| Stradivarius | 10 | 10 | 20 | - | - | - | **MISSING** |
| Coffin | 7 | 3 | 10 | 3 | 7 | 10 | **SWAP** |
| Grail | 5 | 2 | 7 | 2 | 5 | 7 | **SWAP** |
| Diamond | 6 | 10 | 16 | 10 | 6 | 16 | **SWAP** |
| Jade Figurine | 5 | 5 | 10 | 5 | 5 | 10 | OK |
| Large Emerald | 10 | 5 | 15 | 5 | 10 | 15 | **SWAP** |
| Painting | 7 | 4 | 11 | 4 | 7 | 11 | **SWAP** |
| Pearl Necklace | 5 | 9 | 14 | 9 | 5 | 14 | **SWAP** |
| Platinum Bar | 10 | 12 | 22 | 12 | 10 | 22 | **SWAP** |
| Pot of Gold | 10 | 10 | 20 | 10 | 10 | 20 | OK |
| Zorkmid Coin | 12 | 10 | 22 | 10 | 12 | 22 | **SWAP** |
| Ruby | 8 | 15 | 23 | 15 | 8 | 23 | **SWAP** |
| Sapphire Bracelet | 3 | 5 | 8 | 5 | 3 | 8 | **SWAP** |
| Stamp (volcano) | 10 | 4 | 14 | 4 | 10 | 14 | **SWAP** |
| Statue | 13 | 10 | 23 | 10 | 13 | 23 | **SWAP** |
| Saffron | 5 | 5 | 10 | - | - | - | **MISSING** |
| Ivory Torch | 6 | 14 | 20 | 14 | 6 | 20 | **SWAP** |
| Trunk of Jewels | 8 | 15 | 23 | 15 | 8 | 23 | **SWAP** |
| Cancelled Stamp | 1 | 0 | 1 | 0 | 1 | 1 | **SWAP** |
| Stack of Bills | 15 | 10 | 25 | 10 | 15 | 25 | **SWAP** |
| Portrait | 5 | 10 | 15 | 10 | 5 | 15 | **SWAP** |
| Egg | 5 | 5 | 10 | 5 | 5 | 10 | OK |
| Bauble | 1 | 1 | 2 | 1 | 1 | 2 | OK |
| Canary | 2 | 6 | 8 | 6 | 2 | 8 | **SWAP** |
| Crystal Ball x3 | 5 | 10 | 15 | 10 | 5 | 15 | **SWAP** |
| Buoy Emerald | 10 | 5 | 15 | 5 | 10 | 15 | **SWAP** |
| Thief's Canvas | ? | ? | ? | 10 | 24 | 34 | **VERIFY** |

---

## Room Entry Points (RVAL)

Points awarded for first entering certain rooms (NOT IMPLEMENTED):

| Room Code | Room Name | RVAL |
|-----------|-----------|------|
| KITCH | Kitchen | 10 |
| CELLA | Cellar | 25 |
| BLROO | Balloon Room | 10 |
| TREAS | Trophy Room | 25 |
| PASS1 | Narrow Passage | 5 |
| LLD2 | Land of Living Dead | 30 |
| TWELL | Temple Well | 10 |
| INMIR | Inside Mirror | 15 |
| CRYPT | Crypt | 5 |
| TSTRS | Torch Room Stairs | 10 |
| BDOOR | Behind Dungeon Door | 20 |
| FDOOR | Front Door (endgame) | 15 |
| NIRVA | Nirvana | 35 |

**Total RVAL points**: 215 points

---

## Special Scoring

| Achievement | Points | Implemented? |
|-------------|--------|--------------|
| LIGHT-SHAFT | 10 | ✅ YES (event handler in onEngineReady) |
| Death penalty | -10 per death | ? |

---

## Items to REMOVE as Treasures

1. **Candles** - Not a treasure in MDL, just a light source
2. **Gold Card** - Does not exist in MDL, CARD is just a warning note
3. **Golden Chalice** - Does not exist in MDL, only silver chalice exists

---

## Fix Summary

### Files to Modify

1. **stories/dungeo/src/regions/maze.ts**
   - bag-of-coins: Swap values (5/10 not 10/5)
   - Remove "golden chalice" treasure (doesn't exist in MDL)

2. **stories/dungeo/src/regions/temple.ts**
   - candles: Remove treasure properties entirely
   - grail: Swap values (5/2 not 2/5)
   - platinum bar: Swap values (10/12 not 12/10)

3. **stories/dungeo/src/regions/dam.ts**
   - trunk: Swap values (8/15 not 15/8)
   - trident: Swap values (11/4 not 4/11)

4. **stories/dungeo/src/regions/underground.ts**
   - painting: Swap values (7/4 not 4/7)
   - torch: Swap values (6/14 not 14/6)
   - sphere: Swap values (5/10 not 10/5)

5. **stories/dungeo/src/regions/volcano.ts**
   - coffin: Swap values (7/3 not 3/7)
   - emerald: Swap values (10/5 not 5/10)
   - ruby: Swap values (8/15 not 15/8)
   - stamp: Swap values (10/4 not 4/10)

6. **stories/dungeo/src/regions/coal-mine.ts**
   - bracelet: Swap values (3/5 not 5/3)
   - sphere: Swap values (5/10 not 10/5)

7. **stories/dungeo/src/regions/frigid-river.ts**
   - emerald: Swap values (10/5 not 5/10)
   - statue: Swap values (13/10 not 10/13)

8. **stories/dungeo/src/regions/well-room.ts**
   - chalice: Add missing trophyCaseValue=10
   - pearl: Swap values (5/9 not 9/5)
   - sphere: Swap values (5/10 not 10/5)

9. **stories/dungeo/src/regions/bank-of-zork.ts**
   - portrait: Swap values (5/10 not 10/5)
   - bills: Swap values (15/10 not 10/15)
   - coin: Swap values (12/10 not 10/12)

10. **stories/dungeo/src/regions/forest.ts**
    - canary: Swap values (2/6 not 6/2)

11. **stories/dungeo/src/regions/royal-puzzle.ts**
    - Remove gold-card treasure entirely (doesn't exist in MDL)

12. **stories/dungeo/src/actions/send/send-action.ts**
    - cancelled stamp: Swap values (1/0 not 0/1)

13. **stories/dungeo/src/handlers/coal-machine-handler.ts**
    - diamond: Swap values (6/10 not 10/6)

14. **stories/dungeo/src/actions/turn-switch/turn-switch-action.ts**
    - diamond: Swap values (6/10 not 10/6)

### New Treasures to Add

1. **Crown** (Lord Dimwit Flathead's) - OTVAL=10, OFVAL=15
   - Location: Inside safe in Bank
   - Need to create safe container first

2. **Stradivarius** (violin) - OTVAL=10, OFVAL=10
   - Location: Inside steel box in Round Room
   - Need to create steel box container first

3. **Saffron** (tin of spices) - OTVAL=5, OFVAL=5
   - Location: Atlantis Room

---

## Max Score Calculation

### MDL Treasure Points Total

Based on MDL source:
- Sum of all OTVAL: ~220 points
- Sum of all OFVAL: ~220 points
- Total treasure points: ~440 points

### MDL Room Entry Points

- Total RVAL: 215 points

### MDL Special Points

- LIGHT-SHAFT: 10 points

### Expected Max Score

~440 + 215 + 10 = ~665 points (non-endgame)

Our config shows `maxScore: 616` which needs verification.

---

## Next Steps

1. ✅ Fix all SWAPPED treasure values (commit e360b34)
2. ✅ Remove wrong treasure items (candles, gold card, golden chalice) (commit ca192b8)
3. ✅ Add missing treasures (crown, violin, saffron) (commit ca192b8)
4. ✅ Implement room entry scoring (RVAL) - 215 points (commit e360b34)
5. ✅ Implement LIGHT-SHAFT achievement - 10 points (2026-01-12)
6. ❓ Verify death penalty implementation
7. ✅ Max score verified: 616 main + 34 thief bonus + 100 endgame = 750 total
