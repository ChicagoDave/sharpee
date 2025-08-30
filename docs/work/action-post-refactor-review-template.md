# Post-Refactor Review Template

## Action: [ACTION_NAME]
## Review Date: [DATE]
## Reviewer: [NAME]
## Implementation By: [NAME]

---

## Implementation Review

### Three-Phase Pattern Compliance

#### Validation Method
**Signature Correct**: [ ] Yes [ ] No
```typescript
validate(context: ActionContext): ValidationResult
```

**Validation Logic**:
- [ ] All required checks present
- [ ] Error messages appropriate
- [ ] Returns correct shape
- [ ] No side effects

**Issues Found**:
- 

#### Execution Method
**Signature Correct**: [ ] Yes [ ] No
```typescript
execute(context: ActionContext): SemanticEvent[]
```

**Execution Logic**:
- [ ] State changes applied correctly
- [ ] Events emitted properly
- [ ] No validation logic here
- [ ] Returns SemanticEvent array

**Issues Found**:
- 

### Event System Review

#### Event Data Structure
**Properly Typed**: [ ] Yes [ ] No

```typescript
// Actual interface implemented
```

**Extensibility**:
- [ ] Base fields present
- [ ] Additional fields documented
- [ ] Type exports correct
- [ ] Can be extended by stories

**Issues Found**:
- 

#### Event Emission
- [ ] All expected events emitted
- [ ] Event data complete
- [ ] Timing correct
- [ ] Hook points available

**Issues Found**:
- 

---

## IF Conventions Review

### Narrative Style
- [ ] Messages read naturally
- [ ] Proper person/tense used
- [ ] Actor/object relationships clear
- [ ] Prepositions correct

**Examples of Good Messages**:
- 

**Messages Needing Improvement**:
- 

### Game State Consistency
- [ ] State changes logical
- [ ] No impossible states created
- [ ] Relationships maintained
- [ ] World model intact

**Issues Found**:
- 

---

## Code Quality Review

### Code Structure
- [ ] Clean separation of concerns
- [ ] No duplicated logic
- [ ] Proper abstraction level
- [ ] Readable and maintainable

**Improvements Needed**:
- 

### Error Handling
- [ ] All error cases handled
- [ ] Appropriate error messages
- [ ] Graceful degradation
- [ ] No silent failures

**Missing Error Cases**:
- 

### Performance
- [ ] No unnecessary loops
- [ ] Efficient trait checks
- [ ] No memory leaks
- [ ] Reasonable complexity

**Performance Concerns**:
- 

---

## Test Coverage Review

### Test Completeness
- [ ] All paths tested
- [ ] Edge cases covered
- [ ] Error cases tested
- [ ] Integration tested

**Missing Tests**:
- 

### Test Quality
- [ ] Tests are clear
- [ ] Tests are maintainable
- [ ] Tests actually test behavior
- [ ] No brittle tests

**Test Improvements Needed**:
- 

---

## Trait and Behavior Review

### Trait Usage
**Required Traits Documented**: [ ] Yes [ ] No

| Trait | Properly Checked | Used Correctly |
|-------|-----------------|----------------|
| | | |

**Issues**:
- 

### Behavior Integration
**Behaviors Properly Used**: [ ] Yes [ ] No

| Behavior | Properly Checked | Customization Works |
|----------|-----------------|---------------------|
| | | |

**Issues**:
- 

---

## Comparison with Spec

### Spec Compliance
- [ ] All spec requirements met
- [ ] Design followed as planned
- [ ] Deviations documented
- [ ] Acceptance criteria met

**Deviations from Spec**:
- Deviation:
  - Reason:
  - Impact:

### Unexpected Discoveries
- 

---

## Integration Testing Results

### Parser Integration
**Tested**: [ ] Yes [ ] No
**Result**: [ ] Pass [ ] Fail

**Issues**:
- 

### Story Integration
**Tested**: [ ] Yes [ ] No
**Result**: [ ] Pass [ ] Fail

**Issues**:
- 

### Extension Compatibility
**Tested**: [ ] Yes [ ] No
**Result**: [ ] Pass [ ] Fail

**Issues**:
- 

---

## Regression Testing

### Backward Compatibility
- [ ] No breaking changes OR
- [ ] Breaking changes documented
- [ ] Migration path provided
- [ ] Version notes updated

**Breaking Changes**:
- 

### Existing Tests
- [ ] All existing tests still pass
- [ ] Test updates justified
- [ ] No functionality lost
- [ ] Performance maintained

**Failed Tests**:
- 

---

## Documentation Review

### Code Documentation
- [ ] Methods documented
- [ ] Complex logic explained
- [ ] TODOs addressed
- [ ] Examples provided

**Documentation Gaps**:
- 

### External Documentation
- [ ] README updated if needed
- [ ] API docs updated
- [ ] Migration guide created if needed
- [ ] Examples updated

**Missing Documentation**:
- 

---

## Final Assessment

### Critical Issues
**Count**: [NUMBER]
1. 
2. 

### Minor Issues
**Count**: [NUMBER]
1. 
2. 

### Improvements Made
1. 
2. 
3. 

### Future Work Identified
1. 
2. 

---

## Review Decision

### Overall Assessment
[ ] **APPROVED** - Ready for production
[ ] **CONDITIONAL** - Approved pending fixes
[ ] **REJECTED** - Significant rework needed

### Conditions for Approval (if conditional)
1. 
2. 

### Required Changes (if rejected)
1. 
2. 

---

## Review Signoff

**Reviewer**: [NAME]
**Date**: [DATE]
**Decision**: [APPROVED | CONDITIONAL | REJECTED]

**Developer Response**:
- [ ] Agrees with review
- [ ] Issues addressed
- [ ] Ready for re-review

**Developer**: [NAME]
**Date**: [DATE]

---

## Notes

### Positive Highlights
- 

### Lessons Learned
- 

### Process Improvements
-