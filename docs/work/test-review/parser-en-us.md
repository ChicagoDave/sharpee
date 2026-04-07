# Test Review: packages/parser-en-us

**Reviewer**: Claude Opus 4.6 (1M context)
**Date**: 2026-04-06
**Total test files**: 21
**Total test cases**: ~185 (approximate; some tests loop over arrays)
**Skipped tests**: 3 (1 entire file, 2 individual tests)

## Overall Assessment

The parser-en-us test suite is **moderately strong**. It covers a wide surface area of parser features -- pattern compilation, grammar engine matching, typed slots, direction vocabulary, pronoun resolution, error messages, and integration with the full language provider. The tests generally assert on meaningful behavior (parsed actions, slot values, match counts) rather than internal structure.

**Key strengths:**
- Good coverage of the grammar builder API (ADR-087), typed slots (ADR-082), and text/greedy slots (ADR-080)
- Direction vocabulary tests (ADR-143) are thorough and test vocabulary switching, case handling, and edge cases
- Pronoun context tests cover a good range of pronouns including neopronouns
- Slot consumer tests are well-structured unit tests with clear boundary conditions

**Key weaknesses:**
- Several tests that can never fail (always-pass informational tests in grammar-lang-sync)
- Two "debug exploration" test files (colored-buttons, parts of push-panel) that log output and make weak assertions
- One entirely skipped file (push-panel-with-core) that should be removed
- Some overlap between files testing the same grammar engine behavior from slightly different angles
- Scope tests (grammar-scope, grammar-scope-cross-location) are partially obsolete since scope was moved to the action layer

---

## File-by-File Review

### 1. action-grammar-builder.test.ts
**Path**: `packages/parser-en-us/tests/action-grammar-builder.test.ts`
**Test cases**: 11
**Tests**: ADR-087 action-centric grammar builder API -- verb alias expansion, constraints, direction patterns, combined usage, and pattern matching integration

**Quality**: HIGH. Tests verify correct rule generation (count, patterns, action IDs), constraint application, direction semantics, and priority handling. The two integration tests at the end (lines 213-261) are particularly valuable as they verify end-to-end matching through `engine.findMatches()`.

**Gaps**:
- No test for error cases (e.g., calling `.build()` without `.forAction()`, calling `.verbs()` with empty array)
- No test for `.forAction()` combined with `.where()` and `.directions()` all together

**Recommendation**: KEEP. Solid test file.

---

### 2. adr-080-grammar-enhancements.test.ts
**Path**: `packages/parser-en-us/tests/adr-080-grammar-enhancements.test.ts`
**Test cases**: 24
**Tests**: Greedy text slots, `.text()` method, `.instrument()` method, text slot matching, greedy matching, "all" keyword, "and" list parsing, command chaining, vocabulary slots, and manner slots

**Quality**: HIGH. This is one of the most comprehensive test files in the suite. Tests cover the pattern compiler level (greedy syntax compilation), grammar builder level (`.text()`, `.instrument()`, `.fromVocabulary()`, `.manner()`), and engine matching level (slot values, slot types, greedy boundaries, list parsing). The negative tests (non-manner words not matching, vocabulary inactive in wrong location) are well done.

**Gaps**:
- "and" list parsing with comma-separated items is acknowledged as incomplete (line 568-569)
- No test for empty greedy slots (e.g., "say" with no message)
- No test for `parseChain` with quoted strings containing periods (line 540-543 has a weak placeholder test that just parses "look")

**Issues**:
- Line 540-543: Test "should preserve quoted strings containing periods" only parses `'look'` -- does not actually test quoted strings with periods. This test name is misleading and the test is trivially passing.

**Recommendation**: KEEP, but fix the misleading "preserve quoted strings" test (line 540).

---

### 3. adr-082-typed-slots.test.ts
**Path**: `packages/parser-en-us/tests/adr-082-typed-slots.test.ts`
**Test cases**: 18
**Tests**: NUMBER, ORDINAL, TIME, DIRECTION, QUOTED_TEXT, and TOPIC slot types -- both matching and value extraction

**Quality**: HIGH. Good coverage of positive and negative cases for each slot type. Tests verify both that the correct SlotType is set and that extracted values are correct. The combined typed slots tests (lines 376-417) verify multiple typed slots in a single pattern.

**Gaps**:
- No test for NUMBER slot with negative numbers
- No test for ORDINAL words beyond "first" and "fifth" (e.g., "tenth", "twentieth")
- No test for TIME slot with AM/PM format
- QUOTED_TEXT test (lines 305-336) constructs tokens manually in an awkward way -- the real tokenizer behavior for quoted strings is not tested here

**Recommendation**: KEEP. Good test file.

---

### 4. colored-buttons.test.ts
**Path**: `packages/parser-en-us/tests/colored-buttons.test.ts`
**Test cases**: 8
**Tests**: Parsing commands targeting colored buttons (multi-word entity names, aliases, disambiguation)

**Quality**: LOW-MEDIUM. This file reads like a debugging investigation rather than a regression test suite. Multiple tests use `console.log` for debugging output (lines 185, 198, 210, 222, 233, 249, 266, 279-286, 297-299, 305-307). The "Ambiguous references" section (lines 244-275) makes NO assertions on the parse result -- it only logs what happened. The "Debug" section (lines 290-317) similarly only logs. The "Entity scope and visibility" test (line 278-288) is just testing the mock world model, not the parser.

**Issues**:
- Lines 245-275: Two tests with zero meaningful assertions -- `parser.parse()` is called but success/failure is only logged, not asserted
- Lines 278-288: Tests mock model, not parser
- Lines 290-317: Debug tests with no behavioral assertions; they set `PARSER_DEBUG` env var but don't verify anything
- Heavy `console.log` throughout suggests this was investigative code that got committed

**Recommendation**: IMPROVE or REMOVE. The tests in "Single-word references" and "Multi-word references" (lines 181-242) are worth keeping but should drop the console.log. The "Ambiguous references", "Entity scope", and "Debug" sections should be either given real assertions or removed.

---

### 5. direction-vocabulary.test.ts
**Path**: `packages/parser-en-us/tests/direction-vocabulary.test.ts`
**Test cases**: 21
**Tests**: Direction vocabulary system (ADR-143) -- compass, naval, and minimal vocabularies; vocabulary switching; grammar direction map; case handling; edge cases

**Quality**: HIGH. This is one of the best test files in the suite. It tests three distinct vocabularies, verifies that switching vocabularies correctly activates/deactivates word recognition, tests display names, grammar map structure, case insensitivity, whitespace handling, null/undefined input, and fallback behavior. The `afterEach` reset (line 22) prevents cross-contamination.

**Gaps**:
- No test for `getGrammarDirectionMap()` with compass vocabulary verifying diagonal directions (ne, nw, se, sw)
- No test for `parseDirection` with multiple words (e.g., "north east" as two tokens)

**Recommendation**: KEEP. Excellent test file.

---

### 6. english-grammar-engine.test.ts
**Path**: `packages/parser-en-us/tests/english-grammar-engine.test.ts`
**Test cases**: 12
**Tests**: Core grammar engine functionality -- basic pattern matching (literal, verb-noun, alternates, negative), slot extraction (single, multiple, multi-word), priority/confidence, edge cases (empty tokens, too-short input, extra tokens), and multiple rule matching

**Quality**: HIGH. Tests cover the fundamental grammar engine operations with clear assertions. The edge case tests (lines 208-248) are valuable -- testing empty tokens, too-short input, and extra tokens. The priority test (lines 158-178) correctly verifies ordering behavior.

**Gaps**:
- No test for optional slots (e.g., `[:adverb]`)
- The `createToken` helper (lines 30-41) is defined but never used in any test
- No test for patterns where a slot name conflicts with a literal word

**Issues**:
- Lines 30-41: Dead code -- `createToken` helper is defined but unused

**Recommendation**: KEEP. Remove the unused `createToken` helper.

---

### 7. english-pattern-compiler.test.ts
**Path**: `packages/parser-en-us/tests/english-pattern-compiler.test.ts`
**Test cases**: 14
**Tests**: Pattern compilation (literals, slots, alternates, complex patterns), validation (correct/empty/invalid), slot extraction, error handling, edge cases

**Quality**: HIGH. Cleanly structured unit tests for the pattern compiler. Good positive and negative validation tests. The error handling tests (lines 124-133) verify that specific error types are thrown with correct messages.

**Gaps**:
- No test for optional slot syntax (`[:target]`)
- No test for compiling greedy slots (`:message...`) -- this is covered in adr-080 tests but not here
- Line 153: Test "should preserve case in literals but not slots" says "not slots" but doesn't actually verify case handling of slot names -- it just checks they're registered

**Recommendation**: KEEP. Solid unit test file.

---

### 8. grammar-lang-sync.test.ts
**Path**: `packages/parser-en-us/tests/grammar-lang-sync.test.ts`
**Test cases**: 6
**Tests**: Verification that grammar verbs in parser-en-us match language definitions in lang-en-us (ADR-087 Phase 9)

**Quality**: MIXED. The concept is valuable (detecting drift between grammar and language packages), but execution is flawed. Two tests (lines 178-204 and 242-265) have the pattern `expect(true).toBe(true)` -- they can never fail and exist only to produce console.log output. The three specific sync checks (lines 207-239) are genuinely useful.

**Issues**:
- Line 203: `expect(true).toBe(true)` -- always passes, labeled "informational"
- Line 264: `expect(true).toBe(true)` -- always passes, labeled "informational"
- These "informational" tests pollute the test count with meaningless passes
- The console.log-heavy reporting (lines 182-200, 245-261) belongs in a CI reporting tool, not in unit tests

**Gaps**:
- Should assert on maximum allowed drift count rather than logging
- Should fail if any core action has mismatched verbs, not just log

**Recommendation**: IMPROVE. Convert the `expect(true).toBe(true)` tests into real assertions (e.g., `expect(syncResults.length).toBeLessThanOrEqual(MAX_ALLOWED_DRIFT)`). The informational logging can stay as a supplement but should not be the only output.

---

### 9. grammar-scope-cross-location.test.ts
**Path**: `packages/parser-en-us/tests/grammar-scope-cross-location.test.ts`
**Test cases**: 4
**Tests**: Cross-location scope constraints -- verifying grammar parses regardless of location

**Quality**: LOW-MEDIUM. The file header (lines 1-8) and test descriptions (lines 209-211) acknowledge that "Grammar no longer enforces scope" and that scope validation moved to the action layer. This means the tests are largely confirming the absence of a feature. The first two tests (lines 213-246) just verify that `parser.parse()` succeeds for any entity text regardless of location, which is the default behavior of the grammar engine with no world context filtering.

**Issues**:
- The `nearby()` scope test (lines 249-268) accesses private parser internals (`parser['grammarEngine']`) -- brittle and testing implementation details
- Lines 213-246: These tests essentially verify "the parser parses any word" which is true by default
- The elaborate `MockWorldModelWithLocations` class (lines 25-172) is mostly unused since grammar doesn't check scope

**Gaps**:
- If grammar truly doesn't enforce scope, these tests aren't adding value
- If the intent is to document that grammar *should not* enforce scope, a single test would suffice

**Recommendation**: CONSOLIDATE. Keep 1-2 representative tests and merge into grammar-scope.test.ts. Remove the rest -- they test the absence of a feature with excessive mock infrastructure.

---

### 10. grammar-scope.test.ts
**Path**: `packages/parser-en-us/tests/grammar-scope.test.ts`
**Test cases**: 7
**Tests**: Grammar scope constraints -- verifying grammar parses regardless of visibility, carried status, and portability

**Quality**: LOW-MEDIUM. Same situation as grammar-scope-cross-location.test.ts. The file header (lines 1-8) explicitly states "Grammar no longer enforces scope." All seven tests verify that `parser.parse()` succeeds regardless of entity properties, which is the default grammar behavior.

**Issues**:
- Lines 193-228: All "grammar parses regardless of scope" tests simply verify `parser.parse('take X')` succeeds -- this is true for any input text
- Lines 230-256: "grammar parses regardless of carried status" -- same issue
- Lines 258-273: "grammar parses regardless of portable status" -- same issue
- The `MockWorldModel` (lines 26-142) is elaborate but largely irrelevant since grammar doesn't use scope data
- Lines 275-289: The "throw ball at window" test is the only one testing a more complex pattern and is mildly useful

**Recommendation**: CONSOLIDATE with grammar-scope-cross-location.test.ts. Keep the "throw ball at window" test and one representative "grammar parses regardless" test. Remove the rest.

---

### 11. improved-error-messages.test.ts
**Path**: `packages/parser-en-us/tests/improved-error-messages.test.ts`
**Test cases**: 8
**Tests**: Error message analysis -- `analyzeBestFailure` function with various failure scenarios

**Quality**: HIGH. These are focused unit tests for the error classification logic. Each test constructs a specific failure scenario and verifies the correct error code and message ID. The "prefer higher progress failures" test (lines 108-137) is particularly valuable for testing the prioritization logic.

**Gaps**:
- No test for `analyzeBestFailure` with multiple failures at the same progress level
- No test for the case where `matchedVerb` is a multi-word compound verb
- Line 175-176 notes that `getParserErrorMessage` tests are in another package -- a cross-reference test would be useful

**Recommendation**: KEEP. Well-structured, meaningful tests.

---

### 12. parser-integration.test.ts
**Path**: `packages/parser-en-us/tests/parser-integration.test.ts`
**Test cases**: 30
**Tests**: Full integration tests with the real `EnglishLanguageProvider` -- core patterns, directions, compound verbs, prepositions, vocabulary, errors, custom grammar, VERB_NOUN_NOUN patterns, complex noun phrases, optional elements, quoted strings, multiple prepositions

**Quality**: HIGH. This is the most comprehensive integration test file. It tests the full parser pipeline with the real language provider. Tests cover a wide range of IF command patterns. The quoted string tests (lines 391-472) and multiple preposition patterns (lines 475-542) are thorough.

**Gaps**:
- No test for "again" / "g" command
- No test for pronoun usage in parse (e.g., "take it", "give it to him")
- No test for "look in" / "look under" / "search in" patterns
- No test for disambiguation when input could match multiple actions at same priority

**Issues**:
- Line 196-199: Accesses private parser method `parser['tokenizeRich']` -- brittle. This test is also testing vocabulary recognition rather than parsing behavior.

**Recommendation**: KEEP. The most valuable test file in the suite. Consider adding pronoun and disambiguation tests.

---

### 13. pronoun-context.test.ts
**Path**: `packages/parser-en-us/tests/pronoun-context.test.ts`
**Test cases**: 15
**Tests**: Pronoun resolution system (ADR-089 Phase B) -- pronoun recognition, INANIMATE constants, PronounContextManager (resolve, reset, registerEntity, lastCommand)

**Quality**: HIGH. Good coverage of the pronoun system. Tests cover standard pronouns, neopronouns (xem, zir, hir, em, faer), case insensitivity, inanimate vs. animate entities, plural resolution, and the "again" command support via lastCommand. The `registerEntity` tests (lines 187-271) are particularly thorough, testing inanimate singular, plural, gendered actors, and actors with multiple pronoun sets.

**Gaps**:
- No test for pronoun expiry (stale references from many turns ago)
- No test for resolving pronouns when multiple entities share the same pronoun (e.g., two she/her NPCs)
- No test for integration with the actual parser (resolving "take it" to the last mentioned entity)

**Recommendation**: KEEP. Solid unit tests for the pronoun system.

---

### 14. push-panel-pattern.test.ts
**Path**: `packages/parser-en-us/tests/push-panel-pattern.test.ts`
**Test cases**: 5
**Tests**: Story grammar pattern priority -- literal patterns vs. slot patterns for "push red panel"

**Quality**: MEDIUM. The tests verify that story patterns with higher priority override core grammar patterns. The core tests (lines 89-161) are valid. However, the final test (lines 165-189) makes a weak assertion -- it logs the result but doesn't assert which specific action matched. There's also significant `console.log` debugging output throughout.

**Issues**:
- Lines 100, 118, 135, 155: `console.log` statements throughout
- Lines 165-189: "should prefer literal pattern over slot pattern with same priority" -- the test creates two patterns, parses input, but then only logs which action matched without asserting on it
- The mock world model is set up but `parser.setWorldContext()` doesn't seem to influence the tests since grammar doesn't enforce scope

**Recommendation**: IMPROVE. Remove console.log, add proper assertions to the final test, and consider merging with story-grammar.test.ts since both test story pattern registration.

---

### 15. push-panel-with-core.test.ts
**Path**: `packages/parser-en-us/tests/push-panel-with-core.test.ts`
**Test cases**: 0 (1 skipped placeholder)
**Tests**: Nothing -- the entire file is skipped

**Quality**: NONE. The file contains a single `describe.skip` block with a placeholder `expect(true).toBe(true)` test. The header comment (lines 7-8) says "core-grammar module doesn't exist" and suggests creating it or removing the test file.

**Issues**:
- Entirely dead code
- The placeholder test is `expect(true).toBe(true)` -- meaningless

**Recommendation**: REMOVE. This file provides zero value. If the test scenario is still needed, it can be recreated when core-grammar module exists.

---

### 16. slot-consumers/slot-consumer-registry.test.ts
**Path**: `packages/parser-en-us/tests/slot-consumers/slot-consumer-registry.test.ts`
**Test cases**: 6
**Tests**: Slot consumer registry (ADR-088) -- empty registry, registration, unregistered type errors, delegation, default registry contents

**Quality**: HIGH. Clean unit tests that verify the registry's core operations: starting empty, registering consumers, checking for consumers, throwing on missing types, delegating to the correct consumer, and verifying the default registry has all expected slot types.

**Gaps**:
- No test for registering a consumer that overrides an existing one for the same slot type
- No test for registering a consumer for an empty slotTypes array

**Recommendation**: KEEP. Well-structured tests.

---

### 17. slot-consumers/text-slot-consumer.test.ts
**Path**: `packages/parser-en-us/tests/slot-consumers/text-slot-consumer.test.ts`
**Test cases**: 10
**Tests**: Text slot consumer (ADR-088) -- TEXT (single token, empty, out of bounds), TEXT_GREEDY (all tokens, delimiter stop), QUOTED_TEXT (single token, multi-token, unquoted, unclosed), TOPIC (delimiter, no delimiter)

**Quality**: HIGH. Thorough unit tests with good boundary condition coverage. The negative tests (empty tokens, out-of-bounds index, unquoted text, unclosed quotes) are particularly valuable.

**Gaps**:
- No test for QUOTED_TEXT with escaped quotes inside
- No test for TEXT_GREEDY with a single token (edge case where greedy consumes only one word)

**Recommendation**: KEEP. Solid unit tests.

---

### 18. slot-consumers/typed-slot-consumer.test.ts
**Path**: `packages/parser-en-us/tests/slot-consumers/typed-slot-consumer.test.ts`
**Test cases**: 9
**Tests**: Typed slot consumer (ADR-088) -- NUMBER (digits, words, non-numbers), ORDINAL (words, suffixed, non-ordinals), TIME (valid, invalid), DIRECTION (cardinal, abbreviated, up/down, non-directions)

**Quality**: HIGH. Good positive and negative case coverage for each type. Uses parameterized test patterns (iterating over arrays) for compact yet thorough coverage.

**Issues**:
- Line 130-133: "should not match non-directions" tests `'forward'` as a non-direction. With the compass vocabulary active (default), this is correct. But with the naval vocabulary, 'forward' maps to NORTH. This test is implicitly coupled to the default vocabulary being compass, which is fine but undocumented.

**Recommendation**: KEEP. Well-structured tests.

---

### 19. story-grammar.test.ts
**Path**: `packages/parser-en-us/tests/story-grammar.test.ts`
**Test cases**: 5
**Tests**: Story grammar API (ADR-084) -- basic pattern registration, constraint patterns, direction slots, text slots, multi-slot patterns with constraints

**Quality**: MEDIUM-HIGH. Tests verify that stories can register custom grammar patterns and that the parser respects them. The constraint test (lines 126-139) is good -- it checks both positive (magical crystal) and negative (non-magical sword) cases.

**Issues**:
- Line 188: Mutates mock world internals to simulate inventory (`world['entities'].set(...)`) -- fragile
- Lines 181-203: The "complex story patterns" test modifies the mock's `getCarriedEntities` method at runtime -- this is testing mock behavior as much as parser behavior

**Gaps**:
- No test for story patterns conflicting with core grammar patterns at the same priority
- No test for removing/unregistering story grammar patterns

**Recommendation**: KEEP. Valuable for verifying the story grammar API works end-to-end.

---

### 20. unit/english-parser.test.ts
**Path**: `packages/parser-en-us/tests/unit/english-parser.test.ts`
**Test cases**: 16 (2 skipped)
**Tests**: EnglishParser unit tests with a custom MockLanguageProvider -- basic commands (verb-only, verb-noun, direction, verb-noun-prep-noun), articles, abbreviations, error handling, tokenization, debug events, parseWithErrors, complex scenarios

**Quality**: MEDIUM-HIGH. Tests the parser with a hand-crafted mock provider rather than the real EnglishLanguageProvider. This isolates parser logic from language provider quirks. The debug event tests (lines 387-435) are useful for verifying parser instrumentation. The tokenization tests (lines 359-385) verify fundamental tokenization behavior.

**Issues**:
- Lines 347-356: `test.skip('should handle pattern mismatch')` with a TODO note -- needs investigation
- Lines 438-445: `test.skip('should return multiple candidates')` with a TODO note
- Lines 488-498: `test.skip('should choose highest confidence pattern')` with a TODO note
- Three skipped tests suggest the parser API evolved and these tests weren't updated

**Gaps**:
- No test for `setWorldContext` interaction with parse results
- The debug event tests check event existence but not event data accuracy beyond basic structure checks

**Recommendation**: KEEP, but investigate the 3 skipped tests. Either update them or remove them with a note about why.

---

### 21. walk-through-pattern.test.ts
**Path**: `packages/parser-en-us/tests/walk-through-pattern.test.ts`
**Test cases**: 7
**Tests**: Multi-word literal patterns vs. slot patterns, entity matching by `attributes.name` and `IdentityTrait` alias, priority ordering

**Quality**: MEDIUM-HIGH. Tests address a real issue (literal patterns like "walk through south wall" vs. slot patterns like "walk through :target"). The priority ordering test (lines 229-268) is thorough -- it registers three patterns and verifies correct match selection for each.

**Issues**:
- Lines 53-54, 79-82, 218-219: `console.log` debugging output throughout
- The entity matching tests (lines 106-226) test grammar engine internals with elaborately constructed mock contexts rather than going through the parser

**Recommendation**: KEEP, but clean up console.log statements.

---

## Gaps: What SHOULD Be Tested But Isn't

1. **Pronoun integration with parser**: No test verifies that "take it" or "give it to him" resolves through the full parser pipeline. The pronoun-context tests are unit-level only.

2. **"again" / "g" command**: No test for the repeat-last-command feature in the parser.

3. **Disambiguation flow**: No test for when the parser encounters ambiguous entity references and needs to prompt for clarification.

4. **Error recovery / "did you mean" suggestions**: The error message tests cover classification but not suggestion generation.

5. **Unicode and special character input**: No tests for input containing accented characters, emoji, or non-ASCII text.

6. **Very long input**: No tests for excessively long commands or many-word noun phrases to verify the parser handles them gracefully.

7. **Parser state management**: No tests for `setWorldContext` being called multiple times, or for parser behavior when world context is cleared.

8. **Grammar rule removal/override**: No tests for what happens when a grammar rule is replaced or overridden.

9. **Mixed typed and entity slots**: Limited testing of patterns combining entity resolution with typed slot resolution (e.g., "give 3rd coin to guard").

10. **"look in/under/behind" spatial preposition patterns**: parser-integration.test.ts covers "look at" but not spatial inspection commands.

---

## Removal Candidates

| File | Reason | Action |
|------|--------|--------|
| `push-panel-with-core.test.ts` | Entirely skipped, `expect(true).toBe(true)` placeholder, references missing module | **REMOVE** |
| `grammar-lang-sync.test.ts` (2 tests) | Two `expect(true).toBe(true)` "informational" tests that can never fail | **FIX** -- convert to real assertions or remove |
| `colored-buttons.test.ts` (3 tests) | "Ambiguous references" (2 tests) and "Debug" (2 tests) sections have zero assertions | **FIX** -- add assertions or remove those sections |
| `grammar-scope-cross-location.test.ts` | Mostly tests absence of scope enforcement; elaborate mocks for minimal value | **CONSOLIDATE** into grammar-scope.test.ts |

---

## Consolidation Candidates

| Files | Recommendation |
|-------|---------------|
| `grammar-scope.test.ts` + `grammar-scope-cross-location.test.ts` | Merge into a single file with 2-3 representative tests |
| `push-panel-pattern.test.ts` + `story-grammar.test.ts` | Consider merging since both test story grammar registration |
| `adr-082-typed-slots.test.ts` + `slot-consumers/typed-slot-consumer.test.ts` | These test the same typed slot behavior at different layers; keep both but note the overlap |

---

## Priority Actions

1. **Delete** `push-panel-with-core.test.ts` (zero value)
2. **Fix** always-passing tests in `grammar-lang-sync.test.ts` (convert `expect(true).toBe(true)` to real assertions)
3. **Fix** `colored-buttons.test.ts` assertion-less tests (add assertions or remove sections)
4. **Clean** console.log from: colored-buttons, push-panel-pattern, walk-through-pattern
5. **Investigate** 3 skipped tests in `unit/english-parser.test.ts`
6. **Add** pronoun-parser integration test
7. **Add** "again"/"g" command test
8. **Consolidate** scope test files
