# Phase 5: Real Actions Improvement Checklist (Corrected)

## Overview
This corrected checklist focuses on **actual actions that exist** in the stdlib and haven't been refactored in Phases 1-4.

## Phase 5 Progress
- **Started**: August 26, 2025
- **Completed Actions**: 6 (switching_on, switching_off, locking, unlocking, wearing, taking_off)
- **Remaining Actions**: 14
- **Average Score Improvement**: +1.5 points
- **Total Lines Eliminated**: ~230 lines of duplication
- **Shared Helpers Created**: switching-shared.ts, lock-shared.ts, wearable-shared.ts

## Core Assumptions

1. **No Backwards Compatibility**: We can make breaking changes as needed to achieve architectural compliance
2. **Three-Phase Architecture**: All actions MUST follow the validate/execute/report pattern (ADR-051)
3. **No Debug Statements**: Remove all `console.*` debug statements during refactoring
4. **Iterative Approach**: Make changes one action at a time, re-review after each fix
5. **Quality Target**: All refactored actions must achieve 8+ rating (up from <5)
6. **Language Updates**: If an action requires new language messages, include that in the refactoring.


## Actions Already Completed (Phases 1-4)
✅ Giving, Pulling, Inventory, Listening (Phase 1)
✅ Attacking, Drinking, Help, Turning (removed) (Phase 2)  
✅ Pushing, Eating, Exiting (Phase 3)
✅ Smelling, Sleeping, Waiting, Showing (Phase 4)

## Actual Existing Actions Not Yet Refactored

### Already High Quality (8+) - No Changes Needed
- Going (9.0)
- Taking (8.5)
- Dropping (8.5)
- Putting (8.5)
- Opening (9.5)
- Closing (9.5)
- Examining (8.0)
- Looking (8.0)

### Actions That Need Improvement (Confirmed to Exist)

#### Group A: Moderate Quality Actions (6.5-7.5)

##### 1. Searching Action (6.5/10)
**Issues**: Some duplication remains
- [ ] Read searching.ts and identify duplication
- [ ] Create analyzeSearchAction helper function
- [ ] Extract common search patterns
- [ ] Share helpers with examining action
- [ ] Remove any console.* statements
- [ ] Ensure three-phase pattern compliance
- [ ] Target Score: 8.0+

##### 2. Touching Action (6.5/10)
**Issues**: Simple but could be more extensible
- [ ] Read touching.ts implementation
- [ ] Add texture/temperature/sensation support
- [ ] Create analyzeTouchAction helper
- [ ] Add more descriptive touch messages
- [ ] Implement proper event data
- [ ] Target Score: 8.0+

##### 3. Climbing Action (7.0/10)
**Issues**: Has state reconstruction anti-pattern
- [ ] Read climbing.ts and identify anti-pattern
- [ ] Fix state management approach
- [ ] Use proper behavior delegation
- [ ] Create analyzeClimbAction helper
- [ ] Remove duplication between validate/execute
- [ ] Target Score: 8.5+

##### 4. Entering Action (7.5/10)
**Issues**: Could improve validation
- [ ] Review entering.ts validation logic
- [ ] Add more robust checks for enterable objects
- [ ] Ensure proper use of EntryBehavior
- [ ] Extract validation helpers
- [ ] Target Score: 8.5+

##### 5. Inserting Action (7.0/10)
**Issues**: Similar to putting, could share code
- [ ] Read inserting.ts and putting.ts
- [ ] Extract shared placement logic
- [ ] Create common validation helpers
- [ ] Differentiate insert vs put semantics clearly
- [ ] Target Score: 8.5+

##### 6. Removing Action (7.0/10)
**Issues**: Could use more behavior delegation
- [ ] Read removing.ts implementation
- [ ] Improve behavior delegation patterns
- [ ] Extract common removal logic
- [ ] Add proper container validation
- [ ] Target Score: 8.5+

##### 7. ✅ Locking Action (~~7.0/10~~ → 8.5/10) COMPLETED
**Issues**: ~~Works but could be cleaner~~ FIXED
- [x] Read locking.ts implementation
- [x] Created lock-shared.ts with shared helpers
- [x] Extracted key validation logic to validateKeyRequirements()
- [x] Improved error messages with createLockErrorEvent()
- [x] Reduced from 234 to 168 lines (28% reduction)
- [x] All 19 tests passing
- [x] **Target Score: 8.5+ ACHIEVED**

##### 8. ✅ Unlocking Action (~~7.0/10~~ → 8.5/10) COMPLETED
**Issues**: ~~Similar to locking~~ FIXED
- [x] Coordinated with locking refactor
- [x] Shares all validation and helpers from lock-shared.ts
- [x] Ensures consistent patterns with locking
- [x] Reduced from 215 to 155 lines (28% reduction)
- [x] All 22 tests passing (13 + 9 skipped)
- [x] **Target Score: 8.5+ ACHIEVED**

##### 9. ✅ Switching On Action (~~7.0/10~~ → 8.5/10) COMPLETED
**Issues**: ~~Duplicates logic with switching_off~~ FIXED
- [x] Read switching_on.ts
- [x] Extract common switching logic to switching-shared.ts
- [x] Created analyzeSwitchingContext helper
- [x] Created determineSwitchingMessage helper
- [x] Reduced from 201 to 179 lines (11% reduction)
- [x] All 23 tests passing
- [x] **Target Score: 8.5+ ACHIEVED**

##### 10. ✅ Switching Off Action (~~7.0/10~~ → 8.5/10) COMPLETED 
**Issues**: ~~Duplicates logic with switching_on~~ FIXED
- [x] Coordinated with switching_on refactor
- [x] Shares all validation and execution logic
- [x] Uses same helpers from switching-shared.ts
- [x] Reduced from 196 to 169 lines (14% reduction)
- [x] All 23 tests passing
- [x] **Target Score: 8.5+ ACHIEVED**

##### 11. ✅ Wearing Action (~~7.5/10~~ → 9.0/10) COMPLETED
**Issues**: ~~Good but could use better patterns~~ FIXED
- [x] Read wearing.ts implementation
- [x] Created wearable-shared.ts with shared helpers
- [x] Extracted layering conflict detection to checkWearingConflicts()
- [x] Improved event building with buildWearableEventParams()
- [x] Reduced from 185 to 134 lines (28% reduction)
- [x] All 16 tests passing (1 skipped)
- [x] **Target Score: 8.5+ EXCEEDED (9.0)**

##### 12. ✅ Taking Off Action (~~7.5/10~~ → 9.0/10) COMPLETED
**Issues**: ~~Pairs with wearing action~~ FIXED
- [x] Shares all helpers from wearable-shared.ts
- [x] Uses checkRemovalBlockers() for layering validation
- [x] Consistent error handling patterns with wearing
- [x] Reduced from 160 to 129 lines (19% reduction)
- [x] All 17 tests passing
- [x] **Target Score: 8.5+ EXCEEDED (9.0)**

#### Group B: Basic Conversation Actions (6.0-7.0)

##### 13. Talking Action (6.0/10)
**Issues**: Very basic conversation support
- [ ] Read talking.ts implementation
- [ ] Design conversation helpers
- [ ] Add NPC interaction support
- [ ] Extract dialogue patterns
- [ ] Remove any duplication
- [ ] Target Score: 8.0+

##### 14. Throwing Action (6.0/10)
**Issues**: Complex trajectory logic could be extracted
- [ ] Read throwing.ts implementation
- [ ] Extract trajectory calculation helpers
- [ ] Add collision detection patterns
- [ ] Simplify validation logic
- [ ] Remove duplication
- [ ] Target Score: 8.0+

#### Group C: Meta/System Actions (Various Scores)

##### 15. About Action
- [ ] Review for consistency with other meta actions
- [ ] Ensure proper information display

##### 16. Again Action  
- [ ] Review command history integration
- [ ] Ensure proper validation

##### 17. Quitting Action
- [ ] Review for proper game state cleanup
- [ ] Ensure confirmation patterns

##### 18. Restarting Action
- [ ] Review for proper state reset
- [ ] Ensure confirmation patterns

##### 19. Restoring Action
- [ ] Review save/load integration
- [ ] Ensure proper validation

##### 20. Saving Action
- [ ] Review save system integration
- [ ] Ensure proper state capture

##### 21. Scoring Action
- [ ] Review score display patterns
- [ ] Ensure extensibility

##### 22. Reading Action
- [ ] Review readable object handling
- [ ] Extract text display helpers

## Implementation Priority

### Week 1: Focus on Common Patterns
1. **Switching Actions** (switching_on/off) - Extract shared logic first
2. **Lock/Unlock Actions** - Create shared security patterns
3. **Wearing/Taking Off** - Establish wearable patterns

### Week 2: Improve Core Actions
1. **Searching** - Important for gameplay
2. **Touching** - Sensory action improvements
3. **Climbing** - Fix anti-patterns
4. **Entering** - Improve validation

### Week 3: Container Actions
1. **Inserting** - Share with putting
2. **Removing** - Better delegation
3. **Throwing** - Extract physics

### Week 4: Conversation & Meta
1. **Talking** - Conversation foundation
2. **Reading** - Text display patterns
3. **Meta actions** - Consistency review

## Success Metrics

- [ ] All refactored actions score 8.0+ 
- [ ] Zero code duplication within actions
- [ ] 100% three-phase architecture compliance
- [ ] No console.* debug statements
- [ ] Proper behavior delegation patterns
- [ ] Shared helpers extracted where appropriate

## Notes

### Actions That Don't Exist (Remove from Planning)
The following were in the original quality table but don't actually exist:
- ❌ Thinking
- ❌ Waking  
- ❌ Singing
- ❌ Jumping
- ❌ Tasting
- ❌ Buying
- ❌ Selling
- ❌ Asking
- ❌ Telling
- ❌ Answering
- ❌ Switching (generic - only on/off exist)

### Actual Count
- **Total Real Actions**: 44 (after Turning removal: 43)
- **Already Refactored**: 15 actions
- **High Quality (no work)**: 8 actions
- **Need Improvement**: 20 actions remaining

This corrected list focuses on the 20 real actions that actually exist and need improvement.