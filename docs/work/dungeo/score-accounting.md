# Dungeo Score Accounting

**Current score after 9 walkthroughs**: 281/616
**Date**: 2026-02-09

---

## Treasure Points (33 treasures = 525 pts total)

### Collected (14 taken, 12 cased) = 216 pts earned

| Treasure | Take | Case | Status | Walkthrough |
|----------|------|------|--------|-------------|
| Ivory torch | 14 | 6 | Taken only (kept as light) | wt-01 |
| Painting | 4 | 7 | Taken + cased | wt-01 |
| Portrait | 10 | 5 | Taken + cased | wt-02 |
| Zorkmid bills | 10 | 15 | Taken + cased | wt-02 |
| Platinum bar | 12 | 10 | Taken + cased | wt-04 |
| Gold coffin | 3 | 7 | Taken + cased | wt-05 |
| Large emerald | 5 | 10 | Taken + cased | wt-07 |
| Statue | 10 | 13 | Taken + cased | wt-07 |
| Pot of gold | 10 | 10 | Taken + cased | wt-07 |
| Jeweled egg | 5 | 5 | Taken + cased | wt-08 |
| Trunk of jewels | 15 | 8 | Taken only (kept in inv) | wt-04 |
| Pearl necklace | 9 | 5 | Taken + cased | wt-09 |
| Tin of spices | 5 | 5 | Taken + cased | wt-09 |
| White crystal sphere | 6 | 6 | Taken + cased | wt-09 |
| **Subtotal** | **118** | **98** | **= 216** | |

**Note**: Trunk (8 case pts) and torch (6 case pts) are not yet in the trophy case = 14 pts recoverable.

### Not Collected (19 treasures) = 309 pts remaining

| Treasure | Take | Case | Total | Region |
|----------|------|------|-------|--------|
| Bag of coins | 10 | 5 | 15 | Maze |
| Clockwork canary | 6 | 2 | 8 | Inside egg (thief opens) |
| Fancy violin | 10 | 10 | 20 | Round Room |
| Grail | 2 | 5 | 7 | Grail Room |
| Crystal trident | 4 | 11 | 15 | Atlantis |
| Jade figurine | 5 | 5 | 10 | Bat Room |
| Chalice | 10 | 10 | 20 | Treasure Room |
| Blue crystal sphere | 10 | 5 | 15 | Dreary Room |
| Huge diamond | 10 | 6 | 16 | Coal Mine machine |
| Sapphire bracelet | 5 | 3 | 8 | Gas Room |
| Red crystal sphere | 10 | 5 | 15 | Sooty Room |
| Zorkmid coin | 10 | 12 | 22 | Volcano ledge |
| Crown | 15 | 10 | 25 | Volcano |
| Flathead stamp | 4 | 10 | 14 | Volcano library |
| Ruby | 15 | 8 | 23 | Volcano |
| Don Woods stamp | 0 | 1 | 1 | Mail order |
| Brass bauble | 1 | 1 | 2 | Forest (canary) |
| Thief's canvas | 10 | 24 | 34 | Ghost ritual |
| Gold card | 10 | 15 | 25 | Royal Puzzle |
| **Subtotal** | **147** | **162** | **309** | |

---

## Room Visit Points (13 rooms = 215 pts total)

| Room | Pts | Visited? | Notes |
|------|-----|----------|-------|
| Kitchen | 10 | Yes | wt-01 |
| Cellar | 25 | Yes | wt-01 |
| Torch Room | 10 | Yes | wt-01 |
| Volcano Bottom | 10 | No | Balloon puzzle |
| Treasure Room | 25 | No | Thief's lair |
| Land of Dead | 30 | $teleport only | wt-06 — not scored (bypass bug?) |
| Top of Well | 10 | Vehicle only | wt-09 — not scored (vehicle bug?) |
| Tomb | 5 | No | Endgame |
| Narrow Corridor (endgame) | 5 | No | Endgame |
| Inside Mirror | 15 | No | Endgame |
| Dungeon Entrance | 20 | No | Endgame |
| Hallway (endgame) | 15 | No | Endgame |
| Treasury | 35 | No | Endgame (victory) |
| **Earned** | **45** | | |
| **Remaining** | **170** | | |

**Endgame rooms** (Tomb through Treasury) = 95 pts, only reachable in endgame sequence.

---

## Achievement Points

| Achievement | Pts | Earned? | Notes |
|-------------|-----|---------|-------|
| Defeated the troll | 10 | Yes | wt-01 |
| Frightened the cyclops | 10 | Yes | wt-03 |
| Killed the thief | 25 | No | Requires high score |
| Exorcism | 10 | **BUG** | wt-06 — emits `game.score_changed` event but never applies to `scoring.scoreValue` |
| **Earned** | **20** | | |
| **Remaining** | **35** | | |

---

## Summary

| Category | Earned | Remaining | Max |
|----------|--------|-----------|-----|
| Treasures (take) | 118 | 147 | 265 |
| Treasures (case) | 98 | 162 | 260 |
| Room visits | 45 | 170 | 215 |
| Achievements | 20 | 35 | 55 |
| **Total** | **281** | **514** | **795** |

**Note**: Max 795 > 616 because the game cap is 616 (or 650 after thief dies). The original Zork scoring system uses 616 as the displayed max. Some room visit points (endgame) overlap with the endgame 100-point pool, which is separate from the 616 main game score.

---

## Known Bugs

1. **Exorcism scoring**: `exorcism-handler.ts:165` emits `game.score_changed` with `delta: 10`, but no handler processes this into `scoring.scoreValue`. The 10 points are silently lost.

2. **Land of Dead room visit**: wt-06 uses `$teleport` to reach Land of Dead, which bypasses the `if.event.actor_moved` event that triggers room visit scoring. Walking there after exorcism should award 30 pts.

3. **Top of Well room visit**: wt-09 reaches Top of Well via bucket vehicle (pour action), which may not emit `if.event.actor_moved`. The 10 pts may not be awarded.

---

## Walkthrough Coverage

| Walkthrough | Treasures Collected | Pts Added |
|-------------|---------------------|-----------|
| wt-01 | Torch (take), Painting (take+case) | 25 |
| wt-02 | Portrait (take+case), Bills (take+case) | 40 |
| wt-03 | — (maze navigation, cyclops) | 10 (achievement) |
| wt-04 | Platinum bar (take+case), Trunk (take) | 37 |
| wt-05 | Gold coffin (take+case) | 10 |
| wt-06 | — (exorcism) | 0 (bug) |
| wt-07 | Emerald (take+case), Statue (take+case), Pot of gold (take+case) | 58 |
| wt-08 | Jeweled egg (take+case) | 10 |
| wt-09 | Necklace (take+case), Spices (take+case), White sphere (take+case) | 46 |

**Room visits**: Kitchen (10) + Cellar (25) + Torch Room (10) = 45 pts across wt-01.
**Achievements**: Troll (10, wt-01) + Cyclops (10, wt-03) = 20 pts.

---

## Next Walkthroughs Needed

Priority areas for new walkthroughs (by point value):

1. **Coal Mine** — diamond (16), bracelet (8), red sphere (15) = 39 pts
2. **Volcano** — crown (25), coin (22), ruby (23), stamp (14) = 84 pts
3. **Royal Puzzle** — gold card (25) = 25 pts
4. **Scattered treasures** — coins (15), violin (20), grail (7), trident (15), jade (10), chalice (20), blue sphere (15) = 102 pts
5. **Special puzzles** — canary/bauble (10), Don Woods stamp (1), canvas (34) = 45 pts
6. **Trophy case cleanup** — trunk (8) + torch (6) = 14 pts
