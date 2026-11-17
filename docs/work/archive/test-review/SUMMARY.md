# Test Suite Review: Complete Summary

**Date**: 2026-04-06
**Scope**: 197 test files, ~2,500 test cases across all packages and stories
**Reviewer**: Claude Opus 4.6 (10 parallel review agents)

---

## Top-Level Numbers

| Metric | Count |
|--------|-------|
| Test files reviewed | 197 |
| Estimated total test cases | ~2,500 |
| Effective tests (non-trivial, non-skipped) | ~1,900 |
| Skipped tests (`.skip`) | ~120 |
| Tautological tests (`expect(true).toBe(true)` or equivalent) | ~60 |
| "Testing Pattern Examples" dead weight | ~80 tests across 24 files |
| Files recommended for removal | 16 |
| Tests recommended for removal (within kept files) | ~200 |
| Bugs found in source code | 2 |
| Bugs found in tests | 3 |

---

## Systemic Issues (Cross-Cutting)

### 1. "Testing Pattern Examples" -- ~80 Dead Tests Across 24 Files

The single biggest quality issue. These describe blocks appear in most stdlib golden action tests and create local data structures (trait objects, arrays) then assert properties of those structures. They **never invoke the action under test** and cannot detect action bugs. Estimated ~800 lines of dead weight.

**Files affected**: about-golden, attacking-golden, climbing-golden, closing-golden, drinking-golden, eating-golden, entering-golden, exiting-golden, going-golden, listening-golden, looking-golden, pushing-golden, searching-golden, smelling-golden, switching_off-golden, switching_on-golden, taking_off-golden, talking-golden, throwing-golden, touching-golden, wearing-golden, and several more.

**Recommendation**: Remove all "Testing Pattern Examples" sections project-wide.

### 2. Property-Storage Tests Dominate World-Model Traits (~80-85%)

The vast majority of trait tests follow the pattern: `new Trait(data); expect(trait.prop).toBe(data.prop)`. This verifies constructors work but tests no domain behavior, invariants, or mutations. The two exceptions -- `character-model.test.ts` and `vehicle-composition.test.ts` -- are excellent and should serve as templates.

**Recommendation**: Don't remove property tests (they serve as API documentation), but add behavioral tests alongside them. Priority: container capacity enforcement, light source illumination, lockable key matching, openable state blocking containment.

### 3. Missing Mutation Verification in Key Actions

The project's own "dropping bug" lesson has been partially internalized, but several important action tests still lack world-state mutation assertions:

| Action | Gap | Severity |
|--------|-----|----------|
| **Dropping** | No mutation test despite being where the bug was found | Critical |
| **Eating** | No serving/consumption state verification | High |
| **Climbing** | No player location change verification | High |
| **Attacking** | No BREAKABLE state change verification | High |
| **Pushing** | No SwitchableTrait.isOn toggle verification | Medium |
| **Talking** | No hasGreeted mutation verification | Medium |
| **Searching** | No concealed->revealed state verification | Medium |

### 4. Accumulated Skipped Tests (~120)

Skipped tests represent deferred decisions and accumulating tech debt. The worst offenders:

| File | Skipped | Notes |
|------|---------|-------|
| `showing-golden.test.ts` | 16/19 | Effectively no coverage |
| `attacking-golden.test.ts` | ~22/29 | References removed features |
| `unlocking-golden.test.ts` | 10/22 | Key-based unlocking path untested |
| `platform-actions.test.ts` | 17/17 | Entire file disabled |
| `command-history.test.ts` | 7/9 | 78% skip rate |
| `author-vocabulary.test.ts` | 5/5 | Entire file disabled |

### 5. `expect(true).toBe(true)` Pattern (~60 Tests)

Tests that can never fail inflate test counts and give false confidence. Found in:
- `command-executor.test.ts` (7 tests)
- `game-engine-language.test.ts` (3 tests)
- `setup.test.ts` (1 test)
- `debug/types.test.ts` (11 tests, all tautological)
- `types.test.ts` (15 tests, type-shape tautologies)
- `registration.test.ts` (1 test)
- `grammar-lang-sync.test.ts` (2 tests)
- `grammar.test.ts` lines 328-468 (type definition tautologies)
- Various others

### 6. Debug/Exploratory Files Left in Suite

Files with names like `debug-*`, `minimal-*`, or extensive `console.log` output that were created during debugging and never cleaned up:

| File | Issue |
|------|-------|
| `scope-debug.test.ts` | 1 test, duplicated elsewhere |
| `scope-validation-basic.test.ts` | 1 test, duplicated elsewhere |
| `world-model-debug.test.ts` | 2 tests, duplicated elsewhere |
| `debug-worn-visibility.test.ts` | 1 test, exact duplicate |
| `minimal-visibility.test.ts` | 1 test, trivial smoke test |
| `verify-move-issue.test.ts` | 1 test, **zero assertions** |
| `colored-buttons.test.ts` | 4 tests with zero assertions |

---

## Bugs Found

### In Source Code

1. **`formatRoomDescription` mutates input array** (`packages/lang-en-us/src/events.ts:321`): Calls `items.pop()` which mutates the caller's array. Calling the function twice produces different results. No test catches this.

2. **`SpatialIndex.removeChild` leaves stale data** (`packages/world-model`): `removeChild('wrong-parent', 'child')` removes from `childToParent` map but does NOT remove from the correct parent's children list, leaving inconsistent state.

### In Tests

1. **`scope-builder.test.ts` immutability test is likely incorrect** (line 164-175): `build()` does a shallow copy, so array mutations on the builder should propagate to previously-built constraints. Either the source needs deep copy or the test expectation is wrong.

2. **`combat-service.test.ts` knockout test** (lines 242-248): Wraps assertions in `if (result.hit && !result.targetKilled)`, meaning the test silently passes without asserting anything if conditions aren't met.

3. **`verify-move-issue.test.ts`**: Has zero assertions. Can never fail. Was a debugging artifact that was never completed.

---

## Files Recommended for Removal (16)

### Full File Removal (High Confidence)

| File | Tests | Reason |
|------|-------|--------|
| `core/tests/setup.test.ts` | 1 | `expect(true).toBe(true)` |
| `core/tests/debug/types.test.ts` | 11 | All tautological -- asserts values just assigned |
| `engine/tests/game-engine-language.test.ts` | 12 | Dead code for removed feature |
| `engine/tests/integration/query-system.test.ts` | 5 | Entirely skipped, moved to platform layer |
| `engine/tests/types.test.ts` | 15 | TypeScript type-shape tests, compiler already enforces |
| `engine/tests/verb-structure.test.ts` | 1 | Misplaced lang-en-us test |
| `event-processor/tests/unit/handlers/registration.test.ts` | 1 | Placeholder `expect(true).toBe(true)` |
| `parser-en-us/tests/push-panel-with-core.test.ts` | 0 | Entirely skipped, references missing module |
| `lang-en-us/tests/vocabulary.test.ts` | 20 | 100% overlap with language-provider.test.ts |
| `lang-en-us/tests/grammar-patterns.test.ts` | 18 | ~90% overlap with language-provider.test.ts |
| `stdlib/tests/scope-debug.test.ts` | 1 | Duplicated by scope-resolver.test.ts |
| `stdlib/tests/scope-validation-basic.test.ts` | 1 | Duplicated by command-validator-golden.test.ts |
| `stdlib/tests/world-model-debug.test.ts` | 2 | Tests WorldModel basics, wrong package |
| `world-model/tests/debug-worn-visibility.test.ts` | 1 | Exact duplicate of visibility-chains.test.ts |
| `world-model/tests/minimal-visibility.test.ts` | 1 | Trivial smoke test covered everywhere |
| `world-model/tests/unit/world/verify-move-issue.test.ts` | 1 | Zero assertions, can never fail |

**Total removable**: 16 files, ~91 tests

### Merge Then Remove (Medium Confidence)

| File | Action |
|------|--------|
| `world-model/tests/unit/world/author-model.test.ts` | Merge 1 unique test into `unit/author-model.test.ts`, then remove |
| `world-model/tests/scope/window-visibility.test.ts` | Superseded by `window-visibility-fixed.test.ts`, remove |
| `lang-en-us/tests/data-integrity.test.ts` | Merge placeholder syntax tests into language-provider.test.ts, remove rest |

### Entire Suites to Reactivate or Remove

| File | Skipped Tests | Decision Needed |
|------|---------------|-----------------|
| `stdlib/tests/actions/platform-actions.test.ts` | 17/17 | Reactivate or delete |
| `stdlib/tests/unit/vocabulary/author-vocabulary.test.ts` | 5/5 | Delete (features don't exist) |

---

## Exemplary Test Files (Models to Follow)

These files represent the quality bar the rest of the suite should aspire to:

| File | Why It's Good |
|------|---------------|
| `character/tests/character-builder.test.ts` | Full lifecycle, actual data values, roundtrip testing |
| `character/tests/integration.test.ts` | Multi-step scenarios with real WorldModel |
| `world-model/tests/unit/traits/character-model.test.ts` | Tests real methods: parsing, clamping, state machines, predicates |
| `world-model/tests/unit/traits/vehicle-composition.test.ts` | Real world-model integration with moveEntity |
| `world-model/tests/unit/world/visibility-behavior.test.ts` | 34 tests, all 10 ADR-068 scenarios |
| `world-model/tests/unit/world/world-model.test.ts` | 38 tests, comprehensive API coverage |
| `world-model/tests/unit/world/event-chaining.test.ts` | 22 tests, thorough ADR-094 coverage |
| `engine/tests/unit/scheduler/scheduler-service.test.ts` | 24 tests, precise behavioral assertions |
| `engine/tests/universal-capability-dispatch.test.ts` | Full four-phase capability testing |
| `stdlib/tests/unit/actions/closing-golden.test.ts` | Exemplary mutation tests |
| `stdlib/tests/unit/actions/locking-golden.test.ts` | Most complete action test |
| `stdlib/tests/unit/actions/waiting-golden.test.ts` | Cleanest signal action test |
| `stdlib/tests/unit/scope/scope-resolver.test.ts` | ~40 tests, the flagship scope file |
| `stories/dungeo/src/npcs/troll/troll-receiving-behavior.test.ts` | Exemplary story behavior test with state verification |

---

## Coverage Gaps: What's Missing

### Critical (No Coverage At All)

1. **Platform action behavior**: Save/restore/quit/restart actions have zero running tests
2. **`seeded-random.ts`**: Critical for deterministic gameplay, zero tests
3. **Extension registry**: Plugin system, zero tests
4. **Query manager**: Entity querying, zero tests
5. **Typed event system**: event-factory, event-registry, typed-event -- zero tests
6. **Story handler registration/invocation** in event-processor

### High Priority (Partial or Weak Coverage)

7. **Container capacity enforcement**: Stored but never enforced in any test
8. **Light source + room darkness integration**: Only tested with custom inline rules, not engine's real rules
9. **Lockable key matching logic**: No test that key actually prevents/allows unlock
10. **Meta-command turn semantics**: No test that meta-commands skip turn counter
11. **"again"/"g" command**: Not tested in parser
12. **Pronoun integration with parser**: Unit tests exist but no parser pipeline test
13. **Disambiguation flow**: No test for ambiguous entity resolution prompting

### Medium Priority

14. **Darkness interaction with actions**: Almost no action tests verify behavior in dark rooms
15. **Player in special locations**: No tests for actions while inside container/on supporter
16. **NPC behavior error recovery**: No test for behavior throwing during onTurn
17. **Undo/again platform events**: Zero test coverage despite being production features
18. **Forge world inspection**: 12/18 tests only assert `toBeInstanceOf(ForgeStory)`

---

## Priority Action Plan

### P0 -- Immediate (Remove Dead Weight)

1. Delete the 16 recommended-for-removal files (~91 dead tests)
2. Remove all "Testing Pattern Examples" sections (~80 tests across 24 files)
3. Remove/fix all `expect(true).toBe(true)` tests (~60 tests)
4. Total: ~230 tests removed, zero coverage loss

### P1 -- High (Fix Critical Gaps)

5. Add mutation tests to `dropping-golden.test.ts` (the irony is too much)
6. Add mutation tests to `eating-golden.test.ts`
7. Add mutation tests to `climbing-golden.test.ts`
8. Fix `showing-golden.test.ts` (16/19 skipped) or remove entirely
9. Fix `unlocking-golden.test.ts` key-based unlock path
10. Fix `opening-golden.test.ts` container-reveals-contents skipped tests
11. Fix `formatRoomDescription` input mutation bug

### P2 -- Medium (Improve Quality)

12. Reactivate or remove `platform-actions.test.ts` (17 skipped)
13. Fix `combat-service.test.ts` conditional assertion
14. Fix `scope-builder.test.ts` immutability test
15. Clean `console.log` from ~15 test files
16. Add tests for `seeded-random.ts`
17. Add pronoun-parser integration test
18. Consolidate scope test files (grammar-scope + grammar-scope-cross-location)
19. Consolidate lang-en-us from 10 files to 5

### P3 -- Long Term (Fill Coverage Gaps)

20. Add behavioral tests to trait test files (use character-model as template)
21. Add extension registry tests
22. Add query manager tests
23. Add typed event system tests
24. Add platform action behavioral tests
25. Add darkness interaction tests to stdlib actions
26. Test engine-scheduler integration (both tested in isolation, never together)

---

## Detailed Review Documents

Each package area has a detailed file-by-file review:

- [Core](core.md) -- 8 files, 67 tests
- [Engine](engine.md) -- 20 files, 209 tests
- [Event-processor, Forge, If-domain, Character, Extensions](event-processor-forge-if-domain-character-extensions.md) -- 11 files, 108 tests
- [Lang-en-us](lang-en-us.md) -- 10 files, 195 tests
- [Parser-en-us](parser-en-us.md) -- 21 files, 185 tests
- [Stdlib Golden Actions A-L](stdlib-golden-actions-a-l.md) -- 18 files, 280 tests
- [Stdlib Golden Actions M-Z](stdlib-golden-actions-m-z.md) -- 24 files, 350 tests
- [Stdlib Non-Golden](stdlib-non-golden.md) -- 22 files, 215 tests
- [World-Model Traits](world-model-traits.md) -- 25 files, 520 tests
- [World-Model Other + Stories](world-model-other-and-stories.md) -- 37 files, 380 tests
