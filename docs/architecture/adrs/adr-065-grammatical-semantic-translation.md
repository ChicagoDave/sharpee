# ADR-065: Grammatical to Semantic Translation Framework

Status: **Foolish/Not Implemented**

## Context

During refactoring of the opening action, we noticed that events contain fields like `targetId`, `containerId`, `recipientId` etc., which are essentially renamed versions of `directObjectId` and `indirectObjectId` from the parsed command.

This led to a discussion about whether we should:
1. Standardize on grammatical terms (`directObjectId`, `indirectObjectId`) everywhere
2. Keep action-specific semantic terms (`target`, `container`, `recipient`)
3. Create a formal framework for translating between grammatical and semantic roles

## Decision

**Not Implemented** - We decided this would be over-engineering.

## Considered Approach (That We Wisely Rejected)

We explored creating a formal semantic mapping configuration:

```typescript
interface SemanticMapping {
  roles: {
    directObject?: string;
    indirectObject?: string;
  };
  prepositionMappings?: {
    [prep: string]: {
      indirectObject: string;
    };
  };
  constraints?: {
    [role: string]: (entity: IFEntity) => boolean;
  };
}

// Example for PUTTING action
const puttingSemantics: SemanticMapping = {
  roles: {
    directObject: 'item'
  },
  prepositionMappings: {
    'in': { indirectObject: 'container' },
    'on': { indirectObject: 'supporter' }
  },
  constraints: {
    container: (e) => e.has(TraitType.CONTAINER),
    supporter: (e) => e.has(TraitType.SUPPORTER)
  }
};
```

This would have enabled automatic context building, validation, and type-safe semantic contexts.

## Why This Is Over-Engineering

1. **Current approach is simple and clear** - Each action just uses meaningful variable names
2. **No actual problem to solve** - The code is already self-documenting
3. **Adds complexity without benefit** - A framework for something that's just variable naming
4. **Violates YAGNI** - We don't need this level of abstraction

## What We Actually Learned

1. **Each action is its own bounded context** - With its own ubiquitous language (OPENING speaks of "targets", GIVING speaks of "recipients")
2. **The transformation is valuable** - Converting from grammatical (what the parser sees) to semantic (what the action means) adds clarity
3. **Simple code is good code** - Just using clear variable names achieves the same goal without a framework

## Actual Decision

Keep the current pattern where each action:
- Takes what it needs from `command.directObject.entity` and `command.indirectObject.entity`
- Names these appropriately for its domain (`target`, `container`, `gift`, etc.)
- Emits events with semantically meaningful field names
- Documents its expectations through code, not configuration

## Consequences

### Good
- Code remains simple and readable
- No unnecessary abstraction layers
- Each action clearly expresses its intent
- No learning curve for a custom framework

### Bad
- No formal documentation of semantic mappings (but the code itself serves this purpose)
- No automatic validation based on semantic roles (but each action validates what it needs)

## Lesson Learned

When you find yourself designing a `SemanticMappingConfigurationFactory`, you've probably gone too far. Sometimes a `target` is just a renamed `directObject`, and that's okay.

## References

- Design review discussion in `/docs/work/opening/`
- The moment we realized we were over-engineering: "OR am I trying to over-engineer something we can just leave alone?"