# Entity-Centric Action Dispatch (ADR-090)

## Goal

Replace grammar-based action dispatch (priority conflicts) with trait-based capability dispatch where entities declare what verbs they respond to.

## Problem

When multiple entities can respond to the same verb ("lower basket" vs "lower pole"), the current grammar-based approach requires:
- Separate action IDs per entity type
- Priority conflicts in grammar
- Type flags scattered on entities
- 100+ lines of boilerplate per entity-specific action

## Solution

Traits declare capabilities (action IDs they respond to). Stdlib actions dispatch to trait behaviors.

```typescript
// Trait declares capability
class BasketElevatorTrait extends Trait {
  static readonly capabilities = ['if.action.lowering', 'if.action.raising'] as const;
}

// Behavior implements 4-phase pattern
const BasketLoweringBehavior: CapabilityBehavior = {
  validate(entity, world, actorId) { /* ... */ },
  execute(entity, world, actorId) { /* ... */ },
  report(entity, world, actorId) { /* ... */ },
  blocked(entity, world, actorId, error) { /* ... */ }
};

// One grammar pattern per verb
grammar.forAction('if.action.lowering').verbs(['lower']).pattern(':target').build();
```

## Key Documents

- **ADR**: `docs/architecture/adrs/adr-090-entity-centric-action-dispatch.md`
- **Implementation Plan**: `implementation-plan.md`
- **Work Summaries**: `context/`

## Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Core Infrastructure (world-model) | Not started |
| 2 | Stdlib Capability-Dispatch Actions | Not started |
| 3 | Grammar Patterns | Not started |
| 4 | Dungeo Migration (basket elevator) | Not started |
| 5 | Cleanup and Documentation | Not started |

## Branch

`dispatch`

## Key Decisions

1. **Scope-based resolution**: Parser scope math resolves which entity, capability dispatch resolves how
2. **4-phase behaviors**: Same pattern as stdlib actions (validate/execute/report/blocked)
3. **Type-safe builder**: Compile-time capability conflict detection via `EntityBuilder`
4. **Runtime backup**: Runtime check for JS consumers or type edge cases

## References

- ADR-052: Event Handlers for Custom Logic
- ADR-075: Event Handler Consolidation (Effects pattern)
- ADR-087: Action-Centric Grammar
- Prior work summary: `docs/work/mutations/context/2026-01-06-1800-scope-based-resolution.md`
