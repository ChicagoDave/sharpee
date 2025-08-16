# Refactoring Plan: Complete Interface Naming Convention Migration

## Overview
This plan covers two major refactoring efforts:
1. **Add I-prefix to ALL interfaces** across the entire Sharpee codebase for consistency and clarity
2. **Move IF domain interfaces** from `@sharpee/stdlib` to `@sharpee/if-domain` to improve architecture

## Motivation

### Why I-Prefix
- **Naming Conflicts**: Interfaces and classes with same name (e.g., `CommandValidator`) can only coexist in same file
- **Code Clarity**: Instantly distinguish contracts from implementations
- **Consistency**: Currently inconsistent - some interfaces have prefix, most don't
- **Industry Standard**: Common in C# and enterprise TypeScript

### Why Move to if-domain
- Extensions currently must depend on stdlib just for type definitions
- This creates unnecessary coupling and pulls in ~30+ action implementations
- Conceptually, stdlib and extensions are peers - both implement the domain model
- Moving interfaces to if-domain allows multiple implementations of the same contracts

## Naming Convention

**Decision**: Use `I` prefix for all interfaces to clearly distinguish from implementations.
- Rationale: Prevents naming conflicts, improves code clarity, common in C# and enterprise TypeScript
- Example: `IAction` (interface) vs `BaseAction` or `StandardAction` (class)

See ADR-053 for detailed rationale and `/docs/work/interface-refactor-checklist.md` for the complete list of interfaces to rename.

## Migration Strategy

### Phase 1: Core Package (Foundation)
Update all interfaces in @sharpee/core with I-prefix since everything depends on core.

### Phase 2: World Model Package  
Update all interfaces in @sharpee/world-model with I-prefix.

### Phase 3: Create IF Domain Package
Create new interfaces in @sharpee/if-domain with I-prefix from the start.

### Phase 4: Update Stdlib Package
- Update to use I-prefixed interfaces from core, world-model, and if-domain
- Remove local interface definitions
- Update all action implementations

### Phase 5: Update Remaining Packages
- Engine, parser, language packages, etc.
- Update all imports to use I-prefixed interfaces

### Phase 6: Update Stories and Extensions
- Update all story code
- Update extensions (conversation, blood-magic)

## Impact Analysis

### Scope
- **Interfaces to Rename**: 100+ across all packages
- **Files Affected**: 200+ files (virtually every TypeScript file)
- **Packages Affected**: All 15+ packages in the monorepo

### Breaking Changes
- All interface names change (add `I` prefix)
- Import paths change for IF domain interfaces (stdlib → if-domain)
- Every TypeScript file that references an interface needs updating

### Risk Assessment
- **High Risk**: Massive breaking change to public API
- **Medium Risk**: Potential for missed references causing build failures
- **Low Risk**: Runtime behavior (only renaming types, no logic changes)

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
- Phase 1 (Core Package): 2-3 hours
- Phase 2 (World Model): 2-3 hours
- Phase 3 (IF Domain Creation): 1-2 hours
- Phase 4 (Stdlib Updates): 2-3 hours
- Phase 5 (Other Packages): 2-3 hours
- Phase 6 (Stories/Extensions): 1-2 hours
- Testing and Verification: 2-3 hours
- Documentation: 1 hour
- **Total**: 13-20 hours of focused work

## Automation Potential
Much of this can be automated with careful regex replacements:
- Interface declarations: `s/export interface ([A-Z])/export interface I$1/g`
- Type references: Need more careful pattern matching
- Implements clauses: `s/implements ([A-Z])/implements I$1/g`

Estimate with automation: 6-10 hours

## Notes
- This is a breaking change for any external packages depending on stdlib's types
- Consider doing this as part of a major version bump
- May want to deprecate old imports first before removing