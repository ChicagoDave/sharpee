# ADR-005: Action Interface Location and ValidatedCommand Design

## Status
Accepted

## Date
2025-06-30

## Context
During Phase 3.7 refactoring, we discovered a conflict between two ActionContext interfaces:
- One in `@sharpee/stdlib` (rich, IF-specific with player, location, visibility checks)
- One in `@sharpee/world-model` (minimal, generic with just world access)

The `ValidatedCommand` interface in world-model was holding a direct reference to an Action handler, creating a coupling between world-model and action execution.

## Decision
1. Remove the Action interface from `@sharpee/world-model` entirely
2. Change `ValidatedCommand` to store only the action ID (string) instead of the action handler reference
3. Keep all action-related interfaces and implementations in `@sharpee/stdlib`
4. The command executor will look up actions by ID from the ActionRegistry

## Consequences

### Positive
- Clear separation of concerns: world-model handles state, stdlib handles execution
- No more ActionContext conflicts between packages
- Actions remain traceable through the registry pattern
- Prevents bypassing registered actions with anonymous functions
- Simpler dependency graph

### Negative
- Slight performance overhead of registry lookup (negligible)
- Cannot inject custom action handlers inline (by design)

### Neutral
- ValidatedCommand becomes a pure data structure
- Action resolution happens in the executor, not the validator

## Implementation
1. Remove `interfaces/action.ts` from world-model
2. Update `ValidatedCommand` to use `actionId: string` instead of `actionHandler: Action`
3. Update `CommandValidator` to store action ID instead of handler reference
4. Update `CommandExecutor` to look up actions from registry using the ID
5. Remove the `extends Action` from `ActionExecutor` in stdlib

## Example

Before:
```typescript
export interface ValidatedCommand {
  parsed: ParsedCommand;
  actionHandler: Action;  // Direct reference
  // ...
}
```

After:
```typescript
export interface ValidatedCommand {
  parsed: ParsedCommand;
  actionId: string;  // Just the ID
  // ...
}
```

## Related
- ADR-004: Parser-Validation-Execution Separation
- Phase 3.7: Core Refactoring
