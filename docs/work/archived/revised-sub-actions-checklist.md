# Revised Sub-Actions Implementation Checklist

## Key Principle
Sub-actions pattern is ONLY for truly paired opposite actions that share significant logic.

## Completed ✅
- Phase 1: Switching (activate/deactivate) - 10.0 quality
- Phase 2: Locking (secure/unsecure) - 9.0 quality  
- Phase 3: Wearable (wear/remove) - 9.0 quality

## Worth Implementing

### Phase 3.4: Entering/Exiting Actions (Priority: HIGH)
**Current Quality**: Entering 7.5, Exiting 9.0
**Justification**: True opposites, entering needs improvement
- [ ] Create `/passage` directory structure
- [ ] Create `passage-base.ts` with shared entry/exit logic
- [ ] Create `/enter` sub-action (maps to ENTERING)
- [ ] Create `/exit` sub-action (maps to EXITING)
- [ ] Improve entering validation and error handling
- [ ] Share common room/container entry logic
- [ ] Update exports and imports
- [ ] Run tests and verify quality

### Phase 3.8: Saving/Restoring Actions (Priority: MEDIUM)
**Current Quality**: Both 7.5
**Justification**: True opposites, could share state management
- [ ] Create `/game-state` directory structure
- [ ] Create `game-state-base.ts` with shared serialization logic
- [ ] Create `/save` sub-action (maps to SAVING)
- [ ] Create `/restore` sub-action (maps to RESTORING)
- [ ] Extract common state validation
- [ ] Update exports and imports
- [ ] Run tests and verify quality

## Optional (Already High Quality)

### Phase 3.1: Opening/Closing Actions (Priority: LOW)
**Current Quality**: Both 9.5 - Already excellent
**Justification**: True opposites but already near-perfect
- Consider only if time permits
- Would provide organizational benefit only

### Phase 3.2: Taking/Dropping Actions (Priority: LOW)
**Current Quality**: Both 8.5 - Already good
**Justification**: True opposites but already well-implemented
- Consider only if time permits
- Minimal quality improvement expected

### Phase 3.5: Pushing/Pulling Actions (Priority: LOW)
**Current Quality**: Pushing 8.5, Pulling 9.5
**Justification**: True opposites but already high quality
- Consider only if time permits
- Minimal benefit expected

## NOT Sub-Actions Candidates ❌

### Putting/Removing/Inserting
- **Reason**: Not clean paired relationships
- Putting and Inserting are similar but not opposites
- Removing is opposite of Inserting but not Putting
- **Action**: Keep as separate actions, improve individually if needed

### Eating/Drinking  
- **Reason**: Both are consumption, not opposites
- **Action**: Keep as separate actions, already improved to 8.0/8.5

### Giving/Throwing
- **Reason**: Both are transfers away, not opposites
- **Action**: Already improved giving to 9.5, throwing needs standalone improvement

## Actions Needing Standalone Improvement

### High Priority
- **Throwing** (6.0): Needs three-phase pattern, trajectory extraction
- **Inserting** (7.0): Could delegate better to putting
- **Removing** (7.0): Needs better behavior delegation

### Medium Priority  
- **Climbing** (7.0): Has state reconstruction anti-pattern
- **Searching** (6.5): Already improved to 8.5
- **Touching** (6.5): Simple but could be more extensible
- **Talking** (6.0): Very basic conversation

## Summary
- Focus on **Entering/Exiting** first (biggest improvement potential)
- Then **Saving/Restoring** (medium benefit)
- Skip the optional high-quality pairs unless time permits
- Improve standalone low-quality actions separately