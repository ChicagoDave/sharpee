# World-Model (Non-Trait) & Story Tests Review

**Date**: 2026-04-06
**Reviewer**: Claude Opus 4.6 (1M context)
**Scope**: All non-trait unit tests in world-model plus story tests (~37 files)

## Summary

| Metric | Count |
|--------|-------|
| Files reviewed | 37 |
| Total test cases | ~380 |
| Quality: Excellent | 10 files |
| Quality: Good | 15 files |
| Quality: Fair | 8 files |
| Quality: Poor | 4 files |
| Removal candidates | 3 files |
| Skipped tests (`.skip`) | ~10 individual tests |

**Overall Assessment**: The test suite is solid in the core areas (WorldModel, VisibilityBehavior, SpatialIndex, capability dispatch, event chaining, annotations). The behavior tests (attack, breakable, combat, destructible, weapon) are well-structured and test actual mutations. The integration tests are thorough for container/visibility/trait combination scenarios but several test property-setting rather than behavior (door-mechanics, parts of room-actor-containers). The scope tests are ambitious but 4 of 11 tests are skipped, and the architecture is questionable (tests embed complex scope rules inline). There are 3 files that are debug/exploration artifacts and should be removed. Two duplicate AuthorModel test files exist.

---

## Behavior Tests

### `packages/world-model/tests/unit/behaviors/attack.test.ts`
- **Test cases**: 12
- **What it tests**: `AttackBehavior.attack()` for breakable, destructible, combatant, and non-special entities. Priority resolution when multiple traits present.
- **Quality**: Good. Tests actual state mutations (breakableTrait.broken, destructibleTrait.hitPoints, combatantTrait.health). Uses `Math.random` mocking for damage calculation. Assertions check both return values and entity state.
- **Gaps**: No test for attacking with wrong weapon when weapon IS provided but `requiresWeapon: false`. No test for attacking a dead combatant (tested in combat.test.ts but not via AttackBehavior).
- **Issues**: Mock world is comprehensive but never asserts on `world.moveEntity` calls for inventory drops (line 88-89 in combat.test does this properly).
- **Recommendation**: Keep. Add a test for combatant priority over destructible.

### `packages/world-model/tests/unit/behaviors/behavior.test.ts`
- **Test cases**: 10
- **What it tests**: Base `Behavior` class: trait validation, `require`/`optional` helpers, missing traits, inheritance, error messages.
- **Quality**: Excellent. Tests real behavior patterns including inheritance. Validates both success and error paths. Error message assertions are specific.
- **Gaps**: No test for behavior with multiple missing traits (only tests one at a time via `performAction`).
- **Issues**: Line 198 test (`static nature`) tests that Behavior can be instantiated, which is a trivially-true test for any class. Low value.
- **Recommendation**: Keep as-is. Core infrastructure test.

### `packages/world-model/tests/unit/behaviors/breakable.test.ts`
- **Test cases**: 9
- **What it tests**: `BreakableBehavior` - `canBreak`, `break`, `isBroken` methods.
- **Quality**: Good. Verifies actual trait mutation (line 57-58: `breakableTrait.broken` changes to `true`). Tests boundary conditions (already broken, non-breakable).
- **Gaps**: None significant for current scope.
- **Issues**: Lines 61-66 test that debris is NOT created — these are negative tests documenting that story handles debris. Useful documentation.
- **Recommendation**: Keep.

### `packages/world-model/tests/unit/behaviors/combat.test.ts`
- **Test cases**: 13
- **What it tests**: `CombatBehavior` - attack (damage calc, armor, killing, inventory drops), heal, resurrect, isAlive.
- **Quality**: Excellent. Tests actual state mutations on CombatantTrait (health, isAlive). Verifies `world.moveEntity` is called for inventory drops (line 88-89). Tests cap healing at max, dead entity rejection. Damage formula (10 - 2 armor = 8) is explicit.
- **Gaps**: No test for negative damage values. No test for zero maxHealth combatant.
- **Issues**: None.
- **Recommendation**: Keep. Best behavior test file.

### `packages/world-model/tests/unit/behaviors/destructible.test.ts`
- **Test cases**: 10
- **What it tests**: `DestructibleBehavior` - `canDamage`, `damage`, `isDestroyed`.
- **Quality**: Good. Tests damage reduction, destruction (HP=0), transformation entity creation, exit revelation, overkill, weapon type requirements.
- **Gaps**: No test for armor reducing damage on destructible entities (only combatants have armor in these tests).
- **Issues**: Line 99 asserts `world.removeEntity` is called but doesn't verify the entity is actually gone. Line 106 asserts `createEntity` called with specific args but doesn't test what happens to the created entity. These are mock-based assertions, not state assertions.
- **Recommendation**: Keep. Consider adding a test with real WorldModel instead of mocks.

### `packages/world-model/tests/unit/behaviors/weapon.test.ts`
- **Test cases**: 11
- **What it tests**: `WeaponBehavior` - `calculateDamage`, `canDamage`, `isBroken`.
- **Quality**: Good. Line 22: iterates 20 times to verify damage range — probabilistic but effective. Tests fixed-damage weapons, ghost/spirit immunity, broken weapons, durability.
- **Gaps**: No test for critical hits (line 25 mentions "Could be critical hit (2x)" but never asserts one occurred). The 20-iteration loop could miss critical hit verification.
- **Issues**: Line 25: `expect(result.damage).toBeLessThanOrEqual(20)` — comment says "Could be critical hit (2x)" but the assertion allows it. If critical hits are removed, this test still passes. Weak assertion.
- **Recommendation**: Keep. Mock `Math.random` to specifically test critical hit path.

---

## Scope Tests

### `packages/world-model/tests/scope/darkness-light.test.ts`
- **Test cases**: 7 (1 skipped)
- **What it tests**: Darkness/light source interactions with scope rules. Custom unified visibility rule handles dark rooms, carried light sources, room light sources.
- **Quality**: Good. Tests actual WorldModel visibility. Verifies items hidden in dark, visible with lit lantern, light source on/off behavior, room vs carried light, underground darkness.
- **Gaps**: No test for multiple players/actors with different light sources in same dark room.
- **Issues**: Line 194-195: Debug `console.log` statements left in test. Lines 86-155: the `unifiedVisibilityRule` is a complex inline function that duplicates what should be engine behavior. If the engine's real visibility changes, these tests won't catch regressions because they use a custom rule.
- **Recommendation**: Keep but remove console.log statements. Consider if these tests should use the engine's real visibility rules instead of custom ones.

### `packages/world-model/tests/scope/magic-sight.test.ts`
- **Test cases**: 7 (3 skipped)
- **What it tests**: Magical vision abilities: true sight, x-ray vision, detect magic, clairvoyance, crystal orb scrying, power-level-limited sight.
- **Quality**: Fair. The 3 active tests work well via `evaluateScope()`. But 3 tests are skipped with "SKIPPED: Magic sight should affect scope, not physical visibility." This means nearly half the file is dead code.
- **Gaps**: The skipped tests represent intended functionality that was never properly implemented.
- **Issues**: Skipped tests at lines 150, 193, 291, 382 document architectural disagreements. The `basicVisibilityRule` (lines 98-147) is extremely complex inline code.
- **Recommendation**: Keep active tests. Remove skipped tests or convert them to design documentation. The inline scope rules make these fragile.

### `packages/world-model/tests/scope/sound-traveling.test.ts`
- **Test cases**: 6
- **What it tests**: Sound propagation: adjacent room sounds, loud sound distance, soundproof barriers, directional sound, combined sound rules, action-specific filtering.
- **Quality**: Good. All tests pass. Tests realistic IF scenarios (hearing through walls, soundproofing). Uses `evaluateScope()` correctly with action-specific rules.
- **Gaps**: No test for sound through doors (open vs closed).
- **Issues**: Complex inline scope rules (same pattern as other scope tests). Tests are really testing the scope rule engine, not sound-specific behavior.
- **Recommendation**: Keep. These effectively test the scope rule engine's action-filtering feature.

### `packages/world-model/tests/scope/window-visibility-fixed.test.ts`
- **Test cases**: 6 (3 skipped)
- **What it tests**: Cross-location visibility through windows. Uses proper traits (OpenableTrait, SupporterTrait, etc.).
- **Quality**: Fair. Half the tests are skipped with "SKIPPED: Cross-room visibility violates architecture." Active tests cover action-specific visibility, dynamic entity inclusion, one-way visibility.
- **Gaps**: The core window-visibility scenario is skipped.
- **Issues**: This is a "fixed" version of window-visibility.test.ts. Having both files is confusing. The skipped tests indicate the feature was designed but found architecturally unsound.
- **Recommendation**: Improve. Merge active tests from this file and window-visibility.test.ts into one file. Remove skipped tests.

### `packages/world-model/tests/scope/window-visibility.test.ts`
- **Test cases**: 7 (3 skipped)
- **What it tests**: Same window visibility scenarios but uses `window.attributes.open` instead of OpenableTrait. Original version before the "fixed" version.
- **Quality**: Poor. 3 tests skipped. Uses raw attributes instead of traits (line 32: `window.attributes.openable = true`). Console.log debugging left in (lines 47-48). The setup has known issues (line 51: "SKIPPED: Test setup issue").
- **Gaps**: Same as window-visibility-fixed.test.ts.
- **Issues**: Duplicate of window-visibility-fixed.test.ts. Uses deprecated attribute-based approach. Debug console.log at lines 47-48.
- **Recommendation**: **Remove**. This is superseded by window-visibility-fixed.test.ts. The active tests (action-specific visibility, dynamic entity inclusion, scope rule removal, rule priorities) are duplicated in the fixed version.

---

## Integration Tests

### `packages/world-model/tests/integration/container-hierarchies.test.ts`
- **Test cases**: 11
- **What it tests**: Deep nesting, circular containment prevention, weight calculation, capacity limits, mixed container types (supporter+container), container state changes (moving with contents, open/close visibility), query operations, performance.
- **Quality**: Excellent. Tests actual WorldModel state: `getLocation`, `getAllContents`, `getContainingRoom`, `wouldCreateLoop`, `getTotalWeight`. Verifies real mutations (opening/closing cabinet affects visibility). Performance tests with 100 containers x 10 items are practical.
- **Gaps**: Line 76-86: Max nesting depth test has a conditional (`if (!canMove)` / `else`) that means it passes regardless of the actual behavior. This is a weak test.
- **Issues**: Line 162-163: documents that capacity limits are NOT enforced (`expect(world.getContents(smallBox.id)).toHaveLength(4); // Currently no limit enforced`). This is documentation, not a real test.
- **Recommendation**: Keep. Fix the max depth test to assert a specific expected behavior.

### `packages/world-model/tests/integration/door-mechanics.test.ts`
- **Test cases**: 14
- **What it tests**: Door creation, state synchronization, lockable doors, secret doors, one-way doors, auto-closing doors, visibility through doors, multi-door connections, double doors, usage tracking, puzzle doors, performance.
- **Quality**: Fair. Many tests only verify property-setting rather than behavior. Lines 113-125 ("should prevent opening locked doors"): the test just checks that `isLocked` is true and `isOpen` is false — it doesn't actually try to open the door or verify prevention. Lines 206-226 ("one-way doors"): just sets properties, doesn't test that the one-way constraint is enforced. Lines 229-261 ("auto-closing doors"): just sets `autoClose = true`, doesn't test auto-closing.
- **Gaps**: No test actually exercises door opening/closing prevention when locked. No test verifies that going through a one-way door is blocked. These are property-documentation tests, not behavior tests.
- **Issues**: `findPath` is used but the underlying algorithm isn't well-tested here. Performance test at line 451 is good. Using `DoorTrait & { autoClose: boolean }` type assertions (lines 239-240) suggests these properties don't exist on the real type.
- **Recommendation**: Improve. Convert property-documentation tests to actual behavior tests.

### `packages/world-model/tests/integration/room-actor-containers.test.ts`
- **Test cases**: 8
- **What it tests**: Rooms as containers (items in rooms without ContainerTrait), room capacity, nested containers in rooms, actors carrying items, actor inventory limits, preventing actors inside actors, container type detection.
- **Quality**: Fair. Core containment tests (lines 40-48, 122-131) verify real `moveEntity`/`getLocation`/`getContents`. But several tests only document unimplemented features: line 60 ("respect room capacity limits") just checks the trait property exists. Line 143-153 ("actor inventory limits") just checks trait properties. Line 155-177 ("prevent actors in actors") just checks `excludedTypes` exists.
- **Gaps**: The capacity/limit enforcement tests document aspirational behavior but don't test it.
- **Issues**: File header says "No need to import - Jest provides these globally" but uses vitest. Minor.
- **Recommendation**: Keep. Mark aspirational tests with comments indicating they document future behavior.

### `packages/world-model/tests/integration/trait-combinations.test.ts`
- **Test cases**: 12
- **What it tests**: Complex trait interactions: Container+Openable+Lockable, Supporter+Container+Scenery, Actor+Wearable+Container, Door+Room+LightSource, Edible+Container+Actor, Readable in locked container on supporter, Switchable light sources.
- **Quality**: Good. Tests real WorldModel visibility (`getVisible`, `canSee`), containment (`getAllContents`), and trait queries (`findByTrait`). Uses AuthorModel correctly for setup of closed/locked containers. Nested locked container test (lines 92-113) is excellent.
- **Gaps**: Line 435 ("handle consuming items from container"): uses `(edible as any).isConsumed = true` — this is property-setting, not behavior testing.
- **Issues**: Some `as` type assertions (e.g., line 435) suggest testing properties that don't exist on the real type.
- **Recommendation**: Keep. Good integration coverage.

### `packages/world-model/tests/integration/visibility-chains.test.ts`
- **Test cases**: 16
- **What it tests**: Comprehensive visibility: open/closed containers, mixed container chains, supporter visibility, dark rooms with light sources (carried, room-based, in containers), actor visibility (carried items, worn items, closed containers), scenery visibility, deep chains, multiple blockers, movement-based visibility changes, scope vs visibility, performance.
- **Quality**: Excellent. This is the most thorough visibility test file. Tests actual `getVisible`, `canSee`, `getInScope` on real WorldModel. The "handle light in containers" test (lines 167-191) verifies that closing a box containing a lit lantern blocks light — a subtle edge case. Performance test creates 50 containers with 5 items each.
- **Gaps**: Line 467-494 ("should cache visibility calculations"): the caching assertion is commented out (`// Note: Current implementation may not cache`). This is aspirational.
- **Issues**: None significant.
- **Recommendation**: Keep. Reference-quality integration tests.

### `packages/world-model/tests/integration/wearable-clothing.test.ts`
- **Test cases**: 16 (1 skipped)
- **What it tests**: Wearable behavior (wear/remove), clothing with pockets, pocket contents persistence when wearing, layered clothing, clothing+accessories mixing, nested pocket hierarchies, slot blocking, non-removable items, clothing condition tracking, performance.
- **Quality**: Good. Tests actual `WearableBehavior.wear()` and `WearableBehavior.remove()` with state assertions. Pocket hierarchy tests verify `getAllContents` with `includeWorn`. Performance tests are practical.
- **Gaps**: Line 162 skipped test ("items in pockets visibility") is a real gap in coverage.
- **Issues**: Line 376-379 ("non-removable clothing"): just checks `canRemove` is false but doesn't call `WearableBehavior.remove()` to verify it fails. Should test the behavior.
- **Recommendation**: Keep. Fix the non-removable test to actually exercise `WearableBehavior.remove()`.

---

## Other Unit Tests

### `packages/world-model/tests/annotations.test.ts`
- **Test cases**: 14
- **What it tests**: Entity annotations (ADR-124): add/retrieve by kind, multiple annotations, removal, hasAnnotations, conditional annotations (self/player/location trait conditions), clone independence, JSON serialization round-trip.
- **Quality**: Excellent. Thorough coverage of the annotation API. Tests real mutation and state: `annotate()`, `getAnnotations()`, `removeAnnotation()`, `getActiveAnnotations()` with world-state-based conditions. Clone independence test (line 231) verifies deep copy. JSON round-trip (line 237) tests persistence.
- **Gaps**: No test for annotation ordering when multiple annotations of same kind exist.
- **Issues**: None.
- **Recommendation**: Keep. Well-structured feature test.

### `packages/world-model/tests/debug-worn-visibility.test.ts`
- **Test cases**: 1
- **What it tests**: Debug test that a worn crown on an NPC is visible to the player.
- **Quality**: Poor. This is a debugging artifact. The exact same scenario is tested in `visibility-chains.test.ts` line 210 ("should see worn items on actors").
- **Gaps**: N/A — the test is redundant.
- **Issues**: File name starts with "debug-" indicating it was created for debugging. Comment says "Debug test for worn item visibility."
- **Recommendation**: **Remove**. Exact duplicate of visibility-chains.test.ts.

### `packages/world-model/tests/minimal-visibility.test.ts`
- **Test cases**: 1
- **What it tests**: Basic smoke test that items in the same room are visible.
- **Quality**: Poor. Single trivial test with console.log (line 30). Uses `.some(e => e.id === item.id)` instead of `.toContain()`. This scenario is covered by dozens of other tests.
- **Gaps**: N/A.
- **Issues**: Console.log debugging left in. Trivial test duplicated many times elsewhere.
- **Recommendation**: **Remove**. Purely a debugging artifact.

### `packages/world-model/tests/unit/author-model.test.ts`
- **Test cases**: 20
- **What it tests**: AuthorModel: shared data store, unrestricted movement (into closed/locked containers, bypassing container traits, ignoring loops), event recording, convenience methods (populate, connect, fillContainer, setupContainer), entity management, state management, real-world usage pattern.
- **Quality**: Excellent. Tests actual state via WorldModel after AuthorModel operations. Verifies that WorldModel.moveEntity FAILS for closed containers (line 65-66) while AuthorModel succeeds. Tests loop creation (lines 93-104). Event recording with `author:` prefix (lines 146-153).
- **Gaps**: None significant.
- **Issues**: This is DUPLICATED by `packages/world-model/tests/unit/world/author-model.test.ts`. See below.
- **Recommendation**: Keep this one. Remove the duplicate.

### `packages/world-model/tests/unit/world/author-model.test.ts`
- **Test cases**: 18
- **What it tests**: Same AuthorModel functionality as the file above but with slightly different organization and fewer tests.
- **Quality**: Good. Overlaps significantly with `tests/unit/author-model.test.ts`. Has one unique test not in the other: "Scope and Visibility Integration" (line 257-288) which verifies items in closed containers are in scope but not visible.
- **Gaps**: N/A.
- **Issues**: **Duplicate file.** Two AuthorModel test files exist in different directories. The `unit/world/` version has one unique scope/visibility integration test.
- **Recommendation**: Improve. Merge the unique scope test into `tests/unit/author-model.test.ts` and remove this file.

### `packages/world-model/tests/unit/capabilities/capability-dispatch.test.ts`
- **Test cases**: 20
- **What it tests**: Capability dispatch system (ADR-090): finding traits with capabilities, has/get capability helpers, capability registry (register/get/unregister/clear), 4-phase behavior execution (validate/execute/report/blocked), EntityBuilder with conflict detection, createEffect helper.
- **Quality**: Excellent. Tests actual mutations (line 293: `trait.position` changes from 'up' to 'down'). Validates error paths (duplicate registration throws, capability conflicts throw). Tests both the query helpers and the registry/behavior execution. EntityBuilder conflict detection (line 333-339) is critical safety test.
- **Gaps**: No test for behavior execution when trait is not found on entity. No test for multiple traits claiming different capabilities on same entity.
- **Issues**: None.
- **Recommendation**: Keep. Critical infrastructure test.

### `packages/world-model/tests/unit/direction-vocabulary.test.ts`
- **Test cases**: 26
- **What it tests**: DirectionVocabularyRegistry (ADR-143): initialization, vocabulary switching, display names for compass/naval/minimal, rename/alias (custom vocabulary creation), define custom vocabularies, change listeners, pre-defined vocabulary validation (compass=12 dirs, naval=no diagonals, minimal=4 dirs).
- **Quality**: Excellent. Thorough coverage. Tests immutability (rename doesn't mutate original, line 108-110). Tests listener notification for all mutation operations. Validates vocabulary structure.
- **Gaps**: No test for removing a change listener.
- **Issues**: None.
- **Recommendation**: Keep.

### `packages/world-model/tests/unit/entities/entity-store.test.ts`
- **Test cases**: 15
- **What it tests**: EntityStore: add/get/remove/clear, querying by type/trait/allTraits/anyTraits, iteration, serialization, size tracking, edge cases (duplicate add, removing non-existent, empty store).
- **Quality**: Excellent. Tests actual data structure operations. Verifies that `remove` clears traits (line 37-41). Serialization round-trip (lines 172-198). Edge cases are well-covered.
- **Gaps**: No test for concurrent modification during iteration.
- **Issues**: None.
- **Recommendation**: Keep.

### `packages/world-model/tests/unit/entities/if-entity.test.ts`
- **Test cases**: 21
- **What it tests**: IFEntity: constructor, trait CRUD (add/remove/has/hasAll/hasAny/getTraits/getTraitTypes/clearTraits), convenience properties (isRoom, canContain, isTakeable, name resolution, weight), cloning (deep copy), serialization, openable/lockable/lightSource/switchable/actor properties, error handling.
- **Quality**: Excellent. Tests actual entity behavior. Name resolution priority chain (lines 173-196) is thorough. Clone independence verified (line 221-223). Duplicate trait warning tested (lines 69-88).
- **Gaps**: No test for `fromJSON` with malformed data.
- **Issues**: None.
- **Recommendation**: Keep. Core entity test.

### `packages/world-model/tests/unit/entity-system-updates.test.ts`
- **Test cases**: 9
- **What it tests**: Entity system with ID refactoring: entity type storage, name handling, serialization with version numbers, old/new format deserialization, trait ID references (room exits, door connections, exit traits), persistence with save/restore.
- **Quality**: Good. Tests actual persistence round-trip. ID format inference from prefix (line 87: `d01` inferred as 'door'). Trait ID references verified after save/restore.
- **Gaps**: No test for what happens when loading a save with ID conflicts.
- **Issues**: None.
- **Recommendation**: Keep. Important migration/persistence test.

### `packages/world-model/tests/unit/id-generation.test.ts`
- **Test cases**: 8
- **What it tests**: ID generation: sequential type-prefixed IDs, unknown type rejection, default type, base36 conversion, name storage, duplicate names, removal, persistence of ID counters.
- **Quality**: Good. Tests base36 rollover (line 38-44: creating 35 items, then item36 gets ID `i10`). Persistence test (line 80-98) verifies counters survive save/load.
- **Gaps**: Overlaps with world-model.test.ts entity management tests. No test for what happens after `clear()` — do counters reset?
- **Issues**: Minor overlap with other files.
- **Recommendation**: Keep. Focused ID system test.

### `packages/world-model/tests/unit/parsed-command.test.ts`
- **Test cases**: 16
- **What it tests**: ParsedCommand type structures: Token, VerbPhrase, NounPhrase, PrepPhrase, ParsedCommand, ParseError, backward compatibility (ParsedCommandV1), PartOfSpeech enum validation, language-agnostic design.
- **Quality**: Fair. These are primarily **type-structure tests** — they create objects conforming to interfaces and check that the properties exist. No actual parsing behavior is tested. Lines 461-487 test that the PartOfSpeech enum has specific values — this can never fail unless someone changes the enum (which would break compilation anyway).
- **Gaps**: No parsing behavior tested. These are really interface documentation.
- **Issues**: Every test just creates an object literal and asserts its properties exist. Example (line 38-45): creates a Token, asserts `token.word === 'take'`. This can never fail because the test creates the value it asserts. Lines 491-580 ("Language-agnostic design") test that a ParsedCommand doesn't have properties that were never defined — always passes.
- **Recommendation**: Keep but acknowledge these are type documentation, not behavior tests. They have value as compile-time checks (ensuring the types still work as expected) but zero runtime-failure risk.

### `packages/world-model/tests/unit/visibility/container-state-visibility.test.ts`
- **Test cases**: 5
- **What it tests**: Container state change effects on visibility: closed cabinet hides medicine, opening reveals it, multiple state changes, canSee integration, scope includes items regardless of cabinet state.
- **Quality**: Good. Tests actual WorldModel visibility after state changes. Uses `VisibilityBehavior.canSee()` directly (line 93). Verifies scope includes items in closed containers (line 106).
- **Gaps**: None — focused test.
- **Issues**: Overlaps with visibility-chains.test.ts and trait-combinations.test.ts. But this is a focused, well-named test for a specific concern.
- **Recommendation**: Keep.

### `packages/world-model/tests/unit/world/event-chaining.test.ts`
- **Test cases**: 22
- **What it tests**: Event chaining (ADR-094): basic chain registration, handler invocation, null/undefined returns, multiple events, cascade mode, override mode, keyed chains (replace/coexist), priority ordering, chain metadata (_chainedFrom, _chainSourceId, _chainDepth, _transactionId), depth limits, registration before/after connectEventProcessor, world.clear() clears chains, event enrichment (auto-generate id/timestamp), world state access in handlers.
- **Quality**: Excellent. Extremely thorough coverage of event chaining. Tests actual behavior with mock wiring. Priority ordering (line 218-243) verifies execution order. Depth limit (line 337-351) prevents infinite loops. Metadata propagation tests (lines 247-333) are critical for debugging in production.
- **Gaps**: No test for error handling when a chain handler throws.
- **Issues**: None.
- **Recommendation**: Keep. Reference-quality ADR test.

### `packages/world-model/tests/unit/world/get-in-scope.test.ts`
- **Test cases**: 9 (1 skipped)
- **What it tests**: `WorldModel.getInScope()`: room inclusion, items in room, items in containers, carried items, items in carried containers, self-inclusion, empty room, no-room observer, uniqueness.
- **Quality**: Good. Tests real WorldModel. The skipped test (line 58, "deeply nested items") documents a known limitation.
- **Gaps**: Skipped test for deep nesting is a real gap.
- **Issues**: Debug console.log in skipped test (lines 70-73).
- **Recommendation**: Keep.

### `packages/world-model/tests/unit/world/spatial-index.test.ts`
- **Test cases**: 23
- **What it tests**: SpatialIndex: add/remove child, move child, multiple children, getAllDescendants (with depth limit, circular references, deep hierarchies), getAncestors, persistence (toJSON/loadJSON), edge cases (duplicate add, wrong parent remove, self-parenting, consistency during moves).
- **Quality**: Excellent. Core data structure test. Circular reference handling (line 165-172) prevents infinite loops. Persistence round-trip (lines 246-264). Edge case at line 299-306 documents an inconsistency (removing child from wrong parent leaves stale data in parent's children list) — this is a real bug caught by the test.
- **Gaps**: None significant.
- **Issues**: Line 299-306: The test documents a bug — `removeChild('parent-2', 'child-1')` removes from childToParent but not from parent-1's children list. This inconsistency should be filed as a bug.
- **Recommendation**: Keep. The edge case tests are valuable.

### `packages/world-model/tests/unit/world/verify-move-issue.test.ts`
- **Test cases**: 1
- **What it tests**: Verifies that WorldModel.moveEntity rejects moving items into closed containers.
- **Quality**: Poor. The test has **no assertions** — it calls `moveEntity` twice but never checks the return value or the resulting state. Lines 24 and 30: `const moved = world.moveEntity(...)` is assigned but never asserted.
- **Gaps**: The entire point of the test (verification) is missing.
- **Issues**: No assertions at all. This test can never fail. It was clearly a debugging artifact that was never completed.
- **Recommendation**: **Remove**. The same behavior is properly tested in `author-model.test.ts` (line 60-66) with actual assertions.

### `packages/world-model/tests/unit/world/visibility-behavior.test.ts`
- **Test cases**: 34
- **What it tests**: VisibilityBehavior: canSee (same room, different room, self, invisible entities, transparent/opaque/open/closed containers, nested containers), dark rooms (no light, lit light sources, carried lamp, light in closed container, room lighting toggle), getVisible (all visible, carried items, empty room, no room), isVisible (uncontained, invisible scenery, transparent/opaque containers), isDark (10 light scenarios from ADR-068: no light, carried torch, floor lamp, candle in open/closed box, switchable flashlight on/off, glowing gem, worn headlamp, NPC lantern, adjacent room light, transparent container light, isLit precedence over switchable).
- **Quality**: Excellent. The most thorough visibility test. The `isDark` section (lines 505-700) systematically tests all 10 ADR-068 scenarios plus edge cases. Tests actual WorldModel behavior, not mocks. Container transparency vs openability interactions are well-covered.
- **Gaps**: No test for visibility of entities on supporters in dark rooms.
- **Issues**: None.
- **Recommendation**: Keep. This is the canonical visibility test.

### `packages/world-model/tests/unit/world/world-model.test.ts`
- **Test cases**: 38
- **What it tests**: WorldModel: initialization, entity management (create, get, remove, update, strict mode), spatial management (location, contents, move, containment loops, containing room, recursive contents, max depth), world state management, query operations (findByTrait, findByType, findWhere), visibility and scope, relationships (add, get, remove, multiple types, strict mode), utility methods (total weight, loop detection, path finding, player), persistence (serialize, deserialize, old save format, clear), event sourcing (handlers, validators, previewers, history, since-timestamp, clear history, unregister), edge cases.
- **Quality**: Excellent. Comprehensive WorldModel API test. Tests strict mode behavior (line 141-149: throws for non-existent entity). ID overflow test (line 169-179). Persistence with old save format (lines 661-702) is a valuable migration test. Event sourcing section (lines 719-893) tests the full event lifecycle.
- **Gaps**: No test for concurrent event handlers. No test for what happens when a handler modifies the world during event application.
- **Issues**: Minor: line 583-589 path finding test is weak (returns empty path for both cases).
- **Recommendation**: Keep. Core API test file.

---

## Story Tests

### `stories/cloak-of-darkness/tests/cloak-of-darkness.test.ts`
- **Test cases**: 9
- **What it tests**: Cloak of Darkness story: world setup (rooms, objects, player placement), darkness mechanics (carrying cloak makes bar dark, removing cloak makes bar visible), message state (not readable in dark, readable with light, disturbance tracking), completion condition, custom actions (HANG, READ).
- **Quality**: Good. Tests actual WorldModel state through story initialization. Darkness mechanics (lines 64-99) verify real `getVisible()` results. Message readability tests (lines 106-184) exercise the story's core mechanic.
- **Gaps**: No test for the disturbance threshold (what happens after too many disturbances). No test for hanging the cloak on the hook via the HANG action.
- **Issues**: Line 159-180: accesses private methods via `story['disturbances']` and `story['isBarDark']()`. This couples tests to implementation. Line 76: console.log left in.
- **Recommendation**: Keep. Consider testing through the public Story API rather than private internals.

### `stories/dungeo/src/npcs/troll/troll-receiving-behavior.test.ts`
- **Test cases**: 8
- **What it tests**: Troll receiving behavior: validation (always passes), execute for knife (moved to room floor), execute for stiletto (also a knife, moved to room floor), execute for non-knife (item destroyed/eaten), report for give-knife, report for give-non-knife, report for throw-knife, report for throw-non-knife.
- **Quality**: Excellent. Tests actual world state mutations: line 67 `expect(world.getLocation(knife.id)).toBe(room.id)` (knife moved to floor), line 98 `expect(world.getEntity(apple.id)).toBeUndefined()` (apple destroyed). Report tests verify correct message IDs for all give/throw x knife/non-knife combinations. Uses real WorldModel, not mocks.
- **Gaps**: No test for receiving the troll's own axe. No test for receiving when troll is dead.
- **Issues**: None.
- **Recommendation**: Keep. Exemplary story behavior test — follows the mutation verification pattern from the project standards.

---

## Gaps: What SHOULD Be Tested But Isn't

1. **WorldModel.moveEntity rejection reasons**: Tests verify `moveEntity` returns false but never test WHY (no diagnostic message testing).
2. **SpatialIndex.removeChild inconsistency**: The `removeChild('wrong-parent', 'child')` edge case (spatial-index.test.ts line 299) documents a bug where the child is removed from childToParent but the parent's children list is stale.
3. **Scope rules with real engine rules**: All scope tests use custom inline rules. No tests verify the engine's default scope rules work correctly.
4. **Event handler error recovery**: No tests for what happens when an event handler throws during `applyEvent()` or when a chain handler throws.
5. **ID generation after clear()**: No test verifies whether ID counters reset or continue after `world.clear()`.
6. **Capacity enforcement**: Multiple tests document that container capacity limits are NOT enforced (container-hierarchies line 162, room-actor-containers line 60). This is a known gap in the world model.
7. **Concurrent modification**: No tests for modifying entities during iteration (e.g., removing entities while iterating `getAllEntities()`).
8. **WorldModel config options**: `maxDepth` and `strictMode` are tested minimally but `enableSpatialIndex` is never tested as `false`.

## Removal Candidates

| File | Reason | Confidence |
|------|--------|------------|
| `tests/scope/window-visibility.test.ts` | Superseded by `window-visibility-fixed.test.ts`. Uses deprecated attribute approach. 3 tests skipped. Debug console.log. Active tests duplicated in fixed version. | High |
| `tests/debug-worn-visibility.test.ts` | Single debug test. Exact duplicate of visibility-chains.test.ts line 210. File name indicates debug artifact. | High |
| `tests/minimal-visibility.test.ts` | Single trivial smoke test. Console.log left in. Covered by dozens of other visibility tests. | High |
| `tests/unit/world/verify-move-issue.test.ts` | **Zero assertions.** Test can never fail. Same behavior properly tested elsewhere. | High |
| `tests/unit/world/author-model.test.ts` | Duplicate of `tests/unit/author-model.test.ts`. Has one unique test (scope/visibility) that should be merged into the other file first. | Medium |

## Files With console.log That Should Be Cleaned

- `tests/scope/darkness-light.test.ts` (lines 194-196)
- `tests/scope/window-visibility.test.ts` (lines 47-48, 59)
- `tests/minimal-visibility.test.ts` (line 30)
- `stories/cloak-of-darkness/tests/cloak-of-darkness.test.ts` (line 76)
- `tests/unit/world/get-in-scope.test.ts` (lines 70-73, in skipped test)
