# Runtime Failure Analysis

**Date**: 2026-04-06
**Method**: Ran each package's test suite individually via `pnpm --filter <pkg> test`

## Global pnpm test vs Per-Package

Running `pnpm test` at the workspace root reports ~454 failures, but this is **misleading**. The root-level run has vitest globals configuration issues across workspace boundaries, causing `ReferenceError: expect is not defined` in 382 test cases that pass fine when run per-package.

**Actual failures when run per-package: 16 tests across 2 packages.**

---

## Per-Package Results

| Package | Test Files | Pass | Fail | Skip | Status |
|---------|-----------|------|------|------|--------|
| @sharpee/core | 6 | 94 | 0 | 0 | Clean |
| @sharpee/engine | 16 | 156 | 0 | 14 | Clean (14 skipped) |
| @sharpee/world-model | 54 of 56 | 1157 | **10** | 10 | **2 failing files** |
| @sharpee/stdlib | 59 | 1074 | 0 | 55 | Clean (55 skipped) |
| @sharpee/parser-en-us | 19 of 20 | 285 | **6** | 3 | **1 failing file** |
| @sharpee/lang-en-us | 7 | 215 | 0 | 0 | Clean |
| @sharpee/event-processor | 3 | 22 | 0 | 0 | Clean |
| @sharpee/character | 2 | 40 | 0 | 0 | Clean |
| @sharpee/ext-basic-combat | 1 | 23 | 0 | 0 | Clean |
| @sharpee/if-domain | N/A | N/A | N/A | N/A | No test script configured |
| @sharpee/forge | N/A | N/A | N/A | N/A | Package filter not matching |
| **Total** | **148+** | **3066** | **16** | **82** | |

---

## Failing Tests: Detail

### world-model — 10 failures in 2 files

#### `tests/unit/author-model.test.ts` (9 failures)

All caused by `AuthorModel` methods that don't exist on the class:

| Test | Error | Missing Method |
|------|-------|----------------|
| should move entities into closed containers | `TypeError: author.setupContainer is not a function` | `setupContainer()` |
| should move entities into locked containers | `TypeError: author.setupContainer is not a function` | `setupContainer()` |
| should emit events when recordEvent is true | `TypeError: author.registerEventHandler is not a function` | `registerEventHandler()` |
| should use author: prefix for events | `TypeError: author.setEntityProperty is not a function` | `setEntityProperty()` |
| should connect rooms bidirectionally | `TypeError: author.connect is not a function` | `connect()` |
| should fill containers from specs | `TypeError: author.fillContainer is not a function` | `fillContainer()` |
| should setup container properties | `TypeError: author.setupContainer is not a function` | `setupContainer()` |
| should set entity properties directly | `TypeError: author.setEntityProperty is not a function` | `setEntityProperty()` |
| should handle complex world setup | `TypeError: author.connect is not a function` | `connect()` |

**Root cause**: The tests were written for a richer AuthorModel API that was never implemented. The actual `AuthorModel` class only has `createEntity`, `moveEntity`, `removeEntity`, `placeActor`, `setPlayer`, `setStateValue`, `clear`, `populate`, `addTrait`, `removeTrait`, and `getDataStore`. The tests reference 5 methods that don't exist: `setupContainer`, `connect`, `fillContainer`, `setEntityProperty`, `registerEventHandler`.

**Fix**: Either implement the missing methods on AuthorModel, or rewrite the tests to use the methods that do exist (e.g., manually add OpenableTrait/LockableTrait instead of calling `setupContainer`).

#### `tests/integration/container-hierarchies.test.ts` (1 failure)

| Test | Error |
|------|-------|
| should update visibility when opening/closing containers | `TypeError: author.setupContainer is not a function` |

**Root cause**: Same as above -- calls `author.setupContainer()` which doesn't exist.

### parser-en-us — 6 failures in 1 file

#### `tests/parser-integration.test.ts` (6 failures)

All in the "Multiple Preposition Patterns" describe block:

| Test | Input | Issue |
|------|-------|-------|
| should parse "take item from container with tool" | `take item from container with tool` | Parser finds no match |
| should parse "unlock door with key" | `unlock door with key` | Parser finds no match |
| should parse "cut rope with knife" | `cut rope with knife` | Parser finds no match |
| should parse "attack goblin with sword" | `attack goblin with sword` | Parser finds no match |
| should parse "open chest with crowbar" | `open chest with crowbar` | Parser finds no match |
| should parse "dig hole with shovel" | `dig hole with shovel` | Parser finds no match |

**Root cause**: The grammar patterns for multi-preposition commands (`:target with :instrument`) are not registered in the standard grammar. These tests were written for a planned feature (VERB NOUN PREP NOUN PREP NOUN patterns) that was never implemented.

**Fix**: Either implement the multi-preposition grammar patterns, or remove/skip these tests until the feature is built.

---

## Infrastructure Issue: Root-Level pnpm test

The `pnpm test` at workspace root produces ~454 failures because vitest globals (`describe`, `it`, `expect`, `vi`) are not available when test files from multiple packages are collected together. Each package has `globals: true` in its own `vitest.config.ts`, but the root-level run doesn't honor per-package configs correctly.

This means `pnpm test` at the root is not a reliable way to run the full suite. Each package must be run individually.

**Fix options**:
1. Add a root `vitest.workspace.ts` that properly configures workspace-level test running
2. Add a root script that runs `pnpm -r test` (recursive, per-package)
3. Document that `pnpm test` must be run per-package

---

## Summary

- **16 real failures** (not 454)
- **10 failures**: AuthorModel tests reference 5 methods that were never implemented
- **6 failures**: Parser tests reference multi-preposition grammar that was never implemented
- **82 skipped tests** across the suite (55 in stdlib, 14 in engine, 10 in world-model, 3 in parser)
- The root-level `pnpm test` is broken by vitest workspace configuration -- this is an infrastructure issue, not a test issue
