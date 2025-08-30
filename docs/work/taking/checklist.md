# Taking Action Refactoring Checklist

## Action: taking
## Date Started: 2025-08-29
## Date Completed: [IN PROGRESS]
## Status: [ ] Not Started [X] In Progress [ ] Complete [ ] Signed Off

---

## Phase 1: Pre-Refactor Analysis ✅

### Current State Analysis
- [X] Read current implementation files
  - [X] taking.ts - Uses three-phase pattern with validate/execute/report
  - [X] taking-events.ts - Has TakenEventData, TakingErrorData, RemovedEventData interfaces
  - [X] taking-data.ts - Uses data builder pattern for event data
- [X] Identify current pattern: **Three-phase pattern (validate/execute/report)**
- [X] Document all trait dependencies
  - SceneryTrait - checked to prevent taking fixed items
  - RoomTrait - checked to prevent taking rooms
  - WearableTrait - checked for implicit removal of worn items
  - ContainerTrait - checked for capacity constraints
  - ActorTrait - used for inventory management
- [X] Document all behavior checks
  - SceneryBehavior.getCantTakeMessage() - custom messages for fixed items
  - ActorBehavior.canTakeItem() - capacity validation
  - WearableBehavior.remove() - implicit removal of worn items
  - world.moveEntity() - actual movement (NOT using behavior!)
- [X] List all events emitted
  - 'if.event.removed' - when implicitly removing worn item
  - 'if.event.taken' - main success event
  - 'action.success' - with 'taken' or 'taken_from' message
  - 'action.error' - various error conditions
- [X] Review all tests - Golden test exists with 3-phase pattern testing
- [X] Check for parser dependencies - Used in parser grammar

### Problem Identification
- [X] List IF code smells found
  1. **Direct mutation**: Uses world.moveEntity() instead of behavior
  2. **Context pollution**: Stores _previousLocation and _implicitlyRemoved on context
  3. **Complex validation**: Validation logic should be in behaviors
  4. **Mixed responsibilities**: Execute does both removal and taking
- [X] List pattern violations
  1. Report method exists but still checking post-conditions
  2. Execute method modifies context object directly
  3. Not using proper behavior patterns for mutations
- [X] List missing validations
  1. No check for taking from locked containers
  2. No check for taking from other actors (except worn items)
  3. No visibility checks
- [X] List error handling issues
  1. Generic 'cannot_take' error lacks detail
  2. No handling of partial failures (e.g., remove succeeds but take fails)
- [X] List test coverage gaps
  1. No tests for taking from locked containers
  2. No tests for visibility/darkness
  3. No tests for custom event handlers

### Dependency Analysis
- [X] Check for dependencies on other actions
  - Implicitly performs "removing" for worn items
  - May interact with "opening" for closed containers (not implemented)
- [X] Check for story-specific event handlers - 'if.event.taken' likely has handlers
- [X] Check for extension dependencies - Capacity system may have extensions
- [X] Document backward compatibility requirements
  - Must maintain 'if.event.taken' event structure
  - Must maintain 'item' field for backward compatibility
  - Must support both 'taken' and 'taken_from' messages

---

## Phase 2: Design Specification ✅

### Three-Phase Pattern Design
- [X] Define validation logic
  - Keep validation in action, use behaviors for checks
  - ActorBehavior.canTakeItem() for capacity
  - SceneryBehavior for custom messages
  - Add visibility checks via scope
  - Add container accessibility checks
- [X] Define execution logic
  - world.moveEntity() is correct for spatial changes
  - Handle implicit removal via WearableBehavior
  - Use witness system, no context pollution
- [X] Define event structure
  - Keep existing events for compatibility
  - Remove context pollution (_previousLocation, etc.)
  - Use witness system for state tracking
- [X] Define error cases
  - Add visibility errors
  - Add container locked/closed errors
  - Keep existing error messages

### Event Data Structure
- [X] Design typed event data interface - Already exists, keep it
- [X] Ensure extensibility - Data builder pattern works well
- [X] Document all fields - Done in spec
- [X] Define event hook points - if.event.taken is main hook

### Trait/Behavior Requirements
- [X] List required traits
  - None required on target (default is takeable)
  - ActorTrait required on actor
- [X] List optional traits
  - SceneryTrait (prevents taking)
  - WearableTrait (may need removal)
  - ContainerTrait (for capacity/access)
  - LockableTrait (for locked containers)
  - RoomTrait (prevents taking)
- [X] List behavior checks
  - world.moveEntity() for movement (not a behavior)
  - ActorBehavior for capacity validation
  - WearableBehavior for removal
  - SceneryBehavior for custom messages
- [X] Document trait interactions
  - Worn items must be removed first
  - Container capacity affects taking
  - Locked/closed containers block access

### Test Scenarios
- [X] List all test cases needed
  - Basic taking from room ✓
  - Taking from container ✓
  - Taking from supporter ✓
  - Taking worn item (implicit removal) ✓
  - Capacity limits ✓
  - Taking fixed items (fail) ✓
  - Taking self (fail) ✓
  - Taking rooms (fail) ✓
  - Visibility/darkness (NEW)
  - Locked containers (NEW)
- [X] Include edge cases - Done
- [X] Include error scenarios - Done
- [X] Include customization tests - Via event handlers

---

## Phase 3: Implementation

### Prerequisites (World Events - ADR-064)
- [ ] Complete world events Phase 1 (Core Infrastructure)
  - [ ] MoveResult interface defined
  - [ ] World event types defined
  - [ ] World interface signatures updated
- [ ] Complete world events Phase 2 (Movement Implementation)
  - [ ] world.moveEntity() returns MoveResult
  - [ ] Previous location tracked in result
  - [ ] Container/supporter context in result
- [ ] Reference: `/docs/work/world/world-events-implementation-checklist.md`

### Code Changes
- [ ] Update to use MoveResult from world.moveEntity()
  - [ ] Capture MoveResult in execute()
  - [ ] Build semantic events from MoveResult
  - [ ] Remove context pollution (_previousLocation, _implicitlyRemoved)
  - [ ] Update execute() signature to return SemanticEvent[]
- [ ] Clean up validate() to use behaviors
- [ ] Ensure proper event emission
  - [ ] if.event.taken with rich context
  - [ ] if.event.removed for worn items
- [ ] Remove old pattern code
  - [ ] Remove direct context mutations
  - [ ] Remove temporary context fields
- [ ] Update imports/exports

### Event System
- [ ] Define typed event data - Already done
- [ ] Implement extensible structure - Already done
- [ ] Document event hooks
- [ ] Test event emissions

### Test Implementation
- [ ] Update existing tests
- [ ] Add new test cases
  - [ ] Locked container test
  - [ ] Visibility test
  - [ ] Custom handler test
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
- **Developer**: Claude [IN PROGRESS]
- **Reviewer**: [PENDING]
- **Approved**: [ ] Yes [X] No
- **Notes**: Phase 1 analysis complete, found several issues to address

---

## Notes and Issues

### Open Issues
1. ~~**Direct world.moveEntity() call**~~ - Will use MoveResult from world.moveEntity() (ADR-064)
2. **Context pollution** - Will be fixed by using MoveResult instead of context fields
3. ~~**Missing visibility checks**~~ - Already handled by ScopeLevel.REACHABLE
4. ~~**Missing locked container handling**~~ - Already handled by scope system
5. **Complex validation in action** - Keep simple, behaviors handle their part

### Decisions Made
1. Will maintain backward compatibility for event structure
2. Will use MoveResult from world.moveEntity() for context (ADR-064)
3. Scope system already handles visibility and container access
4. Execute() will return SemanticEvent[] directly (three-phase evolution)

### Future Improvements
1. Support for taking multiple objects ("take all")
2. Better weight/size system integration
3. Support for taking from other actors (pickpocketing?)
4. Auto-opening containers when taking from them