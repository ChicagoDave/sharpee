# Parser-Validation-Execution Refactor Decision

**Date:** June 28, 2025
**Participants:** AI Assistant + Human Developer
**Status:** Approved for Implementation

## Context

During v1 assessment, we identified that the parser+grammar → validation → execution pipeline was broken due to confused responsibilities. The current architecture conflates parsing (syntax) with validation (semantics), leading to:

1. Circular dependencies between @sharpee/actions and @sharpee/stdlib
2. Parser needing world model knowledge
3. Unclear error boundaries
4. Inability to test components independently

## Key Insight

As the human developer noted: "we need to think through, in general, what the ins and outs for the parser are... here we need to validate the ParsedCommand vs the World Model. This isn't parser-ish and it's not World Model-ish....we need a new thing to validate a command -> ValidatedCommand"

This aligns with the existing entity handler pattern that separates validation from execution.

## Decision

Separate the command processing pipeline into three distinct phases:

1. **Parse** - Convert text to structured commands (syntax only)
2. **Validate** - Resolve entities and check world state (semantics)
3. **Execute** - Apply business logic and generate events

## Rationale

### Current Problems

```typescript
// Parser knows about entities (WRONG)
class Parser {
  parse(input: string, world: IWorldModel) { ... }
}

// Actions do validation and execution (MIXED)
class TakeAction {
  execute(command: ParsedCommand) {
    if (!canSee(command.noun)) return FAIL;  // Validation
    return [TAKEN_EVENT];                     // Execution
  }
}
```

### Proposed Solution

```typescript
// Parser is pure grammar (RIGHT)
parser.parse("take ball") → ParsedCommand {
  action: "TAKE",
  directObject: { text: "ball", candidates: ["ball"] }
}

// Validator resolves and checks (NEW)
validator.validate(parsed, world) → ValidatedCommand {
  action: "TAKE",
  actionHandler: TakeAction,
  directObject: Entity#ball-1
}

// Action assumes valid input (CLEAN)
action.execute(validated) → [TAKEN_EVENT]
```

## Benefits

1. **No Circular Dependencies** - Parser doesn't need actions, actions don't need parser
2. **Clear Errors** - Each phase fails differently
3. **Testability** - Parser testable without world
4. **Consistency** - Matches entity handler pattern
5. **Performance** - Can cache validations

## Implementation Priority

This is a **CRITICAL** refactor that blocks v1 release. It must be done before:
- Fixing trait property access
- Implementing text service
- Creating working examples

## References

- See `parser-validation-refactor-plan.md` for detailed implementation checklist
- Original discussion in June 28, 2025 assessment session
- Related to stdlib-rearchitecture-june.md decision