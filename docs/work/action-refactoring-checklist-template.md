# Action Refactoring Checklist Template

## Action: [ACTION_NAME]
## Date Started: [DATE]
## Date Completed: [DATE]
## Status: [ ] Not Started [ ] In Progress [ ] Complete [ ] Signed Off

---

## Phase 1: Pre-Refactor Analysis

### Current State Analysis
- [ ] Read current implementation files
  - [ ] [action].ts
  - [ ] [action]-events.ts
  - [ ] [action]-data.ts
- [ ] Identify current pattern (two-phase, partial three-phase, other)
- [ ] Document all trait dependencies
- [ ] Document all behavior checks
- [ ] List all events emitted
- [ ] Review all tests
- [ ] Check for parser dependencies

### Problem Identification
- [ ] List IF code smells found
- [ ] List pattern violations
- [ ] List missing validations
- [ ] List error handling issues
- [ ] List test coverage gaps

### Dependency Analysis
- [ ] Check for dependencies on other actions
- [ ] Check for story-specific event handlers
- [ ] Check for extension dependencies
- [ ] Document backward compatibility requirements

---

## Phase 2: Design Specification

### Three-Phase Pattern Design
- [ ] Define validation logic
- [ ] Define execution logic
- [ ] Define event structure
- [ ] Define error cases

### Event Data Structure
- [ ] Design typed event data interface
- [ ] Ensure extensibility
- [ ] Document all fields
- [ ] Define event hook points

### Trait/Behavior Requirements
- [ ] List required traits
- [ ] List optional traits
- [ ] List behavior checks
- [ ] Document trait interactions

### Test Scenarios
- [ ] List all test cases needed
- [ ] Include edge cases
- [ ] Include error scenarios
- [ ] Include customization tests

---

## Phase 3: Implementation

### Code Changes
- [ ] Implement three-phase pattern
  - [ ] validate() method
  - [ ] execute() method
  - [ ] Proper return types
- [ ] Update event data structures
- [ ] Implement error handling
- [ ] Remove old pattern code
- [ ] Update imports/exports

### Event System
- [ ] Define typed event data
- [ ] Implement extensible structure
- [ ] Document event hooks
- [ ] Test event emissions

### Test Implementation
- [ ] Update existing tests
- [ ] Add new test cases
- [ ] Verify all tests pass
- [ ] Check test coverage

### Build Verification
- [ ] Run build command
- [ ] Fix any TypeScript errors
- [ ] Fix any linting issues
- [ ] Verify no circular dependencies

---

## Phase 4: Review

### Code Review
- [ ] Three-phase pattern correctly implemented
- [ ] Validation logic complete
- [ ] Execution logic correct
- [ ] Event data properly typed
- [ ] Error handling comprehensive

### IF Conventions
- [ ] Follows IF narrative conventions
- [ ] Messages appropriate for IF context
- [ ] Proper actor/object relationships
- [ ] Correct preposition usage

### Test Review
- [ ] All tests passing
- [ ] Coverage adequate
- [ ] Edge cases tested
- [ ] Error cases tested
- [ ] Integration tests updated

### Documentation Review
- [ ] Code comments updated
- [ ] Event documentation complete
- [ ] Trait requirements documented
- [ ] Examples provided

---

## Phase 5: Final Verification

### Integration Testing
- [ ] Test with story implementation
- [ ] Test with extensions
- [ ] Test parser integration
- [ ] Test event handlers

### Performance
- [ ] No performance regression
- [ ] Memory usage acceptable
- [ ] No infinite loops
- [ ] Efficient trait checks

### Backward Compatibility
- [ ] Event structure compatible
- [ ] API surface maintained
- [ ] No breaking changes (or documented)
- [ ] Migration path provided if needed

---

## Phase 6: Signoff

### Checklist Complete
- [ ] All previous phases complete
- [ ] No outstanding issues
- [ ] All tests passing
- [ ] Documentation complete

### Approval
- [ ] Code reviewed
- [ ] Tests reviewed
- [ ] Documentation reviewed
- [ ] Ready for production

### Signoff
- **Developer**: [NAME] [DATE]
- **Reviewer**: [NAME] [DATE]
- **Approved**: [ ] Yes [ ] No
- **Notes**: 

---

## Notes and Issues

### Open Issues
- 

### Decisions Made
- 

### Future Improvements
-