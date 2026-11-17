# Stdlib Golden Action Tests Review: A through L

**Reviewed**: 2026-04-06
**Scope**: 18 test files covering actions from About through Locking
**Reviewer**: Claude Opus 4.6 (automated review)

---

## Summary

| Metric | Value |
|--------|-------|
| Files reviewed | 18 |
| Total test cases (including skipped) | ~280 |
| Skipped tests | ~30 |
| Tests with world-state mutation verification | 7 files (closing, drinking, entering, exiting, giving, going, inserting, locking) |
| Tests that only check events/metadata | 4 files (about, climbing, examining, listening) |
| Tests that are largely aspirational/dead | 1 file (attacking-golden, ~75% skipped) |

**Overall Quality**: Mixed. The best files (closing, going, locking, giving) follow a strong pattern: metadata checks, precondition checks, success cases, event structure, AND world-state mutation verification. The weakest files (about, attacking-golden) either test trivialities or are mostly skipped. Several files include "Testing Pattern Examples" sections that test trait setup, not action behavior -- these are essentially dead weight.

**Key Finding**: The project's "dropping bug" lesson has been partially internalized. Files written or updated after that incident include dedicated "World State Mutations" sections. However, several files (climbing, examining, listening, inventory) still lack mutation verification tests entirely. For observation-only actions (examining, listening, inventory), this is acceptable since they don't mutate state. For climbing, which moves the player, the omission is a gap.

---

## File-by-File Review

### 1. about-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/about-golden.test.ts`
**Test cases**: 8
**What it tests**: Structure (ID, group, metadata), validation, execute (no-throw, no state change), report (event emission), full flow.

**Quality Assessment**: LOW-MEDIUM. The about action is trivially simple (meta action, no target, no state change). Every test here is essentially "does this function exist and not throw." The most useful test is line 71-77 which verifies no world state modification. The rest are structural checks that would only catch catastrophic regressions.

**Gaps**: None meaningful -- the action is too simple to have gaps.

**Problems**:
- Line 46-53: Testing that an object has properties and they are functions is not a behavioral test. If the action didn't have validate/execute/report, it wouldn't compile.
- Line 101-109: "should create well-formed semantic event" duplicates the test at line 88-99.

**Recommendation**: KEEP but consider merging into 2-3 tests. The 8 tests here could be 3 without loss of coverage.

---

### 2. attacking-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/attacking-golden.test.ts`
**Test cases**: 29 (only ~7 active, ~22 skipped)
**What it tests**: Metadata, preconditions, unarmed/armed attacks, FRAGILE/BREAKABLE traits, NPC reactions, event structure.

**Quality Assessment**: LOW. This file is approximately 75% skipped tests. The skipped tests reference removed traits (FRAGILE, BREAKABLE as originally designed) and depend on scope logic that apparently doesn't work in unit tests. The active tests are:
- Line 80-91: No target specified (good, tests validation)
- Line 153-167: Prevent self-attack (good)
- Line 195-217: Non-combatant NPC attack (good, tests behavior)
- Line 603-625: Break a breakable object (good, tests actual behavior)
- Line 752-778: Non-combatant NPC reaction (duplicate of lines 195-217)

The "Testing Pattern Examples" section (lines 806-907) is almost entirely useless -- it tests that arrays contain expected values and that `requiredMessages` includes certain strings. These are not behavioral tests.

**Gaps**:
- No world-state mutation tests (e.g., does breaking a BREAKABLE object actually change the `broken` property?)
- No test for armed attack success path (all armed tests are skipped)

**Problems**:
- Lines 752-778 duplicate lines 195-217 (same scenario: non-combatant NPC)
- Lines 807-826: "pattern: combat verbs" tests that a local array literal has non-null values. Will never fail.
- Lines 851-863: "pattern: destruction verbs" only checks `requiredMessages` -- duplicates lines 36-72.
- Lines 865-878: "pattern: NPC reactions" only checks `requiredMessages` -- same duplication.

**Recommendation**: IMPROVE significantly. Remove skipped tests that reference deleted features. Remove duplicate test at line 752. Remove all "Testing Pattern Examples" tests. Add world-state mutation tests for BREAKABLE.

---

### 3. attacking.test.ts

**Path**: `packages/stdlib/tests/unit/actions/attacking.test.ts`
**Test cases**: 22
**What it tests**: Three-phase compliance, validation logic (no target, not visible, not reachable, self, weapon not reachable, valid target, held weapon), weapon inference (stab/slash/cut/attack/explicit), shared data handling, event generation, attack result types.

**Quality Assessment**: HIGH. This is a well-structured test file that tests actual behavioral outcomes. Key strengths:
- Lines 113-197: Thorough validation testing with meaningful assertions on `result.valid` and `result.error`
- Lines 226-303: Weapon inference tests verify `sharedData` is correctly populated
- Lines 363-471: Event generation tests call execute then report, checking actual event payloads
- Lines 474-517: Attack result types test actual behavior for breakable vs. indestructible objects

**Gaps**:
- No world-state mutation test for BREAKABLE objects (does `broken` get set to true?)
- No test for combatant NPC (with COMBATANT trait) being damaged

**Problems**:
- Lines 56-63 and 520-555: Action metadata tests partially duplicate the golden file. But since these are in a separate file, this is acceptable.

**Recommendation**: KEEP. This is one of the better test files. Add mutation verification for BREAKABLE state changes.

---

### 4. climbing-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/climbing-golden.test.ts`
**Test cases**: 16
**What it tests**: Metadata, preconditions (no target, not climbable, already there, invalid direction, no exit, not in room), successful climbing (up/down, onto supporter, climbable trait, direction normalization), event structure.

**Quality Assessment**: MEDIUM. Tests cover the main scenarios well and check both event type and event data. The precondition tests at lines 49-169 are thorough.

**Gaps**:
- **No world-state mutation tests.** Climbing up/down moves the player. Lines 173-223 check events but never verify `world.getLocation(player.id)` changed. This is a significant gap for a movement action.
- No test for climbing down.

**Problems**:
- Lines 387-453: "Testing Pattern Examples" section tests trait setup, not action behavior. The multi-level climbing test (lines 388-412) just sets up rooms and checks exits exist. The climbable objects test (lines 414-453) checks trait presence. Neither runs the climbing action.

**Recommendation**: IMPROVE. Add world-state mutation tests (verify player location changes after climb up/down/onto). Remove or repurpose the "Testing Pattern Examples" section.

---

### 5. closing-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/closing-golden.test.ts`
**Test cases**: 19
**What it tests**: Three-phase compliance, metadata, preconditions (no target, not closable, already closed), successful closing (container, container with contents, door), close requirements, event structure, AND world-state mutations.

**Quality Assessment**: HIGH. This is one of the best test files in the suite. The "World State Mutations" section (lines 295-466) is exemplary:
- Line 296-321: Verifies `isOpen` goes from `true` to `false`
- Line 323-361: Verifies closing container with contents preserves contents
- Line 363-389: Verifies already-closed stays closed
- Line 391-417: Verifies `canClose: false` prevents state change
- Line 437-466: Verifies door closing

**Gaps**:
- No test for closing a locked container (edge case: close then lock)

**Problems**:
- Lines 469-539: "Testing Pattern Examples" section tests trait setup, not action behavior. Can be removed.

**Recommendation**: KEEP. Model for other test files. Remove "Testing Pattern Examples."

---

### 6. drinking-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/drinking-golden.test.ts`
**Test cases**: ~35
**What it tests**: Metadata, preconditions (no item, not drinkable, already consumed, container closed), successful drinking (from inventory, implicit take from room, portions, last portion, taste variations, effects, thirst, containers, emptying, nutrition), verb variations (sip, quaff, swallow), event structure, AND world-state mutations.

**Quality Assessment**: HIGH. Comprehensive coverage with both event checking and state mutation verification. The mutation tests (lines 700-865) are thorough:
- Line 701-726: Verifies implicit take actually moves item to inventory
- Line 752-778: Verifies servings decrement
- Line 807-837: Verifies liquid amount decrements for containers
- Line 839-865: Verifies container empties to 0

**Gaps**:
- No test for drinking poison (effects applied to player state)

**Problems**:
- Lines 868-967: "Testing Pattern Examples" section tests trait creation, not action behavior. Dead weight.
- The file is very long (~968 lines). The taste/effect variations (lines 261-433) test every taste variant separately. These could be parameterized.

**Recommendation**: KEEP. Remove "Testing Pattern Examples." Consider parameterizing taste tests.

---

### 7. dropping-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/dropping-golden.test.ts`
**Test cases**: 14
**What it tests**: Three-phase compliance, metadata, preconditions (no target, not held, still worn), container checks (closed container skip, full container), successful dropping (in room, in container, on supporter), message variations (glass/discard), event structure.

**Quality Assessment**: MEDIUM. Good coverage of scenarios but **no world-state mutation tests**. Every test checks events only. The dropping bug was literally discovered in this action, yet the golden test doesn't verify `world.getLocation()` changes.

**Gaps**:
- **Critical: No world-state mutation tests.** Must verify:
  - Item actually moves from player to room after drop
  - Item actually moves from player to container when dropping inside container
  - Item stays in player inventory when drop is blocked

**Problems**:
- Line 130-189: Skipped test for dropping inside closed container. The extensive comment is good documentation, but the test should be un-skipped when the feature works.
- Line 460-495: Skipped edge case for dropping while not in a room. Good to have as documentation.

**Recommendation**: IMPROVE urgently. This is the action where the mutation bug was discovered. Add world-state mutation tests.

---

### 8. eating-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/eating-golden.test.ts`
**Test cases**: ~22
**What it tests**: Metadata, preconditions (no item, not edible, is drink, already consumed), successful eating (basic, servings, multi-serving, taste variations, poisonous, filling, nutrition), event structure.

**Quality Assessment**: MEDIUM. Good event-level testing but **no world-state mutation tests**. Similar structure to drinking but missing the crucial mutation section.

**Gaps**:
- **No world-state mutation tests.** Must verify:
  - Servings actually decrement after eating
  - Item is consumed (servings reach 0)
  - Implicit take works (item moves to inventory before eating)

**Problems**:
- Lines 468-563: "Testing Pattern Examples" section tests trait creation, not action behavior.
- Line 551: References `portions` property but `forEach` destructures as `portions` while `add()` uses `portions` -- this may not match the actual trait field name (which is `servings`).

**Recommendation**: IMPROVE. Add world-state mutation tests (mirroring the drinking-golden pattern). Remove "Testing Pattern Examples."

---

### 9. entering-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/entering-golden.test.ts`
**Test cases**: 19
**What it tests**: Metadata, preconditions (no target, not enterable, already inside [skipped], entry blocked [skipped], container closed, max occupancy [skipped]), successful entry (car, container, supporter, occupancy check, custom prepositions [skipped]), event structure, AND world-state mutations.

**Quality Assessment**: HIGH. Has thorough world-state mutation tests (lines 461-645):
- Line 462-489: Verifies player moves into container
- Line 492-519: Verifies player moves onto supporter
- Line 522-543: Verifies player stays when not enterable
- Line 545-578: Verifies player stays when container closed
- Line 580-610: Verifies player stays when already inside
- Line 612-644: Verifies player moves into open container

**Gaps**:
- "Already inside" precondition test is skipped (line 77) -- but covered in mutation tests (line 580)
- Max occupancy test is skipped (line 160)

**Problems**:
- Lines 374-452: "Testing Pattern Examples" tests trait setup, not action behavior.
- Lines 104-127: Skipped test for entry blocking has stale comment about removed EntryTrait.

**Recommendation**: KEEP. Remove "Testing Pattern Examples." Clean up stale skip comments.

---

### 10. examining-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/examining-golden.test.ts`
**Test cases**: 17
**What it tests**: Metadata, preconditions (no target, not visible, examine self), basic examining (simple object, with description), container examining (open with contents, closed, without openable), supporter examining, special types (switchable, readable, wearable, locked door), complex objects (multiple traits), event structure, four-phase compliance.

**Quality Assessment**: HIGH for an observation action. Examining does not mutate state, so event-level testing is appropriate. The test coverage is thorough:
- Lines 109-153: Tests different information in events based on traits
- Lines 157-254: Container examining with various states
- Lines 286-398: Special object types each get dedicated tests
- Lines 467-528: Good four-phase compliance verification with spies

**Gaps**: None significant. The action doesn't mutate state, so no mutation tests are needed.

**Problems**:
- Lines 532-582: Edge cases section is fine but could be folded into the main describe blocks.

**Recommendation**: KEEP as-is. This is a good model for observation action tests.

---

### 11. exiting-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/exiting-golden.test.ts`
**Test cases**: 18
**What it tests**: Metadata, preconditions (already in room, no location [skipped], no parent location, container closed [skipped], exit blocked [skipped]), successful exit (from container, from supporter, from vehicle [skipped], custom prepositions [skipped], from open container), event structure, AND world-state mutations.

**Quality Assessment**: HIGH. World-state mutation tests (lines 395-551) are thorough:
- Line 396-418: Verifies player moves out of container to room
- Line 420-443: Verifies player moves off supporter to room
- Line 446-462: Verifies player stays when already in room
- Line 464-487: Verifies player stays when container has no parent
- Line 489-516: Verifies player exits open container
- Line 518-550: Verifies player stays when container is closed

**Gaps**:
- Container closed precondition test is skipped in golden section but covered in mutation tests.

**Problems**:
- Lines 335-386: "Testing Pattern Examples" reference removed EntryTrait -- entirely dead code.

**Recommendation**: KEEP. Remove dead "Testing Pattern Examples."

---

### 12. giving-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/giving-golden.test.ts`
**Test cases**: 21
**What it tests**: Metadata, preconditions (no item, no recipient, not actor, self), capacity checks (inventory full, too heavy), recipient preferences (refuses, gratefully accepts, reluctantly accepts), successful giving, event structure, edge cases, AND world-state mutations.

**Quality Assessment**: HIGH. One of the most complete test files:
- Precondition testing is thorough (lines 54-129)
- Preference system testing (lines 198-295) covers likes/dislikes/refuses
- World-state mutations (lines 489-675) verify item movement for success AND non-movement for every failure case

**Gaps**:
- No test for "not_holding" (player doesn't have the item). Lines from dropping-golden suggest this should be tested.

**Problems**: None significant. The edge cases section (lines 385-480) complements rather than duplicates.

**Recommendation**: KEEP as-is. Model for other test files.

---

### 13. going-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/going-golden.test.ts`
**Test cases**: 21
**What it tests**: Four-phase compliance, metadata, preconditions (no direction, not in room, no exits, no exit that way, door closed, door locked, destination not found, dark room allowed), successful movement (cardinal direction, abbreviations, first visit, through open door, dark room with light, direction from directObject), event structure (entity inclusion, all opposite directions), AND world-state mutations.

**Quality Assessment**: HIGH. Thorough and well-structured:
- Lines 92-335: Comprehensive precondition testing including edge cases
- Lines 338-599: Success cases with diverse scenarios
- Lines 637-688: Exhaustive opposite-direction mapping test
- Lines 699-854: Strong mutation tests including visited-flag verification

**Gaps**:
- No test for movement blocked by a custom `blockedMessage` on an exit
- No test for implicit door opening (if that feature exists)

**Problems**:
- Lines 857-957: "Testing Pattern Examples" section. The "complex room connections" test (lines 858-911) just sets up rooms and checks trait properties. The "door states" test (lines 913-956) has a trivially-true assertion at line 954 (`expect(isOpen || !shouldPass).toBeTruthy()` -- this is always true since when `isOpen` is false, `shouldPass` is also false).

**Recommendation**: KEEP. Remove "Testing Pattern Examples."

---

### 14. implicit-take.test.ts

**Path**: `packages/stdlib/tests/unit/actions/implicit-take.test.ts`
**Test cases**: 11
**What it tests**: Already carried (no implicit take needed), reachable and takeable (implicit take occurs, events emitted, sharedData populated), not reachable (scope error, no take attempt), scenery (fixed_in_place error, no take attempt), take validation fails (self, room), multiple implicit takes (event accumulation).

**Quality Assessment**: HIGH. This tests a cross-cutting concern (implicit take) that affects many actions. Key strengths:
- Line 87-97: Verifies actual world state change (`world.getLocation(coin.id)` becomes `player.id`)
- Line 147-180: Verifies items in other rooms are NOT taken
- Line 184-210: Verifies scenery cannot be implicitly taken
- Line 238-258: Tests accumulation for multiple implicit takes

**Gaps**:
- No test for implicit take when player inventory is full

**Problems**: None significant.

**Recommendation**: KEEP as-is.

---

### 15. inserting-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/inserting-golden.test.ts`
**Test cases**: 17
**What it tests**: Three-phase compliance, metadata, delegation to putting action (with mock verification), container-specific behavior (open container, closed container, not a container), capacity checks, event structure, integration (consistency with putting, nested containers), AND world-state mutations.

**Quality Assessment**: HIGH. Notable for testing delegation behavior:
- Lines 76-119: Uses `vi.fn` mock to verify inserting delegates to putting with correct preposition. This is an implementation detail test but justified since inserting IS a delegation action.
- Lines 380-533: Thorough mutation tests covering success and all failure paths.

**Gaps**: None significant.

**Problems**:
- Line 76-119: The mock-based delegation test is fragile. If the implementation changes from delegation to a standalone action, this test breaks even if behavior is identical. Consider testing outcomes instead.

**Recommendation**: KEEP. Consider replacing mock-based delegation test with outcome-based test.

---

### 16. inventory-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/inventory-golden.test.ts`
**Test cases**: 15
**What it tests**: Metadata, empty inventory, held items, worn items, mixed inventory, weight information, brief format detection (i/inv/inventory), observable action, event structure.

**Quality Assessment**: MEDIUM-HIGH for an observation action. Inventory doesn't mutate state, so event-level testing is appropriate. Good coverage of different inventory states and brief/full format detection.

**Gaps**:
- Weight information test is skipped (line 195)
- No test for items inside containers carried by player (nested inventory display)

**Problems**:
- Line 381-383: Skipped "pattern: weight calculation" test references undefined `invEvent` variable. Would fail to compile if un-skipped.
- Lines 348-396: "Testing Pattern Examples" section is partially useful (pattern: inventory with various item types actually runs the action) but the weight calc test is broken.

**Recommendation**: KEEP. Fix or remove broken weight calc test.

---

### 17. listening-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/listening-golden.test.ts`
**Test cases**: 15
**What it tests**: Metadata, listening to specific objects (active device, inactive device, container with contents, liquid sounds, empty container, ordinary objects), environment listening (silence, active devices, inactive devices, mixed), complex scenarios (mixed container contents, device+container priority), event structure.

**Quality Assessment**: HIGH for a sensory action. Listening doesn't mutate state. The test coverage is thorough with diverse scenarios:
- Lines 53-225: Object-specific listening covers all trait combinations
- Lines 228-345: Environment scanning correctly tests device filtering
- Lines 349-417: Complex scenarios test priority rules

**Gaps**: None significant for a non-mutating action.

**Problems**:
- Lines 465-617: "Testing Pattern Examples" section tests trait setup, not action behavior. Lengthy dead weight.

**Recommendation**: KEEP. Remove "Testing Pattern Examples."

---

### 18. locking-golden.test.ts

**Path**: `packages/stdlib/tests/unit/actions/locking-golden.test.ts`
**Test cases**: 23
**What it tests**: Metadata, preconditions (no target, not lockable, already locked, target open), key requirements (no key provided, key not held, wrong key), successful locking (without key, with key, door with key, multiple valid keys, lock sound), event structure, edge cases (lockable without openable, keyId vs keyIds priority, backup keys), AND world-state mutations.

**Quality Assessment**: HIGH. One of the most complete test files:
- Lines 49-138: Thorough precondition testing
- Lines 140-240: Key requirement tests cover all failure modes
- Lines 242-433: Success cases cover diverse configurations
- Lines 470-567: Edge cases are well-chosen and non-trivial
- Lines 577-769: Mutation tests verify `isLocked` changes for success and non-changes for every failure

**Gaps**: None significant.

**Problems**: None significant.

**Recommendation**: KEEP as-is. Model for other test files.

---

## Cross-Cutting Gaps

These scenarios SHOULD be tested but are not covered in any file:

1. **Dropping action needs mutation tests** -- the action where the "dropping bug" was discovered lacks the very tests that would catch it.

2. **Eating action needs mutation tests** -- parallels drinking but missing serving/consumption state verification.

3. **Climbing action needs mutation tests** -- a movement action that changes player location but only checks events.

4. **Attacking action needs mutation tests** -- BREAKABLE objects should have their `broken` flag verified after attack.

5. **No negative interaction tests** -- e.g., what happens when you call `execute()` without calling `validate()` first? Or call `report()` without `execute()`? The four-phase pattern assumes sequential calling but no test verifies behavior when phases are skipped.

6. **"Testing Pattern Examples" sections are dead weight** -- present in 10 of 18 files, they test trait setup (object creation, property checking) rather than action behavior. They add ~200+ lines of tests that cannot fail in interesting ways.

---

## Removal Candidates

| File/Section | Lines | Reason |
|---|---|---|
| about-golden.test.ts lines 46-53 | "should implement three-phase pattern" | Tests function existence; would be caught by TypeScript compiler |
| attacking-golden.test.ts lines 806-907 | "Testing Pattern Examples for Attacking" | Tests array literals and `requiredMessages`, not action behavior |
| attacking-golden.test.ts lines 752-778 | "NPC Reactions" describe | Exact duplicate of lines 195-217 |
| attacking-golden.test.ts (all skipped tests) | ~22 tests | Reference removed traits/features. Should be removed, not skipped indefinitely |
| climbing-golden.test.ts lines 387-454 | "Testing Pattern Examples for Climbing" | Tests trait setup, not climbing behavior |
| closing-golden.test.ts lines 469-539 | "Testing Pattern Examples" | Tests trait setup, not closing behavior |
| drinking-golden.test.ts lines 868-967 | "Testing Pattern Examples for Drinking" | Tests trait creation, not drinking behavior |
| eating-golden.test.ts lines 468-563 | "Testing Pattern Examples for Eating" | Tests trait creation, not eating behavior |
| entering-golden.test.ts lines 374-452 | "Testing Pattern Examples for Entering" | Tests trait setup, not entering behavior |
| exiting-golden.test.ts lines 335-386 | "Testing Pattern Examples for Exiting" | Dead code referencing removed EntryTrait |
| going-golden.test.ts lines 857-957 | "Testing Pattern Examples for Going" | Tests trait setup; line 954 assertion is trivially true |
| inventory-golden.test.ts line 381-383 | Skipped weight calc test | Broken -- references undefined variable |
| listening-golden.test.ts lines 465-617 | "Testing Pattern Examples for Listening" | Tests trait creation, not listening behavior |

**Estimated removable lines**: ~800 across all files (tests that either cannot fail, test deleted features, or test implementation details rather than behavior).

---

## Priority Improvements

1. **P0 - Add mutation tests to dropping-golden.test.ts** -- the dropping bug posterchild lacks mutation verification
2. **P0 - Add mutation tests to eating-golden.test.ts** -- consumption state changes need verification
3. **P1 - Add mutation tests to climbing-golden.test.ts** -- player movement needs verification
4. **P1 - Add mutation tests to attacking.test.ts / attacking-golden.test.ts** -- BREAKABLE state change needs verification
5. **P2 - Remove all "Testing Pattern Examples" sections** -- ~800 lines of dead weight across 10 files
6. **P2 - Remove or rewrite attacking-golden.test.ts** -- 75% skipped, most testing deleted features
7. **P3 - Fix inventory-golden.test.ts broken weight calc test** -- line 381-383
