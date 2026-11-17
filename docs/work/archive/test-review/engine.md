# Engine Package Test Review

**Date**: 2026-04-06
**Package**: `packages/engine`
**Reviewer**: Claude (automated review)

## Summary

| Metric | Count |
|--------|-------|
| Test files | 20 |
| Total test cases (`it()` + `it.skip()`) | 209 |
| Skipped tests (`it.skip` / `describe.skip`) | 17 (individual) + 2 entire describe blocks (~12 more tests) |
| Trivially passing (`expect(true).toBe(true)`) | 10 |
| Effective, non-trivial active tests | ~170 |

**Overall Quality Assessment**: Mixed. The test suite has strong areas (scheduler-service, capability-dispatch, platform-operations, event-emitter) and weak areas (game-engine-language is entirely dead code, command-executor has 10 trivially passing tests, types.test.ts only tests data structure creation). Roughly 15% of tests provide zero regression protection.

---

## File-by-File Review

### 1. `packages/engine/tests/command-executor.test.ts`

**Test cases**: 26 (3 skipped via `it.skip`, 7 trivially passing via `expect(true).toBe(true)`)
**What it tests**: CommandExecutor initialization, command execution, parsing, event generation, error handling, integration with story and standard actions, performance.

**Quality Assessment**: **Poor**. 10 of 26 tests are either skipped or contain `expect(true).toBe(true)`, providing zero value. The remaining tests are reasonable but shallow -- they check that results are "defined" without verifying specific behaviors.

**Specific Issues**:
- **Lines 187, 229, 289, 294, 299, 325, 330**: Seven tests are `expect(true).toBe(true)` with comments like "Skip for now." These will never fail regardless of code changes.
- **Line 187** (`should handle sync and async actions`): Does real work executing "look" and "inventory" but then ends with a gratuitous `expect(true).toBe(true)` that undermines confidence.
- **Lines 287-301** (`integration with story actions`): All three tests are trivially passing -- the entire describe block is dead.
- **Lines 322-332** (`integration with standard actions`): Both tests are trivially passing.
- **Line 274** (`should handle missing language provider`): Properly skipped with `it.skip` since CommandExecutor no longer takes a language provider.
- **Lines 103-111** (`should execute a valid command`): Reasonable but `expect(result.success).toBeDefined()` only checks the field exists, not that it's `true`.

**Gaps**:
- No tests for disambiguation scenarios (multiple matching entities).
- No tests verifying that the parser actually resolves entities correctly when commands target specific objects.
- No tests for commands with prepositions (e.g., "put X in Y").

**Recommendation**: **Improve**. Remove the 7 trivially-passing tests or convert them to real tests. Strengthen assertions from `.toBeDefined()` to specific value checks.

---

### 2. `packages/engine/tests/debug-xyzzy.test.ts`

**Test cases**: 2
**What it tests**: That unknown commands (xyzzy) are not tracked in command history but produce events; that successful commands (look) are tracked.

**Quality Assessment**: **Good**. Both tests have meaningful assertions that verify actual state (command history entries, event emission). The assertions check specific values like `historyData.entries[0].originalText`.

**Specific Issues**: None significant.

**Gaps**:
- Only tests one successful command ("look") and one failing command ("xyzzy"). Could test more edge cases (meta commands like "save", "again").

**Recommendation**: **Keep**.

---

### 3. `packages/engine/tests/game-engine-language.test.ts`

**Test cases**: 12 (9 in a `describe.skip` block, 3 active but all `expect(true).toBe(true)`)
**What it tests**: Originally tested dynamic language loading, which has been removed. The 3 remaining "active" tests all defer to "tested in game-engine.test.ts."

**Quality Assessment**: **Dead code**. Zero tests in this file provide any value. The skipped block tests removed functionality. The 3 active tests are all `expect(true).toBe(true)`.

**Recommendation**: **Remove**. This file is entirely dead. The skipped tests document removed functionality (dynamic language loading) -- if that documentation is wanted, it belongs in a migration guide or ADR, not in the test suite.

---

### 4. `packages/engine/tests/game-engine.test.ts`

**Test cases**: 25 (0 skipped)
**What it tests**: GameEngine initialization, story management, engine lifecycle (start/stop), turn execution, game state (save/load), vocabulary management, event handling, text service.

**Quality Assessment**: **Good with caveats**. Most tests verify real behavior: story initialization flags, turn counter increments, event spy call counts, save/load roundtrips. However, some tests access private members via type casts (`EnginePrivate`), coupling tests to implementation details.

**Specific Issues**:
- **Lines 188-201** (`should respect max history limit`): Accesses private `config` via cast to override it. Fragile -- if the property name or type changes, this test silently tests nothing.
- **Lines 301-305** (`should update vocabulary for entities in scope`): Only tests that `updateScopeVocabulary` doesn't throw, not that vocabulary actually changed.
- **Lines 307-323** (`should mark entities correctly as in/out of scope`): Calls `updateEntityVocabulary` but has no assertions about what changed. The test always passes.
- **Lines 353-360** (`should call onEvent config callback`): Good concept but uses private cast to set config, coupling to implementation.

**Gaps**:
- No test for concurrent turn execution (what happens if two turns are submitted before the first completes?).
- No test for `getWorld()` returning the correct world after save/restore.
- Vocabulary tests have no assertions about actual vocabulary state.

**Recommendation**: **Improve**. Fix the assertion-free tests (lines 301-323). Reduce reliance on `EnginePrivate` casts where possible.

---

### 5. `packages/engine/tests/historical-accuracy.test.ts`

**Test cases**: 9 (3 skipped)
**What it tests**: Event data completeness (entity snapshots in action events), event replay capability, event enrichment (turn numbers, normalization).

**Quality Assessment**: **Moderate**. The concept is good -- testing that events carry enough data for historical replay. However, many assertions are guarded by `if (eventData?.itemSnapshot)`, meaning they pass trivially if the data is absent.

**Specific Issues**:
- **Lines 82-98**: All assertions inside `if` blocks. If `takeEvent` has no `itemSnapshot` or `actorSnapshot`, the test passes with zero assertions actually executing. This is a classic "silent pass" anti-pattern.
- **Lines 147-171** (`should include container contents in opening events`): The entire meaningful section is inside `if (openEvent)` -- if no open event is found, the test passes silently.
- **Lines 101-145** (`should include room snapshots in movement events`): Properly skipped with a TODO noting the parser issue.
- **Lines 254-262** (`should normalize event types to lowercase with dots`): Line 260 asserts `event.type` doesn't contain underscores, but many IF event types do contain underscores (e.g., `if.event.quit_requested`). This assertion is likely wrong or the events are pre-filtered.
- **Lines 65-66**: Contains `console.log` debug output that should be removed.

**Gaps**:
- No test that events survive serialization/deserialization roundtrip with all snapshot data intact.
- No test for large entity graphs (deeply nested containers).

**Recommendation**: **Improve**. Replace conditional assertions with unconditional ones that fail if expected data is missing. Remove debug console.log statements. Fix the underscore assertion (line 260) or clarify its intent.

---

### 6. `packages/engine/tests/integration.test.ts`

**Test cases**: 13 (3 skipped)
**What it tests**: Full game flow, save/restore cycle, error scenarios, performance, event flow, text output, vocabulary updates, multi-room navigation, standard engine setup.

**Quality Assessment**: **Good**. Most tests exercise real multi-step workflows. The save/restore test (lines 56-81) is particularly valuable -- it verifies state roundtrip.

**Specific Issues**:
- **Lines 84-96, 263-281, 283-299**: Three skipped tests for game completion. All have TODOs for methods that don't exist (`engine.isComplete()`, `setMaxTurns()`, `setScoreThreshold()`). These are aspirational tests for unimplemented features.
- **Lines 162-186** (`should maintain event ordering`): Checks events have `.type` defined but doesn't actually verify ordering (no timestamp comparison or sequence check).

**Gaps**:
- The event ordering test doesn't test ordering.
- No test for what happens when setStory is called while engine is running.
- No test for multiple save/restore cycles.

**Recommendation**: **Improve**. Either implement the skipped features or remove the aspirational tests. Fix the event ordering test to actually verify order.

---

### 7. `packages/engine/tests/integration/command-history.test.ts`

**Test cases**: 9 (7 skipped)
**What it tests**: Command history tracking: successful command tracking, AGAIN command behavior.

**Quality Assessment**: **Weak due to skip ratio**. Only 2 of 9 tests actually run. The active tests are good quality (verify specific history entries with `actionId`, `originalText`, `turnNumber`). But 78% of the file is skipped.

**Specific Issues**:
- **Line 49**: "should not track failed commands" -- skipped without explanation.
- **Lines 60-77**: "should track multiple commands in order" -- skipped. This is a critical integration test.
- **Lines 79-95**: Complex command tracking -- skipped.
- **Lines 97-105**: Non-repeatable command filtering -- skipped.
- **Lines 107-124**: Max entries limit -- skipped.
- **Lines 143-151**: AGAIN with no history -- skipped.
- **Lines 155-186**: Missing capability handling -- skipped. Also uses extremely fragile private member access.

**Gaps**:
- Most of the planned test scenarios are skipped.

**Recommendation**: **Improve**. Either unskip these tests (if the functionality now works) or document why they remain skipped. The skipped tests represent important behavioral coverage.

---

### 8. `packages/engine/tests/integration/event-handlers.test.ts`

**Test cases**: 2
**What it tests**: Story-level event handlers: registering handlers, complex multi-entity puzzle interactions (three-statue puzzle).

**Quality Assessment**: **Good**. The three-statue puzzle test (lines 52-93) is an excellent integration test that verifies a realistic game mechanic: pushing three statues in any order triggers a puzzle-solved event. Both tests have strong assertions.

**Specific Issues**:
- File header note explains entity `on` handler tests were removed in ISSUE-068, which is good documentation.

**Gaps**:
- No test for handler removal or cleanup.
- No test for handler throwing an error.
- No test for event handler ordering/priority.

**Recommendation**: **Keep**. Add tests for error handling and handler removal.

---

### 9. `packages/engine/tests/integration/query-events.test.ts`

**Test cases**: 3
**What it tests**: Query event emission when quit command is executed: `client.query`, `platform.quit_requested`, and `if.event.quit_requested` events.

**Quality Assessment**: **Good**. Each test verifies a specific event type is emitted with correct data. The assertions check both event existence and payload structure.

**Gaps**:
- Only tests quit. No tests for save/restore query events.
- No test for query event data completeness.

**Recommendation**: **Keep**.

---

### 10. `packages/engine/tests/integration/query-system.test.ts`

**Test cases**: 5 (all in a `describe.skip` block)
**What it tests**: Was testing query system integration (quit confirmation, input interception, quit cancellation, invalid responses, command interruption). Now entirely skipped because query handling moved to platform layer.

**Quality Assessment**: **Dead code**. The file explicitly states these tests should be reimplemented in the platform package.

**Recommendation**: **Remove** (or verify tests exist in the platform package and then delete this file). The skip note is clear about where these tests belong.

---

### 11. `packages/engine/tests/parser-extension.test.ts`

**Test cases**: 8
**What it tests**: Parser extension methods (addVerb, addPreposition, addNoun, addAdjective) and language provider extension methods (addMessage, addActionHelp, addActionPatterns, merge patterns).

**Quality Assessment**: **Good**. Tests cover the extension API surface well. Assertions verify parsed output, message retrieval, and pattern merging.

**Specific Issues**:
- **Lines 46-51** (`should handle addNoun method`): Only tests that the method doesn't throw. This is a placeholder test for a placeholder method -- minimal value.
- **Lines 53-58** (`should handle addAdjective method`): Same issue as addNoun.

**Gaps**:
- No test for adding duplicate verbs or conflicting patterns.
- No test for extension interaction with existing grammar (does a custom verb override a stdlib verb?).

**Recommendation**: **Keep**. Consider removing the two placeholder tests if those methods remain unimplemented.

---

### 12. `packages/engine/tests/performance/event-size-analysis.test.ts`

**Test cases**: 3
**What it tests**: Event size measurement, snapshot vs reference comparison, memory usage patterns over many turns.

**Quality Assessment**: **Moderate/Diagnostic**. These are more diagnostic/benchmarking tests than regression tests. They measure event sizes and assert they stay under thresholds (10KB average, 10MB for 500 turns). The console.log output is informational.

**Specific Issues**:
- **Lines 116-149** (`should compare snapshot vs reference sizes`): Uses `return` instead of skip if no take event is found (line 123), silently passing. Should use `expect(takeEvent).toBeDefined()` before the `if`.
- Heavy use of `console.log` -- appropriate for benchmark output but noisy in CI.

**Gaps**:
- No test for event size growth over time (do events get bigger as more entities exist?).
- Thresholds (10KB, 10MB) appear arbitrary -- not documented why these values were chosen.

**Recommendation**: **Keep** but move to a separate benchmark/diagnostic suite if possible. Fix the silent return on line 123.

---

### 13. `packages/engine/tests/platform-operations.test.ts`

**Test cases**: 19
**What it tests**: Platform operations (save, restore, quit, restart) via event-driven hooks. Tests event detection, hook invocation, success/failure event emission, multiple operations processing.

**Quality Assessment**: **Excellent**. This is one of the best test files in the suite. Every test has specific, meaningful assertions. It tests success paths, failure paths, missing hooks, multiple operations ordering, and event emission through both the emitter and event source.

**Specific Issues**:
- Tests access private members via bracket notation (`engine['pendingPlatformOps']`, `engine['processPlatformOperations']`). This is somewhat fragile but necessary for testing platform operation processing in isolation.
- Line 69: `engine['pendingPlatformOps'].push(saveEvent)` -- direct private member manipulation. If the internal structure changes, many tests break.

**Gaps**:
- No test for platform operations interleaved with regular turn execution.
- No test for save operation providing actual save data back (only tests that the hook is called).

**Recommendation**: **Keep**. Consider adding a public API for testing platform ops to reduce private member access.

---

### 14. `packages/engine/tests/story-testing-verification.test.ts`

**Test cases**: 2
**What it tests**: That the story-based testing approach works (engine initializes with test story, language provider loads correctly).

**Quality Assessment**: **Moderate**. These are scaffolding/smoke tests that were likely created to verify the testing infrastructure itself. Test 1 is a genuine smoke test. Test 2 verifies language provider structure.

**Specific Issues**:
- **Lines 37-57** (`should load language provider directly`): Tests the language provider, not the engine. This belongs in `lang-en-us` tests, not engine tests.

**Gaps**: N/A -- this is infrastructure verification, not feature testing.

**Recommendation**: **Keep** test 1 (smoke test). **Move** test 2 to the `lang-en-us` package or remove it.

---

### 15. `packages/engine/tests/story.test.ts`

**Test cases**: 7
**What it tests**: StoryConfig validation (valid config, author as array, semantic versioning, invalid versions, prerelease versions, required fields) and story lifecycle (completion state tracking).

**Quality Assessment**: **Good**. The validation tests are thorough -- they test valid versions, invalid versions, prerelease versions, required field validation. The lifecycle test verifies completion tracking.

**Specific Issues**:
- **Lines 48-59** (`should reject invalid versions`): Good boundary testing. Includes edge case `1.0.0.0`.
- **Lines 94-135**: The `LifecycleTestStory` class defines `incrementTurn()` which is not part of the Story interface -- it's a test-only method. This tests the story's own logic, not how the engine interacts with it.

**Gaps**:
- No test for empty string fields (e.g., `id: ''`).
- No test for very long field values.
- No test for special characters in story id.

**Recommendation**: **Keep**.

---

### 16. `packages/engine/tests/types.test.ts`

**Test cases**: 15
**What it tests**: Type interfaces: TurnResult, GameContext, EngineConfig, GameState, TimingData. Verifies that objects conforming to these interfaces can be created and their fields accessed.

**Quality Assessment**: **Low value**. These tests only verify that TypeScript interfaces allow certain shapes of data. They test data structure creation, not behavior. In a TypeScript project, the compiler already enforces these constraints.

**Specific Issues**:
- Every test follows the pattern: create object, check fields match what was set. This is tautological -- it tests that `{ turn: 1 }.turn === 1`.
- **Lines 173-200** (`EngineConfig`): Tests that optional fields are undefined when not set and present when set. The TypeScript compiler guarantees this.
- **Lines 201-220** (`should handle event callback`): Slightly more useful -- tests that the onEvent callback actually receives events. But this is testing function invocation, not engine behavior.

**Gaps**: N/A -- the approach itself is the gap. These should test behavior, not structure.

**Recommendation**: **Remove**. TypeScript's type system makes these tests redundant. If any runtime validation is needed (e.g., config parsing from JSON), test that instead.

---

### 17. `packages/engine/tests/unit/events/event-emitter.test.ts`

**Test cases**: 11
**What it tests**: EventEmitter class: on(), off(), emit(), clear(), listenerCount().

**Quality Assessment**: **Excellent**. Clean, focused unit tests that verify each method's behavior. Tests cover registration, removal, emission with return values, void handlers, clearing by type and globally, and count accuracy.

**Specific Issues**: None.

**Gaps**:
- No test for emitting to an event type with no registered handlers.
- No test for handler execution order (FIFO guarantee).
- No test for error propagation when a handler throws.

**Recommendation**: **Keep**. Add error propagation test.

---

### 18. `packages/engine/tests/unit/scheduler/scheduler-service.test.ts`

**Test cases**: 24
**What it tests**: SchedulerService (ADR-071): daemon management (register, remove, pause/resume, priority ordering, conditions, runOnce), fuse management (set, countdown, cancel, adjust, pause/resume, tickCondition, repeat), entity cleanup, serialization, seeded random (determinism, chance, pick, shuffle), introspection, factory function.

**Quality Assessment**: **Excellent**. This is the strongest test file in the suite. Every test verifies specific behavioral outcomes with clear preconditions and postconditions. The fuse countdown test (lines 183-213) is particularly thorough, tracking remaining turns across 4 ticks.

**Specific Issues**:
- **Line 382**: `state.fuses[0].turnsRemaining` should be 4 (turns=5, tick 1 skipped, tick 2 decremented). The comment explains the math, which is helpful.
- Uses a mock WorldModel (lines 17-24) -- appropriate since the scheduler doesn't need real world state.

**Gaps**:
- No test for daemon error handling (what if `run()` throws?).
- No test for fuse trigger returning events that are collected in the tick result.
- No negative test for `adjustFuse` (adjusting below zero).

**Recommendation**: **Keep**. Add daemon error handling test.

---

### 19. `packages/engine/tests/universal-capability-dispatch.test.ts`

**Test cases**: 13
**What it tests**: Capability dispatch system (ADR-090): checking dispatch, validation (allow/block), execution, reporting, blocked reporting, integration scenarios (troll blocking, guarded treasure, unguarded items).

**Quality Assessment**: **Excellent**. Well-structured tests that cover the full four-phase behavior pattern (validate/execute/report/blocked). The integration scenarios (lines 305-357) test realistic game mechanics. Proper setup/teardown with `registerCapabilityBehavior`/`unregisterCapabilityBehavior`.

**Specific Issues**:
- Uses mock entities (lines 50-68) instead of real WorldModel entities. This is appropriate for unit testing the dispatch mechanism but means integration with real entity traits is not tested here.

**Gaps**:
- No test for an entity with multiple capability traits for the same action.
- No test for behavior that modifies world state during execute phase.

**Recommendation**: **Keep**.

---

### 20. `packages/engine/tests/verb-structure.test.ts`

**Test cases**: 1
**What it tests**: That the language provider returns verb definitions with `actionId` and `verbs` array properties.

**Quality Assessment**: **Low value/Misplaced**. This is a diagnostic test for the language provider, not the engine. It tests `@sharpee/lang-en-us` default export structure.

**Specific Issues**:
- **Line 6**: Uses `import mockLanguageProvider from '@sharpee/lang-en-us'` -- default import with "mock" prefix is misleading; it's not a mock.
- Tests only `verbs[0]` -- doesn't verify all entries.
- Belongs in lang-en-us tests, not engine tests.

**Recommendation**: **Remove** or move to `@sharpee/lang-en-us` package tests. The parser-extension tests already exercise the language provider more thoroughly.

---

## Gaps: What SHOULD Be Tested But Isn't

1. **Engine concurrency**: No test for what happens if `executeTurn` is called while another turn is in progress.
2. **Engine reset/reinitialization**: No test for calling `setStory` after the engine has been running and executing turns.
3. **Entity disambiguation in commands**: No test for commands that match multiple entities (e.g., "take ball" when two balls exist).
4. **Parser failure recovery**: No test for parser internal errors (not just "unknown command" but parser throwing exceptions).
5. **Turn execution with scheduler integration**: No test that daemons/fuses actually run during engine turns. The scheduler is tested in isolation, the engine is tested in isolation, but the integration is missing.
6. **Save/restore with scheduler state**: No test that scheduler state (active fuses, daemon paused states) survives save/restore.
7. **Event handler lifecycle**: No test for event handlers being cleaned up when the engine stops or a story is replaced.
8. **Memory leak scenarios**: No test that event listeners registered during turns are properly cleaned up.
9. **Platform operations during turn execution**: No test for platform events (save, quit) being emitted by actions during a turn and processed correctly after the turn completes.
10. **Vocabulary updates after entity creation/destruction**: No test that the parser can resolve entities created mid-game.

## Removal Candidates

| File | Reason | Active Tests Providing Value |
|------|--------|-----|
| `game-engine-language.test.ts` | Entirely dead code. 9 tests in `describe.skip` for removed functionality, 3 active tests all `expect(true).toBe(true)`. | 0 |
| `integration/query-system.test.ts` | Entire file is `describe.skip`. Functionality moved to platform layer. Note says to reimplement elsewhere. | 0 |
| `types.test.ts` | Tests TypeScript type shapes, which the compiler already enforces. All 15 tests are tautological. | 0 |
| `verb-structure.test.ts` | 1 test that belongs in `lang-en-us`, not engine. Misnamed import. | 0 |
| `story-testing-verification.test.ts` (test 2 only) | Tests language provider loading -- belongs in `lang-en-us` package. | 1 (keep test 1) |

**Tests to Remove Within Files** (trivially passing):
- `command-executor.test.ts`: 7 tests containing `expect(true).toBe(true)` (lines 187, 229, 289, 294, 299, 325, 330).
- Total: **~32 tests** can be removed or need to be rewritten to provide value.

## Improvement Priority

1. **High**: Remove dead files (`game-engine-language.test.ts`, `query-system.test.ts`, `types.test.ts`, `verb-structure.test.ts`).
2. **High**: Fix or remove `expect(true).toBe(true)` tests in `command-executor.test.ts`.
3. **Medium**: Unskip or document `command-history.test.ts` skipped tests (7 of 9 skipped).
4. **Medium**: Fix conditional assertions in `historical-accuracy.test.ts` that pass silently.
5. **Medium**: Add scheduler-engine integration test.
6. **Low**: Add error handling tests for event-emitter and scheduler-service.
7. **Low**: Improve vocabulary tests in `game-engine.test.ts` to have actual assertions.
