# Again Action Design Review

## Current Implementation Analysis

### Overview
The `again` action (also known as `G` in many IF games) allows players to repeat their last command. This is a meta-action that requires access to command history and re-execution capabilities.

### Current Structure (Two-Phase)
```typescript
validate(context): ValidationResult
execute(context): ISemanticEvent[]
```

### Current Problems

1. **Duplicated Logic**: The execute method duplicates all validation logic from validate()
   - Lines 99-135 duplicate lines 36-77 almost exactly
   - Non-repeatable action list defined twice
   - Error handling logic repeated

2. **Wrong Pattern**: Returns events from execute() instead of following three-phase pattern

3. **State Management Issues**: 
   - Creates `AgainState` interface but doesn't use it properly
   - State data prepared in validate() but not passed through sharedData
   - Execute() has to reconstruct everything from scratch

4. **Complex Dependencies**: 
   - Requires command history capability
   - Needs to emit special `execute_command` event for engine integration
   - Engine must handle command re-execution

## Three-Phase Design

### Core Responsibilities
1. **Validate**: Check if there's a command to repeat and if it's repeatable
2. **Execute**: No world mutations (meta-action)
3. **Report**: Emit events for command repetition

### State Management via sharedData
```typescript
interface AgainSharedData {
  lastEntry: CommandHistoryEntry;
  repeatingData: RepeatingCommandEventData;
  executeData: ExecuteCommandEventData;
}
```

### Validation Rules
- Command history must exist and have entries
- Last command must not be in non-repeatable list:
  - AGAIN (prevent infinite loop)
  - SAVING, RESTORING (system operations)
  - QUITTING, RESTARTING (game state changes)
  - VERSION, VERIFYING (informational only)

### Event Flow
1. `if.event.repeating_command` - Notification about what's being repeated
2. `action.success` with 'repeating' message - User feedback
3. `if.event.execute_command` - Instruction to engine to re-run command

## Implementation Notes

### Special Considerations
1. **Engine Integration**: The `execute_command` event requires special handling by the engine
2. **Turn Counting**: Should repeating a command increment the turn counter?
3. **History Updates**: Should the repeated command be added to history again?

### Message Requirements
- `no_command_to_repeat`: When history is empty
- `cant_repeat_again`: Special case for trying to repeat AGAIN
- `cant_repeat_meta`: Generic message for non-repeatable meta-actions
- `repeating`: Feedback message showing what command is being repeated

### Testing Coverage
Current tests are comprehensive:
- Empty history scenarios
- Repeatable actions (TAKING, GOING, EXAMINING)
- Non-repeatable actions (all meta-commands)
- Complex commands with indirect objects
- Multiple command history

## Refactoring Strategy

### Phase 1: Extract Shared Logic
1. Move non-repeatable action list to constants
2. Create helper function for checking repeatability
3. Use sharedData to pass state from validate to report

### Phase 2: Three-Phase Implementation
1. Validate: Check history and repeatability, store in sharedData
2. Execute: Empty (no world mutations)
3. Report: Generate events from sharedData

### Phase 3: Simplify Event Data
Consider if we need both `RepeatingCommandEventData` and `ExecuteCommandEventData` or if they can be combined.

## Questions for Consideration

1. **Command Re-execution**: Should this be handled by the engine or should the action itself somehow trigger it?
2. **Error Recovery**: What happens if the repeated command fails?
3. **Context Preservation**: Should we preserve any context from the original command execution?
4. **Chaining**: Should multiple AGAINs in a row repeat the same command or go back through history?

## Recommendation

The again action is a good candidate for three-phase refactoring. The main complexity lies in its integration with the engine for command re-execution. The duplication of validation logic is a clear code smell that the three-phase pattern will resolve.

Key benefits of refactoring:
- Eliminates duplicated validation logic
- Proper state management through sharedData
- Cleaner separation of concerns
- Consistent with other refactored actions