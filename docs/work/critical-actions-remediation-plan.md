# Critical Actions Remediation Plan

## Overview

This document outlines the remediation plan for the 12 critical actions (scoring below 5/10) identified in the stdlib review. These actions represent 26% of the codebase and require immediate attention to address architectural violations and code quality issues.

## Core Assumptions

1. **No Backwards Compatibility**: We can make breaking changes as needed to achieve architectural compliance
2. **Three-Phase Architecture**: All actions MUST follow the validate/execute/report pattern (ADR-051)
3. **No Debug Statements**: Remove all `console.*` debug statements during refactoring
4. **Iterative Approach**: Make changes one action at a time, re-review after each fix
5. **Quality Target**: All refactored actions must achieve 8+ rating (up from <5)

## Critical Actions Summary

### Severity 1 - Catastrophic (1-2.5/10) - 3 Actions
1. **Pulling** (1/10) - 311 lines duplicated (50% of file) - WORST IN CODEBASE
2. **Listening** (2/10) - 88 lines of verbatim duplication 
3. **Inventory** (2.5/10) - 106 lines duplicated (37% of file)

### Severity 2 - Major Issues (3-3.5/10) - 4 Actions
4. **Attacking** (3/10) - Non-deterministic validation with random numbers
5. **Pushing** (3/10) - ~190 lines near-duplication with divergent logic
6. **Eating** (3.5/10) - 85% code duplication with drinking action
7. **Giving** (3.5/10) - CRITICAL BUG: Doesn't actually transfer items
8. **Help** (3.5/10) - 100% logic duplication between validate/execute

### Severity 3 - Significant Problems (4-4.5/10) - 4 Actions
9. **Drinking** (4/10) - 286 lines, violates three-phase pattern
10. **Exiting** (4.5/10) - Manual state mutations, bypasses EntryBehavior

## Remediation Strategy

### Phase 1: Emergency Fixes (Week 1)
**Priority: Critical bugs and worst duplications**

#### 1.1 Fix Critical Functional Bug
- **Giving Action** - Fix the core bug where items aren't actually transferred
  - Status: BLOCKING - this breaks core IF functionality
  - Estimated effort: 2-4 hours

#### 1.2 Address Catastrophic Duplications
- **Pulling Action** - Extract 311 duplicated lines into shared helpers
  - Status: MAINTENANCE DISASTER - 50% of file is duplicated
  - Estimated effort: 1-2 days
- **Inventory Action** - Extract 106 duplicated lines 
  - Status: 37% duplication
  - Estimated effort: 4-6 hours
- **Listening Action** - Extract 88 duplicated lines
  - Status: Critical duplication
  - Estimated effort: 4-6 hours

### Phase 2: Architecture Violations (Week 2)
**Priority: Actions violating core patterns**

#### 2.1 Fix Non-Deterministic Validation
- **Attacking Action** - Remove random numbers from validation phase
  - Status: Violates validation purity principle
  - Estimated effort: 4-6 hours

#### 2.2 Implement Three-Phase Pattern
- **Drinking Action** - Refactor 286-line monolith to three-phase
  - Status: Missing validate/execute/report separation
  - Estimated effort: 1-2 days
- **Help Action** - Extract duplicated logic into shared functions
  - Status: 100% duplication between phases
  - Estimated effort: 4-6 hours

### Phase 3: Code Quality Issues (Week 3)
**Priority: Remaining duplications and pattern violations**

#### 3.1 Resolve Near-Duplications
- **Pushing Action** - Refactor ~190 lines of near-duplication
  - Status: Logic divergence creating maintenance issues
  - Estimated effort: 6-8 hours
- **Eating Action** - Extract shared logic with drinking action
  - Status: 85% copy-paste duplication
  - Estimated effort: 4-6 hours

#### 3.2 Fix State Management Violations
- **Exiting Action** - Use proper behavior delegation instead of manual mutations
  - Status: Bypasses architectural patterns
  - Estimated effort: 4-6 hours

## Success Criteria

### Phase 1 Success Metrics
- [ ] Giving action actually transfers items in tests
- [ ] Pulling action has <100 lines of duplication (from 311)
- [ ] Inventory action has <50 lines of duplication (from 106)  
- [ ] Listening action has <30 lines of duplication (from 88)
- [ ] All console.* statements removed from Phase 1 actions
- [ ] All Phase 1 actions follow three-phase pattern strictly
- [ ] All catastrophic actions score 8+ after fixes (target raised)

### Phase 2 Success Metrics  
- [ ] Attacking action uses deterministic validation only
- [ ] Drinking action follows three-phase pattern (validate/execute/report)
- [ ] Help action has <20% duplication between phases (from 100%)
- [ ] All console.* statements removed from Phase 2 actions
- [ ] All architecture violation actions score 8+ after fixes (target raised)

### Phase 3 Success Metrics
- [ ] Pushing action has <50 lines of duplication (from 190)
- [ ] Eating/Drinking share common logic via helpers
- [ ] Exiting action uses EntryBehavior properly
- [ ] All console.* statements removed from Phase 3 actions
- [ ] All critical actions score 8+ after remediation (target raised)

## Risk Assessment

### High Risk Items
1. **Giving Bug** - Blocks core IF functionality until fixed
2. **Pulling Refactor** - 50% of file needs restructuring
3. **Drinking Refactor** - Large monolithic action needs complete restructure

### Medium Risk Items
1. **Attacking Validation** - Changes core action behavior
2. **Three-Phase Implementations** - Require careful pattern adherence

### Low Risk Items
1. **Duplication Extractions** - Mechanical refactoring with clear benefits

## Resource Requirements

### Estimated Total Effort
- **Phase 1**: 4-6 days (critical fixes)
- **Phase 2**: 3-4 days (architecture)  
- **Phase 3**: 2-3 days (quality)
- **Total**: 9-13 days development time

### Prerequisites
- Understanding of three-phase action pattern (ADR-051)
- Knowledge of behavior delegation system (ADR-052)
- Familiarity with stdlib test patterns

### Validation Approach
- Run full test suite after each action fix
- Verify no regression in high-scoring actions
- Test core IF functionality (taking, putting, going) still works
- Run integration tests with story (cloak-of-darkness)

## Implementation Workflow

### Per-Action Process
1. **Select next action** from priority order
2. **Create feature branch** for single action fix
3. **Review current implementation** and identify specific issues
4. **Apply fixes** following three-phase architecture
5. **Remove all console.* debug statements**
6. **Run action-specific tests** until green
7. **Re-review action** to confirm 8+ score achieved
8. **Commit changes** and move to next action
9. **No parallel work** - complete one action fully before starting next

## Next Steps

1. **Review and approve this plan** with stakeholders
2. **Create detailed checklists** for each critical action
3. **Begin Phase 1** with Giving action bug fix (single action focus)
4. **Set up monitoring** for regression prevention during refactoring
5. **Establish review process** to confirm 8+ scores after each fix

---

*This plan addresses the 26% of stdlib actions requiring critical remediation, transforming them from maintenance liabilities into architectural assets.*