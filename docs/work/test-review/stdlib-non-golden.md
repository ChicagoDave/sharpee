# Stdlib Non-Golden Test Review

**Date**: 2026-04-06
**Reviewer**: Claude (automated review)
**Scope**: 22 test files in `packages/stdlib/tests/` excluding golden action tests

## Summary

| Metric | Count |
|--------|-------|
| Files reviewed | 22 |
| Total test cases | ~215 |
| Entirely skipped files | 2 (platform-actions, author-vocabulary) |
| Partially skipped test cases | ~8 |
| Quality: Strong | 10 files |
| Quality: Adequate | 7 files |
| Quality: Weak/Remove candidate | 5 files |

**Overall Assessment**: The test suite has a solid core around scope resolution, NPC behavior, and command validation. However, there are two fully-skipped files that should either be deleted or reactivated, three debug/exploratory files that provide little regression value, and several integration tests that test mock behavior rather than real system behavior.

---

## File-by-File Review

### 1. `tests/actions/platform-actions.test.ts`

**Test cases**: 17 (all skipped via `describe.skip`)
**What it tests**: Save, restore, quit, and restart actions — event emission, metadata, restrictions
**Quality**: N/A — entire suite is skipped

**Assessment**: This file tests meaningful behavior (platform event payloads, save restrictions, unsaved changes detection, force quit/restart) but has been entirely disabled. The tests reference `setupSharedData` from `platform-test-helpers` and use `createRealTestContext`.

**Gaps**: Since the suite is skipped, there is zero coverage for platform action behavior.

**Recommendation**: **Reactivate or remove.** If the platform actions API has changed, update the tests. If the actions are tested elsewhere (e.g., transcript tests), remove this file. Leaving 17 skipped tests is worse than having no file — it creates false confidence in the test count.

---

### 2. `tests/emit-illustrations.test.ts`

**Test cases**: 8
**What it tests**: `emitIllustrations` helper — trigger matching, conditional annotations (SwitchableTrait), default values, targetPanel pass-through, multiple illustrations
**Quality**: **Strong**

**Details**: Each test creates realistic entities with annotations and verifies the output event structure. Line 71-94 tests conditional annotations based on trait state, which is a genuine behavioral test. Line 96-110 verifies defaults. Line 128-141 tests absence of optional fields.

**Gaps**: No test for what happens when the entity is deleted between annotation and call. No test for malformed annotation data (missing `id` or `src`).

**Recommendation**: **Keep.** Well-structured, tests real behavior, good coverage of edge cases.

---

### 3. `tests/integration/action-language-integration.test.ts`

**Test cases**: 5
**What it tests**: Mock language provider integration with action registry and command validator
**Quality**: **Adequate but misleading**

**Details**: The `MockLanguageProvider` at lines 20-81 is a hand-rolled mock that doesn't implement the full `LanguageProvider` interface (uses `Partial<LanguageProvider>`). The test at line 126-144 exercises a real action (`waitingAction`) through the four-phase pattern, which is valuable. However, the test at lines 200-276 creates a `mockTakeAction` that is NOT the real taking action — it tests a hand-written mock, not actual behavior.

**Gaps**: Does not test what happens when language provider returns no patterns. Does not test error message resolution for failed actions.

**Recommendation**: **Improve.** Remove the mock take action test (lines 200-276) — it tests a fake implementation, not the real one. The remaining tests provide marginal integration value since the mock language provider doesn't match production behavior.

---

### 4. `tests/integration/container-visibility-knowledge.test.ts`

**Test cases**: 5
**What it tests**: Container visibility rules — closed containers hide contents, opening reveals them, scope-aware validation
**Quality**: **Strong**

**Details**: Tests real `StandardScopeResolver.canSee()` and `CommandValidator.validate()` against entities behind closed containers. Line 155-176 tests the open-then-take flow. Line 178-204 is an end-to-end scenario (move, examine, try take, open, take). Uses `AuthorModel` correctly for setup.

**Gaps**: No test for transparent containers (if supported). No test for nested containers (open outer, closed inner).

**Recommendation**: **Keep.** Valuable integration test that verifies the scope-to-validation pipeline.

---

### 5. `tests/integration/meta-commands.test.ts`

**Test cases**: 16 (3 skipped)
**What it tests**: MetaCommandRegistry — auto-registration of meta-actions, recognition of standard meta-commands (SAVE, RESTORE, QUIT, SCORE, HELP, AGAIN), non-meta commands, custom command detection
**Quality**: **Adequate**

**Details**: Lines 60-72 test core registration behavior. Lines 74-98 are essentially lookup table tests — they verify that specific action IDs are registered as meta. These are low-value tests individually but collectively document the meta-command set. The 3 skipped tests (lines 101-124) reference unimplemented author actions (ParserEventsAction, ValidationEventsAction, SystemEventsAction).

**Gaps**: No test that meta-commands actually skip turn increment. No test that meta-commands are excluded from history. These are the behaviors the file's header comment promises to test but doesn't.

**Recommendation**: **Improve.** The registry lookup tests are fine but the file should actually test the behavioral guarantees (no turn increment, no history recording) that make meta-commands special. Remove the 3 skipped tests for unimplemented features.

---

### 6. `tests/query-handlers/platform-handlers.test.ts`

**Test cases**: 15
**What it tests**: QuitQueryHandler and RestartQueryHandler — canHandle routing, handleResponse event emission, timeout/cancel behavior
**Quality**: **Strong**

**Details**: Tests cover the full lifecycle: can-handle routing (lines 32-73), response handling for quit/save-and-quit/cancel (lines 77-191), timeout and cancel fallbacks (lines 194-234), and the parallel restart handler (lines 237-432). Event emission is verified with payload structure checks.

**Gaps**: No test for concurrent queries. No test for invalid response values.

**Recommendation**: **Keep.** Thorough and well-structured tests for an important subsystem.

---

### 7. `tests/scope-debug.test.ts`

**Test cases**: 1
**What it tests**: Closed containers hide contents from scope
**Quality**: **Weak — debug/exploratory test**

**Details**: This is a single test that duplicates what `scope-resolver.test.ts` line 75-86 already tests more thoroughly. The file name itself says "debug."

**Gaps**: N/A — this is entirely redundant.

**Recommendation**: **Remove.** Fully duplicated by `unit/scope/scope-resolver.test.ts` "should not see objects in closed containers" test.

---

### 8. `tests/scope-integration.test.ts`

**Test cases**: 8
**What it tests**: Scope validation through CommandValidator — REACHABLE, CARRIED, AUDIBLE, DETECTABLE scope levels with entity resolution
**Quality**: **Strong**

**Details**: Line 53-94 tests that objects in closed containers fail validation. Lines 123-196 test throwing scope (REACHABLE for implicit take). Lines 199-322 test cross-room hearing and smelling through doors. Line 326-353 verifies `scopeInfo` metadata in validated commands. Uses `AuthorModel` for setup. The assertion at line 87-93 is slightly weak (accepts either "found wrong entity" or "not found") but the comment explains why.

**Gaps**: No test for VISIBLE scope (seeing but not reaching). No test for scope degradation when doors close during a turn.

**Recommendation**: **Keep.** Valuable integration tests that verify scope levels flow through to command validation.

---

### 9. `tests/scope-validation-basic.test.ts`

**Test cases**: 1
**What it tests**: CommandValidator rejects commands when no action is registered
**Quality**: **Weak — debug/exploratory test**

**Details**: A single test that verifies `ACTION_NOT_AVAILABLE` error code. Line 34 has a leftover `console.log`. This is a trivially simple test that the golden tests cover more thoroughly.

**Recommendation**: **Remove.** Fully covered by `unit/validation/command-validator-golden.test.ts` line 105-144 which tests the same scenario.

---

### 10. `tests/unit/capabilities/capability-refactoring.test.ts`

**Test cases**: 7
**What it tests**: StandardCapabilitySchemas structure, registerStandardCapabilities, CommandHistoryCapability data model, WorldModel integration
**Quality**: **Adequate**

**Details**: Lines 17-48 are schema structure tests — verifying that capability schemas have the right fields and types. These are brittle (tied to schema shape) but document the contract. Lines 51-93 verify registration behavior with a spy. Lines 96-152 test the `CommandHistoryData` interface but line 124-152 simulates trimming logic *in the test itself* rather than testing actual trimming code — this is testing test code, not production code. Lines 155-191 test real WorldModel integration, which is valuable.

**Gaps**: No test for registering capabilities twice (idempotency). No test for unknown capability names. The entry trimming test (line 124) tests a manual simulation, not the actual trimming implementation.

**Recommendation**: **Improve.** Remove the manual trimming simulation test (lines 124-152) or replace it with a test of the actual trimming code. Keep the WorldModel integration test.

---

### 11. `tests/unit/chains/opened-revealed.test.ts`

**Test cases**: 12
**What it tests**: Opened-to-revealed event chain — container contents trigger revealed event, null returns for non-containers/empty containers/missing entities, event data structure
**Quality**: **Strong**

**Details**: Comprehensive coverage of the chain handler. Tests both the happy path (lines 34-55) and all null-return cases (lines 57-99). Lines 103-129 test multiple items. Lines 131-210 verify event structure (entities, ids, timestamps). Lines 213-244 test messageId fallback behavior. Line 252-275 tests name resolution from world when not in event. Good use of typed assertions (`RevealedEventData`).

**Gaps**: None significant.

**Recommendation**: **Keep.** Excellent test file — thorough, well-organized, tests real behavior.

---

### 12. `tests/unit/npc/character-observer.test.ts`

**Test cases**: 26
**What it tests**: Character observation system (ADR-141) — perception filtering, hallucination injection, event observation, lucidity decay, multi-turn scenarios
**Quality**: **Strong**

**Details**: Five test suites covering the full NPC cognitive pipeline. `filterPerception` tests (lines 79-156) verify accurate/filtered/augmented perception modes. `injectHallucinations` tests (lines 162-216) verify state-dependent hallucination injection with proper fact tracking. `observeEvent` tests (lines 222-398) verify threat changes, mood shifts, disposition adjustments, and event emission. `processLucidityDecay` tests (lines 405-482) verify actual trait mutation after decay — line 460-481 explicitly checks `trait.currentLucidityState` and `trait.lucidityWindowTurns` postconditions. The multi-turn scenario (lines 544-586) is an excellent integration test.

**Gaps**: No test for concurrent observation by multiple NPCs. No test for observation of the NPC's own actions.

**Recommendation**: **Keep.** High-quality behavioral tests with proper state verification.

---

### 13. `tests/unit/npc/npc-service.test.ts`

**Test cases**: 14
**What it tests**: NpcService — behavior registration/removal, tick lifecycle (alive/dead/unconscious filtering), player enter/leave/speak/attack hooks, standard behaviors (guard, passive, wanderer)
**Quality**: **Strong**

**Details**: Lines 59-84 test CRUD for behaviors. Lines 86-163 test the critical tick filtering — dead NPCs (line 113) and unconscious NPCs (line 139) don't get `onTurn` called. Lines 169-276 test all NPC interaction hooks. Lines 280-393 test standard behavior implementations. Uses `vi.fn()` mocks appropriately for interaction verification.

**Gaps**: No test for NPC behavior throwing an error (error handling). No test for behavior priority when multiple NPCs act in the same turn.

**Recommendation**: **Keep.** Solid behavioral tests with good mock usage.

---

### 14. `tests/unit/parser/parser-factory.test.ts`

**Test cases**: 10
**What it tests**: ParserFactory — registration, case-insensitive language codes, fallback from full code to language-only, creation, error messages, listing, clearing
**Quality**: **Strong**

**Details**: Tests cover the registration lifecycle thoroughly. Line 73-78 tests dual registration (full code + language-only). Line 80-86 tests case insensitivity. Lines 89-127 test creation including error paths with helpful messages. Line 155-161 tests interesting cross-region fallback ("en-GB" finds "en-US" parser).

**Gaps**: No test for registering a parser that fails to construct. No test for thread safety (likely not needed in JS).

**Recommendation**: **Keep.** Clean, comprehensive factory pattern tests.

---

### 15. `tests/unit/scope/scope-resolver.test.ts`

**Test cases**: ~40
**What it tests**: StandardScopeResolver — visibility, container/supporter visibility, reachability, getVisible/getReachable lists, edge cases, minimum scope (author-controlled), vehicle scope, serialization round-trip, disambiguation priorities
**Quality**: **Strong — flagship test file**

**Details**: This is the most comprehensive test file in the suite. Basic visibility (lines 32-58) covers same-room, different-room, and carried items. Container visibility (lines 61-120) tests open/closed/nested containers. Supporter visibility (lines 123-150) tests the supporter chain. Reachability (lines 152-199) mirrors visibility with touch semantics. The minimum scope section (lines 265-878) is extensive — it tests global scope, room-specific scope, additive behavior, clearing, JSON serialization, clone persistence, vehicle scope through balloons, and a full WorldModel serialization round-trip (lines 531-632). Lines 633-749 simulate the command validator flow end-to-end. Lines 751-858 reproduce a specific runtime bug (disambiguation with shared aliases). Lines 881-1006 test the disambiguation priority API.

**Gaps**: Lines 195-199 is an empty test ("should not reach high objects") with a comment about future work. Several tests have `console.log` statements (lines 571-630, 686-748, 803-838) that suggest they were debugging aids and should be cleaned up.

**Recommendation**: **Keep.** Remove `console.log` statements and the empty test stub. This is the cornerstone scope test file.

---

### 16. `tests/unit/scope/sensory-extensions.test.ts`

**Test cases**: 13
**What it tests**: Hearing (same room, through open/closed doors, unconnected rooms, getAudible), smell (food, actors, through open/closed doors, non-scented items), darkness (dark rooms, light sources, carried light, self-lit actors)
**Quality**: **Strong**

**Details**: Tests the full sensory model with proper world setup using `AuthorModel`. Line 86-105 tests hearing through closed doors (muffled but not blocked). Lines 204-210 verify smell IS blocked by closed doors (unlike sound). Lines 233-264 test the darkness/light interaction with `RoomTrait.isDark` and `LightSourceTrait`.

**Gaps**: No test for the interaction between darkness and containers (can you see inside an open box in a dark room with a light source?).

**Recommendation**: **Keep.** Thorough sensory model tests.

---

### 17. `tests/unit/scope/witness-system.test.ts`

**Test cases**: 12 (3 skipped)
**What it tests**: StandardWitnessSystem — witness recording, knowledge management (discovery, movement history, destruction), witness levels (FULL/PARTIAL), getKnownEntities
**Quality**: **Adequate**

**Details**: Lines 57-122 test basic witnessing — NPC witnesses movement, actor doesn't witness own action, different-room isolation. Lines 125-228 test knowledge tracking — discovered entities, movement history, visual properties (acknowledged as incomplete at line 175), destruction marking. The 3 skipped tests (lines 231-329) test event emission via `createEvent` mock but are disabled. Lines 332-374 test witness levels.

**Gaps**: The 3 skipped tests at lines 231-329 are important — they verify that witness events are emitted. These should be either fixed or removed. The `vi.mock('@sharpee/core')` at line 12 is a module-level mock that could interfere with other tests if not properly isolated.

**Recommendation**: **Improve.** Fix or remove the 3 skipped event emission tests. The knowledge management tests are valuable and should be kept.

---

### 18. `tests/unit/services/perception-service.test.ts`

**Test cases**: 11
**What it tests**: PerceptionService — canPerceive for sight/hearing/smell/touch in lit/dark rooms, filterEvents transformation for room descriptions and contents lists in darkness
**Quality**: **Strong**

**Details**: Lines 46-69 test basic perception by sense type. Lines 72-95 verify all events pass through in lit rooms. Lines 97-173 test darkness filtering — room descriptions and content lists get transformed to `perception.blocked` events while non-visual events pass through. Lines 175-227 cover edge cases (orphan player, preserved original data, empty arrays, mixed event types).

**Gaps**: No test for light source interaction (does PerceptionService check for carried light sources, or is that handled by scope resolver?). No test for the future blindness/blindfold case mentioned in the file header.

**Recommendation**: **Keep.** Clean perception filtering tests with good edge case coverage.

---

### 19. `tests/unit/validation/command-validator-golden.test.ts`

**Test cases**: 16
**What it tests**: CommandValidator — basic validation, adjective matching, scope rules, debug events, ambiguity resolution, synonym resolution, complex commands (prepositions), resolveWithSelection disambiguation
**Quality**: **Strong**

**Details**: Despite the "golden" name, this is NOT in the golden test directory. It tests CommandValidator with real actions (taking, examining, putting, pushing). Line 277-311 tests adjective fallback ("press yellow" finds "yellow button"). Lines 448-485 test ambiguity detection. Lines 529-591 test synonym and alias resolution. Lines 647-863 test the `resolveWithSelection` API for post-disambiguation resolution, including scope constraint enforcement on selected entities (line 829-862).

**Gaps**: No test for "take all" pattern. No test for pronoun resolution ("take it").

**Recommendation**: **Keep.** Comprehensive command validation tests.

---

### 20. `tests/unit/vocabulary/author-vocabulary.test.ts`

**Test cases**: 5 (all skipped via `describe.skip`)
**What it tests**: Author debug command vocabulary — parser_events, validation_events, system_events verb registration
**Quality**: N/A — entire suite is skipped

**Details**: All 5 tests are skipped with the note "Not Implemented." They test vocabulary entries for three author actions that don't exist yet.

**Recommendation**: **Remove.** These test unimplemented features. When the features are implemented, fresh tests should be written alongside them. Keeping skipped tests for hypothetical features adds noise.

---

### 21. `tests/validation/entity-alias-resolution.test.ts`

**Test cases**: 9
**What it tests**: Entity resolution by primary name, aliases, multi-word aliases (ISSUE-057), disambiguation with full-text vs head-noun matching, cross-room scoping
**Quality**: **Adequate with issues**

**Details**: Tests important entity resolution scenarios. Lines 263-415 cover ISSUE-057 (multi-word alias resolution), which is a real bug fix. Line 352-388 tests disambiguation priority (full text match beats head-only match). However, lines 62-69 and 122-150 contain extensive `console.log` debug output that should be removed. Lines 71-94 set up custom scope rules (`world.addScopeRule`) that are not used by other test files — this suggests the test may be testing an older API. Lines 168-175 manually wire into internal `systemEvents` via type assertion.

**Gaps**: No test for case sensitivity in aliases. No test for partial alias matches.

**Recommendation**: **Improve.** Remove all `console.log` statements. Verify that the `addScopeRule` API is still the canonical way to set up scope — if not, update the test setup. The multi-word alias tests are valuable and should be preserved.

---

### 22. `tests/world-model-debug.test.ts`

**Test cases**: 2
**What it tests**: Basic WorldModel location tracking and nested locations
**Quality**: **Weak — debug/exploratory test**

**Details**: Two trivial tests that verify `getLocation()` and nested `moveEntity()`. These are WorldModel unit tests, not stdlib tests, and they belong in `packages/world-model/tests/` if anywhere. The behavior they test (entity location tracking) is a fundamental WorldModel feature that is exercised by virtually every other test in the suite.

**Recommendation**: **Remove.** Redundant with WorldModel's own tests and exercised implicitly by every scope/validation test.

---

## Removal Candidates

| File | Reason |
|------|--------|
| `tests/scope-debug.test.ts` | Single test fully duplicated by scope-resolver.test.ts |
| `tests/scope-validation-basic.test.ts` | Single test fully duplicated by command-validator-golden.test.ts |
| `tests/world-model-debug.test.ts` | Tests WorldModel basics, not stdlib; covered everywhere implicitly |
| `tests/unit/vocabulary/author-vocabulary.test.ts` | All 5 tests skipped; features not implemented |
| `tests/actions/platform-actions.test.ts` | All 17 tests skipped; either reactivate or remove |

**Total removable**: 5 files, 26 test cases (all currently provide zero coverage)

---

## Improvement Candidates

| File | Issue | Action |
|------|-------|--------|
| `tests/integration/action-language-integration.test.ts` | Mock take action tests fake code | Remove lines 200-276 |
| `tests/integration/meta-commands.test.ts` | 3 skipped tests for unimplemented features; doesn't test actual meta-command behavior | Remove skipped tests; add turn-skip verification |
| `tests/unit/capabilities/capability-refactoring.test.ts` | Entry trimming test simulates logic in test, not production code | Replace with test of actual trimming implementation |
| `tests/unit/scope/witness-system.test.ts` | 3 skipped event emission tests | Fix or remove; they test important behavior |
| `tests/unit/scope/scope-resolver.test.ts` | Console.log statements, one empty test stub | Clean up debug output; remove empty test at line 195 |
| `tests/validation/entity-alias-resolution.test.ts` | Extensive console.log, internal API wiring | Clean up debug output; verify scope rule API is current |

---

## Coverage Gaps

These are areas that **should** be tested but lack coverage across the entire non-golden test suite:

1. **Platform action behavior**: Save/restore/quit/restart actions have zero running tests (all skipped).

2. **Meta-command turn semantics**: No test verifies that meta-commands actually skip the turn counter or are excluded from command history.

3. **Error recovery in NPC behaviors**: No test verifies what happens when an NPC behavior throws an exception during `onTurn`.

4. **Concurrent/sequential NPC ordering**: No test verifies the order in which multiple NPCs act in the same turn.

5. **Scope resolver with light sources + containers**: No test checks whether items in open containers are visible in dark rooms when the player has a light source.

6. **CommandValidator "take all" and pronoun resolution**: No test for "take all" or pronoun references like "take it."

7. **PerceptionService + light source interaction**: Unclear whether PerceptionService delegates to scope resolver for light checks or handles them independently.

8. **Witness event emission**: The 3 skipped tests in witness-system.test.ts are the only tests for witness event emission, and they're disabled.

9. **Capability trimming**: The actual entry-count-limiting behavior of command history is not tested against production code.

10. **Hallucination de-duplication edge cases**: The character observer tests check that already-known hallucinations aren't re-injected, but don't test what happens when a hallucinated fact is later learned through real observation (source upgrade).
