# Work Summary: Parser Refactor Implementation - Phase 1

**Date**: 2026-01-10
**Duration**: ~1 hour
**Branch**: parser-refactor
**Feature/Area**: Parser architecture - trait-based scope system

## Objective

Implement Phase 1 of the parser refactor: add `.hasTrait()` method to grammar API and migrate existing patterns that use `.matching({ trait: true })` to use trait-based filtering.

## Changes Implemented

### 1. Added `hasTrait()` to Grammar API

**Files modified:**
- `packages/if-domain/src/grammar/grammar-builder.ts`
  - Added `hasTrait(traitType: string): ScopeBuilder` to ScopeBuilder interface
  - Added `traitFilters: string[]` to ScopeConstraint interface

- `packages/if-domain/src/grammar/scope-builder.ts`
  - Implemented `hasTrait()` method in ScopeBuilderImpl
  - Initialized `traitFilters: []` in constraint

### 2. Updated ScopeEvaluator for Trait Filtering

**File:** `packages/parser-en-us/src/scope-evaluator.ts`
- Added trait filtering logic after property filters
- Added `entityHasTrait()` helper method that checks:
  - `entity.has(traitType)` method (trait system standard)
  - `entity.get(traitType)` method returning truthy value (alternate pattern)

### 3. Migrated Grammar Patterns

**File:** `packages/parser-en-us/src/grammar.ts`
- Added import: `import { TraitType } from '@sharpee/world-model';`
- Migrated patterns:

| Before | After |
|--------|-------|
| `.matching({ container: true })` | `.hasTrait(TraitType.CONTAINER)` |
| `.matching({ supporter: true })` | `.hasTrait(TraitType.SUPPORTER)` |
| `.matching({ openable: true })` | `.hasTrait(TraitType.OPENABLE)` |
| `.matching({ switchable: true })` | `.hasTrait(TraitType.SWITCHABLE)` |
| `.matching({ enterable: true })` | `.hasTrait(TraitType.ENTERABLE)` |
| `.matching({ animate: true })` | `.hasTrait(TraitType.ACTOR)` |

**Kept as-is:**
- `.matching({ portable: true })` - Objects are portable by default unless they have SceneryTrait
- `.matching({ locked: true })` - State check, not trait
- `.matching({ open: false })` - State check, not trait

### 4. Fixed Test Configuration

**File:** `packages/parser-en-us/vitest.config.ts`
- Added `@sharpee/world-model` alias for Vite module resolution

**File:** `packages/parser-en-us/tests/grammar-scope.test.ts`
- Added `has()` method to mock guard entity to support trait checking

## Key Design Clarifications

### 1. SceneryTrait is Core Platform Mechanism

Objects are portable by default UNLESS they have SceneryTrait. We do NOT need:
- A separate PORTABLE trait
- `.matching({ portable: true })` in grammar

SceneryTrait blocking is handled in action `validate()`, not grammar.

### 2. Grammar NEVER Declares Scope Filters

**CRITICAL**: Scope (AWARE/VISIBLE/REACHABLE/CARRIED) is handled by action validation, NOT grammar.

Grammar should NEVER use:
- `.visible()`
- `.touchable()` / `.reachable()`
- `.carried()`
- `.matching({ portable: true })`

Grammar ONLY declares semantic constraints (traits):
```typescript
// CORRECT
grammar
  .define('board :target')
  .hasTrait(TraitType.ENTERABLE)
  .mapsTo('if.action.entering')

// WRONG - scope filter in grammar
grammar
  .define('board :target')
  .where('target', (scope) => scope.visible().hasTrait(TraitType.ENTERABLE))
```

### Separation of Concerns

| Layer | Responsibility |
|-------|---------------|
| Grammar | Pattern → Action mapping (`board :target` → `if.action.entering`) |
| Grammar | Semantic constraints (traits) |
| Parser | Entity resolution, disambiguation |
| Action validate() | Scope validation (VISIBLE/REACHABLE/CARRIED) |
| Action blocked() | Scope failure messages |

## Test Results

- **258 tests pass** including all grammar-scope tests
- **6 failures** - pre-existing issues unrelated to trait changes:
  1. Article handling in "push the blue button" (pre-existing)
  2. Error message text changed (test assertions need updating)
  3. Pattern priority issues (unrelated)
  4. Missing `core-grammar` file (pre-existing)

## Files Changed

| File | Change |
|------|--------|
| `packages/if-domain/src/grammar/grammar-builder.ts` | Added hasTrait() to ScopeBuilder, traitFilters to ScopeConstraint |
| `packages/if-domain/src/grammar/scope-builder.ts` | Implemented hasTrait() method |
| `packages/parser-en-us/src/scope-evaluator.ts` | Added trait filtering logic |
| `packages/parser-en-us/src/grammar.ts` | Migrated ~15 patterns to use hasTrait() |
| `packages/parser-en-us/vitest.config.ts` | Added world-model alias |
| `packages/parser-en-us/tests/grammar-scope.test.ts` | Added has() to mock entity |

## API Example

**Before:**
```typescript
grammar
  .define('board :vehicle')
  .where('vehicle', (scope) => scope.visible().matching({ enterable: true }))
  .mapsTo('if.action.entering')
```

**After:**
```typescript
grammar
  .define('board :vehicle')
  .where('vehicle', (scope) => scope.visible().hasTrait(TraitType.ENTERABLE))
  .mapsTo('if.action.entering')
```

## Next Steps

1. **IMMEDIATE**: Remove all scope filters (`.visible()`, `.touchable()`, `.carried()`, `.matching({ portable: true })`) from grammar patterns
2. Grammar patterns should ONLY use `.hasTrait()` for semantic constraints
3. Add action scope metadata registry (which actions require which scope level)
4. Action `validate()` checks scope and `blocked()` generates messages
5. Add disambiguation support
6. Add implicit takes

## References

- Previous session: `docs/context/session-20260110-1430-parser-refactor.md`
- Refactor plan: `docs/work/parser/refactor-plan.md`
- Scope scenarios: `docs/work/parser/scope-scenarios.md`
