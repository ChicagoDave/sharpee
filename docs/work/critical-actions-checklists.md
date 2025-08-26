# Critical Actions - Detailed Fix Checklists

## Core Assumptions & Requirements

1. **No Backwards Compatibility**: Breaking changes are acceptable for architectural compliance
2. **Three-Phase Architecture**: All actions MUST implement validate/execute/report pattern (ADR-051)
3. **No Debug Statements**: Remove all `console.*` debug statements during refactoring
4. **Iterative Approach**: Complete one action at a time, re-review to confirm 8+ score
5. **Quality Target**: Each refactored action must achieve 8+ rating (up from <5)

## Phase 1: Emergency Fixes

### 🔴 CRITICAL: Giving Action (3.5/10) - Functional Bug
**Issue: Doesn't actually transfer items**

#### Pre-Fix Analysis
- [ ] Read current giving.ts implementation
- [ ] Identify where item transfer should occur but doesn't
- [ ] Review giving-golden.test.ts to understand expected behavior
- [ ] Compare with working actions (taking, putting) for transfer patterns

#### Implementation Checklist
- [ ] Remove all `console.*` debug statements from giving.ts
- [ ] Implement strict three-phase pattern (validate/execute/report)
- [ ] Fix validate phase to properly check source/target constraints
- [ ] Implement execute phase to actually move item between entities
- [ ] Use proper behavior delegation (ContainerBehavior.removeItem/addItem)
- [ ] Ensure events reflect actual state changes
- [ ] Add proper error handling for failed transfers

#### Verification
- [ ] Run giving-golden.test.ts - should pass
- [ ] Test actual item transfer in story integration
- [ ] Verify inventory changes reflect the transfer
- [ ] Check no regression in other transfer actions
- [ ] **Re-review action to confirm 8+ score achieved**
- [ ] Verify no `console.*` statements remain

---

### 🔴 CATASTROPHIC: Pulling Action (1/10) - Worst Duplication
**Issue: 311 lines duplicated (50% of file)**

#### Pre-Fix Analysis
- [ ] Read pulling.ts and identify the 311 duplicated lines
- [ ] Map duplicate code to specific functions/logic blocks
- [ ] Identify what should be extracted to shared helpers
- [ ] Review pulling-golden.test.ts for expected behavior

#### Refactoring Checklist
- [ ] Remove all `console.*` debug statements from pulling.ts
- [ ] Extract common validation logic to helper functions
- [ ] Extract common execution patterns to shared utilities  
- [ ] Extract common reporting logic to helper functions
- [ ] Implement strict three-phase pattern (validate/execute/report)
- [ ] Use behavior delegation instead of direct state manipulation
- [ ] Reduce file to <300 lines total

#### Verification
- [ ] Run pulling-golden.test.ts - should pass
- [ ] Verify no logic changes, only structure improvements
- [ ] Check extracted helpers are reusable by other actions
- [ ] Confirm duplication reduced from 311 to <50 lines
- [ ] **Re-review action to confirm 8+ score achieved**
- [ ] Verify no `console.*` statements remain

---

### 🔴 CATASTROPHIC: Inventory Action (2.5/10) - Major Duplication  
**Issue: 106 lines duplicated (37% of file)**

#### Pre-Fix Analysis
- [ ] Read inventory.ts and identify the 106 duplicated lines
- [ ] Compare with similar listing actions for patterns
- [ ] Review inventory-golden.test.ts for expected behavior
- [ ] Identify what logic is truly duplicated vs similar

#### Refactoring Checklist
- [ ] Remove all `console.*` debug statements from inventory.ts
- [ ] Implement strict three-phase pattern (validate/execute/report)
- [ ] Extract inventory collection logic to helper functions
- [ ] Extract display/formatting logic to shared utilities
- [ ] Extract item filtering/sorting to reusable functions
- [ ] Implement DRY principle throughout the action

#### Verification
- [ ] Run inventory-golden.test.ts - should pass
- [ ] Test inventory display in story integration
- [ ] Verify extracted helpers work for similar actions
- [ ] Confirm duplication reduced from 106 to <30 lines
- [ ] **Re-review action to confirm 8+ score achieved**
- [ ] Verify no `console.*` statements remain

---

### 🔴 CATASTROPHIC: Listening Action (2/10) - Critical Duplication
**Issue: 88 lines of verbatim duplication**

#### Pre-Fix Analysis
- [ ] Read listening.ts and identify the 88 duplicated lines
- [ ] Understand what should be shared vs action-specific
- [ ] Review listening-golden.test.ts for expected behavior
- [ ] Compare with other sensory actions (looking, smelling)

#### Refactoring Checklist
- [ ] Remove all `console.*` debug statements from listening.ts
- [ ] Implement strict three-phase pattern (validate/execute/report)
- [ ] Extract sensory processing logic to shared helpers
- [ ] Extract environment scanning to reusable utilities
- [ ] Extract message generation to common functions
- [ ] Reduce code duplication to near zero

#### Verification
- [ ] Run listening-golden.test.ts - should pass
- [ ] Test sensory functionality in story
- [ ] Verify helpers benefit other sensory actions
- [ ] Confirm duplication reduced from 88 to <20 lines
- [ ] **Re-review action to confirm 8+ score achieved**
- [ ] Verify no `console.*` statements remain

## Phase 2: Architecture Violations

### 🟠 MAJOR: Attacking Action (3/10) - Non-Deterministic
**Issue: Random numbers in validation phase**

#### Pre-Fix Analysis
- [ ] Read attacking.ts and locate random number usage
- [ ] Understand why randomness was added to validation
- [ ] Review attacking-golden.test.ts for deterministic expectations
- [ ] Research proper IF attack mechanics (deterministic validation)

#### Implementation Checklist
- [ ] Remove all `console.*` debug statements from attacking.ts
- [ ] Implement strict three-phase pattern (validate/execute/report)
- [ ] Remove all random number generation from validate phase
- [ ] Move any randomness to execute phase only (if needed)
- [ ] Implement deterministic validation based on entity properties
- [ ] Ensure validation is pure (same inputs = same outputs)

#### Verification
- [ ] Run attacking-golden.test.ts multiple times - consistent results
- [ ] Verify validation phase is deterministic
- [ ] Test attack mechanics are still engaging
- [ ] Confirm no random numbers in validate phase
- [ ] **Re-review action to confirm 8+ score achieved**
- [ ] Verify no `console.*` statements remain

---

### 🟠 MAJOR: Drinking Action (4/10) - Monolithic Structure
**Issue: 286 lines, violates three-phase pattern**

#### Pre-Fix Analysis
- [ ] Read drinking.ts and understand the 286-line structure
- [ ] Identify validation, execution, and reporting logic mixed together
- [ ] Review drinking-golden.test.ts for expected behavior
- [ ] Compare with well-structured actions (taking, going)

#### Refactoring Checklist  
- [ ] Remove all `console.*` debug statements from drinking.ts
- [ ] Implement strict three-phase pattern (validate/execute/report)
- [ ] Separate validation logic into validate phase
- [ ] Separate state changes into execute phase
- [ ] Separate messaging into report phase
- [ ] Extract common liquid-handling logic to helpers
- [ ] Use behavior delegation for container interactions
- [ ] Reduce total line count to <150

#### Verification
- [ ] Run drinking-golden.test.ts - should pass
- [ ] Verify three-phase pattern implemented correctly
- [ ] Test drinking mechanics in story integration
- [ ] Confirm action follows architectural patterns
- [ ] **Re-review action to confirm 8+ score achieved**
- [ ] Verify no `console.*` statements remain

---

### 🟠 MAJOR: Help Action (3.5/10) - Logic Duplication
**Issue: 100% logic duplication between validate/execute**

#### Pre-Fix Analysis
- [ ] Read help.ts and identify duplicated logic blocks
- [ ] Understand why validation and execution are identical
- [ ] Review help-golden.test.ts for expected behavior
- [ ] Study help system requirements and proper implementation

#### Refactoring Checklist
- [ ] Remove all `console.*` debug statements from help.ts
- [ ] Implement strict three-phase pattern (validate/execute/report)
- [ ] Extract help content generation to shared functions
- [ ] Separate validation (can show help?) from execution (show help)
- [ ] Extract help topic lookup to reusable utilities
- [ ] Eliminate all duplicate logic between phases

#### Verification
- [ ] Run help-golden.test.ts - should pass
- [ ] Test help system functionality in story
- [ ] Verify no logic duplication remains
- [ ] Confirm three-phase pattern works correctly
- [ ] **Re-review action to confirm 8+ score achieved**
- [ ] Verify no `console.*` statements remain

## Phase 3: Code Quality Issues

### 🟡 MODERATE: Pushing Action (3/10) - Near-Duplication
**Issue: ~190 lines of near-duplication with divergent logic**

#### Pre-Fix Analysis
- [ ] Read pushing.ts and identify the ~190 near-duplicate lines
- [ ] Map where logic diverges and where it's truly the same
- [ ] Review pushing-golden.test.ts for expected behavior
- [ ] Compare with pulling action for shared patterns

#### Refactoring Checklist
- [ ] Remove all `console.*` debug statements from pushing.ts
- [ ] Implement strict three-phase pattern (validate/execute/report)
- [ ] Extract truly common logic to shared helpers
- [ ] Parameterize divergent logic instead of duplicating
- [ ] Create push-specific and pull-specific variants where needed
- [ ] Reduce near-duplication to <50 lines

#### Verification
- [ ] Run pushing-golden.test.ts - should pass
- [ ] Test pushing mechanics in story integration
- [ ] Verify logic divergences are intentional, not accidental
- [ ] Confirm duplication reduced significantly
- [ ] **Re-review action to confirm 8+ score achieved**
- [ ] Verify no `console.*` statements remain

---

### 🟡 MODERATE: Eating Action (3.5/10) - Copy-Paste Duplication  
**Issue: 85% code duplication with drinking**

#### Pre-Fix Analysis
- [ ] Read eating.ts and drinking.ts side-by-side
- [ ] Identify the 85% duplicated code sections
- [ ] Review eating-golden.test.ts for expected behavior
- [ ] Understand what should be shared vs action-specific

#### Refactoring Checklist
- [ ] Remove all `console.*` debug statements from eating.ts
- [ ] Implement strict three-phase pattern (validate/execute/report)
- [ ] Extract shared consumption logic to helper functions
- [ ] Create consumable item handling utilities
- [ ] Parameterize eat vs drink differences
- [ ] Share validation and reporting logic where appropriate
- [ ] Maintain distinct behaviors where actions truly differ

#### Verification
- [ ] Run eating-golden.test.ts - should pass
- [ ] Run drinking-golden.test.ts - still passes
- [ ] Test both actions maintain distinct behaviors
- [ ] Confirm shared code is properly extracted
- [ ] **Re-review action to confirm 8+ score achieved**
- [ ] Verify no `console.*` statements remain

---

### 🟡 MODERATE: Exiting Action (4.5/10) - State Management Bypass
**Issue: Manual state mutations, bypasses EntryBehavior**

#### Pre-Fix Analysis
- [ ] Read exiting.ts and identify manual state mutations
- [ ] Review EntryBehavior to understand proper delegation
- [ ] Review exiting-golden.test.ts for expected behavior
- [ ] Compare with entering action for consistency

#### Refactoring Checklist
- [ ] Remove all `console.*` debug statements from exiting.ts
- [ ] Implement strict three-phase pattern (validate/execute/report)
- [ ] Replace manual mutations with EntryBehavior.exitRoom calls
- [ ] Use proper behavior delegation throughout
- [ ] Ensure state changes go through proper channels
- [ ] Add proper error handling for failed exits

#### Verification
- [ ] Run exiting-golden.test.ts - should pass
- [ ] Test room transitions in story integration
- [ ] Verify EntryBehavior is used properly
- [ ] Confirm no manual state mutations remain
- [ ] **Re-review action to confirm 8+ score achieved**
- [ ] Verify no `console.*` statements remain

## Completion Criteria

### Overall Success Metrics
- [ ] All 12 critical actions score 8+ after remediation (raised target)
- [ ] Code duplication reduced by 80%+ across all actions
- [ ] Three-phase pattern implemented in all actions
- [ ] Behavior delegation used instead of manual mutations
- [ ] All `console.*` debug statements removed
- [ ] Full test suite passes with no regressions
- [ ] Each action completed individually with re-review before next

### Quality Gates
- [ ] No single action has >100 lines of duplication
- [ ] No validation phases contain non-deterministic logic
- [ ] All actions follow architectural patterns (ADR-051, ADR-052)
- [ ] Core IF functionality works in story integration tests

---

*These checklists provide step-by-step remediation for each critical action, ensuring systematic improvement from maintenance liability to architectural asset.*