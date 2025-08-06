# ADR-007: Actions in Standard Library

**Date:** 2025-06-29
**Status:** Accepted  
**Context:** Resolving circular dependencies between actions and stdlib packages

## Context

Actions package depended on stdlib (for parser types), while stdlib depended on actions (for command patterns). This circular dependency prevented clean builds and violated architectural principles.

## Decision

Move all action implementations from `@sharpee/actions` package into `@sharpee/stdlib/actions/`. Actions are part of the standard library of IF functionality, not a separate concern.

## Consequences

### Positive
- Eliminates circular dependency completely
- Better cohesion - parser, validator, and actions work together
- Simpler dependency graph
- One package for all IF standard functionality
- Easier to maintain and version

### Negative
- Larger stdlib package
- Actions no longer independently deployable
- Need to reorganize code structure

## Implementation

### New Structure
```
@sharpee/stdlib/
├── actions/
│   ├── standard/
│   │   ├── taking-action.ts
│   │   ├── dropping-action.ts
│   │   └── ...
│   ├── types.ts (ActionExecutor, ActionContext)
│   ├── registry.ts
│   └── constants.ts (IFActions)
├── parser/
├── validation/
└── language/
```

### Migration Steps
1. Create actions directory in stdlib
2. Move all action files from actions package
3. Update imports throughout codebase
4. Remove actions package from workspace
5. Update build configuration

## Alternatives Considered

1. **Keep separate with interfaces** - Rejected due to complexity
2. **Move to world-model** - Rejected as actions are implementations, not domain
3. **Create new package structure** - Rejected as over-engineering

## References
- Circular dependency analysis
- Package cohesion principles
