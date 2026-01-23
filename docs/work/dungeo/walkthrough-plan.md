# Dungeo Full Walkthrough Plan

## Key Constraints

### Light Sources
| Source | Turns | Notes |
|--------|-------|-------|
| Brass lantern | 330 | Main light, battery limited |
| Ivory torch | Unlimited | DESTROYED when thrown at glacier |
| Candles | 50 | Exorcism only |

### Critical Dependencies
- **Troll**: Must kill to access maze and areas east
- **Dam**: Must drain to get trunk, affects reservoir/river
- **Cyclops**: Say "Odysseus" to open passage to Treasure Room
- **Exorcism**: Bell/book/candle ritual at Entry to Hades
- **Rainbow**: Wave sceptre at Aragain Falls
- **Gas Room**: LAMP ONLY - no fire allowed (bracelet)
- **Glacier**: Throw lit torch to melt (destroys torch, opens volcano)
- **Thief**: Must kill for canvas puzzle; opens egg if given time
- **Royal Puzzle**: Sliding block puzzle for gold card
- **Endgame**: 15 turns in dark in Crypt triggers entry

### Optimal Light Management
1. Use lantern ONLY to get to torch (~30 turns)
2. Use torch for ALL underground exploration
3. Switch to lantern for Gas Room visit (~40 turns)
4. Throw torch at glacier LAST
5. Use remaining lantern (~260 turns) for volcano

---

## Phase 0: Surface (No Light Needed)

**Goal**: Collect surface items, prepare for underground

```
# Start: West of House
open mailbox
take leaflet
read leaflet
north
east                        # Behind House
open window
enter window               # Kitchen
take sack
take bottle
west                       # Living Room
take lantern
take sword
up                         # Attic
take rope
take knife
down
move rug                   # Reveals trapdoor
open trapdoor
# Don't go down yet - get egg first
west                       # Kitchen
climb chimney              # Gallery? Or exit window
# Actually, exit normally and get egg
east                       # Behind House via window exit
```

**Actually, better route:**
```
# Start: West of House
open mailbox, take leaflet
north, east, west          # Through house to Living Room via window
take lantern, sword
up                         # Attic
take rope, take knife
down
move rug, open trapdoor
# Now get egg from tree
north                      # Kitchen
up                         # Chimney to Studio? Or out window...
```

Need to verify chimney route. For now, assume standard navigation.

---

## Phase 1: Get Torch (~30 lantern turns)

**Goal**: Minimize lantern use, get unlimited torch ASAP

```
# From Living Room
down                       # Cellar
turn on lantern
# Kill troll
east                       # Troll Room
kill troll with sword      # Combat (multiple turns)
# Once troll is dead...
east                       # East-West Passage
south                      # Round Room
# Navigate to Dome Room
se                         # Winding Passage
east                       # Cave
ne                         # Dome Room
tie rope to railing
down                       # Torch Room
take torch
turn on torch
turn off lantern           # SAVE BATTERY!
```

---

## Phase 2: Temple & Exorcism (Torch)

```
# From Torch Room
west                       # Tiny Room (key puzzle area)
# Skip for now, come back
east, up                   # Back to Dome Room
# Navigate to Temple area
west                       # Narrow Corridor
south                      # Temple
south                      # Altar
take bell
take book
take candles
north, north               # Temple → Narrow Corridor
east                       # Egyptian Room
take coffin
open coffin
take sceptre
west                       # Back to Narrow Corridor
# Navigate to Entry to Hades
south, south               # Temple → Altar
south                      # Entry to Hades
# Exorcism ritual
ring bell
light candles              # Need matchbook! Get from Dam first
```

**PROBLEM**: Need matchbook from Dam Lobby to light candles. Reorder:
- Do Dam area first
- Then exorcism

---

## Revised Phase Order

1. Surface collection
2. Get torch (Cellar → Dome → Torch Room)
3. Dam area (get matchbook, drain dam, get boat)
4. Exorcism (with matchbook)
5. Temple treasures
6. River & rainbow
7. Maze & Cyclops
8. Well & Tea Room
9. Bank
10. Royal Puzzle
11. Coal Mine (use lantern for Gas Room)
12. Canvas puzzle
13. Glacier & Volcano (throw torch, use lantern)
14. Trophy case deposits
15. Mail order stamp / canary bauble
16. Endgame

---

## Walkthrough Transcript Segments

Organized by light source to maximize torch usage before glacier destruction.

### Phase A: Torch-Based Exploration (wt-01 through wt-11)

| Segment | File | Status | Description | Treasures |
|---------|------|--------|-------------|-----------|
| wt-01 | wt-01-get-torch-early.transcript | ✅ Done | Get lantern, kill troll, get torch | Torch (20) |
| wt-02 | wt-02-bank-puzzle.transcript | ✅ Done | Bank of Zork wall-walking puzzle | Portrait (15), Bills (25) |
| wt-03 | wt-03-maze-cyclops-goal.transcript | ✅ Done | Navigate maze, say Odysseus | Coins (15), Chalice (20) |
| wt-04 | wt-04-dam-reservoir.transcript | ✅ Done | Dam puzzle, get matchbook & boat | Trunk (23) |
| wt-05 | wt-05-egyptian-room.transcript | ✅ Done | Temple area, coffin & sceptre | Coffin (10) |
| wt-06 | wt-06-exorcism.transcript | ✅ Done | Bell/book/candle ritual at Hades | — |
| wt-07 | wt-07-river-rainbow.transcript | 🚧 Next | Boat ride, emerald, wave sceptre | Emerald (15), Pot of gold (20) |
| wt-08 | wt-08-well-tea-room.transcript | ⬜ Todo | Bucket puzzle, cakes, pearl | Pearl (14), Spices (10) |
| wt-09 | wt-09-royal-puzzle.transcript | ⬜ Todo | Sliding block puzzle | Gold card (25) |
| wt-10 | wt-10-canvas-puzzle.transcript | ⬜ Todo | Kill thief, ghost ritual | Canvas (34), Canary (8), Bauble (2) |
| wt-11 | wt-11-coal-mine.transcript | ⬜ Todo | Coal → diamond (skip Gas Room) | Diamond (16), Red sphere (15) |

### Phase B: Lantern for Gas Room (wt-12)

| Segment | File | Status | Description | Treasures |
|---------|------|--------|-------------|-----------|
| wt-12 | wt-12-gas-room.transcript | ⬜ Todo | Gas Room only - NO FIRE | Bracelet (8) |

### Phase C: Glacier & Volcano (wt-13, wt-14)

| Segment | File | Status | Description | Treasures |
|---------|------|--------|-------------|-----------|
| wt-13 | wt-13-glacier.transcript | ⬜ Todo | Throw torch to melt glacier | — |
| wt-14 | wt-14-volcano.transcript | ⬜ Todo | Balloon ride, volcano treasures | Crown (25), Ruby (23), Stamps (14), Coin (22) |

### Phase D: Cleanup & Endgame (wt-15, wt-16)

| Segment | File | Status | Description | Treasures |
|---------|------|--------|-------------|-----------|
| wt-15 | wt-15-trophy-cleanup.transcript | ⬜ Todo | Deposit all treasures, final score | — |
| wt-16 | wt-16-endgame.transcript | ⬜ Todo | Crypt ritual, mirror puzzle, trivia | — |

### Progress Summary

- **Completed**: wt-01 through wt-06 (6 transcripts, 165 tests)
- **Next**: wt-07 (River & Rainbow)
- **Remaining**: wt-07 through wt-16 (10 transcripts)

---

## Treasure Checklist (33 items, 650 points)

| # | Treasure | Location | Points | Notes |
|---|----------|----------|--------|-------|
| 1 | Jeweled egg | Up a Tree | 10 | Contains canary |
| 2 | Clockwork canary | Inside egg | 8 | Thief opens egg |
| 3 | Painting | Gallery | 11 | |
| 4 | Bag of coins | Maze dead end | 15 | |
| 5 | Pearl necklace | Pearl Room | 14 | |
| 6 | Tin of spices | Pool Room | 10 | |
| 7 | White crystal sphere | Dingy Closet | 12 | |
| 8 | Fancy violin | Round Room | 20 | In box |
| 9 | Grail | Grail Room | 7 | |
| 10 | Platinum bar | Loud Room | 22 | Say "echo" |
| 11 | Crystal trident | Atlantis | 15 | |
| 12 | Jade figurine | Bat Room | 10 | Need garlic |
| 13 | Statue | Sandy Beach | 23 | Dig 4 times |
| 14 | Large emerald | Buoy | 15 | In river |
| 15 | Pot of gold | End of Rainbow | 20 | Wave sceptre |
| 16 | Chalice | Treasure Room | 20 | After Cyclops |
| 17 | Trunk of jewels | Reservoir | 23 | Drain dam |
| 18 | Blue crystal sphere | Dreary Room | 15 | Key puzzle |
| 19 | Huge diamond | Machine Room | 16 | Coal→diamond |
| 20 | Sapphire bracelet | Gas Room | 8 | LAMP ONLY |
| 21 | Red crystal sphere | Sooty Room | 15 | |
| 22 | Gold coffin | Egyptian Room | 10 | Contains sceptre |
| 23 | Portrait | Chairman's Office | 15 | Bank puzzle |
| 24 | Zorkmid bills | Vault | 25 | Bank puzzle |
| 25 | Gold card | Royal Puzzle | 25 | Sliding blocks |
| 26 | Ivory torch | Torch Room | 20 | Also light source |
| 27 | Crown | Dusty Room | 25 | Volcano/balloon |
| 28 | Flathead stamp | Library | 14 | Volcano |
| 29 | Zorkmid coin | Narrow Ledge | 22 | Volcano |
| 30 | Ruby | Ruby Room | 23 | Volcano |
| 31 | Don Woods stamp | Brochure | 1 | Mail order |
| 32 | Brass bauble | Forest | 2 | Wind canary |
| 33 | Thief's canvas | Gallery | 34 | Kill thief, ritual |

**Total: 650 points**

---

## Notes

- Thief wanders and steals items - may need to kill and recover from Treasure Room
- Weight limit: Player can carry 100 weight
- Some treasures are heavy: coffin(10), chalice(40), trunk(heavy), platinum bar(20)
- Need multiple trips to trophy case
