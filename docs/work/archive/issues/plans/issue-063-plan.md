# Plan: ISSUE-063 — `as any` regression (1,035 occurrences across 203 files)

## Problem
`as any` casts have regressed to 1,035 occurrences across 203 package files, undermining TypeScript type safety. Most are caused by trait access using `getTrait(TraitType.X) as any`.

## Discovery (2026-03-26)

**`getTrait` is already generic.** The signature:
```typescript
getTrait<T extends ITrait>(type: TraitType | string | ITraitConstructor<T>): T | undefined
```

When passed a trait constructor (e.g., `OpenableTrait`), TypeScript infers `T` and returns `OpenableTrait | undefined`. No platform change needed — the root cause is that callers pass `TraitType` constants instead of constructors, then cast with `as any`.

**Fix pattern:**
```typescript
// Before — untyped, requires cast
const openable = entity.getTrait(TraitType.OPENABLE) as any;

// After — pass the class, T is inferred automatically
const openable = entity.getTrait(OpenableTrait);
```

## Scope
- Severity: High
- Component: Platform-wide
- Blast radius: 203 package files + 73 story files

## Phases

### Phase 1: Clean up worst offender source files

Replace trait-access `as any` casts with constructor pattern in the highest-count files:

| File | Count | Package |
|------|-------|---------|
| `engine/src/game-engine.ts` | 32 | engine |
| `stdlib/src/actions/standard/drinking/drinking.ts` | 22 | stdlib |
| `world-model/src/world/VisibilityBehavior.ts` | 21 | world-model |
| `transcript-tester/src/runner.ts` | 16 | transcript-tester |
| `stdlib/src/actions/base/snapshot-utils.ts` | 15 | stdlib |
| `world-model/src/traits/edible/edibleBehavior.ts` | 13 | world-model |
| `world-model/src/entities/if-entity.ts` | 12 | world-model |
| `world-model/src/world/WorldModel.ts` | 12 | world-model |
| `stdlib/src/scope/scope-resolver.ts` | 12 | stdlib |
| `parser-en-us/src/english-parser.ts` | 11 | parser-en-us |
| `world-model/src/world/AuthorModel.ts` | 8 | world-model |

Build and test after each file or batch.

### Phase 2: Clean up remaining platform source files

Sweep all remaining `as any` casts in `packages/` source files (excluding tests):
- Trait-access casts → constructor pattern
- `sharedData as any` → typed SharedData interfaces per action
- `world as any` → proper type imports
- Other patterns case-by-case

### Phase 3: Clean up story files

Replace trait-access `as any` casts in `stories/dungeo/` source files (73 occurrences across 42 files).

### Phase 4: Clean up test files (future session)

Address test file `as any` casts — lower priority but prevents regression. Focus on integration tests with 40-50+ casts each.

### Phase 5: CI enforcement (future session)

- ESLint rule: `@typescript-eslint/no-explicit-any` (warning → error)
- CI check: count `as any`, fail if above threshold, ratchet down

## Effort Estimate
- Phase 1: 1 session
- Phase 2: 1 session
- Phase 3: < 1 session
- Phase 4-5: future sessions

## Dependencies
- ISSUE-064 (VisibilityBehavior) overlaps with Phase 1 for that file
- No blocking dependencies

## Risks
- Some `as any` casts may hide genuine type mismatches needing design fixes
- Cross-package imports of trait classes may cause circular dependency issues (monitor with `madge`)
- Test suite must pass after each phase
