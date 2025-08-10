# Stdlib Behavior Integration Refactoring Plan

## The Blunder

We designed an elegant behavior system in world-model with traits (data) and behaviors (logic), but then completely ignored it in stdlib. Every action reimplements business logic that already exists in behaviors. This is a fundamental architectural failure that creates:

- **Massive code duplication** - Same logic exists in behaviors AND actions
- **Inconsistent validation** - Different approaches in different places  
- **Maintenance nightmare** - Changes need to be made in multiple locations
- **Wasted abstraction** - Sophisticated behavior APIs sitting unused
- **Bug proliferation** - Each reimplementation is a chance for new bugs

## The Fix

Refactor ALL stdlib actions to properly delegate to behaviors instead of reimplementing logic.

## The Original Validate/Execute Pattern

When we designed behaviors, we established a two-phase pattern that should flow through the entire system:

### Current (BROKEN) Flow
1. **Parser** → ParsedCommand
2. **CommandValidator** → ValidatedCommand (generic validation only)
3. **Action.execute()** → SemanticEvent[] (no action-specific validation!)

### Intended Flow
1. **Parser** → ParsedCommand
2. **CommandValidator** → ValidatedCommand (generic entity resolution, scope)
3. **Action.validate()** → ValidationResult (action-specific validation using behaviors)
4. **Action.execute()** → SemanticEvent[] (execution using behaviors)

### The Two-Phase Pattern at Each Level

#### Actions Should Have:
```typescript
interface Action {
  // REQUIRED: Validate if this action can proceed
  validate(context: ActionContext): ValidationResult;
  
  // Execute only if validation passed
  execute(context: ActionContext): SemanticEvent[];
}
```

#### Behaviors Already Have:
- **Phase 1: Validate** - `canOpen()`, `canClose()`, `canLock()`, `canAccept()`, etc.
- **Phase 2: Execute** - `open()`, `close()`, `lock()`, `addItem()`, etc.

### What's Missing
1. **Actions don't have required validate() method** - They jump straight to execute
2. **Actions use optional canExecute()** - Should be required validate()
3. **No enforcement of validate-before-execute** - Execute runs without validation
4. **Behaviors' validation methods unused** - Actions reimplement checks in execute

This pattern ensures:
- Clear separation of concerns
- Predictable execution flow  
- Reusable validation logic
- Consistent state management
- Proper event generation

## Architectural Pattern (What We Should Have Done)

### Current (WRONG) Pattern
```typescript
// Action directly manipulates traits and implements logic
class OpenAction extends Action {
  execute(context) {
    const openable = entity.get(TraitType.OPENABLE);
    if (openable.isOpen) {
      return error("Already open"); // Logic in action
    }
    openable.isOpen = true; // Direct manipulation
    return success();
  }
}
```

### Correct Pattern - Separate Validate and Execute Methods
```typescript
// Action properly separates validation from execution
class OpenAction extends Action {
  // Phase 1: VALIDATE using behavior's validation methods
  validate(context: ActionContext): ValidationResult {
    const entity = context.command.directObject?.entity;
    
    if (!entity) {
      return { valid: false, error: 'no_target' };
    }
    
    if (!entity.has(TraitType.OPENABLE)) {
      return { valid: false, error: 'not_openable' };
    }
    
    // Use behavior's canOpen for validation
    if (!OpenableBehavior.canOpen(entity)) {
      return { valid: false, error: 'already_open' };
    }
    
    // Check lock status using LockableBehavior validation
    if (entity.has(TraitType.LOCKABLE) && LockableBehavior.isLocked(entity)) {
      return { valid: false, error: 'locked' };
    }
    
    return { valid: true };
  }
  
  // Phase 2: EXECUTE using behavior's execution method
  execute(context: ActionContext): SemanticEvent[] {
    const entity = context.command.directObject?.entity!;
    const actor = context.player;
    
    // Delegate ALL execution to behavior
    return OpenableBehavior.open(entity, actor);
  }
}
```

With this pattern:
1. **CommandExecutor calls validate()** - Returns early if invalid
2. **Only if valid, calls execute()** - Clean execution without validation logic
3. **Behaviors provide both phases** - `canOpen()` for validation, `open()` for execution

## Concrete Example of the Duplication

Here's a real example showing how `openingAction` duplicates logic that already exists in `OpenableBehavior`:

### Current openingAction.ts (Lines 58-81) - DUPLICATING LOGIC
```typescript
// Check if already open
if (openableTrait && (openableTrait as any).isOpen) {
  return [context.event('action.error', {
    actionId: context.action.id,
    messageId: 'already_open',
    reason: 'already_open',
    params: { item: noun.name }
  })];
}

// Check if locked
if (noun.has(TraitType.LOCKABLE)) {
  const lockableTrait = noun.get(TraitType.LOCKABLE);
  if (lockableTrait && (lockableTrait as any).isLocked) {
    return [context.event('action.error', {
      actionId: context.action.id,
      messageId: 'locked',
      reason: 'locked',
      params: { item: noun.name }
    })];
  }
}
```

### OpenableBehavior.ts (Lines 39-65) - EXISTING LOGIC WE'RE NOT USING
```typescript
static open(entity: IFEntity, actor: IFEntity): SemanticEvent[] {
  const openable = OpenableBehavior.require<OpenableTrait>(entity, TraitType.OPENABLE);
  
  if (openable.isOpen) {
    return [createEvent(
      IFEvents.ACTION_FAILED,
      {
        action: 'open',
        reason: 'already_open',
        customMessage: openable.alreadyOpenMessage
      },
      { target: entity.id, actor: actor.id }
    )];
  }
  
  // Open it
  openable.isOpen = true;
  
  return [createEvent(
    IFEvents.OPENED,
    {
      customMessage: openable.openMessage,
      sound: openable.openSound,
      revealsContents: openable.revealsContents
    },
    { target: entity.id, actor: actor.id }
  )];
}
```

### What openingAction SHOULD look like (Two-Phase Pattern):
```typescript
execute(context: ActionContext): SemanticEvent[] {
  const noun = context.command.directObject?.entity;
  const actor = context.player;
  
  // Phase 1: VALIDATE
  
  // Basic entity validation
  if (!noun) {
    return [context.event('action.error', { 
      messageId: 'no_target' 
    })];
  }
  
  // Check trait requirement
  if (!noun.has(TraitType.OPENABLE)) {
    return [context.event('action.error', {
      messageId: 'not_openable',
      params: { item: noun.name }
    })];
  }
  
  // Use behavior's validation method
  if (!OpenableBehavior.canOpen(noun)) {
    // The behavior knows WHY it can't be opened
    const openable = noun.get(TraitType.OPENABLE);
    return [context.event('action.error', {
      messageId: 'already_open',
      params: { item: noun.name }
    })];
  }
  
  // Check lock status using behavior validation
  if (noun.has(TraitType.LOCKABLE) && LockableBehavior.isLocked(noun)) {
    return [context.event('action.error', {
      messageId: 'locked',
      params: { item: noun.name }
    })];
  }
  
  // Phase 2: EXECUTE
  
  // Delegate execution to behavior - it handles:
  // - State mutation (setting isOpen = true)
  // - Event creation with proper data
  // - Custom messages and sounds
  // - Revealing contents flag
  return OpenableBehavior.open(noun, actor);
}
```

The behavior already handles:
- Checking if already open
- Setting the isOpen flag
- Creating proper events
- Custom messages
- Sound effects
- Revealing contents flag

But we're ignoring all of that and reimplementing it poorly in the action!

## Behaviors That Need Integration

### Core Behaviors in world-model
- [x] OpenableBehavior (open, close, canOpen, canClose, isOpen)
- [x] LockableBehavior (lock, unlock, canLock, canUnlock, isLocked)
- [x] ContainerBehavior (canAccept, addItem, removeItem, getContents, checkCapacity)
- [x] PortableBehavior (canCarry, calculateWeight)
- [x] WearableBehavior (wear, remove, canWear)
- [x] EditableBehavior (edit operations)
- [x] LightSourceBehavior (turnOn, turnOff, isLit)
- [x] SupportBehavior (canSupport, addItem, removeItem)
- [x] ScriptableBehavior (script execution)

## Actions That Need Refactoring

### Opening/Closing Actions
- [ ] OpenAction - Should use OpenableBehavior.open()
- [ ] CloseAction - Should use OpenableBehavior.close()
- [ ] LockAction - Should use LockableBehavior.lock()
- [ ] UnlockAction - Should use LockableBehavior.unlock()

### Container Actions
- [ ] PutAction - Should use ContainerBehavior.canAccept() and addItem()
- [ ] InsertAction - Should use ContainerBehavior.addItem()
- [ ] RemoveAction - Should use ContainerBehavior.removeItem()
- [ ] EmptyAction - Should use ContainerBehavior.empty()

### Inventory Actions
- [ ] TakeAction - Should use PortableBehavior.canCarry() and ContainerBehavior.removeItem()
- [ ] DropAction - Should use ContainerBehavior.addItem() for room
- [ ] GiveAction - Should use transfer behaviors
- [ ] ThrowAction - Should use PortableBehavior checks

### Wearable Actions
- [ ] WearAction - Should use WearableBehavior.wear()
- [ ] RemoveAction (clothing) - Should use WearableBehavior.remove()

### Support Actions
- [ ] PutOnAction - Should use SupportBehavior.canSupport() and addItem()
- [ ] GetOffAction - Should use SupportBehavior.removeItem()

### Light Actions
- [ ] TurnOnAction - Should use LightSourceBehavior.turnOn()
- [ ] TurnOffAction - Should use LightSourceBehavior.turnOff()
- [ ] LightAction - Should use LightSourceBehavior.light()
- [ ] ExtinguishAction - Should use LightSourceBehavior.extinguish()

### Other Actions
- [ ] ExamineAction - Should use multiple behaviors for detailed info
- [ ] SearchAction - Should use ContainerBehavior.getContents()
- [ ] LookInAction - Should use ContainerBehavior.getContents()
- [ ] LookUnderAction - Should check support/container behaviors

## Refactoring Checklist

### Phase 1: Setup and Infrastructure
- [ ] Update Action interface to require validate() method
- [ ] Update CommandExecutor to call validate() before execute()
- [ ] Create ValidationResult type for action validation
- [ ] Update all action base classes with validate/execute pattern
- [ ] Create behavior integration test suite
- [ ] Document all current logic duplications
- [ ] Identify missing behaviors that need creation
- [ ] Set up behavior mock utilities for testing

### Phase 2: Core Opening/Locking Actions
- [ ] Refactor OpenAction to use OpenableBehavior
- [ ] Refactor CloseAction to use OpenableBehavior
- [ ] Refactor LockAction to use LockableBehavior
- [ ] Refactor UnlockAction to use LockableBehavior
- [ ] Update tests for opening/locking actions
- [ ] Verify Cloak of Darkness still works

### Phase 3: Container Actions
- [ ] Refactor PutAction to use ContainerBehavior
- [ ] Refactor InsertAction to use ContainerBehavior
- [ ] Refactor RemoveAction to use ContainerBehavior
- [ ] Refactor EmptyAction to use ContainerBehavior
- [ ] Update container action tests
- [ ] Test container capacity and restrictions

### Phase 4: Inventory Management
- [ ] Refactor TakeAction to use PortableBehavior + ContainerBehavior
- [ ] Refactor DropAction to use behaviors
- [ ] Refactor GiveAction to use transfer patterns
- [ ] Refactor ThrowAction with proper checks
- [ ] Update inventory tests
- [ ] Test weight/bulk calculations

### Phase 5: Wearable Actions
- [ ] Refactor WearAction to use WearableBehavior
- [ ] Refactor RemoveAction for clothing
- [ ] Add proper layering support
- [ ] Update wearable tests

### Phase 6: Support Surface Actions
- [ ] Refactor PutOnAction to use SupportBehavior
- [ ] Refactor GetOffAction to use SupportBehavior
- [ ] Test support surface capacity
- [ ] Verify object stacking

### Phase 7: Light Source Actions
- [ ] Refactor TurnOnAction to use LightSourceBehavior
- [ ] Refactor TurnOffAction to use LightSourceBehavior
- [ ] Refactor LightAction to use behaviors
- [ ] Refactor ExtinguishAction to use behaviors
- [ ] Test light source state management

### Phase 8: Information Actions
- [ ] Refactor ExamineAction to aggregate behavior info
- [ ] Refactor SearchAction to use ContainerBehavior
- [ ] Refactor LookInAction to use behaviors
- [ ] Refactor LookUnderAction to check behaviors
- [ ] Update information action tests

### Phase 9: Testing and Validation
- [ ] Run full test suite
- [ ] Test Cloak of Darkness thoroughly
- [ ] Check for performance regressions
- [ ] Verify no behavior logic remains in actions
- [ ] Document any remaining issues

### Phase 10: Cleanup
- [ ] Remove all duplicate logic from actions
- [ ] Update action documentation
- [ ] Create behavior usage examples
- [ ] Write migration guide for custom actions
- [ ] Update architecture documentation

## What's NOT Affected

### Meta-Commands Are Safe
Meta-commands (debug commands, save/restore, score, etc.) will NOT be affected by this refactoring because:

1. **Different base class** - Meta-commands extend `MetaAction`, not regular `Action`
2. **No entity interaction** - Meta-commands work with system state, not game world entities
3. **No trait/behavior usage** - They manipulate capabilities, debug flags, and system concerns
4. **Already properly architected** - The meta-command system is working as designed

Examples of unaffected meta-commands:
- TraceAction - Manipulates debug capabilities
- ScoreAction - Displays game statistics  
- SaveAction/RestoreAction - System file operations
- VersionAction - Shows game metadata

These commands bypass the turn counter and command history as intended, and don't need any changes.

## Success Criteria

1. **No business logic in actions** - Actions only orchestrate behaviors
2. **All behaviors utilized** - Every behavior has at least one action using it
3. **Tests pass** - All existing tests still pass
4. **No duplication** - Logic exists in exactly one place (behaviors)
5. **Consistent validation** - All trait validation goes through behaviors
6. **Event consistency** - All state changes emit behavior events

## Risk Mitigation

1. **Test Coverage** - Write behavior integration tests FIRST
2. **Incremental Refactoring** - One action at a time
3. **Backward Compatibility** - Keep old action signatures working
4. **Performance Monitoring** - Check for slowdowns
5. **Documentation** - Document patterns as we establish them

## Lessons Learned

1. **Architecture without enforcement fails** - We need linting rules or tests that enforce behavior usage
2. **Integration tests matter** - Unit tests didn't catch this architectural violation
3. **Code reviews need architecture checks** - Not just "does it work"
4. **Document patterns with examples** - Abstract descriptions weren't enough
5. **Validate architecture early** - This should have been caught in first action implementation

## Estimated Effort

- Total actions to refactor: ~30-40
- Average time per action: 30-45 minutes (including tests)
- Total effort: 15-30 hours
- Risk: HIGH - This touches every interactive action in the system

## Next Steps

1. Start with Phase 2 (Opening/Locking) as proof of concept
2. Establish the pattern with thorough testing
3. Apply pattern systematically through all phases
4. Add architectural tests to prevent regression

This is a significant blunder but fixing it will:
- Reduce code by ~40%
- Eliminate entire classes of bugs
- Make adding new actions much simpler
- Actually use our well-designed behavior system