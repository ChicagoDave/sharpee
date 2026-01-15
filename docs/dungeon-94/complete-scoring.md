# Mainframe Zork Complete Scoring Reference

**Total Maximum Score: 616 points (main game) + 100 points (endgame separate)**

## Scoring Components

| Component | Points | Description |
|-----------|--------|-------------|
| OFVAL | 260 | Points for first-time acquisition of treasures |
| OTVAL | 231 | Bonus points for putting treasures in trophy case |
| RVAL | 115 | Points for visiting special rooms |
| LTSHFT | 10 | Light shaft puzzle bonus |
| **Main Total** | **616** | |
| Endgame RVAL | 100 | Points for endgame room exploration (separate score) |

## Complete Treasure List

All 32 treasures from dindx.dat:

| ID | Object | OFVAL | OTVAL | Total | Location |
|----|--------|-------|-------|-------|----------|
| 6 | Jade Figurine | 5 | 5 | 10 | Coal Mine |
| 8 | Diamond | 10 | 6 | 16 | Machine (from coal) |
| 25 | Bag of Coins | 10 | 5 | 15 | Maze |
| 26 | Platinum Bar | 12 | 10 | 22 | Loud Room |
| 27 | Pearl Necklace | 9 | 5 | 14 | ? |
| 31 | Ruby | 15 | 8 | 23 | Torch Room |
| 32 | Crystal Trident | 4 | 11 | 15 | Atlantis Room |
| 33 | Gold Coffin | 3 | 7 | 10 | Egyptian Room |
| 34 | Torch | 14 | 6 | 20 | Torch Room |
| 37 | Sapphire Bracelet | 5 | 3 | 8 | Gas Room |
| 40 | Stradivarius (violin) | 10 | 10 | 20 | ? |
| 43 | Grail | 2 | 5 | 7 | Temple |
| 45 | Trunk (jewels) | 15 | 8 | 23 | Reservoir |
| 59 | Chalice | 10 | 10 | 20 | Treasure Room (thief) |
| 60 | Painting | 4 | 7 | 11 | Gallery |
| 85 | Pot of Gold | 10 | 10 | 20 | End of Rainbow |
| 86 | Statue | 10 | 13 | 23 | Sandy Beach (buried) |
| 95 | Large Emerald | 5 | 10 | 15 | Buoy |
| 104 | Zorkmid Coin | 10 | 12 | 22 | Viewing Room |
| 108 | Crown | 15 | 10 | 25 | ? |
| 118 | Stamp (volcano) | 4 | 10 | 14 | Brochure |
| 126 | White Crystal Sphere | 6 | 6 | 12 | Atlantis Room |
| 134 | Saffron (spices) | 5 | 5 | 10 | ? |
| 148 | Pile of Bills | 10 | 15 | 25 | Safety Deposit |
| 149 | Portrait | 10 | 5 | 15 | Bank Chairman's Office |
| 154 | Egg | 5 | 5 | 10 | Bird's Nest (tree) |
| 156 | Bauble | 1 | 1 | 2 | Inside Egg |
| 157 | Canary | 6 | 2 | 8 | Inside Egg |
| 188 | Gold Card | 15 | 10 | 25 | Royal Puzzle |
| 196 | Stamp (brochure) | 0 | 1 | 1 | Brochure |
| 206 | Blue Crystal Sphere (palantir) | 10 | 5 | 15 | Palantir Room |
| 209 | Red Crystal Sphere | 10 | 5 | 15 | Endgame |

**OFVAL Total: 260 | OTVAL Total: 231 | Combined: 491**

### Dynamic Treasures

Some treasures have values that can change:

- **Egg (154)**: Worth OFVAL=5 + OTVAL=5 intact
  - If opened wrong: BROKEN_EGG (155) gets OTVAL=2
- **Canary (157)**: Worth OFVAL=6 + OTVAL=2 intact
  - If damaged: BROKEN_CANARY (158) gets OTVAL=1
- **Stradivarius (40)**: Worth OFVAL=10 + OTVAL=10 intact
  - If attacked with weapon: OTVAL becomes 0

## Room Values (RVAL)

Points awarded for first visit to special rooms:

### Main Game (115 points)

| Room ID | Location | Points |
|---------|----------|--------|
| 1 | West of House | 5 |
| 6 | Kitchen | 10 |
| 9 | Cellar | 25 |
| 94 | Land of Living Dead | 30 |
| 102 | Back of Living Room | 10 |
| 103 | Thief's Treasury | 25 |
| 142 | Top of Well | 10 |
| **Total** | | **115** |

### Endgame (100 points - separate EGSCOR)

| Room ID | Location | Points |
|---------|----------|--------|
| 157 | Crypt | 5 |
| 158 | Top of Stairs | 10 |
| 166 | Front Door | 15 |
| 177 | Inside Mirror | 15 |
| 178 | South Corridor | 20 |
| 187 | Narrow Corridor/Treasury | 35 |
| **Total** | | **100** |

## Special Scoring Events

- **LTSHFT (10 points)**: Awarded in rooms.for line 210 when completing the light shaft puzzle
- **Death penalty (-10 points)**: Charged at each death (subr.for line 220)

## How Scoring Works

1. **RWSCOR** (Raw Score): Accumulates from:
   - RVAL when entering rooms for first time
   - OFVAL when taking treasures
   - LTSHFT from light shaft puzzle

2. **ASCORE** (Actual Score): RWSCOR + OTVAL for items in trophy case

3. Trophy case re-evaluated after TAKE and PUT commands:
```fortran
ASCORE(WINNER)=RWSCOR           ! start with raw score
DO I=1,OLNT
  IF object is in trophy case:
    ASCORE(WINNER)=ASCORE(WINNER)+OTVAL(I)
```

4. **EGSCOR** (Endgame Score): Separate score for endgame rooms, max 100

## Verification

- MXSCOR = 616 = OFVAL(260) + OTVAL(231) + RVAL(115) + LTSHFT(10) ✓
- EGMXSC = 100 = Endgame RVAL ✓

## Object ID to Name Mapping

From DPARAM.FOR parameter definitions and DTEXT.DAT descriptions:

| ID | Constant | Description |
|----|----------|-------------|
| 6 | (implicit) | Jade Figurine |
| 8 | DIAMO | Diamond |
| 25 | BAGCO | Bag of Coins |
| 26 | BAR | Platinum Bar |
| 27 | (implicit) | Pearl Necklace |
| 31 | (implicit) | Ruby |
| 32 | (implicit) | Crystal Trident |
| 33 | COFFI | Gold Coffin |
| 34 | TORCH | Torch |
| 37 | (implicit) | Sapphire Bracelet |
| 40 | STRAD | Stradivarius |
| 43 | (implicit) | Grail |
| 45 | TRUNK | Trunk (of jewels) |
| 59 | CHALI | Chalice |
| 60 | (implicit) | Painting |
| 85 | POT | Pot of Gold |
| 86 | STATU | Statue |
| 95 | (implicit) | Large Emerald |
| 104 | ZORKM | Zorkmid Coin |
| 108 | (implicit) | Crown |
| 118 | (implicit) | Stamp |
| 126 | SPHER | White Crystal Sphere |
| 134 | SAFFR | Saffron (spices) |
| 148 | BILLS | Pile of Bills |
| 149 | PORTR | Portrait |
| 154 | EGG | Egg |
| 156 | BAUBL | Bauble |
| 157 | CANAR | Canary |
| 188 | GCARD | Gold Card |
| 196 | STAMP | Stamp (on brochure) |
| 206 | PALAN | Blue Crystal Sphere |
| 209 | PAL3 | Red Crystal Sphere |
