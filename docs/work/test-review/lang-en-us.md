# Test Review: packages/lang-en-us

**Reviewed**: 2026-04-06
**Reviewer**: Claude Opus 4.6 (1M context)
**Total test files**: 10
**Estimated total test cases**: ~195

## Summary

The lang-en-us test suite is heavily weighted toward **structural/data validation tests** rather than behavioral tests. Several files duplicate each other extensively (vocabulary.test.ts and data-integrity.test.ts test the same data; grammar-patterns.test.ts and language-provider.test.ts overlap on grammar patterns). The strongest test files are `formatters.test.ts` and `unit/perspective/placeholder-resolver.test.ts`, which test actual behavioral logic with meaningful assertions. The weakest are the data integrity and vocabulary tests, which primarily verify that static data looks right -- assertions that can never fail unless someone deletes data fields.

**Quality breakdown**:
- Strong behavioral tests: 2 files (formatters, placeholder-resolver)
- Adequate but overlapping: 3 files (language-provider, text-processing, coverage-improvements)
- Structural/data-only (low value): 4 files (data-integrity, grammar-patterns, vocabulary, unit/grammar)
- Mixed quality: 1 file (integration)

---

## File-by-File Review

### 1. coverage-improvements.test.ts

**Path**: `packages/lang-en-us/tests/coverage-improvements.test.ts`
**Test cases**: 14
**What it tests**: Pluralization edge cases (case preservation, -f to -ves) and event message formatting functions (formatInventory, formatRoomDescription, formatContainerContents).

**Quality assessment**: MIXED
- Lines 17-39 (pluralization): Good edge case coverage for case preservation and -f/-ves conversion. These complement text-processing.test.ts.
- Lines 43-131 (event message functions): Good behavioral tests. They test `eventMessageFunctions.formatInventory`, `formatRoomDescription`, and `formatContainerContents` with meaningful assertions on actual output strings.

**Gaps**:
- `formatRoomDescription` at line 316-327 of events.ts mutates the input array (`items.pop()` on line 321). No test verifies this side effect or tests that calling the function twice produces different results. This is a latent bug in the source code.

**Recommendation**: KEEP. The event message function tests are the only tests for this logic.

---

### 2. data-integrity.test.ts

**Path**: `packages/lang-en-us/tests/data-integrity.test.ts`
**Test cases**: ~20
**What it tests**: Static data validation -- verb definitions have unique IDs, correct format, non-empty lists; word lists have no duplicates, are lowercase, are mutually exclusive; irregular plurals are valid; abbreviations are valid; message templates have valid placeholder syntax; event messages exist for critical events; failure messages are well-formed; system messages exist.

**Quality assessment**: LOW VALUE
- Lines 14-65 (verb definitions): Every assertion checks static data shape. These tests can only fail if someone edits the verbs.ts data file and introduces a typo or format error. TypeScript's type system already catches most of these.
- Lines 68-117 (word lists): Checks for duplicates, lowercase, mutual exclusivity. Some value but again purely structural.
- Lines 120-175 (irregular plurals, abbreviations): Checks data shape, not behavior.
- Lines 177-225 (message templates): Checks placeholder syntax with regex. Moderate value -- catches malformed placeholders.
- Lines 227-315 (event/failure/system messages): Checks messages exist and are well-formed. Low value.

**Problems**:
- Line 17: "should have unique action IDs" -- tests `englishVerbs` directly, but vocabulary.test.ts line 88 tests the same thing via `provider.getVerbs()`. Duplication.
- Line 57: "should have all IFActions values used" -- useful guard but overlaps with vocabulary.test.ts line 24.
- Line 87: "should have mutually exclusive word categories" -- reasonable constraint but could trivially be a one-time data generation check rather than a runtime test.

**Recommendation**: REMOVE or CONSOLIDATE. Most of these checks are better served by TypeScript types or a one-time data linting script. If kept, merge the non-overlapping checks into vocabulary.test.ts.

---

### 3. formatters.test.ts

**Path**: `packages/lang-en-us/tests/formatters.test.ts`
**Test cases**: ~28
**What it tests**: The formatter system (ADR-095) -- placeholder parsing, article formatters (a/the/some with noun types), list formatters (and/or with Oxford comma), text formatters (cap/upper), formatMessage template substitution, and formatter chaining.

**Quality assessment**: HIGH
- Lines 26-44 (parsePlaceholder): Good unit tests for the parser. Tests simple, single formatter, multiple formatters, and chaining.
- Lines 47-103 (article formatters): Excellent coverage of `aFormatter` including proper nouns, mass nouns, unique nouns, plural nouns. Tests `theFormatter` with proper noun handling. Tests `someFormatter`.
- Lines 106-146 (list formatters): Good coverage of empty, single, 2-item, 3-item, and 4-item lists for both `listFormatter` and `orListFormatter`.
- Lines 148-163 (text formatters): Adequate for `capFormatter` and `upperFormatter`.
- Lines 165-249 (formatMessage): Good integration-level tests of the full template substitution pipeline.
- Lines 252-267 (applyFormatters): Tests formatter chaining and unknown formatter handling.

**Gaps**:
- No tests for `yourFormatter` (exported from article.ts)
- No tests for `commaListFormatter` or `countFormatter` (exported from list.ts)
- No tests for `lowerFormatter` or `titleFormatter` (exported from text.ts)
- No tests for array handling in any formatter (all formatters accept arrays, see article.ts lines 61-63, text.ts lines 26-27)
- No tests for `EntityInfo` with custom `article` field (article.ts line 82-84)
- `someFormatter` only tested with plain strings, not with EntityInfo objects

**Recommendation**: KEEP and IMPROVE. This is one of the best test files. Fill the coverage gaps for the untested formatters and array handling.

---

### 4. grammar-patterns.test.ts

**Path**: `packages/lang-en-us/tests/grammar-patterns.test.ts`
**Test cases**: ~18
**What it tests**: Grammar pattern data structure -- checks that patterns have required fields, correct types, non-empty fields, valid tokens, unique names, naming conventions, priorities, examples, and coverage.

**Quality assessment**: LOW VALUE
- This entire file tests the shape and content of static data returned by `provider.getGrammarPatterns()`.
- Lines 19-57 (pattern structure): Checks field existence and types. TypeScript already enforces this.
- Lines 59-87 (pattern names): Unique names, naming convention. Static data validation.
- Lines 89-117 (pattern priority): Positive, unique, sensible ordering, sorted descending. Moderate value -- priority ordering is a behavioral invariant.
- Lines 119-149 (examples): Checks examples are lowercase, match patterns, use common verbs. Low value.
- Lines 151-212 (coverage, consistency): Checks pattern coverage and naming consistency. Low value.

**Problems**:
- Heavily overlaps with language-provider.test.ts lines 244-290 which also tests grammar patterns via the same provider.
- Line 196-210 ("pattern names should reflect their structure"): Fragile test -- asserts that each pattern name token matches the corresponding pattern token. This would break on any legitimate naming variation.

**Recommendation**: REMOVE. This overlaps with language-provider.test.ts and unit/grammar.test.ts. The priority ordering test (lines 102-117) is the only unique value -- move it to language-provider.test.ts if desired.

---

### 5. integration.test.ts

**Path**: `packages/lang-en-us/tests/integration.test.ts`
**Test cases**: ~17
**What it tests**: Cross-feature integration -- text processing pipeline (lemmatize + ignore words), vocabulary lookup, grammar pattern matching, message formatting, error handling (empty/special/long inputs), real-world IF command processing, performance benchmarks, and API compatibility.

**Quality assessment**: MIXED
- Lines 17-56 (text processing pipeline): Good integration tests combining lemmatize, isIgnoreWord, and pluralize. Line 37-44 tests round-trip pluralize -> lemmatize.
- Lines 58-117 (vocabulary lookup): Good tests combining expandAbbreviation with direction lookup, and word categorization across multiple vocabularies.
- Lines 119-136 (grammar pattern matching): LOW VALUE. The comment on line 133 says "In a real implementation, we'd test pattern matching logic here" -- the test just checks that named patterns exist, which is already tested elsewhere.
- Lines 138-153 (message formatting): NOT TESTING REAL CODE. Lines 140-152 do manual string.replace() rather than using the actual `formatMessage` function from the formatter system. This tests JavaScript's String.replace, not the language provider.
- Lines 155-177 (error handling): Good edge case coverage for empty strings, special characters, and long inputs.
- Lines 179-219 (real-world scenarios): Low value -- just checks that `lemmatize` returns a defined value for every word in sample commands.
- Lines 222-258 (performance): Performance benchmarks. These are timing-dependent and can produce false failures on slow CI machines. But the thresholds (100ms for 1000 iterations, 50ms for 100 iterations) are generous enough.
- Lines 260-303 (compatibility): Just checks method existence and return types. TypeScript already enforces this.

**Problems**:
- Line 133: Admits the test doesn't actually test pattern matching.
- Lines 140-152: Tests string manipulation, not the formatter system. This is misleading.
- Lines 260-303: Pure type checking that TypeScript already handles.

**Recommendation**: IMPROVE. Keep the pipeline tests (lines 17-56), vocabulary lookup (lines 58-117), and error handling (lines 155-177). Remove or rewrite the pattern matching, message formatting, compatibility, and performance sections. The message formatting section should use the actual `formatMessage` function.

---

### 6. language-provider.test.ts

**Path**: `packages/lang-en-us/tests/language-provider.test.ts`
**Test cases**: ~40
**What it tests**: The EnglishLanguageProvider class -- metadata (language code, name, direction), getVerbs(), getDirections(), getSpecialVocabulary(), getCommonAdjectives(), getCommonNouns(), getPrepositions(), getGrammarPatterns().

**Quality assessment**: ADEQUATE but OVERLAPPING
- Lines 15-33 (metadata): Good. Tests specific values for language code, name, direction.
- Lines 35-84 (getVerbs): Tests verb structure, common verbs exist, correct patterns, prepositions for indirect-object verbs. Some value.
- Lines 86-141 (getDirections): Tests cardinal, ordinal, vertical directions, abbreviations, structure. Overlaps with vocabulary.test.ts.
- Lines 143-180 (getSpecialVocabulary): Tests articles, pronouns, allWords, exceptWords. Overlaps with vocabulary.test.ts.
- Lines 182-242 (adjectives, nouns, prepositions): Tests lists contain expected words. Overlaps with vocabulary.test.ts.
- Lines 244-290 (getGrammarPatterns): Tests structure, pattern names, priority ordering, examples. Overlaps with grammar-patterns.test.ts.

**Problems**:
- Massive overlap with vocabulary.test.ts -- both test getVerbs(), getDirections(), getSpecialVocabulary(), adjectives, nouns, prepositions via the same provider.
- Overlap with grammar-patterns.test.ts on grammar pattern tests.

**Recommendation**: KEEP as the canonical provider test. Consolidate overlapping tests from vocabulary.test.ts and grammar-patterns.test.ts into this file, then remove those files.

---

### 7. text-processing.test.ts

**Path**: `packages/lang-en-us/tests/text-processing.test.ts`
**Test cases**: ~48
**What it tests**: Text manipulation functions on EnglishLanguageProvider -- lemmatize() (regular plurals, -es, -ies, -ed, -ing endings, irregular plurals, case handling), pluralize() (regular, sibilant, consonant+y, -f/-fe, irregular, case preservation), getIndefiniteArticle() (consonants, vowels, silent h, u-words, case), expandAbbreviation() (directions, commands, unknown, case), formatList() (empty, single, two items, multiple items, edge cases), isIgnoreWord().

**Quality assessment**: HIGH
- This is a thorough behavioral test of the text processing methods.
- Lines 15-115 (lemmatize): Excellent coverage of suffix stripping rules, edge cases like short words ("is", "as"), and irregular plurals.
- Lines 117-185 (pluralize): Excellent coverage of pluralization rules including -s, -es, -ch/-sh, consonant+y, vowel+y, -f/-ves, -fe/-ves, irregular, and case preservation.
- Lines 187-231 (getIndefiniteArticle): Good coverage including silent h, u-words with y sound, "one" prefix, case insensitivity.
- Lines 233-281 (expandAbbreviation): Good coverage of all abbreviation types.
- Lines 283-328 (formatList): Good coverage including Oxford comma, "or" conjunction, edge cases.
- Lines 330-358 (isIgnoreWord): Good coverage.

**Gaps**:
- No test for lemmatize of -ves to -f (e.g., "leaves" -> "leaf"). The lemmatizer strips suffixes but irregular plurals like "leaves" are only handled if they're in the irregularPlurals map.
- No test for pluralize with words ending in -o (e.g., "tomato" -> "tomatoes" or "piano" -> "pianos").

**Recommendation**: KEEP. This is the strongest test file for the provider's text processing methods.

---

### 8. unit/grammar.test.ts

**Path**: `packages/lang-en-us/tests/unit/grammar.test.ts`
**Test cases**: ~42
**What it tests**: The grammar.ts module -- EnglishPartsOfSpeech constants (values, frozen object, unique values), EnglishGrammarPatterns (all patterns defined, required properties, pattern names match keys, examples match patterns), EnglishGrammarUtils (isArticle, isDeterminer, isPronoun, isConjunction, getIndefiniteArticle), type definitions (EnglishToken, EnglishVerbForms, EnglishNounProperties, EnglishPrepositionProperties), pattern validation, edge cases.

**Quality assessment**: MIXED
- Lines 20-67 (EnglishPartsOfSpeech): Tests that constants have expected values, the object is frozen, values are unique. Moderate value -- the freeze test is good (line 37-54), the value checks are trivially guaranteed by the source code.
- Lines 69-125 (EnglishGrammarPatterns): Tests pattern definitions have required properties, names match keys, examples follow patterns. Overlaps with grammar-patterns.test.ts.
- Lines 127-326 (EnglishGrammarUtils): GOOD behavioral tests for isArticle, isDeterminer, isPronoun, isConjunction, getIndefiniteArticle. These test actual logic with case insensitivity, edge cases, and negative cases.
- Lines 328-468 (type definitions): LOW VALUE. Creates objects that match type interfaces and asserts on the values just assigned. These are compile-time tests disguised as runtime tests. Lines 330-364 create an EnglishToken and immediately assert that the properties equal the values that were just set. This can never fail.
- Lines 471-495 (pattern validation): Checks element types are valid. Static data validation.
- Lines 497-529 (edge cases): Good -- tests empty strings and getIndefiniteArticle edge cases.

**Problems**:
- Lines 330-468: Type definition tests are pure tautology. They create objects and assert that the created values match what was written. Example (line 331-344): creates `token` with `word: 'running'`, then asserts `expect(token.word).toBe('running')`. This can never fail.
- Lines 505-511: Tests that `getIndefiniteArticle('')` throws, and checks behavior for numbers '8' and '1'. The number handling is genuinely interesting behavior worth testing.

**Recommendation**: IMPROVE. Keep the EnglishGrammarUtils tests (lines 127-326) and edge cases (lines 497-529). Remove the type definition tautology tests (lines 328-468). The pattern structure tests overlap with grammar-patterns.test.ts and language-provider.test.ts.

---

### 9. unit/perspective/placeholder-resolver.test.ts

**Path**: `packages/lang-en-us/tests/unit/perspective/placeholder-resolver.test.ts`
**Test cases**: ~25
**What it tests**: Perspective-aware placeholder resolution (ADR-089) -- resolvePerspectivePlaceholders for 2nd person, 1st person, 3rd person singular (she/her), 3rd person plural (they/them), parameter passthrough; conjugateVerb for regular verbs, irregular verbs, plural they/them.

**Quality assessment**: HIGH
- Lines 13-143 (resolvePerspectivePlaceholders): Excellent behavioral tests. Tests all four perspectives with {You}, {your}, {yourself}, {You're}, and verb conjugation. Verifies that non-perspective placeholders like {item} and {target} pass through unchanged.
- Lines 146-204 (conjugateVerb): Good coverage of regular verb conjugation (add -s, -es, consonant+y -> ies), irregular verbs (have/has, be/is/are, do/does), modals (can, can't, will), and they/them plural form.

**Gaps**:
- No test for {Yours}/{yours} (possessive pronoun). The source code (lines 134-144 of placeholder-resolver.ts) supports this placeholder, but no test covers it.
- No test for {Your}/{your} with 3rd person he/him pronouns (only she/her and they/them are tested for possessives).
- No test for lowercase {you} (the source handles it at line 260 of placeholder-resolver.ts).
- No test for verbs ending in -o getting -es (e.g., "go" -> "goes" for regular 3rd person, though "go" is in the irregular list).
- No test for capitalization preservation in verb conjugation (source lines 318-319).

**Recommendation**: KEEP and IMPROVE. This is high-quality. Add coverage for {Yours}, lowercase {you}, and he/him pronoun set.

---

### 10. vocabulary.test.ts

**Path**: `packages/lang-en-us/tests/vocabulary.test.ts`
**Test cases**: ~20
**What it tests**: Vocabulary data -- verb vocabulary (IF actions exist, non-empty arrays, valid patterns, prepositions, synonyms, unique IDs), direction vocabulary (compass, vertical, in/out, abbreviations, synonyms), special vocabulary (articles, pronouns, quantifiers), common words (adjective categories, IF nouns, prepositions), data integrity (no duplicate verbs, valid irregular plurals, non-conflicting abbreviations, word lists are arrays and non-empty).

**Quality assessment**: LOW VALUE (heavy overlap)
- Lines 17-93 (verb vocabulary): Almost entirely overlaps with language-provider.test.ts lines 35-84. Both test verbs via `provider.getVerbs()`.
- Lines 95-151 (direction vocabulary): Almost entirely overlaps with language-provider.test.ts lines 86-141.
- Lines 153-188 (special vocabulary): Overlaps with language-provider.test.ts lines 143-180.
- Lines 190-238 (common words): Overlaps with language-provider.test.ts lines 182-242.
- Lines 240-289 (data integrity): Overlaps with data-integrity.test.ts.

**Problems**:
- Line 241-251: "should have no duplicate verbs across all actions" -- uses a weak assertion (`allVerbs.length < uniqueVerbs.length * 1.5`). This allows up to 50% duplication, which is not a meaningful constraint.
- This file is almost entirely redundant with language-provider.test.ts and data-integrity.test.ts.

**Recommendation**: REMOVE. All meaningful tests are duplicated in language-provider.test.ts and data-integrity.test.ts.

---

## Test Gaps

Things that SHOULD be tested but currently are NOT:

1. **Untested formatters**: `yourFormatter`, `commaListFormatter`, `countFormatter`, `lowerFormatter`, `titleFormatter` are exported and used but have zero test coverage.

2. **Formatter array handling**: All formatters (article, list, text) have array-handling branches. None are tested with array inputs.

3. **`formatRoomDescription` mutation bug**: The source code at `events.ts:321` calls `items.pop()` which mutates the input array. This is a bug (caller's array is modified). No test catches this.

4. **`getParserErrorMessage` function**: Defined in `messages.ts` (lines 340-356) with both function and string template handling. Zero test coverage.

5. **`parserErrors` message functions**: The `messages.ts` file defines parser error templates (lines 276-332) that are context-sensitive functions. None are tested.

6. **`getMessage()` on the provider**: The language provider likely has a getMessage method (mentioned in its header comment) for looking up messages by ID. Not tested.

7. **Narrative context management on provider**: The provider stores `narrativeContext` (language-provider.ts line 41) and `formatterRegistry` (line 44). No tests exercise setting/getting the narrative context or using it through the provider interface.

8. **`standardActionLanguage` and `npcLanguage`**: Imported in language-provider.ts (lines 11-12) but never tested. These are the actual message registrations for stdlib actions and NPC behavior.

9. **{Yours}/{yours} perspective placeholder**: Supported in source code but untested.

10. **Verb conjugation for verbs ending in -o**: The `addThirdPersonS` function handles -o verbs (line 223 of placeholder-resolver.ts) but no test covers this path (e.g., "do" is irregular so it doesn't hit this branch -- need a test with a regular -o verb like "echo" -> "echoes").

---

## Removal Candidates

| File | Reason | Action |
|------|--------|--------|
| `vocabulary.test.ts` | 100% overlap with language-provider.test.ts and data-integrity.test.ts | REMOVE |
| `grammar-patterns.test.ts` | ~90% overlap with language-provider.test.ts and unit/grammar.test.ts | REMOVE |
| `data-integrity.test.ts` | Static data validation; TypeScript types cover most of this; partial overlap with vocabulary.test.ts | REMOVE or reduce to just the placeholder syntax validation tests (lines 177-225) |

### Tests within files that should be removed:

| File | Lines | Reason |
|------|-------|--------|
| `unit/grammar.test.ts` | 328-468 | Tautological type-definition tests: create an object, assert on values just assigned. Can never fail. |
| `integration.test.ts` | 119-136 | Admits it doesn't test pattern matching ("In a real implementation, we'd test...") |
| `integration.test.ts` | 138-153 | Tests JavaScript String.replace, not the actual formatter system |
| `integration.test.ts` | 260-303 | TypeScript type checking disguised as runtime tests |

---

## Consolidation Recommendation

The 10 test files could be reduced to 5 without losing meaningful coverage:

1. **language-provider.test.ts** -- keep as the canonical provider API test, absorb unique checks from vocabulary.test.ts and data-integrity.test.ts
2. **text-processing.test.ts** -- keep as-is (strong behavioral tests)
3. **formatters.test.ts** -- keep and expand with missing formatter coverage
4. **unit/perspective/placeholder-resolver.test.ts** -- keep and expand with missing placeholder coverage
5. **unit/grammar.test.ts** -- keep only the EnglishGrammarUtils behavioral tests and edge cases; remove type tautologies

Remove: `vocabulary.test.ts`, `grammar-patterns.test.ts`, `data-integrity.test.ts`, `coverage-improvements.test.ts` (merge event message function tests into a new or existing file), `integration.test.ts` (merge the good pipeline/error tests into language-provider.test.ts).
