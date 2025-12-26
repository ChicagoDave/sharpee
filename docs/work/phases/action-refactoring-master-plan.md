# Action Refactoring Master Plan

## Problems Identified

### 1. Lawnmower Refactoring Failures
- Attempting to refactor all actions at once leads to incomplete implementations
- Mass find-and-replace creates subtle bugs
- Context is lost when jumping between actions
- Testing becomes overwhelming and incomplete

### 2. IF Code Smells
- Actions don't follow consistent patterns
- Mixed responsibilities (validation, execution, event handling)
- Inconsistent error handling
- Poor separation between core logic and customization points
- Missing or incomplete trait/behavior associations

### 3. Pattern Inconsistencies
- Some actions use old two-phase pattern
- Some attempt three-phase but incorrectly
- Event data structures are inconsistent
- Validation returns different shapes

### 4. Lack of Review Process
- No systematic review before/after changes
- No clear acceptance criteria
- No signoff process
- Changes get merged with known issues

## Solutions

### 1. One Action at a Time
- Complete full refactoring of single action before moving to next
- Full test coverage for each action
- Document all changes and decisions
- Get explicit signoff before proceeding

### 2. Three-Phase Pattern Implementation
```typescript
// Consistent structure for ALL actions
interface Action {
  id: string;
  validate(context: ActionContext): ValidationResult;
  execute(context: ActionContext): SemanticEvent[];
}
```

### 3. Standardized Event Data
- All events must have typed data interfaces
- Data must be extensible by stories/extensions
- Clear documentation of available event hooks

### 4. Trait/Behavior Documentation
- Explicitly document which traits are required
- Document which behaviors are checked
- Document customization points

### 5. Review and Signoff Process
- Pre-refactor review to understand current state
- Design spec for target state
- Implementation with tests
- Post-refactor review
- Explicit signoff required

## Things to Look Out For

### During Analysis
- [ ] Hidden dependencies on other actions
- [ ] Implicit trait requirements
- [ ] Event handlers in stories that depend on current structure
- [ ] Parser dependencies (grammar rules)
- [ ] Test coverage gaps

### During Implementation
- [ ] Maintain backward compatibility of events
- [ ] Preserve all customization points
- [ ] Ensure all error cases are handled
- [ ] Verify all test scenarios still pass
- [ ] Check for performance regressions

### During Review
- [ ] All IF conventions followed
- [ ] Three-phase pattern correctly implemented
- [ ] Events properly typed and documented
- [ ] Tests comprehensive and passing
- [ ] Documentation updated

## Process for Each Action

1. **Pre-Refactor Analysis**
   - Current implementation review
   - Identify all dependencies
   - Document current behavior
   - List all problems

2. **Design Specification**
   - Target architecture
   - Event data structures
   - Trait requirements
   - Test scenarios

3. **Implementation**
   - Follow three-phase pattern
   - Implement with tests
   - Document changes

4. **Review**
   - Code review
   - Test review
   - Documentation review

5. **Signoff**
   - All tests passing
   - Documentation complete
   - No regressions
   - Explicit approval

## Priority Order

Start with simpler actions and build up to complex ones:

1. **Simple State Changes**: waiting, looking, inventory
2. **Basic Manipulation**: taking, dropping, examining
3. **Container Operations**: putting, inserting, removing
4. **Movement**: going, entering, exiting, climbing
5. **Complex Interactions**: giving, showing, asking, telling
6. **Specialized Actions**: locking, unlocking, switching, wearing

## Success Criteria

Each action must have:
- [ ] Complete three-phase implementation
- [ ] Full test coverage
- [ ] Typed event data structures
- [ ] Documentation of traits/behaviors
- [ ] Pre and post refactor reviews
- [ ] Explicit signoff

## Anti-Patterns to Avoid

1. **No Batch Changes**: Never use sed/awk/grep to change multiple files
2. **No Assumptions**: Always verify trait requirements
3. **No Shortcuts**: Complete full process for each action
4. **No Moving On**: Don't start next action until current is signed off