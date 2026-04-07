# World-Model Trait Tests Review

**Reviewed**: 2026-04-06
**Package**: `packages/world-model/tests/unit/traits/`
**Total test files**: 25
**Total test cases (approx)**: ~520

## Executive Summary

The trait test suite is dominated by **data-in/data-out property tests** -- constructing a trait with options and verifying the values are stored. Approximately 80-85% of all assertions follow the pattern `new Trait(data); expect(trait.prop).toBe(data.prop)`. This is the test equivalent of testing getters and setters -- it verifies the constructor works, but rarely tests behavior, invariants, or mutations.

**Good**: The tests are thorough about constructor coverage, default values, and edge cases (empty options, undefined). Type constants are uniformly verified.

**Bad**: Almost no tests verify actual domain behavior. Traits that have methods (ActorTrait, CharacterModelTrait) are better tested. Traits that are pure data bags get hundreds of lines of tests that could never realistically fail unless the constructor was deleted.

**Standout file**: `character-model.test.ts` is by far the best test in this suite -- it tests vocabulary parsing, state mutation methods, predicate evaluation, clamping, boundary conditions, and scenario-based state transitions. It should be the model for all other trait tests.

**Standout weakness**: `vehicle-composition.test.ts` is the only file that tests real world-model integration (moving entities, checking containment), and it is excellent. This pattern should be replicated elsewhere but is absent from nearly every other test file.

---

## Per-File Reviews

### 1. `actor.test.ts`

**Path**: `packages/world-model/tests/unit/traits/actor.test.ts`
**Test cases**: 22
**What it tests**: ActorTrait construction, pronoun management, inventory limits, player management, custom properties, state management, entity integration, edge cases.
**Quality**: GOOD. One of the better files. Tests actual methods like `setPronouns()`, `getPrimaryPronouns()`, `setInventoryLimit()`, `makePlayer()`, `setCustomProperty()`, `getCustomProperty()`. The entity integration tests create real WorldModel instances. Line 193 documents a known limitation (isPlayable not enforced after makePlayer). Line 405-411 tests shared reference behavior explicitly.
**Gaps**:
- No test for `getCustomProperty` returning undefined when `customProperties` is undefined (only when key is missing)
- No test for removing a custom property
- No negative test for `setInventoryLimit` with invalid data
**Recommendation**: KEEP. Minor improvements possible.

---

### 2. `attached.test.ts`

**Path**: `packages/world-model/tests/unit/traits/attached.test.ts`
**Test cases**: 16
**What it tests**: AttachedTrait construction, attachment types, detachment effects, sound effects, entity integration.
**Quality**: LOW. Pure property storage tests. Every test creates a trait and checks the properties match. The "entity integration" section (line 115) only checks `hasTrait` and reads properties back. No behavior is tested because AttachedTrait has no methods -- but the tests also do not test any interaction with PullableTrait beyond co-existence on an entity.
**Gaps**:
- No test for state transitions (e.g., setting `loose` to true after creation, simulating detachment)
- Sound effect test (line 239-255) is pure set/get -- "should have appropriate sounds for attachment types" is misleading; it just stores whatever you pass in
**Recommendation**: IMPROVE. Reduce boilerplate property tests. Add tests that verify trait interactions or state transitions if any exist.

---

### 3. `breakable.test.ts`

**Path**: `packages/world-model/tests/unit/traits/breakable.test.ts`
**Test cases**: 10
**What it tests**: BreakableTrait construction, broken state toggling, entity integration.
**Quality**: LOW. BreakableTrait is a trivial trait with one boolean property (`broken`). Nine of ten tests are variations of `expect(trait.broken).toBe(true/false)`. The "usage scenarios" section (line 125) is redundant with "breaking state" (line 41).
**Gaps**:
- No test for any consequences of being broken (does it affect other traits? is there an `isBroken()` method?)
- "should distinguish between broken and unbroken items" (line 143) duplicates "should work with multiple breakable objects" (line 84)
**Recommendation**: REDUCE. Could be cut to 3-4 tests (defaults, construction, mutation, entity attachment). The rest are noise.

---

### 4. `button.test.ts`

**Path**: `packages/world-model/tests/unit/traits/button.test.ts`
**Test cases**: 17
**What it tests**: ButtonTrait construction, sizes/shapes/materials, PushableTrait integration, latching vs momentary, pressed state.
**Quality**: LOW. Entirely property storage. "should handle momentary button" (line 123) and "should handle latching button" (line 140) just set/read `pressed` -- they do not test actual latching behavior (no method for it). "button combinations" (line 268) create entities with PushableTrait but only read properties back.
**Gaps**:
- No test for actual button press mechanics
- Latching test (line 140-154) does not test latching behavior -- just sets `pressed = true` and checks it stays true, which any boolean would
**Recommendation**: REDUCE. Keep constructor, entity integration, and PushableTrait combo tests. Remove all the size/shape/material/color enumeration tests.

---

### 5. `character-model.test.ts`

**Path**: `packages/world-model/tests/unit/traits/character-model.test.ts`
**Test cases**: 35
**What it tests**: Vocabulary parsing, personality expressions, disposition management with clamping, mood axes with clamping, threat levels, knowledge/belief/goal CRUD, lucidity state machine, predicate evaluation, custom predicates, cognitive profiles.
**Quality**: EXCELLENT. The best test file in the suite. Tests real methods with real logic: `parsePersonalityExpr`, `dispositionToValue`/`valueToDisposition`, `nearestMood`, `valueToThreat`, `setPersonality`, `adjustDisposition`, `setMood`/`adjustMood`, `setThreat`/`adjustThreat`, `addFact`/`knows`, `addBelief`/`hasBelief`, `addGoal`/`removeGoal`/`updateGoalPriority`, `enterLucidityState`/`decayLucidity`, `evaluate` predicate system. Tests clamping boundaries, state machine transitions, sorted goal lists, custom predicate registration, error on unknown predicate (line 549-551).
**Gaps**:
- No test for `adjustMood` clamping arousal to minimum 0 (line 262 tests it but only as part of a double-adjustment)
- Could test predicate evaluation for personality with exact threshold value (0.4)
- Could test `decayLucidity` when baseline is undefined
**Recommendation**: KEEP as-is. This is the gold standard for the suite.

---

### 6. `clothing.test.ts`

**Path**: `packages/world-model/tests/unit/traits/clothing.test.ts`
**Test cases**: 16
**What it tests**: ClothingTrait construction, materials, conditions, styles, pockets (via fixtures), slots/layers, entity integration.
**Quality**: MEDIUM. Better than most property-bag tests because it uses test fixtures (`createTestClothing`, `createTestPocket`, `createTestActor`) and tests real world-model operations like `world.moveEntity` and `world.getContents`. The pocket containment test (line 158-177) and "maintain pocket contents when clothing is worn" (line 179-204) are genuine behavioral tests.
**Gaps**:
- No test for ClothingTrait's relationship to WearableTrait (line 53-67 checks properties exist but does not test wearing/removing through the clothing)
- Condition degradation test (line 100) just assigns values -- no validation logic tested
**Recommendation**: KEEP. Pocket/containment tests are valuable. Reduce material/style enumeration.

---

### 7. `container-capability.test.ts`

**Path**: `packages/world-model/tests/unit/traits/container-capability.test.ts`
**Test cases**: 11
**What it tests**: Container capability utilities (`canContain`, `getContainerTrait`, `isContainerCapable`) across RoomTrait, ActorTrait, and ContainerTrait. Tests trait priority (ContainerTrait > RoomTrait).
**Quality**: GOOD. Tests actual utility functions with meaningful return values. The priority test (line 98-109) verifies that explicit ContainerTrait is preferred over RoomTrait. Tests cover the three container-capable trait types and the non-container case.
**Gaps**:
- Does not test `canContain` with SupporterTrait
- Does not test what happens when entity has both ActorTrait and ContainerTrait
- "Integration with World Model" tests (line 120-157) do not actually use WorldModel.moveEntity -- they only check trait properties
**Recommendation**: KEEP. Add SupporterTrait coverage and actual world.moveEntity tests.

---

### 8. `container.test.ts`

**Path**: `packages/world-model/tests/unit/traits/container.test.ts`
**Test cases**: 16
**What it tests**: ContainerTrait construction, capacity constraints, transparency, enterable, type restrictions, entity integration, duplicate trait handling.
**Quality**: LOW-MEDIUM. Mostly property storage. The duplicate-trait test (line 192-217) is valuable -- it verifies that adding a second ContainerTrait logs a warning and keeps the original. But capacity tests are just set/get.
**Gaps**:
- No test for actual containment operations (world.moveEntity, world.getContents)
- No test for capacity enforcement during moveEntity
- Type restrictions are stored but never checked against actual insertion
**Recommendation**: IMPROVE. The property tests are valid but the file needs behavioral tests for actual containment.

---

### 9. `door.test.ts`

**Path**: `packages/world-model/tests/unit/traits/door.test.ts`
**Test cases**: 15
**What it tests**: DoorTrait construction (requires room1+room2), bidirectional doors, entity integration with OpenableTrait/LockableTrait, connected room fixture, common door patterns.
**Quality**: MEDIUM. The constructor validation (line 35-39) testing `throw 'Door must connect two rooms'` is good. The `createConnectedRoomsWithDoor` fixture test (line 161) is excellent -- verifies room exits are set up correctly. Tests door patterns (standard, locked, archway).
**Gaps**:
- No test for door behavior when opened/closed (does opening the door allow passage?)
- "should handle self-connecting door" (line 219) documents a weird case but does not verify any consequences
- No test for what happens when room IDs are invalid
**Recommendation**: KEEP. Good constructor validation and fixture tests.

---

### 10. `edible.test.ts`

**Path**: `packages/world-model/tests/unit/traits/edible.test.ts`
**Test cases**: 22
**What it tests**: EdibleTrait construction, food vs liquid, servings, remains, effects, consume messages, physical properties, entity integration.
**Quality**: LOW. Almost entirely property storage. "should track serving consumption" (line 146) is just decrementing a number manually. "should handle rations with multiple servings" (line 443) has a for-loop that sets `servings = day - 1` which is just testing number assignment.
**Gaps**:
- No test for actual eating/drinking behavior
- `hasEffect` is just a boolean flag with no behavior
- `remainsType` is a string with no entity creation tested
- No test for what happens when `servings` reaches 0
**Recommendation**: REDUCE. Keep defaults, construction, entity integration. Remove the many thematic variations that just store different strings.

---

### 11. `exit.test.ts`

**Path**: `packages/world-model/tests/unit/traits/exit.test.ts`
**Test cases**: 20
**What it tests**: ExitTrait construction with required fields (from, to, command), optional properties, direction handling, custom exits, bidirectional exits, visibility, conditional exits, messages, entity integration, duplicate trait handling.
**Quality**: MEDIUM. The required-fields validation (line 26-29) is good. The duplicate-trait test (line 317-351) is valuable. The variety of exit types tested provides decent documentation value. But all are still property storage.
**Gaps**:
- `conditional` and `conditionId` are just stored strings -- no condition evaluation tested
- Visibility toggling (line 198-214) is just boolean assignment
- No test for exit traversal
**Recommendation**: KEEP but trim. Good as documentation of ExitTrait capabilities.

---

### 12. `identity.test.ts`

**Path**: `packages/world-model/tests/unit/traits/identity.test.ts`
**Test cases**: 15
**What it tests**: IdentityTrait construction, articles (a/an/the/some/empty), aliases, descriptions, concealment, physical properties, entity integration, duplicate trait handling.
**Quality**: LOW-MEDIUM. Pure property tests. The duplicate-trait test (line 215-242) is valuable. Article handling tests document expected behavior but are simple set/get.
**Gaps**:
- No test for how aliases affect entity lookup/resolution
- No test for `properName` interaction with article (business logic may live elsewhere)
- `concealed` is stored but never tested for hiding behavior
**Recommendation**: KEEP. This is a fundamental trait; property tests serve as documentation.

---

### 13. `light-source.test.ts`

**Path**: `packages/world-model/tests/unit/traits/light-source.test.ts`
**Test cases**: 19
**What it tests**: LightSourceTrait construction, brightness levels, lit state, fuel management, SwitchableTrait/WearableTrait integration, flame/electric/magical types, edge cases.
**Quality**: LOW. "Complex scenarios" (line 407) like "refillable light source" and "multi-mode light source" are just property assignments with comments like "Simulate refilling" followed by `lightTrait.fuelRemaining = 100`. No behavior is tested. The test never checks if a light source actually illuminates a dark room.
**Gaps**:
- No test for LightSourceBehavior (fuel consumption over turns, dimming)
- No test for interaction with room darkness
- No test for the isLit undefined semantics described in comment at line 67
**Recommendation**: REDUCE. Keep defaults and entity integration. The "scenarios" are misleading.

---

### 14. `lockable.test.ts`

**Path**: `packages/world-model/tests/unit/traits/lockable.test.ts`
**Test cases**: 14
**What it tests**: LockableTrait construction, startsLocked semantics, key management (single, multiple, master), state changes, entity integration with fixtures, message customization, sound effects.
**Quality**: MEDIUM. The `startsLocked` / `isLocked` precedence tests (lines 69-83) verify actual initialization logic. The `createTestLockableContainer` and `createTestKey` fixture tests (line 160-178) are useful integration tests. Key management tests are simple but document the API.
**Gaps**:
- No test for actual lock/unlock operations (checking key matching, state transition)
- `autoLock` is tested as a flag but no behavior
- No test for `acceptsMasterKey` behavior
**Recommendation**: KEEP.

---

### 15. `moveable-scenery.test.ts`

**Path**: `packages/world-model/tests/unit/traits/moveable-scenery.test.ts`
**Test cases**: 17
**What it tests**: MoveableSceneryTrait construction, weight classes, blocking/reveal behavior flags, movement tracking, PushableTrait/PullableTrait integration, multi-person requirements, sound effects, realistic scenarios.
**Quality**: LOW. Despite the rich domain (blocking exits, revealing secrets, multi-person requirements), every test is property storage. "realistic scenarios" (line 297) create elaborate entities but only read properties back. The `moved` flag is set manually at line 138.
**Gaps**:
- No test for actual exit blocking behavior
- No test for reveal triggering when moved
- No test for multi-person requirement enforcement
**Recommendation**: IMPROVE. This trait has significant game logic potential that is untested.

---

### 16. `openable.test.ts`

**Path**: `packages/world-model/tests/unit/traits/openable.test.ts`
**Test cases**: 12
**What it tests**: OpenableTrait construction, startsOpen semantics, state management, entity integration, one-way openable, revealsContents, sound effects, messages.
**Quality**: LOW-MEDIUM. The `startsOpen`/`isOpen` precedence tests (lines 59-72) mirror the lockable pattern and test real initialization logic. Entity integration uses `createTestOpenableContainer` fixture. But state management is just boolean toggling.
**Gaps**:
- No test for actual opening/closing operations through an action
- `canClose: false` is tested as a flag (line 141) but no enforcement
- `revealsContents` is a flag with no test of the reveal behavior
**Recommendation**: KEEP. Serves as baseline for the OpenableTrait API.

---

### 17. `pullable.test.ts`

**Path**: `packages/world-model/tests/unit/traits/pullable.test.ts`
**Test cases**: 15
**What it tests**: PullableTrait construction, pull types, state management, pullCount tracking, entity integration, effects, edge cases.
**Quality**: LOW. "should respect max pulls" (line 109) sets `pullCount = 3` and checks it equals `maxPulls` -- no enforcement logic tested. State management is manual string assignment. Effects are stored strings.
**Gaps**:
- No test for actual pull mechanics or enforcement of maxPulls
- `detachesOnPull` is never tested with actual detachment
- Effects events are stored but never dispatched
**Recommendation**: REDUCE. Keep constructor and entity integration.

---

### 18. `pushable.test.ts`

**Path**: `packages/world-model/tests/unit/traits/pushable.test.ts`
**Test cases**: 16
**What it tests**: PushableTrait construction, push types, state management, pushCount, entity integration, direction handling, effects.
**Quality**: LOW. Nearly identical structure to pullable.test.ts. Same issues: manual property assignment passed off as "state management" and "scenarios".
**Gaps**: Same as pullable -- no actual push mechanics tested.
**Recommendation**: REDUCE. Keep constructor and entity integration.

---

### 19. `readable.test.ts`

**Path**: `packages/world-model/tests/unit/traits/readable.test.ts`
**Test cases**: 20
**What it tests**: ReadableTrait construction, text content, languages, abilities, readable types, multi-page support, state management, entity integration with OpenableTrait.
**Quality**: MEDIUM. The `pageContent` auto-initialization tests (lines 63-87) verify real constructor logic (auto-setting pages count and currentPage). The "should not override currentPage if already set" test (line 78) catches a specific behavior. The OpenableTrait integration (line 340-369) shows a realistic book pattern.
**Gaps**:
- "should preserve data integrity" (line 409-421) explicitly documents that arrays are NOT copied -- this is a bug or design choice that should be noted
- No test for `requiresAbility` enforcement
- Page bounds test (line 398) documents no validation -- should this be a bug?
**Recommendation**: KEEP. Better than average due to constructor logic tests.

---

### 20. `room.test.ts`

**Path**: `packages/world-model/tests/unit/traits/room.test.ts`
**Test cases**: 15
**What it tests**: RoomTrait construction, exits (simple, with doors, blocked, custom), darkness, visit tracking, ambience, regions/tags, entity integration, complex room setups.
**Quality**: MEDIUM. Uses `createTestRoom` fixture for most tests. Exit structures are well-covered. The tests document the room API well. But no actual navigation is tested (going through exits, door checking).
**Gaps**:
- No test for visit tracking during navigation
- No test for darkness affecting visibility
- No test for `initialDescription` being used only on first visit
- No test for blocked exit enforcement
**Recommendation**: KEEP. Good API documentation but needs behavioral tests.

---

### 21. `scenery.test.ts`

**Path**: `packages/world-model/tests/unit/traits/scenery.test.ts`
**Test cases**: 16
**What it tests**: SceneryTrait construction, cantTakeMessage, mentioned property, entity integration with other traits (OpenableTrait, ContainerTrait, ReadableTrait), scenery types, visibility behavior.
**Quality**: LOW-MEDIUM. The trait is inherently simple (two properties). The entity integration tests (line 122-200) showing scenery combined with OpenableTrait and ReadableTrait are useful. The "should preserve object reference" test (line 324-339) verifies that primitives ARE copied (unlike arrays in other traits).
**Gaps**:
- No test that SceneryTrait actually blocks taking
- `mentioned` toggle is tested but not its effect on room descriptions
**Recommendation**: KEEP but note that taking-block behavior is untested at this level.

---

### 22. `supporter.test.ts`

**Path**: `packages/world-model/tests/unit/traits/supporter.test.ts`
**Test cases**: 18
**What it tests**: SupporterTrait construction, capacity management, type restrictions, enterable property, entity integration with SceneryTrait, supporter types, edge cases.
**Quality**: LOW. Pure property tests. No test for actual "put X on Y" behavior. "dynamic supporter states" (line 436) is just reassigning properties. "should preserve array references" (line 371-387) documents a potential bug (shared mutable state).
**Gaps**:
- No test for putting items on a supporter
- No test for capacity enforcement
- No test for type restriction enforcement
- No test for the relationship between SupporterTrait and the putting-on action
**Recommendation**: IMPROVE. Need behavioral tests for on-surface containment.

---

### 23. `switchable.test.ts`

**Path**: `packages/world-model/tests/unit/traits/switchable.test.ts`
**Test cases**: 14
**What it tests**: SwitchableTrait construction, power requirements, auto-off timer initialization, state management, entity integration, messages, sound effects.
**Quality**: MEDIUM. The power-requirement constructor logic (line 81-93) tests a real condition (if requiresPower && !hasPower, then isOn stays false). The auto-off counter initialization (lines 95-113) tests conditional logic. These are actual behaviors.
**Gaps**:
- No test for auto-off countdown behavior (only stores counter)
- No test for switch-on when no power
- No test for `startsOn` semantics (does it set isOn?)
**Recommendation**: KEEP. Constructor logic tests are genuinely useful.

---

### 24. `vehicle-composition.test.ts`

**Path**: `packages/world-model/tests/unit/traits/vehicle-composition.test.ts`
**Test cases**: 12
**What it tests**: VehicleTrait composition with ContainerTrait/SupporterTrait, boat-in-river scenario, elevator between floors, cable tram scenario, vehicle behavior utilities (`isVehicle`, `isActorInVehicle`, `canActorWalkInVehicle`).
**Quality**: EXCELLENT. The best integration test file. Uses `world.moveEntity` to test actual containment: player enters boat, boat moves to river, player is still in boat (line 139-149). Tests elevator transport, tram transport. The utility function tests (line 284-323) verify real behavior with world state.
**Gaps**:
- No test for exiting a vehicle at an invalid location
- No test for vehicle in vehicle (nested)
- No test for items in vehicle moving with it
**Recommendation**: KEEP. This is the other gold standard alongside character-model.

---

### 25. `wearable.test.ts`

**Path**: `packages/world-model/tests/unit/traits/wearable.test.ts`
**Test cases**: 18
**What it tests**: WearableTrait construction, slots, layering, worn state, messages, physical properties, entity integration, layered armor system, jewelry stacking.
**Quality**: LOW-MEDIUM. Mostly property tests. The layering comparison (line 331-347) documents layer ordering but is trivially true. "should preserve array reference for blocksSlots" (line 443-455) documents shared mutable state (same issue as supporter).
**Gaps**:
- No test for actual wearing/removing through actions
- No test for slot conflict detection
- No test for blocksSlots enforcement
- Layer ordering test does not verify any ordering enforcement
**Recommendation**: KEEP as baseline. Needs behavioral tests.

---

## Gap Analysis: What SHOULD Be Tested

### Critical Missing Behavioral Tests

1. **Container capacity enforcement**: No test verifies that `world.moveEntity` respects `maxItems`, `maxWeight`, or `maxVolume`. These constraints are stored but never enforced in any test.

2. **Light source + room darkness**: No test verifies that a lit LightSourceTrait in a dark room makes it visible.

3. **Lockable key matching**: No test verifies that `keyId` actually prevents/allows unlocking.

4. **Openable state affecting containment**: No test verifies that a closed container blocks insertion/removal.

5. **SceneryTrait blocking take**: No test at the trait level verifies that SceneryTrait prevents the taking action.

6. **SupporterTrait vs ContainerTrait**: No test verifies the behavioral difference between putting something ON (supporter) vs IN (container).

7. **Exit traversal**: No test verifies that exits actually allow movement between rooms.

8. **WearableTrait slot conflicts**: No test verifies that `blocksSlots` prevents wearing conflicting items.

### Shared Mutable State Bug/Design Issue

Multiple tests document that array/object properties are stored by reference, not copied:
- `supporter.test.ts` line 371-387 (allowedTypes/excludedTypes)
- `wearable.test.ts` line 443-455 (blocksSlots)
- `readable.test.ts` line 409-421 (pageContent)
- `actor.test.ts` line 393-411 (customProperties object)

This is either a deliberate design choice or a bug. If deliberate, it should be documented in trait constructors. If a bug, defensive copying should be added.

### Structural Pattern Missing

No trait test verifies serialization/deserialization. If traits are saved to game state, round-trip testing would catch issues.

---

## Removal Candidates

None of these files should be fully removed, but significant sections could be trimmed:

### Files with 50%+ Redundant Tests

| File | Current Cases | Could Reduce To | Reason |
|------|--------------|-----------------|--------|
| `breakable.test.ts` | 10 | 4 | "usage scenarios" duplicates "breaking state" and "entity integration" |
| `button.test.ts` | 17 | 8 | Size/shape/material/color enumeration is pure property storage |
| `edible.test.ts` | 22 | 10 | Thematic variations (poisoned food, magical food) just store different strings |
| `light-source.test.ts` | 19 | 8 | "Complex scenarios" are property assignments with narrative comments |
| `pullable.test.ts` | 15 | 6 | Pull type configurations are redundant property tests |
| `pushable.test.ts` | 16 | 6 | Near-identical structure to pullable |

### Specific Redundant Tests

- `breakable.test.ts`: "should create trait with broken state false" (line 24) duplicates "should create trait with default values" (line 17)
- `breakable.test.ts`: "should distinguish between broken and unbroken items" (line 143) duplicates "should work with multiple breakable objects" (line 84)
- `button.test.ts`: "should handle complex button configurations" (line 247) duplicates "should create trait with provided data" (line 31)
- `attached.test.ts`: "should have appropriate sounds for attachment types" (line 239) tests no behavior; it just stores arbitrary strings and reads them back
- `light-source.test.ts`: "should handle flame-based sources" (line 280), "should handle electric sources" (line 304), "should handle magical sources" (line 322) are thematic restatements of constructor tests

---

## Recommendations

### Priority 1: Add Behavioral Tests
- Add tests that verify `world.moveEntity` interacts with container capacity
- Add tests that verify door open/closed state affects room traversal
- Add tests for vehicle-style entity movement patterns (use vehicle-composition.test.ts as template)

### Priority 2: Reduce Noise
- Remove enumeration tests that just verify `trait.color === 'red'` type assignments
- Consolidate "various X types" tests that iterate over arrays of strings into single parameterized tests
- Remove "complex scenario" tests that are just property assignment with narrative comments

### Priority 3: Document Design Decisions
- The shared mutable reference issue should be resolved or explicitly documented
- TraitType.BREAKABLE uses string literal `'breakable'` at line 21 instead of `TraitType.BREAKABLE` -- inconsistent with other tests

### Priority 4: Test Pattern Standardization
- All trait tests should include at least one behavioral test (not just property storage)
- Use character-model.test.ts and vehicle-composition.test.ts as templates for the pattern
