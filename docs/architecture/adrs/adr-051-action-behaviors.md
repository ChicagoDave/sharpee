# ADR-051: Action Behaviors for Complex Action Handling

## Status
Superseded by ADR-052 (Event Handlers for Custom Game Logic)

## Context

Actions in the stdlib have grown complex, particularly for actions like `pulling`, `pushing`, and `giving` that need to handle many different object types and trait combinations. Currently, these actions contain large switch statements and deeply nested conditionals that make them difficult to maintain, test, and extend.

### Current Problems

1. **Monolithic Actions**: Single action files exceed 400 lines with complex switch statements
2. **State Sharing Issues**: The validate() and execute() methods were attempting to share state, violating the ValidationResult interface
3. **Difficult to Extend**: Adding new variants requires modifying core action files
4. **Hard to Test**: Testing specific scenarios requires executing the entire action
5. **Code Duplication**: Logic is duplicated between validate() and execute() methods

### Example of Current Complexity

```typescript
// pulling.ts currently has:
validate(context: ActionContext): ValidationResult {
  // 50+ lines of validation
  switch(pullableTrait.pullType) {
    case 'lever':  // 40 lines
    case 'cord':   // 60 lines  
    case 'bell':   // 50 lines
    case 'heavy':  // 30 lines
    // etc...
  }
}

execute(context: ActionContext): SemanticEvent[] {
  // Must rebuild all the same logic
  switch(pullableTrait.pullType) {
    case 'lever':  // 40 lines
    case 'cord':   // 60 lines
    // etc...
  }
}
```

## Decision

Introduce **ActionBehaviors** - a new abstraction in stdlib that handles specific action+trait combinations. ActionBehaviors complement the existing Behavior system in world-model:

- **Behaviors** (world-model): Manipulate trait data and entity state
- **ActionBehaviors** (stdlib): Handle user commands and generate events

### Architecture

```
world-model/
  behaviors/              # TraitBehaviors - pure game logic
    OpenableBehavior.ts   # knows how to open things
    LockableBehavior.ts   # knows how to lock/unlock
    
stdlib/
  action-behaviors/       # ActionBehaviors - command handling
    pulling/
      LeverPullBehavior.ts   # handles "pull lever" command
      CordPullBehavior.ts    # handles "pull cord" command
    pushing/
      ButtonPushBehavior.ts  # handles "push button" command
```

### Key Design Points

1. **ActionBehaviors use TraitBehaviors**: They delegate state manipulation to world-model behaviors
2. **Registration System**: ActionBehaviors register themselves with actions
3. **Priority-based Matching**: Behaviors can specify priority for handling
4. **Clean Separation**: World-model remains pure, stdlib handles UI/command concerns

### Example Implementation

```typescript
// stdlib/action-behaviors/pulling/LeverPullBehavior.ts
export class LeverPullBehavior extends ActionBehavior {
  static canHandle(entity: IFEntity, actionId: string): boolean {
    return actionId === IFActions.PULLING && entity.has(TraitType.LEVER);
  }
  
  static validate(entity: IFEntity, context: ActionContext): ValidationResult {
    const lever = entity.get(TraitType.LEVER);
    if (lever.stuck) {
      return { valid: false, error: 'lever_stuck' };
    }
    return { valid: true };
  }
  
  static execute(entity: IFEntity, context: ActionContext): ActionResult {
    // Use world-model behavior for the operation
    const result = LeverBehavior.toggle(entity);
    
    // Convert to action result
    return {
      events: [{
        type: 'if.event.pulled',
        data: {
          target: entity.id,
          oldPosition: result.oldPosition,
          newPosition: result.newPosition
        }
      }],
      messageId: result.springLoaded ? 'lever_springs_back' : 'lever_clicked',
      params: { target: entity.name }
    };
  }
}

// Simplified pulling action
export const pullingAction: Action = {
  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;
    if (!target) return { valid: false, error: 'no_target' };
    
    const behavior = ActionBehaviorRegistry.find(target, IFActions.PULLING);
    if (!behavior) return { valid: false, error: 'not_pullable' };
    
    return behavior.validate(target, context);
  },
  
  execute(context: ActionContext): SemanticEvent[] {
    const target = context.command.directObject?.entity;
    if (!target) return [];
    
    const behavior = ActionBehaviorRegistry.find(target, IFActions.PULLING);
    if (!behavior) return [];
    
    const result = behavior.execute(target, context);
    return this.convertToEvents(result, context);
  }
};
```

## Note on Supersession

This ADR was superseded by ADR-052 after discovering a fundamental limitation: ActionBehaviors assumed that generic patterns exist for handling objects, but in interactive fiction, every pushable/pullable object typically needs unique, story-specific logic. The event handler system (ADR-052) provides a more direct and flexible solution by allowing entities and stories to define their own custom handlers for events.

See ADR-052 for the replacement architecture.

## Consequences

### Positive

1. **Separation of Concerns**: Each behavior handles one specific case
2. **Testability**: Each behavior can be tested in isolation
3. **Maintainability**: Changes to lever logic don't affect cord logic
4. **Extensibility**: New behaviors can be added without modifying actions
5. **Code Reuse**: ActionBehaviors can use existing TraitBehaviors
6. **Cleaner Actions**: Actions become simple dispatchers
7. **Type Safety**: Full TypeScript support throughout

### Negative

1. **More Files**: What was one file becomes multiple files
2. **Indirection**: Another layer of abstraction to understand
3. **Registry Complexity**: Need to manage behavior registration
4. **Learning Curve**: Developers need to understand the pattern

### Neutral

1. **Performance**: Negligible impact - registry lookup is fast
2. **Bundle Size**: More files but similar total code size
3. **Migration Effort**: Can be done incrementally

## Implementation Plan

### Phase 1: Infrastructure
1. Create ActionBehavior base class
2. Create ActionBehaviorRegistry
3. Define ActionResult interface

### Phase 2: Pilot
1. Refactor pulling action to use ActionBehaviors
2. Create behaviors for lever, cord, heavy variants
3. Validate the pattern works

### Phase 3: Rollout
1. Refactor other complex actions (pushing, giving, going)
2. Keep simple actions as-is
3. Document patterns for extension authors

### Phase 4: Optimization
1. Add auto-discovery of behaviors
2. Implement priority system
3. Add debugging tools

## Alternatives Considered

1. **Keep current approach**: Continue with monolithic actions
   - Rejected: Maintainability issues will worsen
   
2. **Split into multiple actions**: Have pulling-lever, pulling-cord as separate actions
   - Rejected: Would break the command interface
   
3. **Use only helper functions**: Extract logic into functions without new abstraction
   - Rejected: Doesn't solve extensibility problem
   
4. **Extend Traits with methods**: Make traits handle actions directly
   - Rejected: Violates separation between data and logic

## References

- ADR-041: Simplified Event System
- ADR-042: Action Organization
- Current Behavior system in world-model
- Similar patterns in other IF systems (Inform 7's rulebooks)

## Notes

The name "ActionBehavior" was chosen because:
1. It's clearly related to but distinct from TraitBehaviors
2. It accurately describes what they do - handle action behavior
3. It maintains consistency with existing naming conventions

This pattern is inspired by:
- Strategy pattern for handling variants
- Plugin architecture for extensibility
- Inform 7's rulebook system for IF actions