# ADR-060: Refactor CommandExecutor to Thin Orchestrator

## Status
Proposed

## Context
During Phase 3 of the atomic events refactor, we discovered that `CommandExecutor` has become a 700+ line god object with too many responsibilities:

1. **Parser integration** - Parsing input and handling parse events
2. **Validation orchestration** - Running validators and creating validation events  
3. **Action execution** - Managing the action lifecycle
4. **Event factory** - Creating error events, system events, validation events
5. **Error handling** - Converting various failures into events
6. **Context creation** - Building ActionContext with helper methods
7. **Backward compatibility** - Supporting both old and new action patterns

This violates several SOLID principles and makes the code difficult to understand, test, and extend.

## Decision
Refactor CommandExecutor to be a thin orchestrator that only coordinates the command execution phases. Actions will own their complete lifecycle through the three-phase pattern (validate/execute/report).

### New Architecture

```typescript
class CommandExecutor {
  async execute(input: string, world: IWorldModel, context: GameContext): Promise<CommandResult> {
    // 1. Parse
    const parsed = await this.parser.parse(input);
    if (!parsed.success) {
      return { success: false, events: parsed.events };
    }
    
    // 2. Resolve entities
    const command = await this.validator.resolve(parsed, world);
    if (!command.success) {
      return { success: false, events: command.events };
    }
    
    // 3. Get action and create context
    const action = this.registry.get(command.actionId);
    const actionContext = createActionContext(world, context.player, action, command);
    
    // 4. Validate
    const validation = action.validate(actionContext);
    if (!validation.valid) {
      (actionContext as any)._validationError = validation;
      return {
        success: false,
        events: action.report(actionContext)
      };
    }
    
    // 5. Execute
    action.execute(actionContext);
    
    // 6. Report
    return {
      success: true,
      events: action.report(actionContext)
    };
  }
}
```

### Key Changes

1. **Actions create ALL their events** - Success, validation errors, and execution errors are all created in the action's `report()` phase

2. **CommandExecutor only orchestrates** - It calls phases but doesn't create events or handle errors directly

3. **Parser owns parse events** - Parser returns its own events on failure

4. **Validator owns validation events** - Validator returns its own events for resolution failures

5. **Consistent event creation** - All events are created with full context in the appropriate component

## Consequences

### Positive
- **Simpler code** - CommandExecutor reduces from 700+ lines to ~100 lines
- **Better encapsulation** - Each component owns its responsibilities fully
- **Easier testing** - Less mocking required, clearer boundaries
- **Consistent events** - All action events created in one place with full context
- **Extensibility** - New features don't require modifying CommandExecutor

### Negative
- **Migration effort** - All actions need updating to handle error events in report()
- **Breaking change** - Changes the responsibility model for actions
- **Initial complexity** - Actions become slightly more complex (but more self-contained)

## Implementation Plan

### Phase 1: Update Action Interface Documentation
- Clarify that report() handles ALL event creation
- Document the pattern for handling validation errors in report()

### Phase 2: Prototype with One Action
- Update `taking.ts` to handle validation errors in report()
- Test the pattern thoroughly

### Phase 3: Refactor CommandExecutor
- Strip out event creation logic
- Reduce to pure orchestration
- Move helper functions to appropriate modules

### Phase 4: Migrate All Actions
- Update each action to handle its error events
- Ensure backward compatibility during migration

### Phase 5: Clean Up
- Remove dead code
- Update tests
- Document the new pattern

## Alternative Considered

**Keep CommandExecutor as-is**: We could leave the current architecture, but this perpetuates the design flaw and makes future changes harder.

**Partial refactor**: We could move some responsibilities but keep error event creation centralized. This doesn't fully solve the problem and leaves unclear boundaries.

## References
- ADR-058: Three-Phase Action Pattern
- Issue: Phase 3.2 validation event enhancement revealed the design flaw
- Original atomic events refactor plan