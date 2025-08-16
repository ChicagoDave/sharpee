# ADR-053: Adopt I-Prefix Convention for All TypeScript Interfaces

## Status
Proposed

## Context

The Sharpee codebase has grown to include hundreds of TypeScript interfaces across multiple packages. Currently, interfaces use the same naming convention as classes, which has led to several problems:

1. **Naming Conflicts**: When an interface and its implementation share the same conceptual name (e.g., `CommandValidator`), TypeScript's declaration merging only works if they're in the same file. This prevents us from separating interfaces into domain packages.

2. **Code Clarity**: When reading code, it's not immediately clear whether a type reference is to an interface (contract) or a class (implementation).

3. **Architectural Coupling**: The stdlib package contains both interface definitions and implementations. Extensions that only need the interface contracts must depend on the entire stdlib, pulling in ~30+ action implementations they don't use.

4. **Inconsistent Patterns**: Some packages already use the I-prefix for certain interfaces (e.g., `IExtensionLoader`, `ITraitExtension` in world-model), creating inconsistency.

## Decision

We will adopt the I-prefix convention for ALL TypeScript interfaces throughout the Sharpee codebase.

### Scope
- All interfaces in all packages will be prefixed with `I`
- This includes:
  - Core domain interfaces (`IEntity`, `IWorldModel`, `ISemanticEvent`)
  - IF domain interfaces (`IAction`, `ICommandValidator`, `IScopeResolver`)
  - Data structure interfaces (`ISaveData`, `ISerializedEntity`)
  - Extension interfaces (`IExtension`, `IExtensionRegistry`)
  - All other interfaces

### Exceptions
- Enums (e.g., `ScopeLevel`, `IFActions`)
- Type aliases (e.g., `type EntityId = string`)
- Classes (no prefix, e.g., `CommandValidator`, `World`)

### Migration Strategy
1. Move IF domain interfaces to `@sharpee/if-domain` with new names
2. Update all core package interfaces
3. Update all world-model interfaces
4. Update stdlib to use new interface names
5. Provide temporary type aliases for backward compatibility

## Consequences

### Positive
- **Clear Architecture**: Instantly distinguishable interfaces from implementations
- **No Naming Conflicts**: Can have `ICommandValidator` interface and `CommandValidator` class
- **Better Separation**: Interfaces can live in domain packages, implementations elsewhere
- **Consistency**: Single rule applies everywhere, no judgment calls needed
- **Industry Alignment**: Common pattern in C#, Java (with 'I'), and enterprise TypeScript
- **Dependency Injection Ready**: Clear contracts make DI patterns more obvious

### Negative
- **Large Refactoring**: Must update 100+ interfaces and all their references
- **Breaking Change**: All consumers must update their imports and type references
- **Style Guide Deviation**: Goes against some TypeScript style guides (though not all)
- **Temporary Inconsistency**: During migration, some interfaces will have the prefix while others don't

### Neutral
- **Learning Curve**: New contributors familiar with typical TypeScript may need adjustment
- **Verbosity**: Slightly longer type names throughout the codebase

## Alternatives Considered

1. **Keep Current Convention**: Maintain status quo
   - Rejected: Current naming conflicts prevent architectural improvements

2. **Selective I-Prefix**: Only use prefix for "pluggable" interfaces
   - Rejected: Requires constant decision-making about what qualifies

3. **Rename Classes Instead**: Use prefixes/suffixes on implementations
   - Rejected: Would require renaming all classes (more disruptive than interfaces)

4. **Hungarian Notation**: Use different prefixes for different interface types
   - Rejected: Too complex, against modern practices

## Implementation

See `/docs/work/refactor-interfaces-to-if-domain.md` for the detailed refactoring plan and `/docs/work/interface-refactor-checklist.md` for the complete checklist.

## References
- [TypeScript Coding Guidelines (Microsoft)](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines) - Notes they don't use I-prefix
- [Angular Style Guide](https://angular.io/guide/styleguide) - Also doesn't use I-prefix
- [C# Interface Naming](https://docs.microsoft.com/en-us/dotnet/standard/design-guidelines/names-of-classes-structs-and-interfaces) - Always uses I-prefix
- [Enterprise TypeScript patterns](https://enterprise-patterns.com) - Often uses I-prefix for clarity

## Notes

This decision prioritizes code clarity and architectural flexibility over adherence to some TypeScript style guides. Given Sharpee's plugin architecture and multiple implementations of core interfaces, the benefits of clear contract identification outweigh the costs of diverging from certain conventions.