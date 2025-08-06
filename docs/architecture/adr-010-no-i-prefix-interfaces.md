# ADR-005: No I-Prefix for Interfaces

**Date:** 2025-06-29
**Status:** Accepted
**Context:** Interface naming convention standardization

## Context

The codebase had inconsistent interface naming - some with `I` prefix (IEntity, IParser) and some without (SemanticEvent, ParsedCommand). This inconsistency causes confusion and doesn't follow modern TypeScript conventions.

## Decision

Remove the `I` prefix from all interfaces to follow modern TypeScript conventions:
- `IEntity` → `Entity`
- `IAction` → `Action`  
- `IParser` → `Parser`
- `ICommandValidator` → `CommandValidator`
- etc.

Keep interfaces that already lack the prefix as-is.

## Consequences

### Positive
- Consistent with modern TypeScript practices
- Cleaner, more readable code
- Aligns with popular libraries (React, Node.js)
- No confusion about naming conventions

### Negative
- Breaking change for existing code
- Need to update many imports
- Potential conflicts with class names (mitigated by good naming)

## Implementation

1. Update all interface definitions to remove `I` prefix
2. Update all imports throughout codebase
3. Remove backwards compatibility aliases
4. Document convention in dev standards

## Alternatives Considered

1. **Keep I-prefix** - Rejected as outdated convention
2. **Gradual migration with aliases** - Rejected to avoid prolonged inconsistency
3. **Use different suffix** - Rejected as non-standard

## References
- TypeScript official style guide
- Modern TypeScript best practices
