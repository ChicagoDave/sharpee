# Naming Conventions

## Interface Naming Convention

**Decision**: Use `I` prefix for all TypeScript interfaces.

### Rationale
1. **Clarity**: Immediately distinguishes interfaces from classes and types
2. **Prevents Conflicts**: Avoids naming collisions when interface and implementation share conceptual names
3. **Industry Standard**: Common in C#, Java (with 'I'), and enterprise TypeScript
4. **Self-Documenting**: Code readers instantly know they're looking at a contract, not an implementation

### Examples
```typescript
// Interfaces
export interface IAction { ... }
export interface ICommandValidator { ... }
export interface IScopeResolver { ... }

// Implementations
export class StandardAction implements IAction { ... }
export class CommandValidator implements ICommandValidator { ... }
export class StandardScopeResolver implements IScopeResolver { ... }
```

### Exceptions
- **Enums**: No prefix (e.g., `ScopeLevel`, `IFActions`)
- **Type Aliases**: No prefix (e.g., `type MessageKey = string`)
- **Pure Data Types**: Consider case-by-case (lean toward `I` prefix for consistency)

### Migration
When refactoring existing code:
1. Add `I` prefix to interface in if-domain
2. Keep class names unchanged where possible
3. Provide type aliases for backward compatibility if needed

### Benefits
- No more interface/class name conflicts
- Clearer code architecture
- Easier to identify extension points
- Consistent with dependency injection patterns

### Trade-offs
- Breaks from some TypeScript style guides (e.g., Microsoft's)
- Requires updating existing code
- May feel redundant in pure TypeScript projects

However, for a complex system like Sharpee with multiple implementations of core interfaces, the clarity benefits outweigh the costs.