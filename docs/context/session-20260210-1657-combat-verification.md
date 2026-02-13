# Session Summary: 2026-02-10 - combat-refactor verification (4:57 PM CST)

## Status: In Progress — Critical Bugs Found and Partially Fixed

## Goals
- Build the combat refactor branch and run verification sequence
- Fix build errors and test failures

## Work Completed

### 1. Build Fix: ISemanticEvent type mismatch
- `packages/extensions/basic-combat/src/basic-npc-resolver.ts` had `sourceId` property which doesn't exist on `ISemanticEvent`
- Fixed: added `id` field and moved `sourceId` into `entities.actor` to match the interface
- Build now passes cleanly

### 2. Full Verification Sequence Run

| Check | Result | Details |
|-------|--------|---------|
| Stdlib unit tests | 349 fail / 776 pass | Two categories (see below) |
| Basic-combat extension tests | 1 fail | Vitest can't resolve `@sharpee/core` — needs vitest.config.ts |
| Walkthrough chain | 3 fail / 319 pass | Combat-related only |
| Unit transcript tests | 51 fail / 1437 pass | Mix of combat and pre-existing |
| No Dungeo→basic-combat dep | PASS | Clean separation confirmed |

### 3. Stdlib Unit Test Failures (349)
- **combat-service.test.ts (22 failures)**: `CombatService is not a constructor` — tests still import from stdlib but CombatService moved to basic-combat. Need to delete from stdlib (already copied to basic-combat).
- **Golden tests (~327 failures)**: All expect `action.success`/`action.blocked` events but actions now emit domain events like `if.event.touched`, `if.event.worn`. **Pre-existing issue**, unrelated to combat refactor.

### 4. Combat Investigation — Root Causes Found

#### Issue A: PROB function misimplemented (FIXED)
- **File**: `stories/dungeo/src/combat/melee.ts` line 230
- MDL `PROB(GOODLUCK, BADLUCK)` uses GOODLUCK when `LUCKY!-FLAG` is set
- `LUCKY!-FLAG` is **always true** (`<SETG LUCKY!-FLAG T>` in util.16:193)
- Our code had `isHeroAttacking ? 0.25 : 0.50` — should be **0.25 for both**
- **Fixed**: Changed to flat `0.25` with comment explaining LUCKY flag

#### Issue B: Weapon loss breaks `attack X with Y` commands (UNDERSTOOD, NOT YET FIXED)
- When troll counter-attacks and gets STAGGER→LOSE_WEAPON, hero's sword drops to floor
- All subsequent `attack troll with sword` fail: parser can't resolve "sword" in inventory
- Walkthrough wt-01 uses 30x `attack troll with sword` — after weapon loss, all fail
- Hero stands defenseless while troll keeps attacking → player death
- **Fix options**: (a) walkthrough should use `attack troll` not `attack troll with sword`, or (b) `attack troll` needs to work without weapon in hand (auto-infer from room?)

#### Issue C: `attack troll` (no weapon specified) → "can't see any such thing" (INVESTIGATED, NOT FIXED)
- `examine troll` works, but `attack troll` fails with same entity
- Works via natural path navigation but fails via GDT teleport
- Confirmed NOT caused by combat refactor — `attack troll with sword` via natural path works fine
- Likely a pre-existing parser scope issue with GDT teleport

#### Issue D: GDT `kl troll` kills wrong entity (PRE-EXISTING)
- `kl troll` kills "Royal Puzzle Controller (o02)" instead of the troll
- GDT entity lookup bug, unrelated to combat refactor

#### Issue E: Walkthrough wt-12 thief fight — chalice not found (NOT INVESTIGATED)
- After killing thief, `take chalice` → "You can't see any such thing"
- Thief may not be dropping loot on death, or chalice naming issue

### 5. Key Discovery: MDL LUCKY!-FLAG
- `PROB(GOODLUCK, BADLUCK)` function in util.16:195-199
- Always uses GOODLUCK (first arg) because `LUCKY!-FLAG` is globally set to T
- This means ALL `<PROB X Y>` calls in the MDL source use X%, not Y%
- May affect other PROB calls beyond LOSE_WEAPON (e.g., WINNING? function lines 289-293)

## Files Changed This Session

| File | Change |
|------|--------|
| `packages/extensions/basic-combat/src/basic-npc-resolver.ts` | Fixed ISemanticEvent construction |
| `stories/dungeo/src/combat/melee.ts` | Fixed PROB: LOSE_WEAPON chance 0.25 for both directions |

## Next Steps (Priority Order)

1. **Rebuild and retest walkthroughs** after PROB fix
2. **Fix walkthrough wt-01**: Change `attack troll with sword` → `attack troll` (if that works via natural path), or add `take sword` between attacks
3. **Delete stale combat-service.test.ts** from stdlib (moved to basic-combat)
4. **Fix basic-combat vitest.config.ts** for `@sharpee/core` resolution
5. **Investigate PROB impact** on other MDL functions (WINNING? for thief AI)
6. **Investigate wt-12 thief/chalice** issue
7. **Fix GDT `kl` entity lookup** (separate issue)

## Architecture Notes

The combat refactor is architecturally sound:
- PC→NPC: MeleeInterceptor handles hero's blow correctly
- NPC→PC: meleeNpcResolver handles villain counter-attack correctly
- No double-attack: interceptor does hero's blow, NPC behavior triggers villain's blow
- Both use the same canonical melee engine tables
- Dungeo has zero dependency on basic-combat extension (verified)
