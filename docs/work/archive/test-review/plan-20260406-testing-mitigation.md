# Testing Mitigation Plan

**Branch**: `testing-mitigation`
**Created**: 2026-04-06
**Source**: Full test suite review of 197 files, ~2,500 tests
**Principle**: Every command gets a functional test. Every mutation gets a state assertion. (CLAUDE.md rules 10-12)

---

## Scope

This plan addresses the complete cleanup of Sharpee's test suite based on the review findings. The work is organized into 7 phases, each session-sized (~2-4 hours), ordered by impact and risk.

**What this plan does NOT do**:
- Write new features
- Change production code (except the 2 bugs found)
- Refactor test infrastructure

---

## Phase 1: Scorched Earth -- Remove Dead Weight ✓ DONE

**Goal**: Eliminate tests that provide zero value. No coverage is lost because these tests never tested anything.

**Estimated effort**: 1 session
**Risk**: Zero -- removing tests that can't fail

### 1A. Delete 16 files entirely

| # | File | Dead Tests | Reason |
|---|------|-----------|--------|
| 1 | `packages/core/tests/setup.test.ts` | 1 | `expect(true).toBe(true)` |
| 2 | `packages/core/tests/debug/types.test.ts` | 11 | All tautological -- asserts values just assigned |
| 3 | `packages/engine/tests/game-engine-language.test.ts` | 12 | Dead code for removed dynamic language loading |
| 4 | `packages/engine/tests/integration/query-system.test.ts` | 5 | Entirely skipped, moved to platform layer |
| 5 | `packages/engine/tests/types.test.ts` | 15 | TypeScript type-shape tests, compiler enforces |
| 6 | `packages/engine/tests/verb-structure.test.ts` | 1 | Misplaced lang-en-us test |
| 7 | `packages/event-processor/tests/unit/handlers/registration.test.ts` | 1 | Placeholder `expect(true).toBe(true)` |
| 8 | `packages/parser-en-us/tests/push-panel-with-core.test.ts` | 0 | Entirely skipped, references missing module |
| 9 | `packages/lang-en-us/tests/vocabulary.test.ts` | 20 | 100% overlap with language-provider.test.ts |
| 10 | `packages/lang-en-us/tests/grammar-patterns.test.ts` | 18 | ~90% overlap with language-provider.test.ts |
| 11 | `packages/stdlib/tests/scope-debug.test.ts` | 1 | Duplicated by scope-resolver.test.ts |
| 12 | `packages/stdlib/tests/scope-validation-basic.test.ts` | 1 | Duplicated by command-validator-golden.test.ts |
| 13 | `packages/stdlib/tests/world-model-debug.test.ts` | 2 | Tests WorldModel basics, wrong package |
| 14 | `packages/world-model/tests/debug-worn-visibility.test.ts` | 1 | Exact duplicate of visibility-chains.test.ts |
| 15 | `packages/world-model/tests/minimal-visibility.test.ts` | 1 | Trivial smoke test covered everywhere |
| 16 | `packages/world-model/tests/unit/world/verify-move-issue.test.ts` | 1 | Zero assertions, can never fail |

### 1B. Merge-then-delete (3 files)

| File | Action |
|------|--------|
| `world-model/tests/unit/world/author-model.test.ts` | Move its 1 unique scope test into `unit/author-model.test.ts`, delete |
| `world-model/tests/scope/window-visibility.test.ts` | Superseded by `window-visibility-fixed.test.ts`, delete |
| `lang-en-us/tests/data-integrity.test.ts` | Move placeholder syntax validation into language-provider.test.ts, delete rest |

### 1C. Delete entirely-skipped suites (2 files)

| File | Skipped | Reason |
|------|---------|--------|
| `stdlib/tests/unit/vocabulary/author-vocabulary.test.ts` | 5/5 | Tests features that don't exist |
| `stdlib/tests/actions/platform-actions.test.ts` | 17/17 | Must be rewritten in Phase 4, not reactivated |

### 1D. Remove `expect(true).toBe(true)` stubs within kept files

| File | Lines/Tests to Remove |
|------|----------------------|
| `engine/tests/command-executor.test.ts` | 7 `expect(true).toBe(true)` tests (lines 187, 229, 289, 294, 299, 325, 330) |
| `parser-en-us/tests/grammar-lang-sync.test.ts` | 2 "informational" tests (lines 178-204, 242-265) |
| `lang-en-us/tests/unit/grammar.test.ts` | Type definition tautologies (lines 328-468) |
| `stdlib/tests/unit/actions/quitting.test.ts` | 2 "integration notes" tests (lines 438-458) |
| `stdlib/tests/unit/actions/registry-golden.test.ts` | "registerMessages is a placeholder" test (lines 288-302) |

### 1E. Remove all "Testing Pattern Examples" sections

Remove the describe blocks named "Testing Pattern Examples for X" from these files:

- `about-golden.test.ts`
- `attacking-golden.test.ts` (also remove ~22 skipped tests referencing deleted features, and duplicate NPC test at line 752)
- `climbing-golden.test.ts`
- `closing-golden.test.ts`
- `drinking-golden.test.ts`
- `eating-golden.test.ts`
- `entering-golden.test.ts`
- `exiting-golden.test.ts`
- `going-golden.test.ts`
- `listening-golden.test.ts`
- `looking-golden.test.ts`
- `pushing-golden.test.ts`
- `searching-golden.test.ts`
- `smelling-golden.test.ts`
- `switching_off-golden.test.ts`
- `switching_on-golden.test.ts`
- `taking_off-golden.test.ts`
- `talking-golden.test.ts`
- `throwing-golden.test.ts`
- `touching-golden.test.ts`
- `wearing-golden.test.ts`

**Phase 1 exit criteria**: All tests pass. Test count drops by ~230. Zero coverage lost.

---

## Phase 2: Fix Source Code Bugs Found During Review ✓ DONE

**Goal**: Fix the 2 bugs discovered in production code and the 3 bugs in tests.

**Estimated effort**: 1 session
**Risk**: Low -- small, targeted fixes with clear reproduction paths

### 2A. Source bug: `formatRoomDescription` mutates input array

**Location**: `packages/lang-en-us/src/events.ts:321`
**Bug**: Calls `items.pop()` which mutates the caller's array. Calling the function twice produces different results.
**Fix**: Copy the array before popping: `const itemsCopy = [...items]; itemsCopy.pop();`
**Test**: Add test in `coverage-improvements.test.ts` that calls `formatRoomDescription` twice with the same array and verifies identical output.

### 2B. Source bug: `SpatialIndex.removeChild` stale data

**Location**: `packages/world-model/src/world/spatial-index.ts`
**Bug**: `removeChild('wrong-parent', 'child')` removes from `childToParent` map but does NOT clean up the correct parent's children list.
**Fix**: Before removing from `childToParent`, check if the specified parent actually owns this child. If not, either reject the operation or find and clean the real parent.
**Test**: Already documented in `spatial-index.test.ts` line 299-306. Convert the documenting test into an asserting test for the correct behavior.

### 2C. Test bug: `scope-builder.test.ts` immutability test

**Location**: `packages/if-domain/tests/grammar/scope-builder.test.ts` lines 164-175
**Fix**: Either fix `ScopeBuilderImpl.build()` to deep-copy arrays, or update the test expectation to document that immutability is NOT guaranteed. Investigate which is the intended behavior.

### 2D. Test bug: `combat-service.test.ts` conditional assertion

**Location**: `packages/extensions/basic-combat/tests/combat-service.test.ts` lines 242-248
**Fix**: Remove the `if (result.hit && !result.targetKilled)` wrapper. Use a deterministic seed that guarantees the knockout scenario.

### 2E. Clean console.log from ~15 test files

Files with debugging output left in:
- `engine/tests/historical-accuracy.test.ts` (line 65-66)
- `parser-en-us/tests/colored-buttons.test.ts` (multiple lines)
- `parser-en-us/tests/push-panel-pattern.test.ts` (lines 100, 118, 135, 155)
- `parser-en-us/tests/walk-through-pattern.test.ts` (lines 53-54, 79-82, 218-219)
- `stdlib/tests/unit/scope/scope-resolver.test.ts` (lines 571-630, 686-748, 803-838)
- `stdlib/tests/validation/entity-alias-resolution.test.ts` (lines 62-69, 122-150)
- `world-model/tests/scope/darkness-light.test.ts` (lines 194-196)
- `world-model/tests/unit/world/get-in-scope.test.ts` (lines 70-73)
- `stories/cloak-of-darkness/tests/cloak-of-darkness.test.ts` (line 76)

**Phase 2 exit criteria**: All tests pass. Both source bugs fixed with tests. All console.log removed from test files.

---

## Phase 3: Critical Mutation Test Gaps ✓ DONE

**Goal**: Add world-state mutation tests to actions that change state but only verify events. This is the "dropping bug" lesson applied systematically.

**Estimated effort**: 2 sessions
**Risk**: Low -- adding tests only, no production code changes
**Principle**: "Test the mutation, not the mock." (CLAUDE.md rule 10)

### 3A. `dropping-golden.test.ts` -- THE priority

The action where the dropping bug was literally discovered has no mutation tests.

Add a "World State Mutations" section (following `closing-golden.test.ts` as template):
1. Item moves from player inventory to room after drop
2. Item moves from player to container when dropping inside open container
3. Item moves from player to supporter when dropping on supporter
4. Item stays in player inventory when drop is blocked (not held, scenery, etc.)
5. Item stays when dropping into closed container fails

### 3B. `eating-golden.test.ts`

Add mutation tests:
1. Servings decrement after eating
2. Item consumed when servings reach 0 (how is this represented? removed? flag?)
3. Implicit take moves item to inventory before eating
4. Multiple servings tracked correctly over multiple eat actions

### 3C. `climbing-golden.test.ts`

Add mutation tests:
1. Player location changes after climbing up
2. Player location changes after climbing down
3. Player location changes after climbing onto supporter
4. Player location unchanged when climb is blocked

### 3D. `attacking-golden.test.ts` / `attacking.test.ts`

Add mutation tests:
1. BREAKABLE object's `broken` flag set to true after attack
2. Destructible object's hitPoints reduced after attack
3. Combatant's health reduced after attack
4. Non-combatant target unchanged (validation rejects)

### 3E. `pushing-golden.test.ts`

Add mutation tests:
1. SwitchableTrait.isOn toggles for button press
2. Pushable state updates after push

### 3F. `talking-golden.test.ts`

Add mutation test:
1. hasGreeted set to true after first conversation

### 3G. `searching-golden.test.ts`

Add mutation test:
1. Concealed item becomes unconcealed after search (if this is a state change in the engine)

**Phase 3 exit criteria**: All 7 action test files have "World State Mutations" sections. Every mutating action verifies actual `world.getLocation()`, trait property, or entity state changes.

---

## Phase 4: Rewrite Broken/Skipped Critical Tests ✓ DONE

**Goal**: Fix tests that are skipped but cover important behavior. These represent known coverage holes.

**Estimated effort**: 2 sessions
**Risk**: Medium -- may require understanding why tests were skipped in the first place

### 4A. `showing-golden.test.ts` -- 16/19 skipped

Decision needed: The 16 skipped tests all say "depends on scope logic." Since scope validation moved to CommandValidator, these tests need to be rewritten to work with the new architecture.

- Rewrite the 16 skipped tests to use CommandValidator for scope checking
- OR delete the file and write fresh showing action tests
- Must cover: showing to NPC, viewer reactions, worn items, preconditions

### 4B. `unlocking-golden.test.ts` -- 10/22 skipped

The key-based unlocking happy path is untested. Fix:
1. Unskip "unlock with correct key" (line 223)
2. Unskip "unlock door with room connection" (line 272)
3. Unskip "unlock sound" (line 363)
4. Fix edge case tests that call `execute` directly instead of three-phase pattern
5. Verify all tests pass with current action implementation

### 4C. `opening-golden.test.ts` -- 3 skipped (container-reveals-contents)

The container-reveals-contents flow is critical and entirely untested:
1. Investigate why tests hang (lines 190, 335, 442)
2. Fix the hanging issue (likely related to AuthorModel or chain handler setup)
3. Unskip and verify container contents trigger revealed events

### 4D. `command-history.test.ts` -- 7/9 skipped

Important behavioral coverage:
1. Investigate each skipped test
2. Unskip those where functionality now works
3. Remove those where functionality was intentionally removed
4. Must cover: failed commands not tracked, multiple commands in order, max entries limit

### 4E. Platform actions -- rewrite from scratch

The old `platform-actions.test.ts` (17 skipped) was deleted in Phase 1. Write new tests:
1. Save action emits correct event with save data
2. Restore action emits correct event
3. Quit action emits event, handles unsaved progress
4. Restart action emits event, handles unsaved progress
5. All platform actions are recognized as meta-commands (don't increment turn)

### 4F. `colored-buttons.test.ts` -- 4 tests with zero assertions

Either add proper assertions or delete the assertion-less tests:
- "Ambiguous references" section (2 tests) -- add assertion on parse result
- "Debug" section (2 tests) -- remove entirely

**Phase 4 exit criteria**: Skipped test count drops from ~120 to <30. All critical paths (showing, unlocking, opening reveals, platform actions) have running tests.

---

## Phase 5: Consolidation ← CURRENT

**Goal**: Reduce file count and overlap without losing coverage. The lang-en-us and parser-en-us suites have significant duplication.

**Estimated effort**: 1 session
**Risk**: Low -- reorganization only

### 5A. Lang-en-us: 10 files to 5

| Keep | Absorb From | Remove |
|------|-------------|--------|
| `language-provider.test.ts` | unique checks from deleted vocabulary.test.ts, data-integrity.test.ts | (already deleted in Phase 1) |
| `text-processing.test.ts` | -- | -- |
| `formatters.test.ts` | event message function tests from coverage-improvements.test.ts | `coverage-improvements.test.ts` |
| `unit/perspective/placeholder-resolver.test.ts` | -- | -- |
| `unit/grammar.test.ts` (trimmed) | -- | -- |

Also delete `integration.test.ts` after merging its good pipeline/error tests into `language-provider.test.ts` (its message formatting section tests `String.replace`, not the formatter system).

### 5B. Parser-en-us scope consolidation

Merge `grammar-scope.test.ts` and `grammar-scope-cross-location.test.ts` into a single file with 2-3 representative tests. Both currently test the absence of scope enforcement with elaborate mock infrastructure.

### 5C. Event-processor entity-handlers consolidation

`entity-handlers.test.ts` has 6 tests but 4 are tautological after ISSUE-068. Reduce to 2 tests:
1. Keep test 1 (documents ISSUE-068 removal)
2. Keep test 6 (nonexistent entity handling)
3. Remove tests 2-5

### 5D. Rewrite `processor-reactions.test.ts`

Currently mocks private `processSingleEvent` method. Rewrite to use public `processEvents` API and `registerHandler`.

**Phase 5 exit criteria**: File count reduced by ~8. No duplicate coverage. All remaining tests use public APIs.

---

## Phase 6: World-Model Behavioral Tests

**Goal**: Add behavioral tests to trait test files that currently only have property-storage tests. Follow the `character-model.test.ts` and `vehicle-composition.test.ts` templates.

**Estimated effort**: 3 sessions
**Risk**: Low -- adding tests only

### 6A. Container behavior (highest priority)

Add to `container.test.ts` or new `container-behavior.test.ts`:
1. `world.moveEntity` respects `maxItems` (if enforced)
2. `world.moveEntity` respects container open/closed state
3. Putting item in container updates `world.getContents()`
4. Removing item from container updates `world.getContents()`
5. Type restrictions prevent wrong item types
6. Document whether capacity enforcement is aspirational or implemented

### 6B. Light source + darkness integration

Add to `light-source.test.ts` or new integration test:
1. Lit LightSourceTrait in dark room makes items visible via `VisibilityBehavior.isDark()`
2. Switching off light source makes room dark again
3. Carried light source illuminates dark room
4. Light inside closed container does NOT illuminate room
5. Multiple light sources (one off, one on)

### 6C. Lockable key matching

Add to `lockable.test.ts`:
1. Correct `keyId` allows unlock (through actual unlock operation if available)
2. Wrong `keyId` prevents unlock
3. `keyIds` array allows any listed key
4. No key needed when `requiresKey` is false

### 6D. Openable + containment interaction

Add to `openable.test.ts` or integration test:
1. Closed container blocks `world.moveEntity` into it
2. Open container allows `world.moveEntity`
3. `revealsContents` triggers appropriate behavior when opened

### 6E. Scenery blocking take

Add to `scenery.test.ts`:
1. Entity with SceneryTrait is rejected by taking action validation
2. SceneryTrait entity stays in room after failed take attempt

### 6F. Supporter behavioral tests

Add to `supporter.test.ts`:
1. `world.moveEntity` onto supporter updates `world.getContents()`
2. Capacity limits (if enforced)
3. Items on supporter are visible (integration with VisibilityBehavior)

### 6G. Wearable slot conflicts

Add to `wearable.test.ts`:
1. `blocksSlots` prevents wearing conflicting items (through WearableBehavior if available)
2. Removing blocking item allows wearing blocked item
3. Layer ordering affects what can be removed

### 6H. Exit traversal

Add to `exit.test.ts` or `room.test.ts`:
1. Exit with valid destination allows movement
2. Blocked exit prevents movement
3. Conditional exit respects conditions (if mechanism exists)

**Phase 6 exit criteria**: Every trait that has game-logic implications (container, lockable, openable, scenery, supporter, wearable, light-source, exit) has at least one behavioral test that exercises the trait through WorldModel operations or action invocations.

---

## Phase 7: Coverage Gap Fill

**Goal**: Add tests for untested production code. These are entirely new test files.

**Estimated effort**: 3-4 sessions
**Risk**: Medium -- requires understanding undocumented code

### 7A. `packages/core/src/random/seeded-random.ts`

Critical for deterministic gameplay. Tests needed:
1. Same seed produces same sequence
2. Different seeds produce different sequences
3. `nextFloat()` returns values in [0, 1)
4. `nextInt(min, max)` returns values in range
5. `pick(array)` returns element from array
6. `shuffle(array)` produces deterministic permutation
7. `chance(probability)` respects probability with known seed

### 7B. `packages/core/src/extensions/registry.ts`

Plugin system. Tests needed:
1. Register extension
2. Retrieve registered extension
3. List extensions
4. Remove extension
5. Duplicate registration handling
6. Extension initialization lifecycle

### 7C. `packages/core/src/query/query-manager.ts`

Entity querying. Tests needed:
1. Register query handler
2. Execute query, receive results
3. No handler for query type
4. Multiple handlers

### 7D. Typed event system (`event-factory.ts`, `event-registry.ts`, `typed-event.ts`)

Tests needed:
1. Create typed event with schema
2. Register event type
3. Validate event against schema
4. Factory creates correct event structure

### 7E. Undo/again platform events

Currently zero test coverage despite being production features (used in Zifmia):
1. `createUndoRequestedEvent` / `createUndoCompletedEvent`
2. `createAgainRequestedEvent` / `createAgainFailedEvent`
3. Type guards for undo/again events
4. Integration with platform operations

### 7F. Meta-command turn semantics

No test verifies the defining characteristic of meta-commands:
1. Meta-command does NOT increment turn counter
2. Meta-command is NOT added to command history
3. Regular command DOES increment turn counter
4. Regular command IS added to command history

### 7G. Forge world inspection — SKIPPED

~~12/18 forge tests only check `toBeInstanceOf(ForgeStory)`.~~

**Skipped**: Forge package will be superseded by the Lantern project. No vitest config exists (tests don't run). Not worth investing in a deprecated package.

### 7H. Engine-scheduler integration — DEFERRED

Both are well-tested in isolation (engine: 163 tests, scheduler: 24 tests) but their interaction is untested. Requires full game engine + scheduler plugin setup — complex integration test.

Deferred to a dedicated integration testing session:
1. Daemon runs during engine turn
2. Fuse counts down during engine turns
3. Fuse triggers at zero
4. Scheduler state survives save/restore through engine

**Phase 7 exit criteria**: All production code modules identified in the review as having zero coverage now have at least basic behavioral tests.

---

## Phase 8: Test Grading — Mutation Verification Infrastructure

**Goal**: Every test in the suite must be proven to catch real bugs, not just pass. Two tools: a fast static grader (CI) and a mutation tester (nightly).

**Estimated effort**: 2 sessions
**Risk**: Low — tooling only, no production code changes

**Principle**: A test that still passes when you break the source code is worse than no test. It creates false confidence. The "dropping bug" proved this — execute phases that didn't call `world.moveEntity()` passed all event-based tests.

### 8A. Static Test Grader (`grade-tests.sh`)

A script that classifies every test by assertion quality. Runs in <10 seconds, fails CI if quality drops below thresholds.

**Grading categories:**

| Grade | Meaning | Detection |
|-------|---------|-----------|
| **RED** | Dead (zero assertions), tautological (`expect(true).toBe(true)`), or tests mocks instead of real code | Zero `expect()` count, tautology patterns, `vi.fn()` on primary subject |
| **YELLOW** | Test passes but doesn't verify the important thing: property echo (set then read back, no operation), event-only (asserts on events after `execute()` but never checks world state) | Heuristic: no `getLocation\|getContents\|getTrait\|\.isOpen\|\.isLocked` after `execute(`; set-then-assert with nothing in between |
| **GREEN** | Exercises real code path, asserts on resulting world state or meaningful output | Has operation + state/output assertion |

**Output format:**
```
=== Test Grade Report ===
Files scanned: 173
Tests graded: 1170
Grade distribution:
  🟢 GREEN:  847  (72%)
  🟡 YELLOW: 323  (28%)
  🔴 RED:      0  ( 0%)

YELLOW files (need world-state assertions):
  packages/stdlib/tests/unit/actions/wearing-golden.test.ts
    Line 45: event-only assertion after execute()
    Line 112: property echo (no operation)
```

**CI integration:**
- Fails if any RED test exists
- Warns on YELLOW tests (tracked as tech debt, target: <10%)
- Reports grade distribution for trend tracking

**Implementation**: TypeScript script using a lightweight AST parser (e.g., `ts-morph`) or regex-based for speed. Lives at `scripts/grade-tests.ts`, runnable via `pnpm grade-tests`.

### 8B. Targeted Stryker Mutation Testing

Install and configure `@stryker-mutator/core` + `@stryker-mutator/vitest-runner` scoped to the modules where silent mutation failures are most dangerous.

**Mutation scope** (where state mutations live):
- `packages/stdlib/src/actions/standard/**/execute.ts` — action execute phases
- `packages/world-model/src/world/WorldModel.ts` — moveEntity, canMoveEntity
- `packages/world-model/src/behaviors/**/*.ts` — trait behaviors

**Excluded from mutation** (low value, high cost):
- `stories/` — story content, not engine logic
- `packages/lang-en-us/` — string templates
- `packages/parser-en-us/` — grammar patterns (tested by integration tests)
- Test files themselves

**Configuration** (`stryker.config.json` at repo root):
```json
{
  "$schema": "https://raw.githubusercontent.com/stryker-mutator/stryker/master/packages/core/schema/stryker-core.json",
  "testRunner": "vitest",
  "vitest": {
    "configFile": "vitest.workspace.ts"
  },
  "mutate": [
    "packages/stdlib/src/actions/standard/**/execute.ts",
    "packages/world-model/src/world/WorldModel.ts",
    "packages/world-model/src/behaviors/**/*.ts"
  ],
  "reporters": ["html", "clear-text", "progress"],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
```

**Run as**: `pnpm stryker run` — estimated 15-45 minutes for the scoped set.

**CI integration**: Nightly GitHub Actions job. Posts mutation score to PR comments when score drops below threshold. Not blocking on every push (too slow).

### 8C. Remediation Pass

After both tools are running, do a single pass through flagged tests:

1. Fix or delete all RED tests (should be zero after Phases 1-5, but verify)
2. Upgrade YELLOW tests to GREEN by adding world-state assertions
3. Investigate survived Stryker mutants — each one is a test that doesn't catch a real bug
4. Document any intentional exceptions (e.g., signal actions like `talking` that are correctly zero-mutation)

### 8D. Ongoing Enforcement

Add to the project's definition of done:

- **New action tests**: Must be GREEN (enforced by `grade-tests.sh`)
- **New trait behavioral tests**: Must exercise through WorldModel operations, not just property storage
- **Stryker score**: Must not decrease on merge to main (enforced by nightly job threshold)
- **`grade-tests.sh`**: Runs in pre-commit hook or CI, zero RED allowed

**Phase 8 exit criteria**: 
- `grade-tests.sh` runs, produces report, integrated into CI
- Stryker configured and producing mutation scores for scoped modules
- Zero RED tests in the suite
- YELLOW tests either upgraded to GREEN or documented as intentional exceptions (target: <10% of suite)
- Mutation score ≥60% for stdlib actions, ≥70% for WorldModel

---

After all 7 phases are complete, run the following to verify:

```bash
# Full test suite
pnpm test

# Count active vs skipped
grep -r 'it\.skip\|describe\.skip\|xit\|xdescribe' packages/ stories/ --include='*.test.ts' | wc -l

# Count tautological tests
grep -r 'expect(true)\.toBe(true)' packages/ stories/ --include='*.test.ts' | wc -l

# Count console.log in tests
grep -r 'console\.log' packages/ stories/ --include='*.test.ts' | wc -l
```

**Target state**:
- `expect(true).toBe(true)`: 0
- `console.log` in tests: 0
- Skipped tests: <30 (only for genuinely aspirational/future features)
- Every mutating action has world-state verification tests
- Every trait with game-logic implications has behavioral tests
- Every core module has at least basic coverage

---

## Phase Dependencies

```
Phase 1 (remove dead weight)
    |
Phase 2 (fix bugs) ---------> Phase 3 (mutation tests)
    |                              |
Phase 5 (consolidation)      Phase 4 (fix skipped tests)
    |                              |
    +-----------> Phase 6 (trait behavioral tests)
                       |
                  Phase 7 (coverage gaps)
                       |
                  Phase 8 (test grading infrastructure)
                    8A: grade-tests.sh (static grader)
                    8B: Stryker mutation testing (nightly)
                    8C: Remediation pass (upgrade YELLOW → GREEN)
                    8D: Ongoing enforcement (CI + hooks)
```

Phases 1-2 must go first. Phases 3-5 can run in parallel. Phase 6 depends on cleanup being done. Phase 7 is the long tail. Phase 8 runs after all tests exist — it grades and enforces quality on the complete suite.
