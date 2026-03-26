# Plan: ISSUE-063 — `as any` regression (1,035 occurrences across 203 files)

## Problem
`as any` casts have regressed to 1,035 occurrences across 203 package files, undermining TypeScript type safety. Most are caused by `getTrait()` returning base `ITrait` instead of the specific trait type.

## Scope
- Severity: High
- Component: Platform-wide
- Blast radius: 203 package files + 73 story files

## Phases

### Phase 1: Fix `getTrait` typing (structural fix, biggest impact)

1. **Read the current `getTrait` signature**
   - `packages/world-model/src/entities/if-entity.ts`
   - Understand how `getTrait(type)` currently returns `ITrait | undefined`

2. **Design the generic signature**
   - `getTrait<T extends ITrait>(type: TraitType): T | undefined`
   - Or use a trait type registry pattern: `getTrait(TraitType.CONTAINER)` returns `ContainerTrait`
   - Consider: a type map `TraitTypeMap` that maps `TraitType.CONTAINER -> ContainerTrait`, etc.

3. **Implement the generic `getTrait`**
   - Update the interface and implementation
   - Ensure backward compatibility (callers without type params still work)

4. **Remove `as any` casts for trait access**
   - Start with the worst offenders: game-engine.ts (32), VisibilityBehavior.ts (21), drinking.ts (22)
   - Replace `entity.getTrait(TraitType.X) as any` with `entity.getTrait<XTrait>(TraitType.X)`
   - Or if using type map: `entity.getTrait(TraitType.X)` automatically returns `XTrait`

5. **Build and fix type errors**
   - `./build.sh` to catch any type errors introduced
   - Fix iteratively

### Phase 2: Clean up source files by count

6. **Address remaining `as any` in source files**
   - Work through the worst offenders table from the issue
   - Categories: `sharedData as any`, `world as any`, direct attribute mutation
   - For each, determine the correct type and apply it

7. **Fix `sharedData` typing in actions**
   - Actions pass data between phases via `sharedData`
   - Design a typed `SharedData` interface per action (or a generic pattern)

### Phase 3: Clean up test files

8. **Address test file `as any` casts**
   - Lower priority but prevents regression
   - Focus on integration tests that have 40-50+ casts each
   - Many will be fixed automatically by Phase 1 (getTrait typing)

### Phase 4: CI enforcement

9. **Add a lint rule**
   - ESLint rule: `@typescript-eslint/no-explicit-any` or custom rule
   - Start with warning, promote to error after cleanup
   - Allow exceptions via `// eslint-disable-next-line` with justification

10. **Add a CI check**
    - Count `as any` occurrences in CI
    - Fail if count exceeds a threshold (ratchet down over time)

## Effort Estimate
Large — 4-6 sessions total across all phases.
- Phase 1: 1-2 sessions (highest impact, do first)
- Phase 2: 1-2 sessions
- Phase 3: 1 session
- Phase 4: < 1 session

## Dependencies
- Phase 1 should be done before Phase 2 (fixes the root cause, many Phase 2 casts disappear)
- ISSUE-064 (VisibilityBehavior) could be done alongside Phase 1 for that file

## Risks
- Changing `getTrait` signature could cause cascading type errors
- Some `as any` casts may hide genuine type mismatches that need design fixes, not just casts
- Large blast radius means careful incremental approach is needed
- Test suite must pass after each phase
