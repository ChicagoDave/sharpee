# Test Review: event-processor, forge, if-domain, character, basic-combat

**Date**: 2026-04-06
**Reviewer**: Claude Opus 4.6
**Scope**: 11 test files across 5 packages
**Total test cases**: 108
**Overall quality**: Mixed -- two packages (character, if-domain) are well-tested; event-processor has significant test-vs-reality drift; forge tests check construction but not behavior; one file is a pure placeholder.

---

## Summary by Package

| Package | Files | Tests | Quality | Verdict |
|---------|-------|-------|---------|---------|
| event-processor | 4 | 22 | Poor-to-Fair | Tests test removed behavior; one file is a placeholder |
| forge | 1 | 18 | Fair | Almost all tests only check `instanceof`; no behavioral assertions |
| if-domain | 3 | 42 | Good | Thorough scope/grammar/vocabulary coverage; one immutability test is incorrect |
| character | 2 | 25 | Excellent | Full lifecycle, integration, data roundtrip |
| basic-combat | 1 | 18 | Good | Good coverage of combat math; one fragile test |

---

## File-by-File Review

### 1. `packages/event-processor/tests/unit/entity-handlers.test.ts`

**Test count**: 6
**What it tests**: Verifies that entity-level `on` handlers are NOT invoked after ISSUE-068 removed them.
**Quality**: Fair, but testing removed behavior is inherently low-value.

**Observations**:
- Lines 26-51: First test verifies that `handlerFn` is not called. This is the only meaningful test in the file -- it documents the ISSUE-068 removal.
- Lines 54-78: "should not invoke handler when event has no target" -- this tests a no-target scenario, but since handlers are never invoked (ISSUE-068), the assertion `expect(handlerFn).not.toHaveBeenCalled()` would pass even if the entity had no `on` property. This is a **tautological test** -- it passes for the same reason test 1 passes.
- Lines 81-107: "should not invoke handler when entity has no handler for event type" -- same issue. Entity `on` handlers are completely removed, so the specific event type mismatch is irrelevant.
- Lines 109-135: "should handle handler returning void" -- again, handlers are not invoked at all, so "returning void" is moot. The assertions on `result.applied` and `result.reactions` are actually testing the processor, not entity handlers.
- Lines 137-165: "should handle handler throwing error gracefully" -- the handler throw can never happen because entity `on` handlers are never called. The mock entity's `on` handler is set up but never reached.
- Lines 167-184: "should not invoke handler when entity does not exist" -- testing that processing a nonexistent target does not crash. This is valid but has nothing to do with entity handlers specifically.

**Recommendation**: **Improve or consolidate.** Tests 2-5 are all tautological after ISSUE-068 and test conditions that can never arise. Keep test 1 as documentation of the removal. Test 6 (nonexistent entity) is valid and should remain but be moved/renamed to a general processor robustness suite. Tests 2-5 can be removed.

---

### 2. `packages/event-processor/tests/unit/handlers/registration.test.ts`

**Test count**: 1
**What it tests**: Nothing. It is a placeholder with `expect(true).toBe(true)`.

**Observations**:
- Lines 15-23: A single test that immediately passes with a TODO comment about IFEvents export.
- This file was written as a future TODO that was never revisited.
- IFEvents IS imported and used in the sibling `test-events.ts` fixture (line 6), so the blocking issue may have been resolved without this test being updated.

**Recommendation**: **Remove.** This is dead weight. If handler registration needs testing, write a real test. The current file provides zero value and could confuse someone into thinking registration is tested.

---

### 3. `packages/event-processor/tests/unit/processor-reactions.test.ts`

**Test count**: 5
**What it tests**: The reaction chain system in EventProcessor -- simple reactions, nested reactions, depth limiting, failed reactions, and initial-event-fail blocking.

**Quality**: Fair. Tests cover the right scenarios but rely heavily on mocking private internals, which makes them brittle and coupled to implementation.

**Observations**:
- Lines 13-19: Uses a `ProcessorPrivate` type to access `processSingleEvent`, a private method. Every test in the "reaction processing" group (lines 31-161) replaces this private method with a mock via `vi.fn().mockImplementation()`.
- Lines 31-53: "should process simple reactions" -- correctly verifies that a trigger event produces a reaction and both appear in `result.applied` and `result.reactions`. However, the mock completely bypasses the real processing path, so this doesn't test actual EventProcessor reaction processing -- it tests the loop that calls the mocked method.
- Lines 55-76: "should handle nested reactions" -- tests chain depth. Same brittleness concern.
- Lines 78-116: "should respect maxReactionDepth" -- good scenario. Correctly asserts the depth limit and the console.warn message. However, it asserts `result.applied.toHaveLength(3)` which depends on the private mock's behavior, not the processor's actual depth tracking.
- Lines 118-146: "should handle failed reactions" -- uses `mockWorld.setCanApplyResult` for the fail reaction, but the private method is also mocked. The mock returns both reactions, then the processor tries to process them. This works but is fragile.
- Lines 148-160: "should not process reactions if initial event fails" -- good edge case. Note: `reactionEvent` is created but never used (line 149), which is dead code in the test.

**Recommendation**: **Improve.** These tests should use the public `processEvents` API and `registerHandler` to set up story handlers that return effects/events, rather than mocking private methods. The current approach will break silently if `processSingleEvent` is renamed or refactored.

---

### 4. `packages/event-processor/tests/unit/processor.test.ts`

**Test count**: 10
**What it tests**: EventProcessor constructor, processEvents (valid/invalid/batch/errors), options (validate, preview), setOptions, and getWorld.

**Quality**: Good. These are the strongest event-processor tests. They test through the public API using the mock world.

**Observations**:
- Lines 29-52: Constructor tests verify the processor is created and standard handlers are registered. Line 48 checks for specific handler names (`'taken'`, `'dropped'`, `'opened'`, `'closed'`). This is coupled to the handler registration implementation but acceptable for a smoke test.
- Lines 55-69: Single event and batch processing tests are clean and correct.
- Lines 72-82: Validation failure test correctly checks both `result.failed` length and the `reason` string. The string assertion on line 81 (`toContain('validation failed')`) is coupled to an error message but provides useful documentation.
- Lines 84-97: Skip-validation test is well-structured -- sets validation to fail, then confirms the processor ignores it.
- Lines 99-119: Preview test correctly sets up expected changes and verifies they appear in the result.
- Lines 121-136: Error handling test correctly mocks `applyEvent` to throw and verifies graceful failure.
- Lines 139-156: setOptions test demonstrates runtime option changes. Clean.
- Lines 158-162: getWorld is trivially correct.

**Recommendation**: **Keep.** These are solid. Minor improvement: add a test for `registerHandler`/`unregisterHandler` (the story handler API), which is the current primary handler mechanism but has zero test coverage.

---

### 5. `packages/forge/tests/forge.test.ts`

**Test count**: 18
**What it tests**: The Forge fluent API for building IF stories -- rooms, items, characters, story execution, debug mode, templates, save/load.

**Quality**: Fair. Almost every test only asserts `expect(story).toBeInstanceOf(ForgeStory)`. This confirms the build completes without throwing but does not verify the resulting story has the expected rooms, items, exits, or properties.

**Observations**:
- Lines 10-31: Basic story creation and method chaining. Line 29 asserts `forge2 === forge1` which is a good fluent-API invariant test.
- Lines 34-64: Room building. Both tests only check `toBeInstanceOf(ForgeStory)`. No assertion that rooms were actually created, that exits connect correctly, or that the dark flag is set.
- Lines 66-115: Item building. Three tests (takeable, fixed, container) all only check `toBeInstanceOf`. No assertion on item properties. A story with `item("key").description("A brass key").takeable()` should verify the key exists and is portable, but it doesn't.
- Lines 117-135: Character building. Same issue -- `toBeInstanceOf` only.
- Lines 137-149: Example stories. These are integration smoke tests. Reasonable as-is.
- Lines 151-177: Story execution tests. Lines 152-156 (`start` succeeds, `isStarted` is true) and lines 158-162 (double-start throws) are good behavioral tests. Lines 164-176 (`getTurnCount`) has a try/catch (line 169-174) that catches command processing failures and asserts turn count is 1 anyway -- this means the test passes whether the command succeeds or fails, weakening its value.
- Lines 179-193: Debug mode. Only `toBeInstanceOf`.
- Lines 195-225: Templates. Only `toBeInstanceOf`.
- Lines 228-254: ForgeStory tests. `getCoreStory()` (line 236-239) checks existence. `save/load` (line 241-247) only checks no-throw. `getMessage` (line 249-253) only checks string type.

**Gaps**:
- No test verifies that rooms/items/characters/exits are actually created with correct properties after `build()`.
- No test verifies that processing a command ("look", "take key", "go north") produces expected output.
- No test for error conditions (missing startIn room, invalid exit targets, duplicate room IDs).

**Recommendation**: **Improve significantly.** The `toBeInstanceOf` assertions are smoke tests at best. Add tests that inspect the built world model: room count, exit connectivity, item properties (portable, container, surface), character properties. The story execution tests should verify actual game output.

---

### 6. `packages/if-domain/tests/grammar/grammar-builder.test.ts`

**Test count**: 10
**What it tests**: GrammarBuilder rule creation, slot constraints, engine integration, error handling.

**Quality**: Good. Tests verify rule properties, slot constraints, engine rule ordering, and error cases.

**Observations**:
- Lines 13-61: Uses a `MockPatternCompiler` and `TestGrammarEngine` -- clean test doubles.
- Lines 73-118: Basic rule building tests are thorough. Line 83 checks default priority (100), line 104 checks alternate tokens, line 116 checks custom priority.
- Lines 121-170: Slot constraint tests verify property constraints, function constraints, scope constraints, and multiple constraints. Good coverage.
- Lines 173-206: Engine integration tests verify rules are added, priority-ordered (lines 186-194), and grouped by action (lines 197-206). These are valuable.
- Lines 209-224: Error handling -- missing action throws (good), unique IDs generated (good).

**Gaps**:
- No test for `.forAction()` API which is the preferred pattern per CLAUDE.md.
- No test for direction patterns.
- No test for pattern validation (e.g., `||` should be rejected by the compiler's validate method, but the builder never calls it).

**Recommendation**: **Keep and extend.** Add tests for `.forAction()` and direction patterns since those are the recommended grammar API per ADR-087.

---

### 7. `packages/if-domain/tests/grammar/scope-builder.test.ts`

**Test count**: 14
**What it tests**: ScopeBuilder fluent API -- base scopes, filters, explicit entities, include rules, chaining, immutability.

**Quality**: Good with one bug.

**Observations**:
- Lines 11-43: Base scope tests (visible, touchable, carried, nearby, default "all") are clean and correct.
- Lines 45-87: Filter tests verify property, function, kind, and multiple filters. Good.
- Lines 89-108: Explicit entity tests correctly verify accumulation.
- Lines 110-130: Include rules tests correctly verify accumulation.
- Lines 132-162: Chaining tests are good. Line 160 (`expect(same).toBe(builder)`) correctly checks fluent identity.
- Lines 164-175: **Immutability test is INCORRECT.** The test at line 172 asserts `constraint1.explicitEntities.toHaveLength(0)`, but the `ScopeBuilderImpl.build()` method (source line 72) does `return { ...this.constraint }` which is a shallow copy. This means `constraint1.explicitEntities` and the builder's internal array are the **same array reference**. After calling `builder.orExplicitly(['extra'])` on line 169, the builder's `explicitEntities` array is mutated (via `push`), and since `constraint1.explicitEntities` points to the same array, `constraint1.explicitEntities` will actually contain `['extra']`. This test may be passing only if the `build()` was updated to deep-copy arrays. Checking the source: `{ ...this.constraint }` does NOT deep-copy arrays, so this test should be FAILING. If it's passing, it suggests the test may not actually be running, or there's a transpilation/runtime difference.

**Recommendation**: **Keep but fix the immutability test.** The `build()` method needs to deep-copy its arrays (`filters: [...this.constraint.filters]`, etc.) or the test expectation needs to be updated to document that immutability is NOT guaranteed. Also add a test for `hasTrait()` which exists in the source but has no test coverage.

---

### 8. `packages/if-domain/tests/vocabulary-provider.test.ts`

**Test count**: 18
**What it tests**: GrammarVocabularyProvider -- define, extend, match, isActive, getWords, hasCategory, getCategories, removeCategory, clear, plus two real-world usage scenarios.

**Quality**: Excellent. Thorough coverage of all public methods, edge cases (non-existent categories, case insensitivity), context predicates, and defensive copying.

**Observations**:
- Lines 27-73: `define()` tests cover happy path, normalization, duplicate rejection, and context predicates. All meaningful.
- Lines 75-99: `extend()` tests cover adding words, normalization, and missing-category error. Good.
- Lines 101-138: `match()` tests cover case-insensitive matching, non-matching, non-existent category, and context predicates. Excellent -- the context predicate test (lines 121-137) verifies both active and inactive states.
- Lines 140-169: `isActive()` tests are clean and correct.
- Lines 171-185: `getWords()` defensive copy test (line 176 -- modifies returned set, verifies original unchanged). This is a genuinely valuable immutability test.
- Lines 187-214: `hasCategory`, `getCategories`, `removeCategory` -- all clean.
- Lines 230-243: `clear()` -- complete.
- Lines 244-292: Real-world usage scenarios (Inside Mirror puzzle, manner adverbs) are good documentation/integration tests.

**Recommendation**: **Keep as-is.** This is exemplary test coverage.

---

### 9. `packages/character/tests/character-builder.test.ts`

**Test count**: 20 (across 4 describe blocks: CharacterBuilder 11, COGNITIVE_PRESETS 4, VocabularyExtension 4, applyCharacter + roundtrip 3)
**What it tests**: CharacterBuilder fluent API compilation to trait data -- personality, disposition, mood, threat, cognitive profile, knowledge, beliefs, goals, lucidity, perception, triggers, custom predicates, vocabulary extension, and application to entities.

**Quality**: Excellent. Tests verify actual compiled data values, not just that the builder runs. Full ADR-141 example characters are tested end-to-end.

**Observations**:
- Lines 31-45: Defaults test verifies all default values explicitly. Strong.
- Lines 52-61: Personality compilation -- asserts numeric values (0.8, 0.6, 0.2) match modifier words ("very", none, "slightly"). This is testing real business logic.
- Lines 65-93: Disposition tests verify numeric values match semantic shortcuts (loyalTo=90, likes=40, dislikes=-60, trusts=60, distrusts=-30). Excellent.
- Lines 99-146: Mood, threat, cognitive profile tests are clean. Line 142 correctly tests unknown preset throws.
- Lines 152-179: Knowledge and beliefs tests verify full object structures including defaults.
- Lines 185-199: Goals test verifies priority sorting. Good.
- Lines 205-225: Lucidity config test verifies both config storage and initial state derivation.
- Lines 231-254: Perception filters and hallucination tests. Good.
- Lines 260-331: Trigger chain tests are thorough -- basic triggers, conditional triggers, becomesLucid mutation, auto-finalize without `.done()`, auto-finalize on new `.on()`.
- Lines 337-348: Custom predicate test. Good.
- Lines 354-394: Full Margaret example from ADR-141 -- comprehensive integration test.
- Lines 400-450: Full Eleanor example -- comprehensive.
- Lines 457-500: Cognitive presets validation against ADR-141 table values.
- Lines 506-547: VocabularyExtension tests -- custom moods, custom personality traits, listing, integration with builder.
- Lines 553-599: `applyCharacter` tests verify actual CharacterModelTrait creation and predicate registration. Line 598 (`trait.evaluate('test-pred')`) correctly tests that the predicate actually evaluates.
- Lines 607-633: Compilation roundtrip creates a CharacterModelTrait from compiled data and verifies all read-back values match. This is the gold standard for builder/trait testing.

**Recommendation**: **Keep as-is.** Exemplary test suite.

---

### 10. `packages/character/tests/integration.test.ts`

**Test count**: 5 (but several are large multi-step scenarios)
**What it tests**: Full ADR-141 end-to-end integration -- character build, application to entity, event observation, lucidity decay, hallucinations, perception filters, and NpcTrait coexistence.

**Quality**: Excellent. These are genuine integration tests that use real WorldModel and real stdlib functions.

**Observations**:
- Lines 43-58: Setup helpers create real rooms, players, and NPCs with proper traits. Clean.
- Lines 107-212: Main lifecycle test is a 100-line scenario that:
  1. Builds Margaret with CharacterBuilder (layer 3)
  2. Applies to entity (layer 1)
  3. Verifies initial state (personality, disposition, mood, threat, knowledge, goals, cognitive profile, lucidity, predicates)
  4. Observes a violence event (layer 2) -- verifies threat increase, mood shift, lucidity trigger, emitted events
  5. Tests lucidity decay over multiple turns -- verifies timing and baseline restoration
  6. Tests kindness event -- verifies disposition adjustment
  This is an outstanding integration test.
- Lines 214-258: Schizophrenic profile test (Eleanor) -- tests hallucination injection and cognitive profile predicates. Good.
- Lines 260-284: PTSD perception filter test -- verifies quiet events are completely missed. Good.
- Lines 286-311: NpcTrait coexistence -- verifies both traits work independently on same entity. Good.

**Recommendation**: **Keep as-is.** Exemplary integration testing.

---

### 11. `packages/extensions/basic-combat/tests/combat-service.test.ts`

**Test count**: 18
**What it tests**: CombatService -- hit chance calculation, attack resolution (miss, hit, weapon damage, armor, kill, knockout), canAttack validation, health status reporting, and factory function.

**Quality**: Good with one fragile test.

**Observations**:
- Lines 49-79: `calculateHitChance` tests are clean and deterministic. Equal skills, advantage, disadvantage, weapon bonus, min/max clamping. Good.
- Lines 82-110: "should miss when roll exceeds hit chance" -- uses a loop (lines 103-107) to find a seed that produces a miss. This is fragile because it depends on the PRNG implementation. If the PRNG changes, the loop might not find a miss within 10 iterations. However, with skill=20 vs defense=50, the hit chance is ~20%, so most seeds should miss. Acceptable but not ideal.
- Lines 112-137: "should hit and deal damage" -- uses seed=1 for determinism. Clean.
- Lines 139-166: "should add weapon damage" -- correctly verifies 1 base + 3 weapon = 4. Good.
- Lines 168-190: "should apply armor reduction" -- verifies 3 - 2 armor = 1. Good.
- Lines 192-216: "should kill target when health reaches 0" -- checks `targetKilled`, `targetNewHealth`, `messageId`. Good.
- Lines 218-248: **Knockout test is fragile.** Lines 242-248 wrap the assertion in `if (result.hit && !result.targetKilled)` which means the test can silently pass without asserting anything if the attack misses or kills. With skill=95 and seed=1, it should hit, but if damage calculation changes, this test could silently stop testing. This is a **test that can never fail** under certain conditions.
- Lines 251-284: `canAttack` tests are clean -- combatant, non-combatant, dead target. Good.
- Lines 286-340: `getHealthStatus` tests cover all status levels. Good.
- Lines 343-351: Factory test is a smoke test. Fine.

**Gaps**:
- No test for attack when attacker has no CombatantTrait (edge case).
- No test for negative armor or negative skill values.
- No test for weapon `skillBonus` affecting hit chance (only `damage` is verified).

**Recommendation**: **Keep and fix the knockout test.** Replace the conditional assertion (lines 242-248) with deterministic setup that guarantees the knockout threshold is hit. Also add a test for `weapon.skillBonus` affecting hit chance.

---

## Gaps: What Should Be Tested But Isn't

### event-processor
1. **Story handler registration and invocation** -- `registerHandler`/`unregisterHandler` have zero test coverage despite being the primary handler mechanism after ISSUE-068.
2. **Effect processing** -- No tests for the `EffectProcessor` integration or the `game.message` override logic (processor.ts lines 269-326).
3. **WorldQuery** -- No tests for the `createWorldQuery` wrapper.

### forge
4. **Built world inspection** -- No test verifies that rooms/items/characters actually exist in the built story with correct properties.
5. **Command processing output** -- No test verifies that "look" or "take key" produces expected text.
6. **Error handling** -- No test for malformed stories (missing start room, dangling exits, etc.).
7. **NPC conversation** -- Character topics (`canTalkAbout`) are set up but never tested for retrieval.

### if-domain
8. **`.forAction()` grammar API** -- The recommended grammar pattern has no test coverage.
9. **Direction patterns** -- No test for direction grammar building.
10. **`hasTrait()` scope filter** -- Exists in source (scope-builder.ts line 66-68) but has no test.

### basic-combat
11. **Weapon skill bonus on hit chance** -- WeaponTrait has `skillBonus` but no test verifies it affects `calculateHitChance`.
12. **Edge cases** -- No tests for zero health, zero maxHealth, negative values.

---

## Removal Candidates

| File | Reason | Action |
|------|--------|--------|
| `event-processor/tests/unit/handlers/registration.test.ts` | Placeholder with `expect(true).toBe(true)`. Zero value. | **Remove entirely** |
| `event-processor/tests/unit/entity-handlers.test.ts` tests 2-5 | Tautological after ISSUE-068 -- all pass for the same reason (entity handlers are never called). | **Remove tests 2-5, keep test 1 and test 6** |
| `event-processor/tests/unit/processor-reactions.test.ts` | Not a removal candidate, but tests should be rewritten to use public API instead of mocking private `processSingleEvent`. | **Rewrite** |

---

## Priority Actions

1. **Remove** `registration.test.ts` -- it is dead weight.
2. **Fix** `scope-builder.test.ts` immutability test (line 164-175) -- either fix the source to deep-copy arrays or fix the test expectation.
3. **Fix** `combat-service.test.ts` knockout test (lines 218-248) -- remove the conditional wrapper around assertions.
4. **Consolidate** `entity-handlers.test.ts` from 6 tests to 2.
5. **Add** story handler registration/invocation tests to event-processor.
6. **Add** world inspection tests to forge (verify built rooms, items, exits have correct properties).
7. **Rewrite** `processor-reactions.test.ts` to use public API.
