# Scoring Fix Plan

**Status: TABLED** - Deferring until parser regression work complete

## Overview

Fix Dungeo scoring to match Mainframe Zork FORTRAN implementation (616 points main game).

## Phase 1: Fix Treasure Values (Priority: High)

Add missing `trophyCaseValue` to all treasures:

| Treasure | Current | Correct | Fix |
|----------|---------|---------|-----|
| Jade Figurine | 5+0 | 5+5 | Add trophyCaseValue=5 |
| Platinum Bar | 10+0 | 12+10 | Fix to 12+10 |
| Pearl Necklace | 15+0 | 9+5 | Fix to 9+5 |
| Coffin | 10+0 | 3+7 | Fix to 3+7 |
| Torch | 6+0 | 14+6 | Fix to 14+6 |
| Bracelet | 5+0 | 5+3 | Add trophyCaseValue=3 |
| Trunk | 15+0 | 15+8 | Add trophyCaseValue=8 |
| Pot of Gold | 10+0 | 10+10 | Add trophyCaseValue=10 |
| Emerald | 5+0 | 5+10 | Add trophyCaseValue=10 |
| Zorkmid Coin | 5+0 | 10+12 | Fix to 10+12 |
| Bills | 15+0 | 10+15 | Fix to 10+15 |
| Portrait | 10+0 | 10+5 | Add trophyCaseValue=5 |
| Egg | 5+0 | 5+5 | Add trophyCaseValue=5 |
| Canary | 6+0 | 6+2 | Add trophyCaseValue=2 |

## Phase 2: Add Missing Treasures (Priority: Medium)

| Treasure | Points | Location |
|----------|--------|----------|
| Crystal Trident | 4+11=15 | Atlantis Room |
| Stradivarius | 10+10=20 | Music Room? |
| Crown | 15+10=25 | TBD |
| Saffron/Spices | 5+5=10 | TBD |

## Phase 3: Implement Room Points (Priority: Medium)

Add RVAL system for first-visit room scoring:

```typescript
// In room entity or handler
(room as any).firstVisitPoints = 25;  // e.g., Cellar

// In movement handler
if (!room.visited && room.firstVisitPoints) {
  scoringService.addAchievement(`Discovered ${room.name}`, room.firstVisitPoints);
}
```

Main game rooms:
- West of House: 5 pts
- Kitchen: 10 pts
- Cellar: 25 pts
- Land of Living Dead: 30 pts
- Back of Living Room: 10 pts
- Thief's Treasury: 25 pts
- Top of Well: 10 pts

## Phase 4: Fix Max Score Display

Change `index.ts` victory message from 716 to 616.

## Phase 5: Implement LTSHFT (Priority: Low)

10 points for light shaft puzzle completion.

## Estimated Effort

- Phase 1: ~2 hours (update 15+ treasure definitions)
- Phase 2: ~4 hours (add 4 new treasures with locations)
- Phase 3: ~2 hours (implement room points system)
- Phase 4: 5 minutes
- Phase 5: ~1 hour

## Dependencies

None - can be done independently of parser work.

## Reference

See `docs/dungeon-ref/complete-scoring.md` for FORTRAN values.
See `docs/work/dungeo/scoring-audit.md` for full comparison.
