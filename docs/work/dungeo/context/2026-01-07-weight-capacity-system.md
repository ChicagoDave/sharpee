# Work Summary: Weight/Capacity System Implementation

**Date**: 2026-01-07
**Branch**: dungeo
**Commit**: 9de4590

## Overview

Implemented the weight/capacity system for Dungeo. All portable objects now have weight values, and the player's carrying capacity (maxWeight=100) is enforced.

## What Was Done

### 1. Object Weight Assignment

Added `weight` property to IdentityTrait for all portable objects across 14 files:

| File | Objects Updated |
|------|-----------------|
| house-interior/objects | sword (10), lamp (5), knife (4), rope (5), bottle (5), garlic (3), food (5), brick (5), wire (5), sack (5) |
| white-house/objects | leaflet (2), mat (5) |
| forest/objects | egg (2), canary (10) |
| underground/objects | axe (25), painting (20), grail (5), box (5), violin (5), shovel (5) |
| maze/objects | bag of coins (5), key (25), chalice (40) |
| temple/objects | bell (5), book (5), candles (20), coffin (10), sceptre (10), torch (5), skull (5), chalice (40), sphere (5), key (25) |
| dam/objects | matchbook (5), guidebook (5), wrench (5), screwdriver (10), trunk (5), platinum bar (20), pump (5) |
| coal-mine/objects | coal (10), figurine (5), bracelet (5), sphere (5), timber (20) |
| frigid-river/objects | pot (5), trident (5), buoy (10), emerald (5), boat (2), shovel (5), statue (2) |
| volcano/objects | emerald (5), ruby (5), book (5), stamp (2) |
| bank-of-zork/objects | portrait (20), bills (20), coin (5) |
| well-room/objects | bucket (5), chalice (40), pearl (5), sphere (5), paper (2), cakes (5 each) |
| royal-puzzle/objects | gold card (2), warning note (2) |
| thiefs-canvas-objects | frame (5), piece (2), incense (5), canvas (5) |

### 2. Platform Infrastructure

The platform already supported weight checking:
- `ContainerTrait.capacity.maxWeight` - configured on player as 100
- `IdentityTrait.weight` - optional property on entities
- `ContainerBehavior.checkCapacity()` - validates weight before accepting items
- `IdentityBehavior.getWeight()` - retrieves item weight

The player entity already had `maxWeight: 100` set on their ContainerTrait (in `index.ts` lines 335, 361).

### 3. Transcript Test

Created `weight-capacity.transcript` with 16 tests:
- Uses GDT to collect items totaling 92 weight units
- Attempts to take coffin (10 weight) which would exceed 100
- Verifies "can't" message appears (weight limit enforced)

## Test Results

```
Total: 802 tests in 50 transcripts
797 passed, 5 expected failures
Duration: 6347ms
✓ All tests passed!
```

## Weight Values Reference

From Fortran dindx.dat:
- **40**: Chalices (heavy gold/silver)
- **25**: Axe, Keys
- **20**: Painting, Portrait, Platinum bar, Timber, Zorkmid bills, Candles
- **10**: Sword, Coffin, Coal, Canary, Screwdriver, Sceptre, Buoy
- **5**: Most standard items (lamp, rope, food, bottle, etc.)
- **2-4**: Small items (leaflet, stamp, garlic, knife)

Player MXLOAD = 100 (can carry up to 100 weight units)

## Files Changed

- 14 object definition files (weight property added)
- 1 new transcript test
- Updated implementation-plan.md

## Next Steps

Remaining systems to implement:
- INFLATE/DEFLATE actions (boat)
- Water current (river auto-movement)
- Robot commands ("tell robot 'X'" syntax)
