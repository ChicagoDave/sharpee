# Sub-Actions Implementation Checklist

## Core Requirements (Apply to ALL Phases)
- [ ] **Three-Phase Architecture**: Every action follows validate/execute/report (ADR-051)
- [ ] **Quality Target**: All actions achieve 8+ quality score
- [ ] **No Debug Statements**: Remove all `console.*` statements
- [ ] **Iterative Approach**: Complete one action, review, then proceed
- [ ] **Breaking Changes OK**: Make architectural improvements as needed
- [ ] **Language Messages**: Add/update messages as required
- [ ] **Code Review**: Check for smells after each action

## Pre-Implementation
- [ ] Review ADR-063 sub-actions pattern
- [ ] Review ADR-054 semantic grammar
- [ ] Review ADR-051 three-phase architecture
- [ ] Backup current working state
- [ ] Ensure all tests passing on main branch

## Phase 1: Switching Actions Pilot
- [x] Create `/switching` directory structure
- [x] Create `switching-base.ts` with abstract class
- [x] Move shared logic from `switching-shared.ts`
- [x] Create `/activate` sub-action:
  - [x] Create `activate.ts`
  - [x] Create `activate-events.ts`
  - [x] Implement validation
  - [x] Implement execution
  - [x] Map to SWITCHING_ON action ID
- [x] Create `/deactivate` sub-action:
  - [x] Create `deactivate.ts`
  - [x] Create `deactivate-events.ts`
  - [x] Implement validation
  - [x] Implement execution
  - [x] Map to SWITCHING_OFF action ID
- [x] Update exports in `switching/index.ts`
- [x] Update `standard/index.ts` imports
- [x] Remove all debug statements
- [x] Verify validate/execute/report separation
- [x] Run tests: `pnpm --filter '@sharpee/stdlib' test switching`
- [x] Fix any test failures
- [x] Code review for smells
- [x] Verify 8+ quality score achieved
- [x] Delete old `switching_on` directory
- [x] Delete old `switching_off` directory
- [x] Delete `switching-shared.ts`
- [x] Document any new language messages

## Phase 2: Locking/Unlocking Actions
- [x] Create `/locking` directory structure
- [x] Create `locking-base.ts` with abstract class
- [x] Move shared logic from `lock-shared.ts`
- [x] Create `/secure` sub-action:
  - [x] Create `secure.ts`
  - [x] Create `secure-events.ts`
  - [x] Implement validation
  - [x] Implement execution
  - [x] Map to LOCKING action ID
- [x] Create `/unsecure` sub-action:
  - [x] Create `unsecure.ts`
  - [x] Create `unsecure-events.ts`
  - [x] Implement validation
  - [x] Implement execution
  - [x] Map to UNLOCKING action ID
- [x] Update exports in `locking/index.ts`
- [x] Update `standard/index.ts` imports
- [x] Remove all debug statements
- [x] Verify validate/execute/report separation
- [x] Run tests: `pnpm --filter '@sharpee/stdlib' test locking unlocking`
- [x] Fix any test failures
- [x] Code review for smells
- [x] Verify 8+ quality score achieved
- [x] Delete old `locking/locking.ts`
- [x] Delete old `unlocking/unlocking.ts`
- [x] Delete `lock-shared.ts`
- [x] Document any new language messages

## Phase 3.1: Opening/Closing Actions
- [ ] Examine OpenableBehavior for refactoring opportunities
  - [ ] Remove extraneous properties (sounds, auto-behaviors, etc.)
  - [ ] Keep only essential open/closed state
- [ ] Create `/doorway` directory structure
- [ ] Create `doorway-base.ts` with abstract class
- [ ] Move shared logic from any shared files
- [ ] Create `/open` sub-action:
  - [ ] Create `open.ts`
  - [ ] Create `open-events.ts`
  - [ ] Map to OPENING action ID
- [ ] Create `/close` sub-action:
  - [ ] Create `close.ts`
  - [ ] Create `close-events.ts`
  - [ ] Map to CLOSING action ID
- [ ] Update exports and imports
- [ ] Remove debug statements
- [ ] Run tests and fix failures
- [ ] Verify 8+ quality score

## Phase 3.2: Taking/Dropping Actions
- [ ] Examine PortableBehavior for refactoring opportunities
  - [ ] Remove extraneous properties
  - [ ] Keep only essential carrying logic
- [ ] Create `/carrying` directory structure
- [ ] Create `carrying-base.ts` with abstract class
- [ ] Create `/take` sub-action (maps to TAKING)
- [ ] Create `/drop` sub-action (maps to DROPPING)
- [ ] Update exports and imports
- [ ] Run tests and verify quality

## Phase 3.3: Inserting/Removing/Putting Actions
- [ ] Examine ContainerBehavior for refactoring opportunities
  - [ ] Remove complex container logic not essential
  - [ ] Keep only basic containment
- [ ] Create `/container` directory structure
- [ ] Create `container-base.ts` with abstract class
- [ ] Create `/insert` sub-action (maps to INSERTING)
- [ ] Create `/remove` sub-action (maps to REMOVING)
- [ ] Create `/put` sub-action (maps to PUTTING)
- [ ] Handle relationships between putting/inserting
- [ ] Update exports and imports
- [ ] Run tests and verify quality

## Phase 3.4: Entering/Exiting Actions
- [ ] Examine EntryBehavior for refactoring opportunities
  - [ ] Simplify entry/exit logic
- [ ] Create `/movement` directory structure
- [ ] Create `movement-base.ts` with abstract class
- [ ] Create `/enter` sub-action (maps to ENTERING)
- [ ] Create `/exit` sub-action (maps to EXITING)
- [ ] Update exports and imports
- [ ] Run tests and verify quality

## Phase 3.5: Pushing/Pulling Actions
- [ ] Examine MovableBehavior for refactoring opportunities
  - [ ] Remove complex physics/movement
  - [ ] Keep only basic push/pull state
- [ ] Create `/manipulation` directory structure
- [ ] Create `manipulation-base.ts` with abstract class
- [ ] Create `/push` sub-action (maps to PUSHING)
- [ ] Create `/pull` sub-action (maps to PULLING)
- [ ] Update exports and imports
- [ ] Run tests and verify quality

## Phase 3.6: Eating/Drinking Actions
- [ ] Examine EdibleBehavior for refactoring opportunities
  - [ ] Remove nutrition/hunger systems
  - [ ] Keep only basic consumption
- [ ] Create `/consumption` directory structure
- [ ] Create `consumption-base.ts` with abstract class
- [ ] Create `/eat` sub-action (maps to EATING)
- [ ] Create `/drink` sub-action (maps to DRINKING)
- [ ] Update exports and imports
- [ ] Run tests and verify quality

## Phase 3.7: Giving/Throwing Actions
- [ ] Examine TransferBehavior for refactoring opportunities
  - [ ] Simplify transfer logic
- [ ] Create `/transfer` directory structure
- [ ] Create `transfer-base.ts` with abstract class
- [ ] Create `/give` sub-action (maps to GIVING)
- [ ] Create `/throw` sub-action (maps to THROWING)
- [ ] Update exports and imports
- [ ] Run tests and verify quality

## Phase 3.8: Saving/Restoring Actions
- [ ] Examine GameStateBehavior for refactoring opportunities
  - [ ] Keep minimal save/load logic
- [ ] Create `/game-state` directory structure
- [ ] Create `game-state-base.ts` with abstract class
- [ ] Create `/save` sub-action (maps to SAVING)
- [ ] Create `/restore` sub-action (maps to RESTORING)
- [ ] Update exports and imports
- [ ] Run tests and verify quality

## Phase 3: Wearable Actions (Original - Now Complete)
- [x] Create `/wearable` directory structure
- [x] Create `wearable-base.ts` with abstract class
- [x] Move shared logic (no wearable-shared.ts existed)
- [x] Create `/wear` sub-action:
  - [x] Create `wear.ts`
  - [x] Create `wear-events.ts`
  - [x] Implement validation
  - [x] Implement execution
  - [x] Handle implicit taking
  - [x] Map to WEARING action ID
- [x] Create `/remove` sub-action:
  - [x] Create `remove.ts`
  - [x] Create `remove-events.ts`
  - [x] Implement validation
  - [x] Implement execution
  - [x] Map to TAKING_OFF action ID
- [x] Update exports in `wearable/index.ts`
- [x] Update `standard/index.ts` imports
- [x] Remove all debug statements
- [x] Verify validate/execute/report separation
- [x] Run tests: `pnpm --filter '@sharpee/stdlib' test wearing taking_off`
- [x] Fix any test failures
- [x] Code review for smells
- [x] Verify 8+ quality score achieved
- [x] Delete old `wearing` directory (already gone)
- [x] Delete old `taking_off` directory (already gone)
- [x] Delete `wearable-shared.ts` (didn't exist)
- [x] Document any new language messages

## Phase 4: Registration & Exports
- [x] Update `packages/stdlib/src/actions/standard/index.ts`:
  - [x] Import from new paths
  - [x] Remove backward compatibility (not needed)
  - [x] Ensure standardActions array updated
- [x] Verify all action IDs remain unchanged
- [x] Test action registration:
  - [x] Run full stdlib test suite (some unrelated failures)
  - [x] Test refactored actions (all pass)
  - [ ] Test story loading (optional)

## Phase 5: Test Migration
- [x] Reorganize switching tests:
  - [x] Simplified SwitchableBehavior to just set isOn
  - [x] Created `switching_on-simple.test.ts`
  - [x] Created `switching_off-simple.test.ts`
  - [x] Removed old complex test files
- [x] Reorganize locking tests:
  - [x] Move to `/tests/unit/actions/locking/`
  - [x] Create `secure.test.ts` (moved from locking-golden.test.ts)
  - [x] Create `unsecure.test.ts` (moved from unlocking-golden.test.ts)
  - [x] Updated imports for new location
- [x] Reorganize wearable tests:
  - [x] Move to `/tests/unit/actions/wearable/`
  - [x] Create `wear.test.ts` (moved from wearing-golden.test.ts)
  - [x] Create `remove.test.ts` (moved from taking_off-golden.test.ts)
  - [x] Updated imports for new location
- [x] Run full test suite for refactored actions
- [x] Ensure all refactored action tests pass:
  - [x] Switching: 17 tests passing
  - [x] Locking: 28 tests passing
  - [x] Wearable: 28 tests passing

## Phase 6: Documentation
- [ ] Update each sub-action's JSDoc comments
- [ ] Create migration guide in `docs/migration/`
- [ ] Update `packages/stdlib/README.md`
- [ ] Document extension patterns
- [ ] Add examples of creating new sub-actions
- [ ] Update architecture diagrams

## Quality Checks
- [ ] All action quality scores ≥8 (minimum)
- [ ] Target 9+ where possible
- [ ] Code reduction achieved (target: 20-30%)
- [ ] No duplicate validation logic
- [ ] Zero debug statements (`console.*`)
- [ ] Strict validate/execute/report separation
- [ ] No performance regression
- [ ] Clean lint results
- [ ] Type checking passes

## Final Validation
- [ ] Run complete test suite
- [ ] Test with cloak-of-darkness story
- [ ] Breaking changes documented
- [ ] Check bundle size impact
- [ ] Review with git diff for code smells

## Post-Implementation
- [ ] Create comprehensive PR description
- [ ] Document lessons learned
- [ ] Update ADR-063 with implementation details
- [ ] Plan next action families to convert
- [ ] Consider automating sub-action creation

## Rollback Checkpoints
After each phase, verify:
- [ ] All tests updated and passing
- [ ] Quality score ≥8 achieved
- [ ] No debug statements remain
- [ ] Performance acceptable
- [ ] Can proceed or need to rollback

## Sign-off
- [x] Phase 1 Complete: 2025-08-27 04:00 (Switching)
- [x] Phase 2 Complete: 2025-08-27 04:30 (Locking)
- [x] Phase 3 Complete: 2025-08-27 15:53 (Wearable)
- [ ] Phase 3.1 Complete: ___________ (Opening/Closing)
- [ ] Phase 3.2 Complete: ___________ (Taking/Dropping)
- [ ] Phase 3.3 Complete: ___________ (Container manipulation)
- [ ] Phase 3.4 Complete: ___________ (Entering/Exiting)
- [ ] Phase 3.5 Complete: ___________ (Pushing/Pulling)
- [ ] Phase 3.6 Complete: ___________ (Eating/Drinking)
- [ ] Phase 3.7 Complete: ___________ (Giving/Throwing)
- [ ] Phase 3.8 Complete: ___________ (Saving/Restoring)
- [x] Phase 4 Complete: 2025-08-27 16:08
- [x] Phase 5 Complete: 2025-08-27 19:36
- [ ] Phase 6 Complete: ___________
- [ ] Ready for PR: ___________