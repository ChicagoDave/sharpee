# Stdlib Golden Action Tests Review: L-Z (Second Half)

**Date**: 2026-04-06
**Reviewer**: Claude Opus 4.6
**Scope**: 24 test files covering looking through wearing actions, plus meta-registry, registry, and report-helpers

## Summary

- **Total test files reviewed**: 24
- **Total test cases**: ~350 (including skipped)
- **Skipped tests**: ~30 across all files (mostly in showing, unlocking)
- **Files with world-state mutation tests**: 14 of 24
- **Files without world-state mutation tests**: 10 of 24

### Overall Quality Assessment

The test suite is **moderately strong** with clear patterns and good coverage of the four-phase action pattern. The strongest area is the consistent "World State Mutations" sections that verify actual state changes (not just events), which directly addresses the documented "dropping bug." The weakest area is the prevalence of "Testing Pattern Examples" sections that test data structures and categorizations rather than actual action behavior -- these are effectively documentation disguised as tests.

### Recurring Issues

1. **Pattern Example tests are hollow**: Nearly every file has a "Testing Pattern Examples" describe block with tests that never invoke the action. They create data structures, iterate over them, and assert properties of those structures. These can never fail due to action bugs. They pad test counts without testing behavior.
2. **Metadata tests are brittle and low-value**: Every file has "should have correct ID" and "should declare required messages" tests. These test string constants and array membership, not behavior. Any rename breaks them, yet they catch no bugs.
3. **Inconsistent mutation coverage**: Some files (opening, putting, removing, taking, throwing, switching_on, switching_off, taking_off, wearing, unlocking) have thorough mutation tests. Others (looking, smelling, touching, talking, searching, showing) have zero mutation tests, though some of these are observation-only actions where that is expected.
4. **Skipped tests accumulate tech debt**: showing-golden has 13+ skipped tests; unlocking has 7 skipped tests. Many reference "depends on scope logic" or "implementation bug" without tracking issues.

---

## Per-File Reviews

### 1. looking-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/looking-golden.test.ts`
**Test cases**: 14 (12 active, 2 in pattern examples)
**What it tests**: Room description, darkness handling, light sources, special locations (containers, supporters), brief/verbose modes, command variations, four-phase pattern compliance.

**Quality**: Good. Tests actual action execution with real world model setup. Darkness tests (lines 124-222) are particularly well done with dark rooms, carried lights, and room lights. The "should handle empty rooms" test (line 108) verifies negative case.

**Gaps**:
- No test for looking in a dark room with a light source in a container (edge case)
- Brief/verbose tests (lines 296-328) are aspirational -- both test the same behavior and comments say "when those features are implemented"
- No world-state mutation tests (acceptable -- looking is observation-only)

**Problems**:
- Lines 471-508: "pattern: complex room contents" test creates entities and categorizes them locally but never runs the looking action. It tests WorldModel entity creation, not looking behavior.
- Lines 510-553: "pattern: light source combinations" similarly tests trait properties, not action behavior.
- Line 432: execute is called twice (once via executeWithValidation, once directly) -- the second call is benign but wasteful.

**Recommendation**: **Keep, improve**. Remove the two pattern example tests (lines 470-554). Fix brief/verbose tests to either test real behavior or remove them.

---

### 2. meta-registry.test.ts

**Path**: `packages/stdlib/tests/unit/actions/meta-registry.test.ts`
**Test cases**: 11
**What it tests**: MetaCommandRegistry -- pre-registered commands, registration/unregistration, query methods, reset/clear.

**Quality**: Excellent. Pure unit tests of a registry class. Each test is focused, assertions are meaningful, and edge cases (null input, empty string) are covered.

**Gaps**:
- No test for registering the same command twice (idempotency)
- No test for concurrent registration (likely not an issue in JS but worth documenting)

**Problems**:
- Line 118: `clear()` test asserts same count after clear, meaning clear restores defaults. The test name "should clear and restore defaults" is accurate but the test doesn't verify that custom commands were removed -- it only checks count. If clear() left custom commands and also restored defaults, the count could match.

**Recommendation**: **Keep as-is**. This is one of the better test files.

---

### 3. opening-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/opening-golden.test.ts`
**Test cases**: 18 (14 active, 4 skipped)
**What it tests**: Opening containers, doors, locked items, non-container openables; atomic event structure; world-state mutations.

**Quality**: Very good. Has dedicated "World State Mutations" section (lines 507-675) with 7 mutation tests covering positive and negative cases. The precondition checks are thorough.

**Gaps**:
- No test for opening a transparent container (can see contents but still closed)
- Skipped tests (lines 190, 335, 442) for AuthorModel-based container content tests -- these are important for the "revealing" mechanic and have been skipped due to hangs

**Problems**:
- Lines 190-262: Important test for "revealed events for container contents" is skipped with debug logging left in the code. This is a significant coverage gap.
- Lines 334-381: "should include proper atomic events" is also skipped. Between these two skips, the container-opening-reveals-contents path is entirely untested.

**Recommendation**: **Keep, fix skipped tests**. The hanging skipped tests need investigation -- they represent the most important opening scenario (opening a container to reveal its contents).

---

### 4. pulling-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/pulling-golden.test.ts`
**Test cases**: 8
**What it tests**: Pulling action validation (no target, not pullable, worn items, already pulled), execution (state update, pull count tracking), event handler integration.

**Quality**: Good. Tests verify actual world-state mutations (lines 155-157: pullable.state and pullCount checks). The event handler integration test (line 193) is documentation rather than behavior testing but is short.

**Gaps**:
- No blocked() phase test
- No test for pulling items from different locations (room vs inventory)
- Missing test for pulling an item with pullType = 'cord' vs 'lever' behavior differences

**Problems**:
- Line 75-77: Defensive removal of PULLABLE trait is unnecessary -- if the entity was just created without it, there's nothing to remove.

**Recommendation**: **Keep, improve**. Add a blocked() test and remove the defensive trait removal.

---

### 5. pushing-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/pushing-golden.test.ts`
**Test cases**: 18 (15 active, 3 pattern examples)
**What it tests**: Pushing buttons, switches, heavy objects, moveable objects, direction-based pushing, hidden passage reveals.

**Quality**: Good behavioral coverage. Tests verify event data thoroughly with messageId, params, pushType, direction, etc.

**Gaps**:
- No world-state mutation tests (pushing should verify SwitchableTrait.isOn toggles for buttons)
- No test for pushing when player is in a container/on a supporter
- No blocked() phase test

**Problems**:
- Lines 509-582: Three "Testing Pattern Examples" tests (push types, trait combinations, pushable properties) are pure data-structure tests that never invoke the pushing action. Line 559: `expect(valid).toBe(true)` always passes because `valid` is hardcoded to `true` in the test data. These can never fail.

**Recommendation**: **Keep, improve**. Add mutation tests for button toggle state. Remove the three pattern example tests.

---

### 6. putting-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/putting-golden.test.ts`
**Test cases**: 24 (all active)
**What it tests**: Putting in containers, on supporters, auto-detection of preposition, capacity limits (items, weight, volume), self-placement prevention, dual-nature objects, world-state mutations.

**Quality**: Excellent. This is one of the best-tested files. The "World State Mutations" section (lines 605-729) has 4 mutation tests covering positive placement and negative cases (closed container, full container). Capacity tests (lines 394-506) cover items, weight, and supporter limits.

**Gaps**:
- Line 182-192: "should fail when item already in destination" test is incomplete -- it moves the key to player.id before the test (not in drawer), then runs the action but has no assertion on the result. The comment "let's just run the action and see what happens" suggests this test is unfinished.
- No test for putting in a transparent closed container (should still fail)

**Problems**:
- Line 182-192: Incomplete test with no meaningful assertion. It moves the key out of the drawer, so the "already there" scenario isn't even being tested.

**Recommendation**: **Keep, fix the incomplete test at line 162**.

---

### 7. quitting.test.ts

**Path**: `packages/stdlib/tests/unit/actions/quitting.test.ts`
**Test cases**: 15
**What it tests**: Quit event emission, unsaved progress detection, force quit, near-completion detection, missing/empty shared data.

**Quality**: Good. Tests cover edge cases well (zero max score, missing data, empty data). The local executeWithValidation helper (lines 38-56) duplicates the test-utils version.

**Gaps**:
- No test for the interaction between force quit and near-completion

**Problems**:
- Lines 439-458: Two "Integration Notes" tests. Line 449: `expect(true).toBe(true)` is a test that can never fail. Line 451: just checks requiredMessages again (already tested in metadata section). These are documentation masquerading as tests.

**Recommendation**: **Keep, improve**. Remove the two trivially-passing integration note tests. Remove the local executeWithValidation (use from test-utils).

---

### 8. reading-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/reading-golden.test.ts`
**Test cases**: 10
**What it tests**: Reading notes, books, signs, inscriptions; multi-page books; validation (no target, not readable, conditionally unreadable); read tracking; empty text.

**Quality**: Good. Tests verify actual mutation (hasBeenRead flag, lines 249-268). Variety of readable types is well covered. Validation tests check error messages and params.

**Gaps**:
- No test for reading in darkness
- No test for reading something inside a closed container
- Language requirement test (line 225) has a TODO and doesn't actually test the failure case

**Problems**:
- Line 244: Language requirement test always passes because ability checking isn't implemented. The test documents what should happen but doesn't test anything meaningful yet.

**Recommendation**: **Keep, improve**. Mark the language requirement test as `.skip` with a TODO until ability checking is implemented.

---

### 9. registry-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/registry-golden.test.ts`
**Test cases**: 16
**What it tests**: StandardActionRegistry -- registration, retrieval, group management, language provider integration, pattern storage, edge cases, backward compatibility.

**Quality**: Good. Tests real actions (taking, dropping, examining, etc.) with real language provider. Pattern lookup tests are meaningful.

**Gaps**:
- No test for removing/unregistering actions
- Line 163-166: "should sort actions by priority" is empty (just a comment saying skip)

**Problems**:
- Lines 288-302: "registerMessages is a placeholder" test just verifies it doesn't throw. This is a test for dead code.

**Recommendation**: **Keep, improve**. Remove the placeholder test and the empty priority test.

---

### 10. removing-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/removing-golden.test.ts`
**Test cases**: 20
**What it tests**: Removing items from containers and supporters; preconditions (no target, no source, wrong container, already have, closed container); container/supporter dual nature; nested containers; world-state mutations.

**Quality**: Excellent. Has 6 world-state mutation tests (lines 514-696) covering containers, open containers, supporters, closed containers, wrong containers, and nested containers. This is thorough.

**Gaps**:
- No test for removing from a transparent closed container
- No blocked() phase test

**Problems**: None significant.

**Recommendation**: **Keep as-is**. One of the strongest test files.

---

### 11. report-helpers.test.ts

**Path**: `packages/stdlib/tests/unit/actions/report-helpers.test.ts`
**Test cases**: 14
**What it tests**: handleValidationError, handleExecutionError, handleReportErrors utility functions; target snapshot inclusion; integration with real action blocked phase.

**Quality**: Excellent. Pure utility function tests with clear inputs and outputs. Integration test (line 337) verifies the helper works with a real action's blocked phase.

**Gaps**: None significant.

**Problems**: None.

**Recommendation**: **Keep as-is**. Good utility test coverage.

---

### 12. searching-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/searching-golden.test.ts`
**Test cases**: 17 (12 active, 5 pattern examples)
**What it tests**: Searching containers (empty, with contents, concealed items), supporters, regular objects, current location, closed containers, complex search scenarios.

**Quality**: Good behavioral coverage. Concealed item discovery (lines 148-192) is well tested. Location searching (lines 354-408) covers both finding and not finding.

**Gaps**:
- No world-state mutation tests for concealed items becoming unconcealed after searching
- No test for searching in darkness

**Problems**:
- Lines 533-712: Five "Testing Pattern Examples" tests that create data structures and iterate over them without invoking the searching action. Lines 560, 601, 646, 680, 709 all assert properties of locally-defined arrays -- these can never fail due to action bugs.

**Recommendation**: **Keep, improve**. Remove the 5 pattern example tests. Add a mutation test verifying concealed items are revealed.

---

### 13. showing-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/showing-golden.test.ts`
**Test cases**: 19 (3 active, 16 skipped)
**What it tests**: Showing items to NPCs; preconditions; viewer reactions (recognizes, impressed, examines, nods); worn items; event structure.

**Quality**: Poor due to skip count. Only 3 tests are active: action metadata (2) and "no item specified" precondition (1). The remaining 16 tests are all skipped with "depends on scope logic" comments.

**Gaps**:
- Almost everything. With 16/19 tests skipped, the showing action has virtually no active test coverage beyond metadata.
- No world-state mutation tests (showing shouldn't mutate state, but the lack of any behavioral test is the issue)

**Problems**:
- 16 skipped tests indicate the showing action's scope/visibility logic was refactored (moved to CommandValidator) and these tests were never updated to work with the new architecture.

**Recommendation**: **Improve or remove**. Either fix the 16 skipped tests to work with CommandValidator, or remove the file entirely and re-create when scope validation is testable. Currently, this file provides almost no value.

---

### 14. smelling-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/smelling-golden.test.ts`
**Test cases**: 17 (14 active, 3 pattern examples)
**What it tests**: Smelling food, drinks, burning objects, unlit objects, open/closed containers with food, ordinary objects; environmental smelling (empty room, food, smoke, smoke+food priority).

**Quality**: Good. Tests cover the scent-detection logic well with variety of trait combinations. The smoke-over-food priority test (line 314) is a good edge case.

**Gaps**:
- No world-state mutation tests (acceptable -- smelling is observation-only)
- No test for smelling in darkness
- No test for smelling an NPC/actor

**Problems**:
- Lines 442-515: Three "Testing Pattern Examples" tests that check trait presence on locally-created objects without invoking the smelling action.

**Recommendation**: **Keep, improve**. Remove the 3 pattern example tests.

---

### 15. switching_off-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/switching_off-golden.test.ts`
**Test cases**: 27 (21 active, 6 pattern examples)
**What it tests**: Switching off devices; preconditions; custom sounds; running sounds; temporary devices; light source handling (darken room, other lights, carried lights); power management; side effects (auto-close doors); world-state mutations.

**Quality**: Excellent. Has 6 world-state mutation tests (lines 649-820) including coordinated SwitchableTrait + LightSourceTrait mutation verification. The light source handling tests (lines 228-334) are particularly thorough with carried-light edge cases.

**Gaps**:
- No blocked() phase test

**Problems**:
- Lines 489-640: Five "Testing Pattern Examples" tests (shutdown sequences, sound cessation, light extinguishing, power effects, temporary devices) are pure data-structure tests.

**Recommendation**: **Keep, improve**. Remove the 5 pattern example tests.

---

### 16. switching_on-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/switching_on-golden.test.ts`
**Test cases**: 27 (21 active, 6 pattern examples)
**What it tests**: Switching on devices; preconditions (not switchable, already on, no power); custom sounds; temporary activation; light sources; power requirements; side effects (auto-open doors); world-state mutations.

**Quality**: Excellent. Mirror of switching_off with same thoroughness. 7 world-state mutation tests (lines 662-833) including SwitchableTrait + LightSourceTrait coordination.

**Gaps**:
- No blocked() phase test

**Problems**:
- Lines 478-653: Five "Testing Pattern Examples" tests are pure data-structure tests.

**Recommendation**: **Keep, improve**. Remove the 5 pattern example tests.

---

### 17. taking_off-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/taking_off-golden.test.ts`
**Test cases**: 21 (17 active, 2 pattern examples)
**What it tests**: Taking off worn items; preconditions (no target, not wearing, not wearable, not actually worn); layering rules (outer blocks inner, cursed items); world-state mutations.

**Quality**: Very good. Mutation tests (lines 456-648) verify worn flag, wornBy, body part preservation, layering independence. The layering rule tests (lines 117-176) are well done.

**Gaps**:
- No test for taking off an item while in a container/on a supporter
- No test for taking off when inventory is full (item goes where?)

**Problems**:
- Lines 370-447: Two pattern example tests check trait data, not action behavior.

**Recommendation**: **Keep, improve**. Remove pattern example tests.

---

### 18. taking-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/taking-golden.test.ts`
**Test cases**: 19
**What it tests**: Taking items from rooms, containers, supporters; preconditions (no target, self, already have, room, scenery); capacity checks; worn item implicit removal; world-state mutations.

**Quality**: Very good. Mutation tests (lines 444-541) verify movement from room, container, and supporter. The "should not count worn items toward capacity" test (line 207) is a valuable edge case. The implicit worn-item removal test (line 351) tests an important interaction.

**Gaps**:
- Weight-based capacity test (line 249) is skipped
- No test for taking from a closed container (should be blocked by CommandValidator)
- No test for taking an NPC

**Problems**:
- Lines 418-434: Event structure test checks nested `eventData?.data?.container` which suggests confusion about event data structure.

**Recommendation**: **Keep, improve**. Fix or track the skipped weight test.

---

### 19. talking-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/talking-golden.test.ts`
**Test cases**: 17 (14 active, 3 pattern examples)
**What it tests**: Talking to NPCs; preconditions (no target, not actor, self, not available); first meeting; personalities (formal, casual); subsequent meetings (friendly, remembers player, regular); conversation topics.

**Quality**: Good behavioral coverage. The conversation state machine (first meeting, personality, subsequent greeting, topics) is well tested through events.

**Gaps**:
- No world-state mutation tests (talking should update hasGreeted flag)
- No test for hostile NPC conversation
- No test for talking when actor is dead/unconscious

**Problems**:
- Lines 399-489: Three pattern example tests create NPCs and check trait properties, never invoking the talking action.

**Recommendation**: **Keep, improve**. Add a mutation test verifying hasGreeted is set to true after first meeting. Remove pattern example tests.

---

### 20. throwing-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/throwing-golden.test.ts`
**Test cases**: 26 (20 active, 2 skipped, 6 pattern examples)
**What it tests**: General throwing (drop), targeted throwing (hit/miss, supporters, containers, closed containers), fragile item breaking, NPC anger, weight limits, fragility detection; world-state mutations.

**Quality**: Very good. Comprehensive coverage of throwing mechanics. World-state mutation tests (lines 782-946) verify item movement to room, supporter, container, floor (bounce), and non-movement on validation failure. Use of `Math.random` mocking is appropriate for probabilistic logic.

**Gaps**:
- Two tests skipped (lines 285, 318) for NPC duck/catch -- documented as "implementation bug"
- No test for throwing in darkness
- No mutation test for item destruction (fragile item breaking should remove it from world)

**Problems**:
- Lines 674-773: Six pattern example tests are data-structure tests.
- Math.random is stored/restored manually (lines 196-209, etc.) -- this pattern is repeated many times and could use a helper.

**Recommendation**: **Keep, improve**. Fix the two skipped NPC tests. Add a mutation test for item destruction. Remove pattern example tests.

---

### 21. touching-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/touching-golden.test.ts`
**Test cases**: 19 (16 active, 3 pattern examples)
**What it tests**: Temperature detection (hot, warm), vibrating devices, texture detection (soft, smooth, hard, wet), special cases (liquid container, immovable scenery), verb variations (poke, prod, pat, stroke, feel), temperature/texture priority.

**Quality**: Good. Verb variation tests (lines 339-472) are unique to touching and cover an important UX concern. Temperature/texture priority test (line 475) is a good edge case.

**Gaps**:
- No world-state mutation tests (acceptable -- touching is observation-only)
- No test for touching an NPC/actor
- No cold temperature test (no trait for it yet, noted in pattern example)
- No test for touching in darkness

**Problems**:
- Lines 530-604: Three pattern example tests check trait data, not action behavior.

**Recommendation**: **Keep, improve**. Remove pattern example tests.

---

### 22. unlocking-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/unlocking-golden.test.ts`
**Test cases**: 22 (12 active, 10 skipped)
**What it tests**: Unlocking preconditions (no target, not lockable, already unlocked); key requirements (no key, key not held, wrong key); successful unlocking (no key needed, with key, door, multiple keys, sound); auto-open; world-state mutations.

**Quality**: Mixed. The active tests are good. World-state mutation tests (lines 656-841) have 7 tests covering lock state changes with and without keys, wrong keys, and doors. However, 10 skipped tests leave significant gaps.

**Gaps**:
- Skipped: unlock with correct key (line 223), unlock door with room connection (line 272), unlock sound (line 363), container with contents (line 408), auto-open on unlock (line 443), auto-open not configured (line 477), prefer keyId over keyIds (line 558), backup key (line 589), empty container unlock (line 618)
- These skips mean the "unlock with key" happy path is not tested (only "unlock without key" works)

**Problems**:
- Lines 580, 606, 638: Three skipped edge case tests call `unlockingAction.execute(context)` directly instead of going through the three-phase pattern. This is incorrect for the current architecture.
- The number of skipped tests suggests the unlocking action was significantly refactored but tests were not updated.

**Recommendation**: **Improve priority**. The key-based unlocking path is untested. Fix at least the "unlock with correct key" test (line 223).

---

### 23. waiting-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/waiting-golden.test.ts`
**Test cases**: 11
**What it tests**: Waiting action as a signal action -- always-valid validation, no mutations, event emission with location and turnsPassed, three-phase pattern compliance.

**Quality**: Excellent. The cleanest test file in the set. Tests are focused and meaningful. The "No State Mutation" section (lines 139-173) uses spies to verify no world changes occur -- a creative and effective approach. The "Signal Action Pattern" test (line 176) is a useful integration summary.

**Gaps**: None for a signal action.

**Problems**: None.

**Recommendation**: **Keep as-is**. Model test file for simple actions.

---

### 24. wearing-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/wearing-golden.test.ts`
**Test cases**: 19 (17 active, 1 skipped, 2 pattern examples)
**What it tests**: Wearing items; preconditions (no target, not wearable, already wearing, not held, body part conflict, layer conflict); successful wearing (from inventory, implicit take from room, no body part, layered clothing, different body parts); world-state mutations.

**Quality**: Very good. Mutation tests (lines 463-655) cover worn flag, wornBy, body part preservation, layering system, and items without body parts. The layer conflict test (line 162) and body part conflict test (line 126) test important game mechanics.

**Gaps**:
- Skipped test for "not held and not in room" (line 100) -- scope validation moved to CommandValidator
- No test for wearing something that's too heavy

**Problems**:
- Lines 393-453: Two pattern example tests check trait data, not action behavior.

**Recommendation**: **Keep, improve**. Remove pattern example tests.

---

## Gaps: What SHOULD Be Tested But Is Not

### Cross-cutting gaps (affect multiple actions):
1. **Darkness interaction**: Almost no action tests verify behavior in dark rooms. Looking tests darkness, but taking, putting, opening, etc. do not.
2. **blocked() phase coverage**: Very few files test the blocked() phase directly. Most rely on executeWithValidation routing to it implicitly.
3. **Actor (NPC) targets**: Few tests verify behavior when the target is an actor (throwing at an NPC is one exception).
4. **Player in special locations**: No tests verify action behavior when the player is inside a container or on a supporter.

### Specific missing tests:
1. **Opening**: Container-with-contents reveal flow (skipped, high priority)
2. **Pushing**: SwitchableTrait.isOn mutation for button toggles
3. **Showing**: Nearly all behavioral tests (16 skipped)
4. **Talking**: hasGreeted mutation after first conversation
5. **Unlocking**: Key-based unlocking happy path (skipped, high priority)
6. **Throwing**: Item destruction mutation (remove from world on break)
7. **Searching**: Concealed item state mutation (concealed -> not concealed)

## Removal Candidates

### Tests that should be removed (provide no value):

1. **All "Testing Pattern Examples" blocks** (found in 14 files, ~40 test cases total):
   - `looking-golden.test.ts` lines 470-554 (2 tests)
   - `pushing-golden.test.ts` lines 509-582 (3 tests)
   - `searching-golden.test.ts` lines 533-712 (5 tests)
   - `smelling-golden.test.ts` lines 442-515 (3 tests)
   - `switching_off-golden.test.ts` lines 489-640 (5 tests)
   - `switching_on-golden.test.ts` lines 478-653 (5 tests)
   - `taking_off-golden.test.ts` lines 370-447 (2 tests)
   - `talking-golden.test.ts` lines 399-489 (3 tests)
   - `throwing-golden.test.ts` lines 674-773 (6 tests)
   - `touching-golden.test.ts` lines 530-604 (3 tests)
   - `wearing-golden.test.ts` lines 393-453 (2 tests)
   
   **Rationale**: These tests create local data structures and assert properties of those structures. They never invoke the action under test. They cannot detect action bugs. They inflate test counts. They should be either deleted or converted to actual behavioral tests.

2. **quitting.test.ts lines 438-458**: Two "integration notes" tests. Line 449 is `expect(true).toBe(true)`. Line 451 re-checks requiredMessages.

3. **registry-golden.test.ts lines 288-302**: "registerMessages is a placeholder" -- tests dead code.

### Tests that should be fixed (skipped but important):

Priority 1 (blocking coverage of core mechanics):
- **opening-golden.test.ts**: 3 skipped tests for container-reveals-contents (lines 190, 335, 442)
- **unlocking-golden.test.ts**: "unlock with correct key" (line 223)

Priority 2 (significant gaps):
- **showing-golden.test.ts**: 16 skipped tests -- needs architectural discussion about whether to fix or remove
- **unlocking-golden.test.ts**: remaining 9 skipped tests

Priority 3 (nice to have):
- **throwing-golden.test.ts**: 2 skipped NPC reaction tests (lines 285, 318)
- **taking-golden.test.ts**: weight capacity test (line 249)

## Final Notes

The test suite follows a consistent pattern that makes it easy to navigate. The strongest files (removing, putting, switching_on, switching_off, waiting, report-helpers) demonstrate what the golden tests should look like: real world setup, action invocation through the three-phase pattern, event verification, and world-state mutation checks. The weakest files (showing, quitting integration notes) need attention. The "pattern example" tests should be systematically removed across all files.
