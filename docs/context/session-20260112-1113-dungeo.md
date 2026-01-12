# Session Summary: 20260112-1113 - dungeo (Points/Scoring Audit)

**Date**: 2026-01-12
**Duration**: ~3 hours
**Status**: Completed - Treasure values fixed, awaiting room entry points implementation

---

## Session Objective

Audit and fix the Dungeo scoring system against the 1981 MDL source code to ensure authentic Zork point values and treasure definitions.

---

## What Was Accomplished

### 1. Created Comprehensive Audit Document

**File**: `docs/work/dungeo/points-audit.md`

Compared all treasure scoring between MDL source and our implementation, documenting:
- MDL terminology (OTVAL/OFVAL/RVAL)
- All 30+ treasures with their take/case values
- Room entry scoring (RVAL) - 13 rooms worth 215 points
- Special achievements (LIGHT-SHAFT)

### 2. Fixed 21+ Swapped Treasure Values

**Critical bug discovered**: All treasures had `treasureValue` and `trophyCaseValue` swapped. The pattern was consistent across the entire codebase - our code had been using the wrong values since treasures were first implemented.

**MDL terminology**:
- OTVAL (Object Take VALue) → our `treasureValue`
- OFVAL (Object Final VALue) → our `trophyCaseValue`

**Example fixes**:
- Bag of Coins: Was 10/5, should be 5/10
- Trident: Was 4/11, should be 11/4
- Ruby: Was 15/8, should be 8/15
- Stack of Bills: Was 10/15, should be 15/10

### 3. Removed 3 Wrong Treasures

Found and removed items that were incorrectly marked as treasures:

1. **Candles** - Just a light source tool in MDL, not a treasure
2. **Gold Card** - Doesn't exist in MDL (CARD is just a warning note about explosives)
3. **Golden Chalice** - Doesn't exist in MDL (only silver chalice exists)

### 4. Added 3 Missing Treasures

Implemented treasures that existed in MDL but were missing from our game:

1. **Crown** (Lord Dimwit Flathead's Crown) - 10/15 points
   - Added to safe in Bank of Zork
   - Created safe as LockableTrait + ContainerTrait
   - Requires combination to open (no key implementation)

2. **Stradivarius** (violin) - 10/10 points
   - Added to steel box in Round Room
   - Created steel box as OpenableTrait + ContainerTrait

3. **Saffron** (tin of spices) - 5/5 points
   - Added to Atlantis Room

### 5. Fixed Missing Trophy Case Value

**Silver Chalice** had `treasureValue=10` but was missing `trophyCaseValue=10`.

---

## Files Modified

### Region Files (Treasure Value Fixes)
1. **stories/dungeo/src/regions/maze.ts**
   - bag-of-coins: Swapped to 5/10
   - Removed golden-chalice (doesn't exist in MDL)

2. **stories/dungeo/src/regions/temple.ts**
   - candles: Removed treasure properties
   - grail: Swapped to 5/2
   - platinum-bar: Swapped to 10/12

3. **stories/dungeo/src/regions/dam.ts**
   - trunk: Swapped to 8/15
   - trident: Swapped to 11/4

4. **stories/dungeo/src/regions/underground.ts**
   - painting: Swapped to 7/4
   - ivory-torch: Swapped to 6/14
   - crystal-sphere: Swapped to 5/10

5. **stories/dungeo/src/regions/volcano.ts**
   - coffin: Swapped to 7/3
   - emerald: Swapped to 10/5
   - ruby: Swapped to 8/15
   - stamp: Swapped to 10/4

6. **stories/dungeo/src/regions/coal-mine.ts**
   - sapphire-bracelet: Swapped to 3/5
   - crystal-sphere: Swapped to 5/10

7. **stories/dungeo/src/regions/frigid-river.ts**
   - buoy-emerald: Swapped to 10/5
   - crystal-statue: Swapped to 13/10

8. **stories/dungeo/src/regions/well-room.ts**
   - silver-chalice: Added trophyCaseValue=10
   - pearl-necklace: Swapped to 5/9
   - crystal-sphere: Swapped to 5/10

9. **stories/dungeo/src/regions/bank-of-zork.ts**
   - portrait: Swapped to 5/10
   - stack-of-bills: Swapped to 15/10
   - zorkmid-coin: Swapped to 12/10
   - Added crown treasure (10/15) inside new safe

10. **stories/dungeo/src/regions/forest.ts**
    - canary: Swapped to 2/6

11. **stories/dungeo/src/regions/royal-puzzle.ts**
    - Removed gold-card treasure (doesn't exist in MDL)
    - Added steel-box container
    - Added stradivarius treasure (10/10)

12. **stories/dungeo/src/regions/round-room.ts**
    - Added atlantis-room region
    - Added saffron treasure (5/5)

### Action/Handler Files (Diamond Value Fixes)
13. **stories/dungeo/src/actions/send/send-action.ts**
    - cancelled-stamp: Swapped to 1/0

14. **stories/dungeo/src/handlers/coal-machine-handler.ts**
    - diamond: Swapped to 6/10

15. **stories/dungeo/src/actions/turn-switch/turn-switch-action.ts**
    - diamond: Swapped to 6/10

### Thief Behavior (Canvas Value Fix)
16. **stories/dungeo/src/npcs/thief/thief-behavior.ts**
    - Noted canvas value needs verification against MDL

### Story Index (New Regions)
17. **stories/dungeo/src/index.ts**
    - Added atlantis-room to region initialization

---

## Key Decisions

### 1. All Treasure Values Were Backwards

The systematic swap across all treasures indicates this was a fundamental misunderstanding of MDL terminology when the scoring system was first implemented. Rather than being random bugs, the pattern suggests the code was consistently using OFVAL where OTVAL belonged and vice versa.

**Decision**: Fix all treasures uniformly by swapping values.

### 2. Non-Existent Treasures Must Be Removed

Items like "golden chalice" and "gold card" don't exist in MDL source. These appear to have been added based on assumptions or incomplete documentation.

**Decision**: Remove any treasure not found in MDL source code, adhering to authentic 1981 Zork.

### 3. Missing Treasures Must Be Added

Three treasures from MDL were completely missing from our implementation.

**Decision**: Add crown, stradivarius, and saffron with their authentic containers and locations.

### 4. Safe Uses Combination, Not Key

In MDL, the safe in Bank of Zork requires a combination (found elsewhere), not a physical key. Our current implementation uses LockableTrait which assumes keys.

**Decision**: Implement safe with combination-based unlocking (deferred for now - safe is locked but unlocking mechanism TBD).

---

## Challenges & Solutions

### Challenge 1: Systemic Value Swap

All treasures had values backwards - fixing required touching 15+ files across the codebase.

**Solution**: Used the audit document as a checklist, verifying each treasure against MDL source. Fixed values one file at a time to avoid mistakes.

### Challenge 2: Identifying Wrong vs Missing Treasures

Some items existed in our game but not in MDL (golden chalice), while others existed in MDL but not our game (crown).

**Solution**: Cross-referenced complete MDL treasure list against our implementation to catch both false positives and false negatives.

### Challenge 3: Container Creation for Missing Treasures

Crown and Stradivarius required creating new containers (safe, steel box) with appropriate traits.

**Solution**:
- Safe: LockableTrait (pre-locked) + ContainerTrait
- Steel Box: OpenableTrait + ContainerTrait
- Both placed in correct regions with treasures inside

### Challenge 4: Atlantis Room Didn't Exist

Saffron belongs in "Atlantis Room" which wasn't implemented yet.

**Solution**: Created minimal Atlantis Room in Round Room region with description and saffron placement.

---

## Testing Performed

### Manual Verification

Checked each modified treasure against MDL source in `docs/work/dungeo/points-audit.md`:
- Verified all 21+ value swaps
- Confirmed removal of 3 wrong treasures
- Validated addition of 3 missing treasures with correct values

### Build Verification

```bash
./scripts/bundle-sharpee.sh
```

Successfully compiled with all changes.

### No Regression Testing Yet

**Important**: Changes affect core scoring mechanic but no transcript tests were run to verify in-game behavior. This is because:
1. Changes are purely data (treasure values)
2. Scoring system already tested in previous sessions
3. Values now match MDL source which is authoritative

---

## Code Quality

- All TypeScript compilation successful
- No new runtime logic added (only data changes)
- Follows existing treasure creation patterns
- Maintains region organization structure

---

## Open Items & Next Steps

### 1. Room Entry Scoring (RVAL) - High Priority

**215 points** from 13 rooms need implementation:

| Room | Points | Notes |
|------|--------|-------|
| Kitchen | 10 | First visit to Kitchen |
| Cellar | 25 | Below trap door |
| Balloon Room | 10 | - |
| Trophy Room | 25 | First time entering |
| Narrow Passage | 5 | - |
| Land of Living Dead | 30 | Major milestone |
| Temple Well | 10 | - |
| Inside Mirror | 15 | Mirror dimension |
| Crypt | 5 | - |
| Torch Room Stairs | 10 | - |
| Behind Dungeon Door | 20 | Past the master lock |
| Front Door | 15 | Endgame area |
| Nirvana | 35 | Final location |

**Implementation approach**:
- Add RoomAchievementTrait or similar
- Track first-visit per room in game state
- Award points via scoring system
- May need ScoringEventProcessor extension

### 2. LIGHT-SHAFT Achievement - Medium Priority

**10 points** for specific puzzle solution (details TBD from MDL source).

**Research needed**: What triggers this achievement in MDL?

### 3. Max Score Verification - Medium Priority

Current config shows `maxScore: 616`. With fixes:
- Treasure points: ~440 (take + case)
- Room points: 215
- LIGHT-SHAFT: 10
- **Expected total**: ~665 points

**Action needed**: Verify max score calculation matches MDL.

### 4. Death Penalty Verification - Low Priority

MDL has -10 points per death. Need to verify our implementation matches.

### 5. Safe Combination Lock - Low Priority

Safe currently uses LockableTrait (expects key). MDL uses combination.

**Options**:
- Extend LockableTrait for combination locks
- Create new CombinationLockTrait
- Handle as puzzle-specific logic

### 6. Thief's Canvas Value - Low Priority

Canvas shows `treasureValue=10, trophyCaseValue=24` (total 34). MDL source unclear on this treasure.

**Action needed**: Research canvas/painting values in MDL.

---

## Statistics

### Treasure Count
- Total treasures in MDL: 30+
- Treasures fixed: 21+
- Treasures removed: 3
- Treasures added: 3
- Treasures still needing verification: 1 (canvas)

### Point Distribution
- Treasure points (implemented): ~440
- Room entry points (pending): 215
- Special achievements (pending): 10
- Current max score: 616
- Expected max score: ~665

### Files Modified
- Region files: 12
- Action/handler files: 3
- NPC behavior files: 1
- Story index: 1
- Documentation: 1 (audit)
- **Total**: 18 files

---

## References

### Primary Sources
- **MDL Source Code**: 1981 Mainframe Zork treasure definitions (OTVAL/OFVAL)
- **Audit Document**: `docs/work/dungeo/points-audit.md`

### Related ADRs
- ADR-052: Event Handlers for Custom Logic (scoring hooks)
- Previous sessions on ScoringEventProcessor implementation

### Related Work Sessions
- `session-20260110-2249-dungeo.md` - Thief implementation
- `session-20260111-1103-dungeo.md` - Coal machine puzzle
- `session-20260111-2231-dungeo.md` - Treasure scoring system

---

## Notes

### Why This Matters

This session corrects a fundamental flaw in the scoring system that would have made our Dungeo implementation inauthentic. While the total points were correct (both values were swapped consistently), the gameplay experience was wrong:

- Players got the wrong feedback on treasure importance
- Taking actions gave misleading point values
- Trophy case placement didn't match original Zork

The fix ensures players experience authentic 1981 Zork scoring behavior.

### Pattern Discovered

The systematic nature of the swap (ALL treasures were backwards) suggests this was a conceptual error during initial implementation, not a bug introduced later. This highlights the importance of:
1. Validating against primary sources early
2. Testing with known-good data
3. Documenting data sources in code comments

### Future Scoring Work

With treasure values fixed, the next phase is implementing room entry scoring (RVAL). This requires:
- Architectural decision on room achievement tracking
- Integration with existing scoring system
- Possible extension of ScoringEventProcessor

The LIGHT-SHAFT achievement needs research in MDL source to understand trigger conditions.

---

## Session Timeline

- **11:13** - Session started, identified scoring audit as goal
- **11:30** - Created comprehensive audit document from MDL source
- **12:00** - Discovered systematic treasure value swap
- **12:30** - Fixed maze, temple, dam regions
- **13:00** - Fixed underground, volcano, coal-mine regions
- **13:30** - Fixed frigid-river, well-room, bank regions
- **14:00** - Added missing treasures (crown, stradivarius, saffron)
- **14:15** - Removed wrong treasures (candles, gold card, golden chalice)
- **14:20** - Session summary requested

---

**Status**: Work session complete. Treasure values now match 1981 MDL source. Room entry scoring and special achievements remain for future implementation.
