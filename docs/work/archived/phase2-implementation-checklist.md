# Phase 2 Implementation Checklist

## Prerequisites ✅
- [x] Phase 1 complete - All actions use validate/execute pattern
- [x] All tests passing with current implementation
- [x] Strategy document reviewed and approved

## Phase 2A: Update Core Behaviors (Foundation)

### OpenableBehavior Updates
- [ ] Add ActionContext parameter to `open()` method signature
- [ ] Update `open()` to return SemanticEvent[] instead of OpenResult
- [ ] Ensure events match current test expectations
- [ ] Update `close()` method with same pattern
- [ ] Test OpenableBehavior in isolation

### LockableBehavior Updates  
- [ ] Add ActionContext parameter to `lock()` method signature
- [ ] Update `lock()` to return SemanticEvent[] instead of LockResult
- [ ] Add ActionContext parameter to `unlock()` method signature
- [ ] Update `unlock()` to return SemanticEvent[] instead of UnlockResult
- [ ] Test LockableBehavior in isolation

### ContainerBehavior Updates
- [ ] Review current method signatures (many return booleans)
- [ ] Identify which methods need event creation
- [ ] Add ActionContext to methods that perform state changes
- [ ] Update return types for mutation methods
- [ ] Test ContainerBehavior in isolation

## Phase 2B: Refactor Opening/Closing Actions (Pilot Group)

### OpeningAction Integration
- [ ] Update validate() to use OpenableBehavior queries only
- [ ] Replace execute() logic with OpenableBehavior.open() delegation
- [ ] Verify all opening tests still pass
- [ ] Test with Cloak of Darkness
- [ ] Document lessons learned

### ClosingAction Integration
- [ ] Update validate() to use OpenableBehavior queries only
- [ ] Replace execute() logic with OpenableBehavior.close() delegation
- [ ] Verify all closing tests still pass
- [ ] Test with Cloak of Darkness

### LockingAction Integration
- [ ] Update validate() to use LockableBehavior queries only
- [ ] Replace execute() logic with LockableBehavior.lock() delegation
- [ ] Verify all locking tests still pass

### UnlockingAction Integration
- [ ] Update validate() to use LockableBehavior queries only
- [ ] Replace execute() logic with LockableBehavior.unlock() delegation
- [ ] Verify all unlocking tests still pass

## Phase 2C: Validate Pilot Success

### Testing
- [ ] All opening/closing/locking tests pass
- [ ] Cloak of Darkness plays correctly
- [ ] No performance regressions measured
- [ ] Code duplication eliminated in pilot actions

### Review
- [ ] Behavior signatures feel correct
- [ ] Event formats match expectations
- [ ] Action code is significantly simpler
- [ ] No unexpected side effects

### Decision Point: Proceed or Adjust
- [ ] If successful: Continue to Phase 2D
- [ ] If issues: Document problems and adjust approach

## Phase 2D: Scale to Container Actions

### ContainerBehavior Completion
- [ ] Finalize container behavior event creation
- [ ] Test container behaviors in isolation

### PuttingAction Integration
- [ ] Replace validation with ContainerBehavior queries
- [ ] Replace execution with behavior delegation
- [ ] Verify putting tests pass

### InsertingAction Integration
- [ ] Update to delegate to updated PuttingAction
- [ ] Verify inserting tests pass

### RemovingAction Integration
- [ ] Replace with ContainerBehavior delegation
- [ ] Verify removing tests pass

### TakingAction Integration
- [ ] Replace with PortableBehavior + ContainerBehavior
- [ ] Verify taking tests pass

### DroppingAction Integration
- [ ] Replace with behavior delegation
- [ ] Verify dropping tests pass

## Phase 2E: Scale to Remaining Actions

### Wearable Actions
- [ ] Update WearableBehavior for event creation
- [ ] Integrate WearingAction
- [ ] Integrate TakingOffAction
- [ ] Verify wearable tests pass

### Movement Actions  
- [ ] Review EntryBehavior for event creation needs
- [ ] Integrate GoingAction if needed
- [ ] Integrate EnteringAction
- [ ] Integrate ExitingAction
- [ ] Verify movement tests pass

### Interaction Actions
- [ ] Review which behaviors are needed
- [ ] Integrate GivingAction
- [ ] Integrate ThrowingAction
- [ ] Integrate TalkingAction
- [ ] Integrate AttackingAction
- [ ] Verify interaction tests pass

### Manipulation Actions
- [ ] Review PullableBehavior, PushableBehavior needs
- [ ] Integrate PullingAction
- [ ] Integrate PushingAction
- [ ] Integrate TurningAction
- [ ] Verify manipulation tests pass

### Sensory Actions
- [ ] Review what behavior integration is needed
- [ ] Most sensory actions may not need behavior changes
- [ ] Integrate LookingAction if needed
- [ ] Integrate ExaminingAction if needed
- [ ] Integrate SearchingAction if needed
- [ ] Verify sensory tests pass

### Consumable Actions
- [ ] Review EdibleBehavior, DrinkableBehavior needs
- [ ] Integrate EatingAction if needed
- [ ] Integrate DrinkingAction if needed
- [ ] Verify consumable tests pass

### Meta Actions
- [ ] Review - meta actions likely don't need behavior integration
- [ ] Verify meta actions still work
- [ ] Most meta actions should be unchanged

## Phase 2F: Final Validation

### Comprehensive Testing
- [ ] All action tests pass (1000+ tests)
- [ ] All behavior tests pass 
- [ ] All integration tests pass
- [ ] Cloak of Darkness plays perfectly
- [ ] Performance benchmarks show no regression

### Code Quality Review
- [ ] No business logic remains in actions
- [ ] All trait validation goes through behaviors
- [ ] No code duplication between actions and behaviors
- [ ] Actions are thin orchestrators (average < 20 lines)
- [ ] Behavior event formats are consistent

### Documentation
- [ ] Update action development guide
- [ ] Document behavior integration patterns
- [ ] Create examples for new action development
- [ ] Update architectural decision records

### Architectural Tests
- [ ] Add tests that prevent logic duplication
- [ ] Add tests that enforce behavior delegation
- [ ] Add tests that validate event consistency
- [ ] Add performance regression tests

## Success Metrics

### Quantitative
- [ ] Actions reduced by 40%+ lines of code
- [ ] Zero business logic duplication detected
- [ ] All tests pass (no functionality regression)
- [ ] Performance within 5% of baseline

### Qualitative  
- [ ] New actions are much simpler to write
- [ ] Business logic changes only need behavior updates
- [ ] Event creation is consistent across all actions
- [ ] Architecture feels clean and maintainable

## Rollback Plan

### If Phase 2A Fails
- Revert behavior signature changes
- Keep Phase 1 validate/execute pattern
- Continue with current action implementations

### If Phase 2B Fails  
- Revert pilot action changes
- Keep behavior updates if they work in isolation
- Reassess strategy

### If Phase 2D+ Fails
- Revert to successful pilot implementation
- Scale more gradually or adjust approach
- Consider hybrid approaches

## Notes

- Each phase should be tested independently
- Don't proceed to next phase if current phase isn't solid
- Document all issues and decisions for future reference
- Performance should be monitored throughout
- Cloak of Darkness is our integration test - it must always work