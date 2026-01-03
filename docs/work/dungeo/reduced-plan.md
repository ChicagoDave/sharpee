# Dungeo: Remaining Work

**Status**: 169 rooms (100%), 650/650 points (100%)

---

## Remaining Treasures (0 pts) - ALL COMPLETE!

| Treasure | Points | Requirement | Notes |
|----------|--------|-------------|-------|
| ~~Don Woods stamp~~ | ~~1~~ | ~~Mail order system~~ | ✅ Complete |
| ~~Brass bauble~~ | ~~2~~ | ~~Wind canary in forest~~ | ✅ Complete |

---

## Remaining Puzzles

### Item Manipulation
| Puzzle | Solution | Blocker |
|--------|----------|---------|
| Rainbow | WAVE sceptre at falls | ✅ Complete (action + dynamic exits) |
| Glacier | Throw torch at ice | ✅ Complete (handler + dynamic exits) |
| Buried treasure | DIG 4x with shovel | ✅ DIG action + shovel done |
| Egg/Canary | Let thief steal & open | ✅ Complete (thief has logic, player can also open) |
| Bauble | Wind canary in forest | ✅ Complete (bauble spawns on WIND in forest) |

### Mechanical
| Puzzle | Solution | Blocker |
|--------|----------|---------|
| Bucket/Well | Pour water to descend | Need bucket/well mechanics |
| Balloon | Light guidebook, wait, land | Need Vehicle trait, balloon |

### Keys
| Puzzle | Solution | Blocker |
|--------|----------|---------|
| Key (Tiny Room) | Mat under door, screwdriver | Need mat/door mechanics |
| Grating | Skeleton key | Need key object |

---

## Missing Systems

| System | Needed For | Complexity |
|--------|------------|------------|
| WAVE action | Rainbow/sceptre | ✅ Done |
| DIG action | Buried statue | ✅ Done |
| WIND action | Canary/bauble | ✅ Done |
| Vehicle trait | Boat, balloon | Medium |
| INFLATE/DEFLATE | Boat | Low |
| Robot commands | "tell robot X" | Medium |
| Water current | River auto-movement | Medium |
| Bucket mechanics | Well puzzle | Medium |

---

## Missing Objects

| Object | Location | Notes |
|--------|----------|-------|
| Shovel | Sandy Beach | ✅ Done |
| Statue | Sandy Beach | ✅ Done (buried, revealed by DIG) |
| ~~Bauble~~ | ~~Forest~~ | ✅ Spawned by WIND canary |
| Pump | Reservoir North | Inflate boat |
| Skeleton key | Dead End (maze) | Grating |
| Iron key | Tiny Room | Dreary Room door |
| Eat-me/Drink-me cakes | Tea Room | Size change |
| Brick + fuse | Volcano | Explosion |
| Braided wire | Stream View | Balloon tether |
| Mat | West of House | Key puzzle |
| Green paper | Tea Room | Robot instructions |

---

## Priority Order

1. **WAVE action** → Rainbow puzzle → Pot of gold access
2. **DIG action + shovel** → Buried statue (23 pts)
3. **Boat system** (Vehicle trait + INFLATE) → River navigation
4. **Bucket/Well** → Tea Room access
5. **Remaining keys** → Blue sphere access
6. **Canary/bauble** → Final 2 pts
7. **Brochure/stamp** → Final 1 pt

---

## Quick Wins (Low effort, high impact)

- [x] WAVE action (simple verb, enables rainbow) ✅
- [x] DIG action (simple verb, enables statue) ✅
- [x] Add shovel object to Sandy Beach ✅
- [x] WIND action (simple verb, enables bauble) ✅
- [x] Add bauble object that spawns when canary wound in forest ✅
- [x] SEND action + matchbook/brochure (mail order stamp) ✅
