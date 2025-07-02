# ADR-004: Parser-Validation-Execution Separation

**Date:** 2025-06-28
**Status:** Accepted
**Context:** Parser architecture refactor to resolve circular dependencies

## Context

The current architecture conflates parsing (syntax), validation (semantics), and execution (business logic) concerns. This causes:
- Circular dependencies between packages
- Unclear responsibilities 
- Difficult testing (parser needs world model)
- Poor error messages (can't distinguish parse vs validation errors)

## Decision

Separate command processing into three distinct phases:

1. **Parse Phase** - Convert user input to potential command structures using grammar and vocabulary only
2. **Validation Phase** - Validate parsed commands against world state and resolve references
3. **Execution Phase** - Execute validated commands to produce events

Each phase has clear inputs, outputs, and responsibilities with no knowledge of later phases.

## Consequences

### Positive
- Cleaner architecture with single responsibilities
- Better error handling with phase-specific messages
- Resolved circular dependencies
- Testable components (parser without world model)
- Consistent pattern throughout system

### Negative
- More complex pipeline with three phases
- Potential performance overhead from multiple passes
- Need to migrate existing code to new structure

## Implementation

### Type Hierarchy
```typescript
// Phase 1 Output
interface ParsedCommand {
  action: string;
  pattern: string;
  directObject?: ParsedReference;
  // No entity resolution
}

// Phase 2 Output  
interface ValidatedCommand {
  action: string;
  actionHandler: ActionExecutor;
  directObject?: Entity;
  // Fully resolved entities
}

// Phase 3 Output
type ExecutionResult = SemanticEvent[];
```

## Alternatives Considered

1. **Two-phase (parse+validate, execute)** - Rejected because validation errors would be conflated with parse errors
2. **Keep current architecture** - Rejected due to circular dependencies
3. **Combine validation+execution** - Rejected because different error handling strategies needed

## References
- Entity handler pattern (prepare/validate/execute)
- Event processing pattern (receive/validate/apply)
