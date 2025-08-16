# Refactoring Plan: Move Core Interfaces to if-domain

## Overview
Move core interactive fiction interfaces from `@sharpee/stdlib` to `@sharpee/if-domain` to enable extensions and alternative implementations to share the same contract without depending on stdlib's implementation.

## Motivation
- Extensions (like blood-magic) currently must depend on stdlib just for type definitions
- This creates unnecessary coupling and pulls in ~30+ action implementations
- Conceptually, stdlib and extensions are peers - both implement the domain model
- Moving interfaces to if-domain allows multiple implementations of the same contracts

## Interfaces to Move

### From `stdlib/src/actions/enhanced-types.ts`:
- [ ] `Action` interface
- [ ] `ValidationResult` interface  
- [ ] `ActionContext` interface
- [ ] `ActionRegistry` interface

### From `stdlib/src/validation/types.ts`:
- [ ] `ValidatedCommand` interface
- [ ] `CommandObject` interface
- [ ] `ParsedIntent` interface

### From `stdlib/src/validation/command-validator.ts`:
- [ ] `ActionMetadata` interface

### From `stdlib/src/scope/types.ts`:
- [ ] `ScopeLevel` enum
- [ ] `ScopeResolver` interface
- [ ] `ScopeContext` interface

### From `stdlib/src/actions/constants.ts`:
- [ ] `IFActions` enum (standard action identifiers)
- [ ] Action group constants

### From message system (various files):
- [ ] `MessageKey` type
- [ ] `MessageTemplate` interface
- [ ] `MessageContext` interface

## New Structure in if-domain

```
packages/if-domain/src/
├── actions/
│   ├── types.ts         # Action, ValidationResult, ActionContext
│   ├── metadata.ts      # ActionMetadata
│   ├── registry.ts      # ActionRegistry
│   └── constants.ts     # IFActions enum, groups
├── commands/
│   └── types.ts         # ValidatedCommand, CommandObject, ParsedIntent
├── scope/
│   └── types.ts         # ScopeLevel, ScopeResolver, ScopeContext
├── messages/
│   └── types.ts         # MessageKey, MessageTemplate, MessageContext
└── index.ts             # Re-exports all
```

## Migration Checklist

### Phase 1: Create New Interfaces in if-domain
- [ ] Create directory structure in if-domain
- [ ] Copy interfaces to if-domain (keep originals for now)
- [ ] Ensure if-domain exports all new interfaces
- [ ] Build if-domain successfully
- [ ] Create unit tests for type exports

### Phase 2: Update stdlib to Use if-domain
- [ ] Update stdlib imports to use if-domain interfaces
- [ ] Remove duplicate interface definitions from stdlib
- [ ] Update stdlib's index.ts to re-export from if-domain (compatibility)
- [ ] Run stdlib build
- [ ] Run stdlib tests

### Phase 3: Update All Action Files (~30+ files)
- [ ] actions/standard/opening/opening.ts
- [ ] actions/standard/taking/taking.ts
- [ ] actions/standard/dropping/dropping.ts
- [ ] actions/standard/examining/examining.ts
- [ ] actions/standard/going/going.ts
- [ ] actions/standard/entering/entering.ts
- [ ] actions/standard/exiting/exiting.ts
- [ ] actions/standard/looking/looking.ts
- [ ] actions/standard/inventory/inventory.ts
- [ ] actions/standard/putting/putting.ts
- [ ] actions/standard/inserting/inserting.ts
- [ ] actions/standard/removing/removing.ts
- [ ] actions/standard/giving/giving.ts
- [ ] actions/standard/showing/showing.ts
- [ ] actions/standard/telling/telling.ts
- [ ] actions/standard/asking/asking.ts
- [ ] actions/standard/attacking/attacking.ts
- [ ] actions/standard/climbing/climbing.ts
- [ ] actions/standard/closing/closing.ts
- [ ] actions/standard/drinking/drinking.ts
- [ ] actions/standard/eating/eating.ts
- [ ] actions/standard/listening/listening.ts
- [ ] actions/standard/pulling/pulling.ts
- [ ] actions/standard/pushing/pushing.ts
- [ ] actions/standard/reading/reading.ts
- [ ] actions/standard/searching/searching.ts
- [ ] actions/standard/switching/switching.ts
- [ ] actions/standard/talking/talking.ts
- [ ] actions/standard/throwing/throwing.ts
- [ ] actions/standard/touching/touching.ts
- [ ] actions/standard/waiting/waiting.ts
- [ ] actions/standard/wearing/wearing.ts
- [ ] (any others found during migration)

### Phase 4: Update Stories
- [ ] stories/cloak-of-darkness
- [ ] Any other stories using these types

### Phase 5: Update Extensions
- [ ] Update blood-magic extension to import from if-domain
- [ ] Update conversation extension (if it uses these types)

### Phase 6: Update Tests
- [ ] Update all action test files
- [ ] Update integration tests
- [ ] Update any test utilities that use these types

### Phase 7: Documentation
- [ ] Update API documentation
- [ ] Update architecture docs (ADRs if needed)
- [ ] Update README files
- [ ] Add migration guide for external users

## Impact Analysis

### Files Affected
- **Minimum**: ~50 files (30+ actions, tests, stories)
- **Maximum**: ~100+ files (including all tests)

### Risk Assessment
- **High Risk**: Breaking changes to public API
- **Medium Risk**: Test failures due to import changes
- **Low Risk**: Runtime behavior (only moving types, not logic)

### Mitigation Strategies
1. **Compatibility Layer**: Keep re-exports in stdlib for backward compatibility
2. **Incremental Migration**: Do one action at a time if needed
3. **Type-Only Changes**: Since we're only moving interfaces, runtime behavior unchanged
4. **Automated Testing**: Rely on existing test suite to catch issues

## Alternative Approaches Considered

1. **Keep stdlib dependency**: Simpler but maintains coupling
2. **Duplicate interfaces**: Risk of divergence
3. **Move to @sharpee/core**: Core is too low-level for IF concepts
4. **Create new package**: More packages to maintain

## Success Criteria
- [ ] All builds pass
- [ ] All tests pass
- [ ] Extensions can import from if-domain without stdlib
- [ ] No runtime behavior changes
- [ ] TypeScript correctly resolves all types

## Rollback Plan
If issues arise:
1. Git revert the commits
2. Re-publish previous package versions
3. Document lessons learned

## Estimated Timeline
- Setup and Phase 1: 1 hour
- Phase 2-3 (stdlib updates): 2-3 hours  
- Phase 4-6 (stories/tests): 1-2 hours
- Phase 7 (documentation): 1 hour
- **Total**: 5-7 hours of focused work

## Notes
- This is a breaking change for any external packages depending on stdlib's types
- Consider doing this as part of a major version bump
- May want to deprecate old imports first before removing