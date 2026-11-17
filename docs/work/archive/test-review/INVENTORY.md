# Complete Test Inventory

**Generated**: 2026-04-06
**Source**: SQLite DB at docs/work/test-review/tests.db
**Total tests**: 3,164 across 9 packages

## Dashboard

| Metric | Count | % |
|--------|-------|---|
| pass | 3066 | 96% |
| fail | 16 | 0% |
| skipped | 82 | 2% |
| **Total** | **3164** | |

| Type | Count | % |
|------|-------|---|
| functional | 2059 | 65% |
| structural | 796 | 25% |
| behavioral | 308 | 9% |
| tautological | 1 | 0% |

| Quality | Count | % |
|---------|-------|---|
| good | 2322 | 73% |
| adequate | 784 | 24% |
| dead | 33 | 1% |
| poor | 25 | 0% |

| Needs mitigation | 108 | 3% |
| Has mutation check | 485 | 15% |

## Per-Package Breakdown

| Package | Total | Pass | Fail | Skip | Functional | Behavioral | Structural | Good | Mitigation |
|---------|-------|------|------|------|-----------|-----------|-----------|------|-----------|
| world-model | 1177 | 1157 | 10 | 10 | 500 | 115 | 562 | 620 | 21 |
| stdlib | 1129 | 1074 | 0 | 55 | 905 | 44 | 180 | 930 | 36 |
| parser-en-us | 294 | 285 | 6 | 3 | 185 | 99 | 10 | 283 | 13 |
| lang-en-us | 215 | 215 | 0 | 0 | 183 | 8 | 23 | 196 | 3 |
| engine | 170 | 156 | 0 | 14 | 128 | 33 | 9 | 121 | 33 |
| core | 94 | 94 | 0 | 0 | 89 | 2 | 3 | 92 | 1 |
| character | 40 | 40 | 0 | 0 | 29 | 7 | 4 | 40 | 0 |
| ext-basic-combat | 23 | 23 | 0 | 0 | 22 | 0 | 1 | 21 | 1 |
| event-processor | 22 | 22 | 0 | 0 | 18 | 0 | 4 | 19 | 0 |

## All 16 Failing Tests

| ID | Package | Test Name | Error |
|----|---------|-----------|-------|
| 2770 | parser-en-us | should parse "take item from container with tool" | `AssertionError: expected undefined to be 'tweezers' // Object.is equality` |
| 2771 | parser-en-us | should parse "unlock door with key" | `AssertionError: expected undefined to be 'key' // Object.is equality` |
| 2772 | parser-en-us | should parse "cut rope with knife" | `AssertionError: expected undefined to be 'knife' // Object.is equality` |
| 2773 | parser-en-us | should parse "attack goblin with sword" | `AssertionError: expected undefined to be 'sword' // Object.is equality` |
| 2774 | parser-en-us | should parse "open chest with crowbar" | `AssertionError: expected undefined to be 'crowbar' // Object.is equality` |
| 2775 | parser-en-us | should parse "dig hole with shovel" | `AssertionError: expected undefined to be 'shovel' // Object.is equality` |
| 320 | world-model | should update visibility when opening/closing containers | `TypeError: author.setupContainer is not a function` |
| 404 | world-model | should move entities into closed containers | `TypeError: author.setupContainer is not a function` |
| 405 | world-model | should move entities into locked containers | `TypeError: author.setupContainer is not a function` |
| 409 | world-model | should emit events when recordEvent is true | `AssertionError: expected [] to have a length of 3 but got +0` |
| 410 | world-model | should use author: prefix for events | `TypeError: author.setEntityProperty is not a function` |
| 412 | world-model | should connect rooms bidirectionally | `TypeError: author.connect is not a function` |
| 413 | world-model | should fill containers from specs | `TypeError: author.fillContainer is not a function` |
| 414 | world-model | should setup container properties | `TypeError: author.setupContainer is not a function` |
| 417 | world-model | should set entity properties directly | `TypeError: author.setEntityProperty is not a function` |
| 420 | world-model | should handle complex world setup | `TypeError: author.connect is not a function` |

## All 108 Tests Needing Mitigation

| ID | Package | File | Test Name | Type | Quality | Executes? | Mitigation |
|----|---------|------|-----------|------|---------|-----------|-----------|
| 1 | core | event-system.test.ts | should create a basic event with required fields | functional | adequate | Yes | Uses toBeDefined for id/timestamp instead of checking type/format |
| 95 | engine | command-executor.test.ts | should create executor with all dependencies | structural | poor | Yes | Only checks toBeDefined and toBeInstanceOf - no behavior verified |
| 96 | engine | command-executor.test.ts | should create executor using factory function | structural | poor | Yes | Only checks toBeInstanceOf - no behavior verified |
| 97 | engine | command-executor.test.ts | should execute a valid command | functional | adequate | Yes | Does not verify world state changes or event content - only checks result.success is defined |
| 102 | engine | command-executor.test.ts | should pass context to actions | functional | poor | Yes | Does not verify context was actually passed - only checks result is defined |
| 111 | engine | command-executor.test.ts | should handle missing language provider | functional | dead | Skip | Remove - permanently skipped, no longer relevant per comment |
| 114 | engine | command-executor.test.ts | should handle many sequential commands | functional | poor | Yes | Only checks result is defined - no meaningful behavior assertion |
| 117 | engine | game-engine.test.ts | should create an engine with standard setup | structural | poor | Yes | Only checks toBeDefined - no meaningful behavior assertion |
| 119 | engine | game-engine.test.ts | should accept custom config | structural | poor | Yes | Only checks engine toBeDefined - custom config not verified |
| 132 | engine | game-engine.test.ts | should process text output | functional | poor | Yes | Does not verify text output was processed - only checks result is defined |
| 136 | engine | game-engine.test.ts | should update vocabulary for entities in scope | functional | poor | Yes | Only checks not.toThrow - no vocabulary state verification |
| 137 | engine | game-engine.test.ts | should mark entities correctly as in/out of scope | functional | poor | Yes | No assertions at all - calls methods but never asserts outcome |
| 141 | engine | game-engine.test.ts | should have text service configured | structural | poor | Yes | Only checks toBeDefined - no behavior verified |
| 142 | engine | historical-accuracy.test.ts | should include complete entity snapshots in action events | behavioral | adequate | Yes | Conditional assertions with if-checks may silently pass without verifying snapshots exist |
| 143 | engine | historical-accuracy.test.ts | should include room snapshots in movement events | behavioral | dead | Skip | Permanently skipped - parser/vocabulary not set up properly for movement commands |
| 144 | engine | historical-accuracy.test.ts | should include container contents in opening events | behavioral | adequate | Yes | Conditional assertions with if-checks may silently pass if no open event found |
| 145 | engine | historical-accuracy.test.ts | should be able to reconstruct game state from events alone | behavioral | adequate | Yes | Only checks event structure, does not actually reconstruct game state |
| 146 | engine | historical-accuracy.test.ts | should preserve entity state at time of event | behavioral | adequate | Yes | Conditional if-check on lampAtTake/lampAtDrop may silently pass |
| 148 | engine | historical-accuracy.test.ts | should include actor and location in enriched events | functional | dead | Skip | Permanently skipped - feature not implemented per TODO comment |
| 150 | engine | historical-accuracy.test.ts | should handle functions in event data during save/load | functional | dead | Skip | Permanently skipped - event source does not track manually emitted events per TODO |
| 153 | engine | integration.test.ts | should handle game completion | behavioral | dead | Skip | Permanently skipped - engine.isComplete() not implemented per TODO |
| 157 | engine | integration.test.ts | should maintain event ordering | functional | adequate | Yes | Only checks events exist and have type string - does not verify ordering |
| 158 | engine | integration.test.ts | should format complex game output | functional | poor | Yes | Does not verify formatting - only checks result.success is defined |
| 162 | engine | integration.test.ts | should complete game after turn limit | behavioral | dead | Skip | Permanently skipped - setMaxTurns not implemented per TODO |
| 163 | engine | integration.test.ts | should complete game on score threshold | behavioral | dead | Skip | Permanently skipped - setScoreThreshold not implemented per TODO |
| 214 | engine | command-history.test.ts | should not track failed commands | behavioral | dead | Skip | Permanently skipped - needs investigation on why failed commands are tracked |
| 215 | engine | command-history.test.ts | should track multiple commands in order | behavioral | dead | Skip | Permanently skipped - needs unskipping and verification |
| 216 | engine | command-history.test.ts | should track complex commands with objects and prepositions | behavioral | dead | Skip | Permanently skipped - needs unskipping and verification |
| 217 | engine | command-history.test.ts | should not track non-repeatable commands | behavioral | dead | Skip | Permanently skipped - needs unskipping and verification |
| 218 | engine | command-history.test.ts | should respect maxEntries limit | behavioral | dead | Skip | Permanently skipped - needs unskipping and verification |
| 220 | engine | command-history.test.ts | should handle AGAIN with no history | behavioral | dead | Skip | Permanently skipped - needs unskipping and verification |
| 221 | engine | command-history.test.ts | should gracefully handle missing command history capability | behavioral | dead | Skip | Permanently skipped - test uses private internals, needs rewrite |
| 166 | engine | parser-extension.test.ts | should handle addNoun method (placeholder) | functional | poor | Yes | Only checks not.toThrow for placeholder method - no actual behavior to verify yet |
| 167 | engine | parser-extension.test.ts | should handle addAdjective method (placeholder) | functional | poor | Yes | Only checks not.toThrow for placeholder method - no actual behavior to verify yet |
| 3153 | ext-basic-combat | combat-service.test.ts | should knock out target at 20% health | functional | adequate | Yes | Conditional if-check on result.hit may silently pass without testing knockout logic |
| 2922 | lang-en-us | integration.test.ts | should handle all placeholder types correctly | functional | poor | Yes | Replace manual string.replace with actual formatMessage call to test the real system |
| 2926 | lang-en-us | integration.test.ts | should process common IF commands | behavioral | poor | Yes | Assert specific lemmatized values rather than just toBeDefined |
| 3050 | lang-en-us | grammar.test.ts | types should support partial data | tautological | dead | Yes | Remove - tautological, asserts values that were just assigned to local variables |
| 2644 | parser-en-us | colored-buttons.test.ts | should handle "push button" when multiple buttons exist | behavioral | poor | Yes | Add concrete assertions for disambiguation behavior instead of just logging |
| 2645 | parser-en-us | colored-buttons.test.ts | should handle "press button" when multiple buttons exist | behavioral | poor | Yes | Add concrete assertions for disambiguation behavior instead of just logging |
| 2647 | parser-en-us | colored-buttons.test.ts | should show what text is captured for "push blue button" | functional | poor | Yes | Convert debug logging to proper assertions or remove as they are exploratory/debug tests |
| 2648 | parser-en-us | colored-buttons.test.ts | should show what text is captured for "push blue" | functional | poor | Yes | Convert debug logging to proper assertions or remove as they are exploratory/debug tests |
| 2770 | parser-en-us | parser-integration.test.ts | should parse "take item from container with tool" | behavioral | good | No | Tests are failing - investigate whether grammar patterns for instrument slots are registered correctly |
| 2771 | parser-en-us | parser-integration.test.ts | should parse "unlock door with key" | behavioral | good | No | Tests are failing - investigate whether grammar patterns for instrument slots are registered correctly |
| 2772 | parser-en-us | parser-integration.test.ts | should parse "cut rope with knife" | behavioral | good | No | Tests are failing - investigate whether grammar patterns for instrument slots are registered correctly |
| 2773 | parser-en-us | parser-integration.test.ts | should parse "attack goblin with sword" | behavioral | good | No | Tests are failing - investigate whether grammar patterns for instrument slots are registered correctly |
| 2774 | parser-en-us | parser-integration.test.ts | should parse "open chest with crowbar" | behavioral | good | No | Tests are failing - investigate whether grammar patterns for instrument slots are registered correctly |
| 2775 | parser-en-us | parser-integration.test.ts | should parse "dig hole with shovel" | behavioral | good | No | Tests are failing - investigate whether grammar patterns for instrument slots are registered correctly |
| 2851 | parser-en-us | english-parser.test.ts | should handle pattern mismatch | functional | adequate | Skip | Test is skipped - investigate why take in box is parsing successfully and fix or update test |
| 2859 | parser-en-us | english-parser.test.ts | should return multiple candidates | functional | adequate | Skip | Test is skipped - parseWithErrors needs updating for new grammar engine |
| 2864 | parser-en-us | english-parser.test.ts | should choose highest confidence pattern | behavioral | adequate | Skip | Test is skipped - put down without object pattern matching needs investigation |
| 1461 | stdlib | action-language-integration.test.ts | should resolve messages through language provider | behavioral | adequate | Yes | Assertion is weak: accepts [Missing:...] as valid outcome, defeating the purpose of verifying message resolution |
| 1463 | stdlib | action-language-integration.test.ts | example: action that checks preconditions | functional | adequate | Yes | Uses a mock take action instead of the real one; does not verify actual world state change (moveEntity never called) |
| 1478 | stdlib | meta-commands.test.ts | should recognize author.parser_events as meta | functional | dead | Skip | Skipped: ParserEventsAction not implemented. Remove or implement. |
| 1479 | stdlib | meta-commands.test.ts | should recognize author.validation_events as meta | functional | dead | Skip | Skipped: ValidationEventsAction not implemented. Remove or implement. |
| 1480 | stdlib | meta-commands.test.ts | should recognize author.system_events as meta | functional | dead | Skip | Skipped: SystemEventsAction not implemented. Remove or implement. |
| 1450 | stdlib | scope-integration.test.ts | should fail when trying to take an object that is not reacha | behavioral | adequate | Yes | Assertion is overly flexible: accepts either not-finding-gem or finding-chest as success. Should specifically assert the |
| 1582 | stdlib | climbing-golden.test.ts | should climb up when exit exists | functional | good | Yes | Add world state mutation check: verify player actually moved to destination room |
| 1583 | stdlib | climbing-golden.test.ts | should climb down when exit exists | functional | good | Yes | Add world state mutation check: verify player actually moved to destination room |
| 1584 | stdlib | climbing-golden.test.ts | should climb onto enterable supporter | functional | good | Yes | Add world state mutation check: verify player actually moved onto supporter |
| 1585 | stdlib | climbing-golden.test.ts | should climb object with CLIMBABLE trait | functional | good | Yes | Add world state mutation check: verify player location changed |
| 1650 | stdlib | dropping-golden.test.ts | should drop item in room | functional | good | Yes | Add world state mutation check: verify item actually moved from player to room |
| 1651 | stdlib | dropping-golden.test.ts | should drop item in open container | functional | good | Yes | Add world state mutation check: verify item actually moved to container |
| 1652 | stdlib | dropping-golden.test.ts | should drop item on supporter | functional | good | Yes | Add world state mutation check: verify item actually moved to supporter |
| 1666 | stdlib | eating-golden.test.ts | should eat item from inventory | functional | good | Yes | Add mutation check: verify EdibleTrait.servings decremented or consumed flag set |
| 1893 | stdlib | looking-golden.test.ts | should use brief description for visited rooms in brief mode | functional | adequate | Yes | Test notes brief/verbose not implemented yet; both tests check verbose=true. Should be updated when brief mode is implem |
| 1912 | stdlib | meta-registry.test.ts | should clear and restore defaults | functional | adequate | Yes | Test asserts count equals initialCount after clear, but clear() restores defaults. The name says "clear and restore defa |
| 1914 | stdlib | opening-golden.test.ts | should use report() for ALL event generation | structural | poor | Yes | Test only checks events is defined and is an array. Does not verify any specific event content. |
| 1965 | stdlib | putting-golden.test.ts | should use report() for ALL event generation | structural | poor | Yes | Test only checks events is defined and is an array. Does not verify any specific event content. |
| 1973 | stdlib | putting-golden.test.ts | should fail when item already in destination | functional | poor | Yes | Test has no final assertion on the events. It moves the key, runs the action, but does not verify any specific outcome.  |
| 2021 | stdlib | reading-golden.test.ts | should handle items with language requirements | functional | adequate | Yes | Test says "we assume the player has the ability" and checks valid=true. Language requirement is not actually tested. Add |
| 2034 | stdlib | registry-golden.test.ts | should sort actions by priority in pattern results | structural | poor | Yes | Test body is empty - no assertions at all. Either implement or remove. |
| 2045 | stdlib | removing-golden.test.ts | should use report() for ALL event generation | structural | poor | Yes | Test only checks events is defined and is an array. Does not verify any specific event content. |
| 2199 | stdlib | taking-golden.test.ts | should use report() for ALL event generation | structural | poor | Yes | Test only checks events is defined and is an array. Does not verify any specific event content. |
| 2272 | stdlib | throwing-golden.test.ts | should miss moving actor - implementation bug: duck/catch lo | functional | adequate | Skip | Skipped due to implementation bug: duck/catch logic only runs on hit. Fix the action logic then unskip. |
| 2273 | stdlib | throwing-golden.test.ts | should allow NPC to catch thrown item - implementation bug:  | functional | adequate | Skip | Skipped due to implementation bug: catch logic only runs on hit. Fix the action logic then unskip. |
| 2281 | stdlib | throwing-golden.test.ts | should detect various fragile materials | functional | adequate | Yes | Test duplicates action internals (fragility detection logic) rather than testing through the action API. Should test via |
| 1521 | stdlib | capability-refactoring.test.ts | should handle entry trimming logic | functional | adequate | Yes | Implements trimming logic inline in the test instead of calling the real code. Tests its own mock, not the actual capabi |
| 2388 | stdlib | scope-resolver.test.ts | should not reach high objects | functional | dead | Yes | Empty test body - no assertions. Either implement or remove. |
| 2410 | stdlib | scope-resolver.test.ts | should resolve entities by name + scope after serialization  | behavioral | adequate | Yes | Test has excessive console.log tracing and reimplements command validator logic inline. Should use actual CommandValidat |
| 2411 | stdlib | scope-resolver.test.ts | REPRO: two wires with shared alias cause ENTITY_NOT_FOUND vi | behavioral | adequate | Yes | Bug reproduction test that reimplements command validator logic manually. Has excessive console.log statements. Should b |
| 2443 | stdlib | witness-system.test.ts | should update visual properties when witnessed | functional | adequate | Yes | Test notes visual property extraction not yet implemented. Only checks entity exists=true; should verify visual properti |
| 2445 | stdlib | witness-system.test.ts | should emit action witness event | functional | dead | Skip | Skipped test. Uses module-level mock of createEvent but may need different approach. Enable or remove. |
| 2446 | stdlib | witness-system.test.ts | should emit movement witness event | functional | dead | Skip | Skipped test. Uses module-level mock of createEvent. Enable or remove. |
| 2447 | stdlib | witness-system.test.ts | should emit unknown entity for partial witness level | functional | dead | Skip | Skipped test. Uses module-level mock and spy on canReach. Enable or remove. |
| 2518 | stdlib | command-validator-golden.test.ts | validates action without object in parsed command | functional | dead | Skip | Skipped: parser currently requires object for take verb. Either fix parser or remove test. |
| 1506 | stdlib | entity-alias-resolution.test.ts | should find entity by alias "hook" | behavioral | adequate | Yes | Excessive console.log debug output (world state dump). Clean up debug logging. |
| 313 | world-model | container-hierarchies.test.ts | should enforce maximum nesting depth | behavioral | adequate | Yes | Conditional assertion (if/else) weakens the test; should assert a definite outcome |
| 316 | world-model | container-hierarchies.test.ts | should handle container capacity limits | behavioral | adequate | Yes | Test documents that capacity limits are NOT enforced (comment says "Currently no limit enforced") -- either implement li |
| 327 | world-model | door-mechanics.test.ts | should prevent opening locked doors | behavioral | adequate | Yes | Test only checks trait state, never actually tries to open a locked door via behavior; it just re-asserts the state it s |
| 328 | world-model | door-mechanics.test.ts | should unlock doors with correct key | behavioral | adequate | Yes | Test manually sets isLocked=false rather than using unlock behavior with key verification |
| 331 | world-model | door-mechanics.test.ts | should handle one-way doors | structural | adequate | Yes | Test only verifies custom property values were set; does not test any behavior |
| 332 | world-model | door-mechanics.test.ts | should handle automatic closing doors | structural | adequate | Yes | Test only verifies custom property values were set; does not test any auto-close behavior |
| 334 | world-model | door-mechanics.test.ts | should handle doors with windows | structural | adequate | Yes | Only checks that hasWindow/windowTransparent properties were set on door trait; no behavior tested |
| 337 | world-model | door-mechanics.test.ts | should track door usage | structural | adequate | Yes | Test only sets and checks custom ad-hoc properties (useCount, lastUsedBy) -- no actual door usage behavior is tested |
| 338 | world-model | door-mechanics.test.ts | should handle door with special requirements | structural | adequate | Yes | Test only sets and checks custom ad-hoc properties (puzzleSolved, requiresPuzzle) -- no puzzle behavior is tested |
| 341 | world-model | room-actor-containers.test.ts | should respect room capacity limits | structural | adequate | Yes | Test only checks that trait property exists; does not verify capacity enforcement |
| 344 | world-model | room-actor-containers.test.ts | should handle actor inventory limits | structural | adequate | Yes | Test only checks trait capacity property exists; does not verify capacity enforcement |
| 345 | world-model | room-actor-containers.test.ts | should prevent actors from being placed inside other actors | structural | adequate | Yes | Test only checks excludedTypes property; does not verify that actor-in-actor placement is actually blocked |
| 348 | world-model | trait-combinations.test.ts | should not open locked container | behavioral | adequate | Yes | Test manually sets isOpen=true on locked container and only checks lockable is still true -- does not verify that the op |
| 361 | world-model | trait-combinations.test.ts | should handle consuming items from container | behavioral | adequate | Yes | Test sets custom isConsumed property on edible trait via as-cast; no actual consume behavior tested |
| 385 | world-model | visibility-chains.test.ts | should cache visibility calculations | functional | adequate | Yes | Test notes caching is aspirational and comments out the actual cache assertion -- either implement caching or rewrite as |
| 391 | world-model | wearable-clothing.test.ts | should handle items in pockets visibility - SKIPPED: Complex | behavioral | dead | Skip | Test is skipped; needs review of complex visibility scenario |
| 397 | world-model | wearable-clothing.test.ts | should handle non-removable clothing | behavioral | adequate | Yes | Test does not actually try to remove the cursed ring; only checks that canRemove property is false |
| 286 | world-model | darkness-light.test.ts | should not see when light source is off | behavioral | adequate | Yes | Contains console.log debug statements that should be removed |
| 655 | world-model | actor.test.ts | should ensure player is always playable | functional | adequate | Yes | Test name says "ensure player is always playable" but actually demonstrates the limitation that isPlayable can be set fa |
| 815 | world-model | container-capability.test.ts | should allow moving items into rooms without explicit Contai | functional | adequate | Yes | Test claims to verify moving items into rooms but only checks canContain/getContainerTrait, never actually moves anythin |
| 1289 | world-model | get-in-scope.test.ts | should include deeply nested items - SKIPPED: Default scope  | functional | dead | Skip | Test is skipped; default scope rules may need adjustment for deep nesting -- contains debug console.log statements |

## Full Test Inventory by File

### character

#### character-builder.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 3102 | should store and return the character ID | funct | good | Y |  |  |
| 3103 | should compile with default values | funct | good | Y |  |  |
| 3104 | should compile personality expressions to numeric values | funct | good | Y |  |  |
| 3105 | should compile disposition shortcuts to numeric values | funct | good | Y |  |  |
| 3106 | should compile trusts and distrusts | funct | good | Y |  |  |
| 3107 | should compile mood word | funct | good | Y |  |  |
| 3108 | should compile threat level | funct | good | Y |  |  |
| 3109 | should compile from named preset | funct | good | Y |  |  |
| 3110 | should compile from partial override | funct | good | Y |  |  |
| 3111 | should throw on unknown preset name | funct | good | Y |  |  |
| 3112 | should compile knowledge facts | funct | good | Y |  |  |
| 3113 | should compile beliefs | funct | good | Y |  |  |
| 3114 | should compile goals sorted by priority | funct | good | Y |  |  |
| 3115 | should compile lucidity config | funct | good | Y |  |  |
| 3116 | should compile perception filters | funct | good | Y |  |  |
| 3117 | should compile perceived events (hallucinations) | funct | good | Y |  |  |
| 3118 | should compile .on() trigger with mutations | funct | good | Y |  |  |
| 3119 | should compile trigger with condition | funct | good | Y |  |  |
| 3120 | should compile becomesLucid mutation | funct | good | Y |  |  |
| 3121 | should auto-finalize pending trigger on compile | funct | good | Y |  |  |
| 3122 | should auto-finalize pending trigger on new .on() | funct | good | Y |  |  |
| 3123 | should compile custom predicate functions | funct | good | Y |  |  |
| 3124 | should compile the complete Margaret character | behav | good | Y |  |  |
| 3125 | should compile the complete Eleanor character with cognitive profile | behav | good | Y |  |  |
| 3126 | should have all eight presets from ADR-141 | struc | good | Y |  |  |
| 3127 | should match ADR-141 condition table for schizophrenic | struc | good | Y |  |  |
| 3128 | should match ADR-141 condition table for PTSD | struc | good | Y |  |  |
| 3129 | should match ADR-141 condition table for dementia | struc | good | Y |  |  |
| 3130 | should reject unknown preset name | funct | good | Y |  |  |
| 3131 | should register and retrieve custom moods | funct | good | Y |  |  |
| 3132 | should register and retrieve custom personality traits | funct | good | Y |  |  |
| 3133 | should list registered names | funct | good | Y |  |  |
| 3134 | should compile custom mood through builder | funct | good | Y |  |  |
| 3135 | should create trait and add it to entity | funct | good | Y | Y |  |
| 3136 | should register custom predicates on the trait | funct | good | Y | Y |  |
| 3137 | should produce a CharacterModelTrait that matches builder declarations | behav | good | Y |  |  |
#### integration.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 3138 | should build, apply, observe, and decay a full character lifecycle | behav | good | Y | Y |  |
| 3139 | should handle NPC with schizophrenic profile and hallucinations | behav | good | Y | Y |  |
| 3140 | should skip filtered events for PTSD character | behav | good | Y | Y |  |
| 3141 | should coexist with NpcTrait without interference | behav | good | Y | Y |  |
### core

#### event-system.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1 | should create a basic event with required fields | funct | adeq | Y |  | Uses toBeDefined for id/timestamp instead of checking type/format |
| 2 | should include entity information | funct | good | Y |  |  |
| 3 | should include metadata | funct | good | Y |  |  |
| 4 | should handle empty payload | funct | good | Y |  |  |
| 5 | should generate unique IDs | funct | good | Y |  |  |
| 6 | should generate increasing timestamps | funct | good | Y |  |  |
| 7 | should handle complex payloads | funct | good | Y |  |  |
| 8 | should set narrate flag from metadata | funct | good | Y |  |  |
| 9 | should set tags from metadata | funct | good | Y |  |  |
| 10 | should handle all entity types | funct | good | Y |  |  |
| 11 | should support legacy data property | funct | adeq | Y |  |  |
| 12 | should create events suitable for the semantic event source | struc | good | Y |  |  |
| 13 | should follow expected ID pattern | funct | good | Y |  |  |
| 14 | should create standard narrative events | funct | good | Y |  |  |
| 15 | should create standard error events | funct | good | Y |  |  |
#### platform-events.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 16 | should have all required event types | struc | good | Y |  |  |
| 17 | should identify platform events | funct | good | Y |  |  |
| 18 | should identify platform request events | funct | good | Y |  |  |
| 19 | should identify platform completion events | funct | good | Y |  |  |
| 20 | should create save requested event with context | funct | good | Y |  |  |
| 21 | should create save completed event | funct | good | Y |  |  |
| 22 | should create save failed event with error | funct | good | Y |  |  |
| 23 | should create restore requested event with context | funct | good | Y |  |  |
| 24 | should create restore completed event | funct | good | Y |  |  |
| 25 | should create restore failed event | funct | good | Y |  |  |
| 26 | should create quit requested event with context | funct | good | Y |  |  |
| 27 | should create quit confirmed event | funct | good | Y |  |  |
| 28 | should create quit cancelled event | funct | good | Y |  |  |
| 29 | should create restart requested event with context | funct | good | Y |  |  |
| 30 | should create restart completed event | funct | good | Y |  |  |
| 31 | should create restart cancelled event | funct | good | Y |  |  |
| 32 | should create platform event with custom data | funct | good | Y |  |  |
| 33 | should generate unique event IDs | funct | good | Y |  |  |
| 34 | should include timestamp | funct | good | Y |  |  |
#### semantic-event-source.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 35 | should store and retrieve events | funct | good | Y | Y |  |
| 36 | should clear all events | funct | good | Y | Y |  |
| 37 | should filter events by type | funct | good | Y |  |  |
| 38 | should filter events by entity | funct | good | Y |  |  |
| 39 | should filter events by tag | funct | good | Y |  |  |
| 40 | should support custom filters | funct | good | Y |  |  |
| 41 | should emit events to subscribers | funct | good | Y |  |  |
| 42 | should support EventEmitter interface | funct | good | Y |  |  |
| 43 | should handle emitter unsubscribe | funct | good | Y |  |  |
| 44 | should track unprocessed events | funct | good | Y |  |  |
| 45 | should get events since a specific event | funct | good | Y |  |  |
| 46 | should find events by any entity role | funct | good | Y |  |  |
| 47 | should handle errors in event emitter listeners | funct | good | Y |  |  |
#### simple-event-source.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 48 | should emit events to subscribers | funct | good | Y |  |  |
| 49 | should support multiple subscribers | funct | good | Y |  |  |
| 50 | should return working unsubscribe function | funct | good | Y |  |  |
| 51 | should handle errors in subscribers gracefully | funct | good | Y |  |  |
| 52 | should track subscriber count | funct | good | Y | Y |  |
| 53 | should clear all subscribers | funct | good | Y | Y |  |
| 54 | should create event source via factory | funct | good | Y |  |  |
| 55 | should handle unsubscribe called multiple times | funct | good | Y |  |  |
| 56 | should handle subscriber that modifies handler list during emit | funct | good | Y |  |  |
#### ifid.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 57 | should generate a valid IFID | funct | good | Y |  |  |
| 58 | should generate uppercase UUID format | funct | good | Y |  |  |
| 59 | should generate unique IFIDs | funct | good | Y |  |  |
| 60 | should accept valid uppercase UUID | funct | good | Y |  |  |
| 61 | should accept valid IFID with minimum length (8 chars) | funct | good | Y |  |  |
| 62 | should accept valid IFID with maximum length (63 chars) | funct | good | Y |  |  |
| 63 | should reject lowercase letters | funct | good | Y |  |  |
| 64 | should reject too short IFID (< 8 chars) | funct | good | Y |  |  |
| 65 | should reject too long IFID (> 63 chars) | funct | good | Y |  |  |
| 66 | should reject invalid characters | funct | good | Y |  |  |
| 67 | should accept hyphens | funct | good | Y |  |  |
| 68 | should convert lowercase to uppercase | funct | good | Y |  |  |
| 69 | should return same string if already uppercase | funct | good | Y |  |  |
| 70 | should return null for invalid IFID even after normalization | funct | good | Y |  |  |
| 71 | should handle mixed case | funct | good | Y |  |  |
#### result.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 72 | should create success results | funct | good | Y |  |  |
| 73 | should create failure results | funct | good | Y |  |  |
| 74 | should handle any value types | funct | good | Y |  |  |
| 75 | should identify success results | funct | good | Y |  |  |
| 76 | should identify failure results | funct | good | Y |  |  |
| 77 | should narrow types correctly | struc | good | Y |  |  |
| 78 | should transform success values | funct | good | Y |  |  |
| 79 | should pass through failures | funct | good | Y |  |  |
| 80 | should handle type transformations | funct | good | Y |  |  |
| 81 | should transform error values | funct | good | Y |  |  |
| 82 | should pass through successes | funct | good | Y |  |  |
| 83 | should chain successful results | funct | good | Y |  |  |
| 84 | should propagate failures | funct | good | Y |  |  |
| 85 | should handle chained failures | funct | good | Y |  |  |
| 86 | should allow complex chains | funct | good | Y |  |  |
| 87 | should return value for success | funct | good | Y |  |  |
| 88 | should throw error for failure | funct | good | Y |  |  |
| 89 | should throw non-Error failures | funct | good | Y |  |  |
| 90 | should return value for success | funct | good | Y |  |  |
| 91 | should return default for failure | funct | good | Y |  |  |
| 92 | should handle different types | funct | good | Y |  |  |
| 93 | should work for parsing operations | behav | good | Y |  |  |
| 94 | should work for validation chains | behav | good | Y |  |  |
### engine

#### command-executor.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 95 | should create executor with all dependencies | struc | poor | Y |  | Only checks toBeDefined and toBeInstanceOf - no behavior verified |
| 96 | should create executor using factory function | struc | poor | Y |  | Only checks toBeInstanceOf - no behavior verified |
| 97 | should execute a valid command | funct | adeq | Y |  | Does not verify world state changes or event content - only checks result.succes |
| 98 | should include timing data when configured | funct | good | Y |  |  |
| 99 | should handle unknown commands | funct | good | Y |  |  |
| 100 | should handle empty input | funct | good | Y |  |  |
| 101 | should handle whitespace-only input | funct | good | Y |  |  |
| 102 | should pass context to actions | funct | poor | Y |  | Does not verify context was actually passed - only checks result is defined |
| 103 | should handle action execution errors | funct | good | Y |  |  |
| 104 | should handle sync and async actions | funct | adeq | Y |  |  |
| 105 | should parse commands using language provider | funct | adeq | Y |  |  |
| 106 | should normalize input | funct | adeq | Y |  |  |
| 107 | should return events with valid structure | struc | good | Y |  |  |
| 108 | should add timestamp to events | funct | good | Y |  |  |
| 109 | should handle missing action registry | funct | good | Y |  |  |
| 110 | should handle missing parser | funct | good | Y |  |  |
| 111 | should handle missing language provider | funct | dead | S |  | Remove - permanently skipped, no longer relevant per comment |
| 112 | should create error event for failed commands | funct | good | Y |  |  |
| 113 | should execute commands quickly | funct | adeq | Y |  |  |
| 114 | should handle many sequential commands | funct | poor | Y |  | Only checks result is defined - no meaningful behavior assertion |
#### debug-xyzzy.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 115 | should not track xyzzy in command history but should emit events | behav | good | Y | Y |  |
| 116 | should track successful commands in history and emit events | behav | good | Y | Y |  |
#### game-engine.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 117 | should create an engine with standard setup | struc | poor | Y |  | Only checks toBeDefined - no meaningful behavior assertion |
| 118 | should initialize with default config | funct | good | Y |  |  |
| 119 | should accept custom config | struc | poor | Y |  | Only checks engine toBeDefined - custom config not verified |
| 120 | should set story and initialize components | funct | good | Y | Y |  |
| 121 | should properly initialize world with story | funct | good | Y | Y |  |
| 122 | should handle story initialization errors gracefully | funct | good | Y |  |  |
| 123 | should start and stop correctly | funct | adeq | Y |  |  |
| 124 | should throw if already running | funct | good | Y |  |  |
| 125 | should throw if executing turn when not running | funct | good | Y |  |  |
| 126 | should start without a story if dependencies are provided | funct | adeq | Y |  |  |
| 127 | should execute a basic turn | funct | adeq | Y |  |  |
| 128 | should update context after turn | funct | good | Y | Y |  |
| 129 | should emit turn events | funct | good | Y |  |  |
| 130 | should handle turn execution errors | funct | good | Y |  |  |
| 131 | should respect max history limit | funct | good | Y | Y |  |
| 132 | should process text output | funct | poor | Y |  | Does not verify text output was processed - only checks result is defined |
| 133 | should save current state | funct | good | Y |  |  |
| 134 | should load saved state | behav | good | Y | Y |  |
| 135 | should reject incompatible save versions | funct | good | Y |  |  |
| 136 | should update vocabulary for entities in scope | funct | poor | Y |  | Only checks not.toThrow - no vocabulary state verification |
| 137 | should mark entities correctly as in/out of scope | funct | poor | Y |  | No assertions at all - calls methods but never asserts outcome |
| 138 | should emit events during turn execution | funct | good | Y |  |  |
| 139 | should call onEvent config callback | funct | good | Y |  |  |
| 140 | should get recent events | funct | adeq | Y |  |  |
| 141 | should have text service configured | struc | poor | Y |  | Only checks toBeDefined - no behavior verified |
#### historical-accuracy.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 142 | should include complete entity snapshots in action events | behav | adeq | Y |  | Conditional assertions with if-checks may silently pass without verifying snapsh |
| 143 | should include room snapshots in movement events | behav | dead | S |  | Permanently skipped - parser/vocabulary not set up properly for movement command |
| 144 | should include container contents in opening events | behav | adeq | Y |  | Conditional assertions with if-checks may silently pass if no open event found |
| 145 | should be able to reconstruct game state from events alone | behav | adeq | Y |  | Only checks event structure, does not actually reconstruct game state |
| 146 | should preserve entity state at time of event | behav | adeq | Y |  | Conditional if-check on lampAtTake/lampAtDrop may silently pass |
| 147 | should include turn number in event data | funct | good | Y |  |  |
| 148 | should include actor and location in enriched events | funct | dead | S |  | Permanently skipped - feature not implemented per TODO comment |
| 149 | should normalize event types to lowercase with dots | funct | good | Y |  |  |
| 150 | should handle functions in event data during save/load | funct | dead | S |  | Permanently skipped - event source does not track manually emitted events per TO |
#### integration.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 151 | should complete a full game session | behav | good | Y | Y |  |
| 152 | should handle save and restore | behav | good | Y | Y |  |
| 153 | should handle game completion | behav | dead | S |  | Permanently skipped - engine.isComplete() not implemented per TODO |
| 154 | should handle malformed input gracefully | funct | good | Y |  |  |
| 155 | should recover from action errors | behav | good | Y |  |  |
| 156 | should handle rapid turn execution | funct | adeq | Y |  |  |
| 157 | should maintain event ordering | funct | adeq | Y |  | Only checks events exist and have type string - does not verify ordering |
| 158 | should format complex game output | funct | poor | Y |  | Does not verify formatting - only checks result.success is defined |
| 159 | should update vocabulary as player moves | funct | good | Y |  |  |
| 160 | should create functional standard engine | struc | adeq | Y |  |  |
| 161 | should handle multi-room world with objects | behav | adeq | Y | Y |  |
| 162 | should complete game after turn limit | behav | dead | S |  | Permanently skipped - setMaxTurns not implemented per TODO |
| 163 | should complete game on score threshold | behav | dead | S |  | Permanently skipped - setScoreThreshold not implemented per TODO |
#### command-history.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 213 | should track successful commands in history | behav | good | Y | Y |  |
| 214 | should not track failed commands | behav | dead | S |  | Permanently skipped - needs investigation on why failed commands are tracked |
| 215 | should track multiple commands in order | behav | dead | S |  | Permanently skipped - needs unskipping and verification |
| 216 | should track complex commands with objects and prepositions | behav | dead | S |  | Permanently skipped - needs unskipping and verification |
| 217 | should not track non-repeatable commands | behav | dead | S |  | Permanently skipped - needs unskipping and verification |
| 218 | should respect maxEntries limit | behav | dead | S |  | Permanently skipped - needs unskipping and verification |
| 219 | should handle AGAIN command by repeating last command | behav | good | Y | Y |  |
| 220 | should handle AGAIN with no history | behav | dead | S |  | Permanently skipped - needs unskipping and verification |
| 221 | should gracefully handle missing command history capability | behav | dead | S |  | Permanently skipped - test uses private internals, needs rewrite |
#### event-handlers.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 222 | should allow stories to register event handlers | funct | good | Y |  |  |
| 223 | should support complex multi-entity interactions | behav | good | Y | Y |  |
#### query-events.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 224 | should emit client.query event when quit is executed | funct | good | Y |  |  |
| 225 | should emit platform.quit_requested event | funct | good | Y |  |  |
| 226 | should emit if.event.quit_requested event | funct | good | Y |  |  |
#### parser-extension.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 164 | should add custom verbs | funct | good | Y |  |  |
| 165 | should add custom prepositions | funct | good | Y |  |  |
| 166 | should handle addNoun method (placeholder) | funct | poor | Y |  | Only checks not.toThrow for placeholder method - no actual behavior to verify ye |
| 167 | should handle addAdjective method (placeholder) | funct | poor | Y |  | Only checks not.toThrow for placeholder method - no actual behavior to verify ye |
| 168 | should add custom messages | funct | good | Y |  |  |
| 169 | should add action help | funct | good | Y |  |  |
| 170 | should add action patterns | funct | good | Y |  |  |
| 171 | should merge patterns with existing actions | funct | good | Y |  |  |
#### event-size-analysis.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 227 | should measure event sizes for common actions | funct | adeq | Y |  |  |
| 228 | should compare snapshot vs reference sizes | funct | adeq | Y |  |  |
| 229 | should analyze memory usage patterns | funct | adeq | Y |  |  |
#### platform-operations.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 172 | should detect and queue platform events during turn execution | funct | good | Y |  |  |
| 173 | should process save requested event and call save hook | funct | good | Y |  |  |
| 174 | should emit save completed event on success | funct | good | Y |  |  |
| 175 | should emit save failed event when hook throws | funct | good | Y |  |  |
| 176 | should emit save failed event when no save hook registered | funct | good | Y |  |  |
| 177 | should process restore requested event and call restore hook | funct | good | Y |  |  |
| 178 | should load save data and emit completion event | funct | good | Y |  |  |
| 179 | should emit restore failed event when no save data available | funct | good | Y |  |  |
| 180 | should process quit requested event and call quit hook | funct | good | Y |  |  |
| 181 | should stop engine and emit confirmation when quit confirmed | funct | good | Y | Y |  |
| 182 | should emit cancelled event when quit declined | funct | good | Y | Y |  |
| 183 | should quit by default when no hook registered | funct | good | Y |  |  |
| 184 | should process restart requested event and call restart hook | funct | good | Y |  |  |
| 185 | should reinitialize story and emit completion when restart confirmed | funct | good | Y |  |  |
| 186 | should emit cancelled event when restart declined | funct | good | Y |  |  |
| 187 | should process multiple platform operations in order | funct | good | Y |  |  |
| 188 | should continue processing even if one operation fails | funct | good | Y |  |  |
| 189 | should add completion events to current turn events | funct | good | Y | Y |  |
| 190 | should emit events through event source | funct | good | Y |  |  |
#### story-testing-verification.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 191 | should successfully initialize engine with test story and language pro | behav | good | Y |  |  |
| 192 | should load language provider directly | struc | good | Y |  |  |
#### story.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 193 | should validate valid story config | funct | good | Y |  |  |
| 194 | should accept author as array | funct | good | Y |  |  |
| 195 | should validate semantic version | funct | good | Y |  |  |
| 196 | should reject invalid versions | funct | good | Y |  |  |
| 197 | should accept prerelease versions | funct | good | Y |  |  |
| 198 | should require all mandatory fields | funct | good | Y |  |  |
| 199 | should track completion state | funct | good | Y | Y |  |
#### event-emitter.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 230 | should register a handler for an event type | funct | good | Y | Y |  |
| 231 | should allow multiple handlers for the same event | funct | good | Y | Y |  |
| 232 | should remove a specific handler | funct | good | Y | Y |  |
| 233 | should handle removing non-existent handler gracefully | funct | good | Y |  |  |
| 234 | should call all registered handlers | funct | good | Y |  |  |
| 235 | should collect semantic events from handlers | funct | good | Y |  |  |
| 236 | should handle handlers that return void | funct | good | Y |  |  |
| 237 | should clear all handlers for a specific event type | funct | good | Y | Y |  |
| 238 | should clear all handlers when no event type specified | funct | good | Y | Y |  |
| 239 | should return 0 for unregistered events | funct | good | Y |  |  |
| 240 | should return correct count for registered events | funct | good | Y |  |  |
#### scheduler-service.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 241 | should register a daemon | funct | good | Y | Y |  |
| 242 | should throw when registering duplicate daemon ID | funct | good | Y |  |  |
| 243 | should remove a daemon | funct | good | Y | Y |  |
| 244 | should pause and resume a daemon | funct | good | Y | Y |  |
| 245 | should run daemons in priority order | funct | good | Y |  |  |
| 246 | should only run daemon if condition is met | funct | good | Y |  |  |
| 247 | should remove runOnce daemons after first successful run | funct | good | Y | Y |  |
| 248 | should set a fuse | funct | good | Y | Y |  |
| 249 | should count down and trigger fuse | behav | good | Y | Y |  |
| 250 | should cancel a fuse and call onCancel | funct | good | Y | Y |  |
| 251 | should adjust fuse turns | funct | good | Y | Y |  |
| 252 | should pause and resume a fuse | behav | good | Y | Y |  |
| 253 | should respect tickCondition | funct | good | Y | Y |  |
| 254 | should repeat fuses | behav | good | Y | Y |  |
| 255 | should cancel fuses bound to entity | funct | good | Y | Y |  |
| 256 | should save and restore state | behav | good | Y | Y |  |
| 257 | should provide deterministic random | funct | good | Y |  |  |
| 258 | should provide chance function | funct | good | Y |  |  |
| 259 | should pick from array | funct | good | Y |  |  |
| 260 | should shuffle array | funct | adeq | Y |  |  |
| 261 | should return active daemons info | funct | good | Y |  |  |
| 262 | should return active fuses info | funct | good | Y |  |  |
| 263 | should create a scheduler service | struc | adeq | Y |  |  |
| 264 | should accept optional seed | funct | good | Y |  |  |
#### universal-capability-dispatch.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 200 | should return shouldDispatch=true for entity with matching capability | funct | good | Y |  |  |
| 201 | should return shouldDispatch=false for entity without capability | funct | good | Y |  |  |
| 202 | should return shouldDispatch=false for undefined target | funct | good | Y |  |  |
| 203 | should return shouldDispatch=false for unregistered capability | funct | good | Y |  |  |
| 204 | should find correct behavior for blocking trait | funct | good | Y |  |  |
| 205 | should delegate validation to behavior and return valid=true when allo | funct | good | Y | Y |  |
| 206 | should delegate validation to behavior and return valid=false when blo | funct | good | Y |  |  |
| 207 | should call behavior execute phase | funct | good | Y | Y |  |
| 208 | should return events from behavior report phase | funct | good | Y |  |  |
| 209 | should return blocked events from behavior | funct | good | Y |  |  |
| 210 | should support troll blocking passage scenario | behav | good | Y |  |  |
| 211 | should support guarded treasure scenario | behav | good | Y |  |  |
| 212 | should allow taking unguarded items normally | behav | good | Y |  |  |
### event-processor

#### entity-handlers.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 3080 | should not invoke entity on handler (removed in ISSUE-068) | funct | good | Y |  |  |
| 3081 | should not invoke handler when event has no target | funct | good | Y |  |  |
| 3082 | should not invoke handler when entity has no handler for event type | funct | good | Y |  |  |
| 3083 | should handle handler returning void | funct | good | Y |  |  |
| 3084 | should handle handler throwing error gracefully | funct | good | Y |  |  |
| 3085 | should not invoke handler when entity does not exist | funct | good | Y |  |  |
#### processor-reactions.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 3086 | should process simple reactions | funct | good | Y |  |  |
| 3087 | should handle nested reactions | funct | good | Y |  |  |
| 3088 | should respect maxReactionDepth | funct | good | Y |  |  |
| 3089 | should handle failed reactions | funct | good | Y |  |  |
| 3090 | should not process reactions if initial event fails | funct | good | Y |  |  |
#### processor.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 3091 | should create processor with default options | struc | adeq | Y |  |  |
| 3092 | should create processor with custom options | struc | adeq | Y |  |  |
| 3093 | should register standard handlers on creation | struc | good | Y |  |  |
| 3094 | should process a single valid event | funct | good | Y | Y |  |
| 3095 | should process multiple events | funct | good | Y | Y |  |
| 3096 | should handle validation failures | funct | good | Y |  |  |
| 3097 | should skip validation when validate option is false | funct | good | Y | Y |  |
| 3098 | should capture preview changes when preview option is true | funct | good | Y |  |  |
| 3099 | should handle events that throw errors | funct | good | Y |  |  |
| 3100 | should update processor options | funct | good | Y | Y |  |
| 3101 | should return the world model | struc | adeq | Y |  |  |
### ext-basic-combat

#### combat-service.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 3142 | should return 50% for equal skills | funct | good | Y |  |  |
| 3143 | should increase chance with skill advantage | funct | good | Y |  |  |
| 3144 | should decrease chance with skill disadvantage | funct | good | Y |  |  |
| 3145 | should include weapon bonus | funct | good | Y |  |  |
| 3146 | should clamp to minimum 10% | funct | good | Y |  |  |
| 3147 | should clamp to maximum 95% | funct | good | Y |  |  |
| 3148 | should miss when roll exceeds hit chance | funct | good | Y |  |  |
| 3149 | should hit and deal damage | funct | good | Y |  |  |
| 3150 | should add weapon damage | funct | good | Y |  |  |
| 3151 | should apply armor reduction | funct | good | Y |  |  |
| 3152 | should kill target when health reaches 0 | funct | good | Y | Y |  |
| 3153 | should knock out target at 20% health | funct | adeq | Y | Y | Conditional if-check on result.hit may silently pass without testing knockout lo |
| 3154 | should allow attacking combatant | funct | good | Y |  |  |
| 3155 | should reject attacking non-combatant | funct | good | Y |  |  |
| 3156 | should reject attacking dead target | funct | good | Y |  |  |
| 3157 | should return healthy for full health | funct | good | Y |  |  |
| 3158 | should return wounded for 70% health | funct | good | Y |  |  |
| 3159 | should return badly_wounded for 30% health | funct | good | Y |  |  |
| 3160 | should return near_death for 10% health | funct | good | Y |  |  |
| 3161 | should return unconscious for unconscious entity | funct | good | Y |  |  |
| 3162 | should return dead for dead entity | funct | good | Y |  |  |
| 3163 | should return healthy for non-combatant | funct | good | Y |  |  |
| 3164 | should create a combat service | struc | adeq | Y |  |  |
### lang-en-us

#### coverage-improvements.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2865 | should preserve all uppercase for irregular plurals | funct | good | Y |  |  |
| 2866 | should preserve title case for irregular plurals | funct | good | Y |  |  |
| 2867 | should handle uppercase -y to -ies conversion | funct | good | Y |  |  |
| 2868 | should handle -f to -ves conversion | funct | good | Y |  |  |
| 2869 | should return empty inventory message | funct | good | Y |  |  |
| 2870 | should format inventory without worn items | funct | good | Y |  |  |
| 2871 | should format inventory with worn items | funct | good | Y |  |  |
| 2872 | should handle single item | funct | good | Y |  |  |
| 2873 | should handle single worn item | funct | good | Y |  |  |
| 2874 | should return description without items | funct | good | Y |  |  |
| 2875 | should add single item to description | funct | good | Y |  |  |
| 2876 | should add multiple items to description | funct | good | Y |  |  |
| 2877 | should handle two items | funct | good | Y |  |  |
| 2878 | should return empty container message | funct | good | Y |  |  |
| 2879 | should format single item in container | funct | good | Y |  |  |
| 2880 | should format multiple items in container | funct | good | Y |  |  |
| 2881 | should work with different container names | funct | good | Y |  |  |
#### formatters.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2882 | should parse simple placeholder | funct | good | Y |  |  |
| 2883 | should parse placeholder with one formatter | funct | good | Y |  |  |
| 2884 | should parse placeholder with multiple formatters | funct | good | Y |  |  |
| 2885 | should parse chained formatters | funct | good | Y |  |  |
| 2886 | should add "a" before consonant | funct | good | Y |  |  |
| 2887 | should add "an" before vowel | funct | good | Y |  |  |
| 2888 | should handle special cases | funct | good | Y |  |  |
| 2889 | should handle proper nouns (no article) | funct | good | Y |  |  |
| 2890 | should handle mass nouns (some) | funct | good | Y |  |  |
| 2891 | should handle unique nouns (the) | funct | good | Y |  |  |
| 2892 | should handle plural nouns (no article) | funct | good | Y |  |  |
| 2893 | should add "the" to common nouns | funct | good | Y |  |  |
| 2894 | should not add article to proper nouns | funct | good | Y |  |  |
| 2895 | should add "some" to nouns | funct | good | Y |  |  |
| 2896 | should return empty string for empty array | funct | good | Y |  |  |
| 2897 | should return single item unchanged | funct | good | Y |  |  |
| 2898 | should join two items with "and" | funct | good | Y |  |  |
| 2899 | should join three items with commas and "and" | funct | good | Y |  |  |
| 2900 | should join four items with commas and "and" | funct | good | Y |  |  |
| 2901 | should join two items with "or" | funct | good | Y |  |  |
| 2902 | should join three items with commas and "or" | funct | good | Y |  |  |
| 2903 | should capitalize first letter | funct | good | Y |  |  |
| 2904 | should convert to uppercase | funct | good | Y |  |  |
| 2905 | should substitute simple placeholders | funct | good | Y |  |  |
| 2906 | should apply single formatter | funct | good | Y |  |  |
| 2907 | should apply article formatter with vowel | funct | good | Y |  |  |
| 2908 | should apply list formatter | funct | good | Y |  |  |
| 2909 | should apply "the" formatter | funct | good | Y |  |  |
| 2910 | should handle multiple placeholders | funct | good | Y |  |  |
| 2911 | should handle cap formatter | funct | good | Y |  |  |
| 2912 | should leave unknown placeholders unchanged | funct | good | Y |  |  |
| 2913 | should apply formatters in sequence | funct | good | Y |  |  |
| 2914 | should handle unknown formatters gracefully | funct | good | Y |  |  |
#### integration.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2915 | should lemmatize and identify ignore words | behav | good | Y |  |  |
| 2916 | should handle complex text transformations | behav | good | Y |  |  |
| 2917 | should format lists with proper articles | behav | good | Y |  |  |
| 2918 | should find verbs by lemmatized forms | behav | good | Y |  |  |
| 2919 | should expand abbreviations and find directions | behav | good | Y |  |  |
| 2920 | should categorize words correctly | behav | good | Y |  |  |
| 2921 | should identify pattern types for common commands | struc | adeq | Y |  |  |
| 2922 | should handle all placeholder types correctly | funct | poor | Y |  | Replace manual string.replace with actual formatMessage call to test the real sy |
| 2923 | should handle empty inputs gracefully | funct | good | Y |  |  |
| 2924 | should handle special characters | funct | good | Y |  |  |
| 2925 | should handle very long inputs | funct | adeq | Y |  |  |
| 2926 | should process common IF commands | behav | poor | Y |  | Assert specific lemmatized values rather than just toBeDefined |
| 2927 | should handle compound objects | behav | adeq | Y |  |  |
| 2928 | should handle repeated operations efficiently | funct | adeq | Y |  |  |
| 2929 | should handle large vocabulary lookups efficiently | funct | adeq | Y |  |  |
| 2930 | should provide all required language provider methods | struc | adeq | Y |  |  |
| 2931 | should return data in expected formats | struc | adeq | Y |  |  |
#### language-provider.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2932 | should have correct language code | funct | good | Y |  |  |
| 2933 | should have correct language name | funct | good | Y |  |  |
| 2934 | should have correct text direction | funct | good | Y |  |  |
| 2935 | should return an array of verb vocabularies | struc | adeq | Y |  |  |
| 2936 | should have valid structure for each verb | struc | good | Y |  |  |
| 2937 | should include common IF verbs | funct | good | Y |  |  |
| 2938 | should have correct patterns | funct | good | Y |  |  |
| 2939 | should include prepositions for verbs that allow indirect objects | funct | good | Y |  |  |
| 2940 | should return an array of direction vocabularies | struc | adeq | Y |  |  |
| 2941 | should include all cardinal directions | funct | good | Y |  |  |
| 2942 | should include ordinal directions | funct | good | Y |  |  |
| 2943 | should include vertical directions | funct | good | Y |  |  |
| 2944 | should have abbreviations for common directions | funct | good | Y |  |  |
| 2945 | should have valid structure for each direction | struc | good | Y |  |  |
| 2946 | should return a valid special vocabulary object | struc | adeq | Y |  |  |
| 2947 | should include standard English articles | funct | good | Y |  |  |
| 2948 | should include common pronouns | funct | good | Y |  |  |
| 2949 | should include all-words | funct | good | Y |  |  |
| 2950 | should include except-words | funct | good | Y |  |  |
| 2951 | should return an array of adjectives | struc | adeq | Y |  |  |
| 2952 | should include size adjectives | funct | good | Y |  |  |
| 2953 | should include color adjectives | funct | good | Y |  |  |
| 2954 | should include state adjectives | funct | good | Y |  |  |
| 2955 | should return an array of nouns | struc | adeq | Y |  |  |
| 2956 | should include common IF objects | funct | good | Y |  |  |
| 2957 | should return an array of prepositions | struc | adeq | Y |  |  |
| 2958 | should include common spatial prepositions | funct | good | Y |  |  |
| 2959 | should return an array of grammar patterns | struc | adeq | Y |  |  |
| 2960 | should have valid structure for each pattern | struc | good | Y |  |  |
| 2961 | should include basic verb patterns | funct | good | Y |  |  |
| 2962 | should have decreasing priorities | funct | good | Y |  |  |
| 2963 | should have valid examples | funct | good | Y |  |  |
#### text-processing.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2964 | should remove simple -s endings | funct | good | Y |  |  |
| 2965 | should not remove -s from words ending in -ss | funct | good | Y |  |  |
| 2966 | should handle short words correctly | funct | good | Y |  |  |
| 2967 | should remove -es endings | funct | good | Y |  |  |
| 2968 | should handle short words with -es | funct | good | Y |  |  |
| 2969 | should convert -ies to -y | funct | good | Y |  |  |
| 2970 | should not convert short words | funct | good | Y |  |  |
| 2971 | should remove -ed endings | funct | good | Y |  |  |
| 2972 | should handle short words correctly | funct | good | Y |  |  |
| 2973 | should remove -ing endings | funct | good | Y |  |  |
| 2974 | should handle short words correctly | funct | good | Y |  |  |
| 2975 | should handle common irregular plurals | funct | good | Y |  |  |
| 2976 | should handle uppercase words | funct | good | Y |  |  |
| 2977 | should handle mixed case | funct | good | Y |  |  |
| 2978 | should not change words that are already lemmatized | funct | good | Y |  |  |
| 2979 | should add -s to regular nouns | funct | good | Y |  |  |
| 2980 | should add -es to words ending in s, x, z | funct | good | Y |  |  |
| 2981 | should add -es to words ending in ch, sh | funct | good | Y |  |  |
| 2982 | should change y to ies after consonant | funct | good | Y |  |  |
| 2983 | should add -s after vowel + y | funct | good | Y |  |  |
| 2984 | should change -f to -ves | funct | good | Y |  |  |
| 2985 | should change -fe to -ves | funct | good | Y |  |  |
| 2986 | should handle common irregular plurals | funct | good | Y |  |  |
| 2987 | should preserve case of original word | funct | good | Y |  |  |
| 2988 | should return "a" for words starting with consonants | funct | good | Y |  |  |
| 2989 | should return "an" for words starting with vowels | funct | good | Y |  |  |
| 2990 | should handle silent h words | funct | good | Y |  |  |
| 2991 | should handle u words with y sound | funct | good | Y |  |  |
| 2992 | should handle words starting with "one" | funct | good | Y |  |  |
| 2993 | should handle uppercase words | funct | good | Y |  |  |
| 2994 | should expand cardinal directions | funct | good | Y |  |  |
| 2995 | should expand ordinal directions | funct | good | Y |  |  |
| 2996 | should expand vertical directions | funct | good | Y |  |  |
| 2997 | should expand common command abbreviations | funct | good | Y |  |  |
| 2998 | should return null for unknown abbreviations | funct | good | Y |  |  |
| 2999 | should be case insensitive | funct | good | Y |  |  |
| 3000 | should return empty string for empty list | funct | good | Y |  |  |
| 3001 | should return single item unchanged | funct | good | Y |  |  |
| 3002 | should use "and" by default | funct | good | Y |  |  |
| 3003 | should use "or" when specified | funct | good | Y |  |  |
| 3004 | should use Oxford comma with "and" | funct | good | Y |  |  |
| 3005 | should use Oxford comma with "or" | funct | good | Y |  |  |
| 3006 | should handle longer lists | funct | good | Y |  |  |
| 3007 | should handle items with special characters | funct | good | Y |  |  |
| 3008 | should preserve item casing | funct | good | Y |  |  |
| 3009 | should identify common ignore words | funct | good | Y |  |  |
| 3010 | should not identify non-ignore words | funct | good | Y |  |  |
| 3011 | should be case insensitive | funct | good | Y |  |  |
| 3012 | should handle empty strings | funct | good | Y |  |  |
#### grammar.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 3013 | should define all expected parts of speech | struc | good | Y |  |  |
| 3014 | should be a const object | struc | good | Y |  |  |
| 3015 | should have unique values | struc | good | Y |  |  |
| 3016 | type should correctly represent all values | struc | adeq | Y |  |  |
| 3017 | should define all expected patterns | struc | good | Y |  |  |
| 3018 | each pattern should have required properties | struc | good | Y |  |  |
| 3019 | pattern names should match object keys | struc | good | Y |  |  |
| 3020 | examples should follow their patterns | funct | good | Y |  |  |
| 3021 | type should represent all pattern names | struc | adeq | Y |  |  |
| 3022 | should identify definite and indefinite articles | funct | good | Y |  |  |
| 3023 | should be case-insensitive | funct | good | Y |  |  |
| 3024 | should reject non-articles | funct | good | Y |  |  |
| 3025 | should identify quantifiers | funct | good | Y |  |  |
| 3026 | should identify demonstratives | funct | good | Y |  |  |
| 3027 | should identify possessives | funct | good | Y |  |  |
| 3028 | should identify quantity determiners | funct | good | Y |  |  |
| 3029 | should be case-insensitive | funct | good | Y |  |  |
| 3030 | should reject non-determiners | funct | good | Y |  |  |
| 3031 | should identify personal pronouns | funct | good | Y |  |  |
| 3032 | should identify reflexive pronouns | funct | good | Y |  |  |
| 3033 | should identify demonstrative pronouns | funct | good | Y |  |  |
| 3034 | should identify interrogative pronouns | funct | good | Y |  |  |
| 3035 | should be case-insensitive | funct | good | Y |  |  |
| 3036 | should reject non-pronouns | funct | good | Y |  |  |
| 3037 | should identify coordinating conjunctions | funct | good | Y |  |  |
| 3038 | should identify subordinating conjunctions | funct | good | Y |  |  |
| 3039 | should be case-insensitive | funct | good | Y |  |  |
| 3040 | should reject non-conjunctions | funct | good | Y |  |  |
| 3041 | should return "a" for consonant-starting words | funct | good | Y |  |  |
| 3042 | should return "an" for vowel-starting words | funct | good | Y |  |  |
| 3043 | should handle silent h words | funct | good | Y |  |  |
| 3044 | should handle u words that sound like "you" | funct | good | Y |  |  |
| 3045 | should be case-insensitive | funct | good | Y |  |  |
| 3046 | all patterns should have valid element types | struc | good | Y |  |  |
| 3047 | patterns should be internally consistent | struc | good | Y |  |  |
| 3048 | grammar utils should handle empty strings | funct | good | Y |  |  |
| 3049 | getIndefiniteArticle should handle edge cases | funct | good | Y |  |  |
| 3050 | types should support partial data | tauto | dead | Y |  | Remove - tautological, asserts values that were just assigned to local variables |
#### placeholder-resolver.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 3051 | should resolve {You} to "You" | funct | good | Y |  |  |
| 3052 | should resolve {your} to "your" | funct | good | Y |  |  |
| 3053 | should resolve {yourself} to "yourself" | funct | good | Y |  |  |
| 3054 | should resolve {You're} to "You're" | funct | good | Y |  |  |
| 3055 | should conjugate verbs in base form | funct | good | Y |  |  |
| 3056 | should resolve {You} to "I" | funct | good | Y |  |  |
| 3057 | should resolve {your} to "my" | funct | good | Y |  |  |
| 3058 | should resolve {yourself} to "myself" | funct | good | Y |  |  |
| 3059 | should resolve {You're} to "I'm" | funct | good | Y |  |  |
| 3060 | should conjugate verbs in base form | funct | good | Y |  |  |
| 3061 | should resolve {You} to "She" | funct | good | Y |  |  |
| 3062 | should resolve {your} to "her" | funct | good | Y |  |  |
| 3063 | should resolve {yourself} to "herself" | funct | good | Y |  |  |
| 3064 | should resolve {You're} to "She's" | funct | good | Y |  |  |
| 3065 | should conjugate verbs with 3rd person singular | funct | good | Y |  |  |
| 3066 | should resolve {You} to "They" | funct | good | Y |  |  |
| 3067 | should resolve {your} to "their" | funct | good | Y |  |  |
| 3068 | should keep verbs in base form for plural | funct | good | Y |  |  |
| 3069 | should resolve {You're} to "They're" | funct | good | Y |  |  |
| 3070 | should not affect {item} placeholder | funct | good | Y |  |  |
| 3071 | should not affect {target} placeholder | funct | good | Y |  |  |
| 3072 | should add -s for 3rd person singular | funct | good | Y |  |  |
| 3073 | should add -es for verbs ending in -s, -sh, -ch, -x, -z | funct | good | Y |  |  |
| 3074 | should change -y to -ies for consonant + y | funct | good | Y |  |  |
| 3075 | should handle "have" correctly | funct | good | Y |  |  |
| 3076 | should handle "be" correctly | funct | good | Y |  |  |
| 3077 | should handle "do" correctly | funct | good | Y |  |  |
| 3078 | should handle modals (no change) | funct | good | Y |  |  |
| 3079 | should use base form for plural verbs | funct | good | Y |  |  |
### parser-en-us

#### action-grammar-builder.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2571 | should generate patterns for multiple verbs with single pattern | funct | good | Y |  |  |
| 2572 | should generate patterns for multiple verbs with multiple patterns | funct | good | Y |  |  |
| 2573 | should generate standalone verb patterns when no pattern template | funct | good | Y |  |  |
| 2574 | should apply where constraints to all generated patterns | funct | good | Y |  |  |
| 2575 | should apply priority to all generated patterns | funct | good | Y |  |  |
| 2576 | should apply default semantics to all generated patterns | funct | good | Y |  |  |
| 2577 | should generate direction patterns with aliases | funct | good | Y |  |  |
| 2578 | should attach direction semantics to direction patterns | funct | good | Y |  |  |
| 2579 | should use lower priority for single-character abbreviations | funct | good | Y |  |  |
| 2580 | should handle verbs, patterns, and directions together | funct | good | Y |  |  |
| 2581 | should match patterns generated by forAction | behav | good | Y |  |  |
| 2582 | should match direction patterns with semantics | behav | good | Y |  |  |
#### adr-080-grammar-enhancements.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2583 | should compile pattern with greedy slot syntax | funct | good | Y |  |  |
| 2584 | should extract slot name correctly from greedy pattern | funct | good | Y |  |  |
| 2585 | should validate greedy slot patterns | funct | good | Y |  |  |
| 2586 | should compile bounded greedy pattern | funct | good | Y |  |  |
| 2587 | should handle optional greedy slots | funct | good | Y |  |  |
| 2588 | should mark slot as TEXT type via .text() | funct | good | Y |  |  |
| 2589 | should allow mixing .text() and .where() | funct | good | Y |  |  |
| 2590 | should mark slot as INSTRUMENT type via .instrument() | funct | good | Y |  |  |
| 2591 | should allow .instrument() with .where() | funct | good | Y |  |  |
| 2592 | should consume single token for TEXT slot | funct | good | Y |  |  |
| 2593 | should consume multiple tokens for TEXT_GREEDY slot | funct | good | Y |  |  |
| 2594 | should stop greedy consumption at delimiter | funct | good | Y |  |  |
| 2595 | should mark slot as instrument type | funct | good | Y |  |  |
| 2596 | should recognize "all" and set isAll flag | funct | good | Y |  |  |
| 2597 | should parse "all but X" with exclusion | funct | good | Y |  |  |
| 2598 | should parse "all except X and Y" with multiple exclusions | funct | good | Y |  |  |
| 2599 | should parse "X and Y" as list | funct | good | Y |  |  |
| 2600 | should parse "X, Y, and Z" style list | funct | good | Y |  |  |
| 2601 | should parse list with multi-word items | funct | good | Y |  |  |
| 2602 | should stop list at pattern delimiter | funct | good | Y |  |  |
| 2603 | should split on periods | behav | good | Y |  |  |
| 2604 | should handle trailing period | behav | good | Y |  |  |
| 2605 | should handle single command without period | behav | good | Y |  |  |
| 2606 | should preserve quoted strings containing periods | behav | adeq | Y |  |  |
| 2607 | should split comma when followed by verb | behav | good | Y |  |  |
| 2608 | should NOT split comma when followed by noun (treat as list) | behav | good | Y |  |  |
| 2609 | should handle multiple periods | behav | good | Y |  |  |
| 2610 | should handle errors in chain without stopping | behav | good | Y |  |  |
| 2611 | should mark slot as VOCABULARY type via .fromVocabulary() | funct | good | Y |  |  |
| 2612 | should match vocabulary slot when category is active | behav | good | Y |  |  |
| 2613 | should not match vocabulary slot when category is inactive | behav | good | Y |  |  |
| 2614 | should mark slot as MANNER type via .manner() | funct | good | Y |  |  |
| 2615 | should match built-in manner adverbs | behav | good | Y |  |  |
| 2616 | should match multiple built-in manner adverbs | behav | good | Y |  |  |
| 2617 | should match story-extended manner adverbs | behav | good | Y |  |  |
| 2618 | should not match non-manner words | behav | good | Y |  |  |
#### adr-082-typed-slots.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2619 | should match digit numbers | funct | good | Y |  |  |
| 2620 | should match number words | funct | good | Y |  |  |
| 2621 | should not match non-numbers | funct | good | Y |  |  |
| 2622 | should extract numeric value from digit | funct | good | Y |  |  |
| 2623 | should extract numeric value from word | funct | good | Y |  |  |
| 2624 | should match ordinal words | funct | good | Y |  |  |
| 2625 | should match suffixed ordinals (1st, 2nd, 3rd) | funct | good | Y |  |  |
| 2626 | should extract ordinal value from word | funct | good | Y |  |  |
| 2627 | should match time in HH:MM format | funct | good | Y |  |  |
| 2628 | should extract time components | funct | good | Y |  |  |
| 2629 | should not match invalid time formats | funct | good | Y |  |  |
| 2630 | should match cardinal directions | funct | good | Y |  |  |
| 2631 | should match abbreviated directions | funct | good | Y |  |  |
| 2632 | should match ordinal directions (ne, sw, etc.) | funct | good | Y |  |  |
| 2633 | should match up/down directions | funct | good | Y |  |  |
| 2634 | should match single-token quoted text | funct | good | Y |  |  |
| 2635 | should consume words until pattern delimiter | funct | good | Y |  |  |
| 2636 | should consume to end if no delimiter | funct | good | Y |  |  |
| 2637 | should handle multiple typed slots in one pattern | funct | good | Y |  |  |
| 2638 | should handle ordinal with entity pattern | funct | good | Y |  |  |
#### colored-buttons.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2639 | should parse "push blue" using alias | behav | good | Y |  |  |
| 2640 | should parse "press yellow" using alias | behav | good | Y |  |  |
| 2641 | should parse "push blue button" using full name | behav | good | Y |  |  |
| 2642 | should parse "press yellow button" using full name | behav | good | Y |  |  |
| 2643 | should parse "push the blue button" with article | behav | good | Y |  |  |
| 2644 | should handle "push button" when multiple buttons exist | behav | poor | Y |  | Add concrete assertions for disambiguation behavior instead of just logging |
| 2645 | should handle "press button" when multiple buttons exist | behav | poor | Y |  | Add concrete assertions for disambiguation behavior instead of just logging |
| 2646 | should list all visible entities for debugging | struc | adeq | Y |  |  |
| 2647 | should show what text is captured for "push blue button" | funct | poor | Y |  | Convert debug logging to proper assertions or remove as they are exploratory/deb |
| 2648 | should show what text is captured for "push blue" | funct | poor | Y |  | Convert debug logging to proper assertions or remove as they are exploratory/deb |
#### direction-vocabulary.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2649 | should parse compass words | funct | good | Y |  |  |
| 2650 | should parse compass abbreviations | funct | good | Y |  |  |
| 2651 | should return compass display names | funct | good | Y |  |  |
| 2652 | should not parse naval words | funct | good | Y |  |  |
| 2653 | should parse naval words | funct | good | Y |  |  |
| 2654 | should parse naval abbreviations | funct | good | Y |  |  |
| 2655 | should parse naval synonyms | funct | good | Y |  |  |
| 2656 | should return naval display names | funct | good | Y |  |  |
| 2657 | should no longer parse compass words | funct | good | Y |  |  |
| 2658 | should not have diagonal directions | funct | good | Y |  |  |
| 2659 | should still parse in/out | funct | good | Y |  |  |
| 2660 | should parse only vertical and threshold directions | funct | good | Y |  |  |
| 2661 | should parse minimal synonyms | funct | good | Y |  |  |
| 2662 | should reject all compass directions | funct | good | Y |  |  |
| 2663 | should reject naval directions | funct | good | Y |  |  |
| 2664 | should return minimal display names | funct | good | Y |  |  |
| 2665 | should switch from compass to naval and back | behav | good | Y | Y |  |
| 2666 | should update display names on switch | behav | good | Y | Y |  |
| 2667 | should return compass grammar map by default | funct | good | Y |  |  |
| 2668 | should return naval grammar map after switching | funct | good | Y |  |  |
| 2669 | should not include diagonals in naval grammar map | funct | good | Y |  |  |
| 2670 | should only include 4 directions in minimal grammar map | funct | good | Y |  |  |
| 2671 | should handle uppercase input | funct | good | Y |  |  |
| 2672 | should handle mixed case input | funct | good | Y |  |  |
| 2673 | should handle whitespace | funct | good | Y |  |  |
| 2674 | should return null for empty input | funct | good | Y |  |  |
| 2675 | should fall back to lowercase constant for display | funct | good | Y |  |  |
#### english-grammar-engine.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2676 | should match simple verb patterns | funct | good | Y |  |  |
| 2677 | should match verb-noun patterns | funct | good | Y |  |  |
| 2678 | should match patterns with alternates | funct | good | Y |  |  |
| 2679 | should not match incorrect patterns | funct | good | Y |  |  |
| 2680 | should extract single slots correctly | funct | good | Y |  |  |
| 2681 | should extract multiple slots correctly | funct | good | Y |  |  |
| 2682 | should handle multi-word slots | funct | good | Y |  |  |
| 2683 | should respect rule priorities | funct | good | Y |  |  |
| 2684 | should calculate confidence based on alternate matches | funct | good | Y |  |  |
| 2685 | should handle empty token lists | funct | good | Y |  |  |
| 2686 | should handle patterns longer than token list | funct | good | Y |  |  |
| 2687 | should require exact token count match | funct | good | Y |  |  |
| 2688 | should find all matching rules | funct | good | Y |  |  |
| 2689 | should limit matches based on maxMatches option | funct | good | Y |  |  |
#### english-pattern-compiler.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2690 | should compile simple literal patterns | funct | good | Y |  |  |
| 2691 | should compile patterns with slots | funct | good | Y |  |  |
| 2692 | should compile patterns with alternates | funct | good | Y |  |  |
| 2693 | should handle multiple slots | funct | good | Y |  |  |
| 2694 | should handle complex patterns | funct | good | Y |  |  |
| 2695 | should validate correct patterns | funct | good | Y |  |  |
| 2696 | should reject empty patterns | funct | good | Y |  |  |
| 2697 | should reject patterns with empty alternates | funct | good | Y |  |  |
| 2698 | should reject invalid slot names | funct | good | Y |  |  |
| 2699 | should accept valid slot names | funct | good | Y |  |  |
| 2700 | should extract slot names from patterns | funct | good | Y |  |  |
| 2701 | should handle patterns with no slots | funct | good | Y |  |  |
| 2702 | should not duplicate slot names | funct | good | Y |  |  |
| 2703 | should throw on invalid pattern compilation | funct | good | Y |  |  |
| 2704 | should throw on duplicate slot names | funct | good | Y |  |  |
| 2705 | should handle patterns with many alternates | funct | good | Y |  |  |
| 2706 | should handle patterns with underscores in slot names | funct | good | Y |  |  |
| 2707 | should preserve case in literals but not slots | funct | good | Y |  |  |
#### grammar-lang-sync.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2708 | should have grammar patterns for all core actions | struc | good | Y |  |  |
| 2709 | should have lang-en-us definitions for all core actions | struc | good | Y |  |  |
| 2710 | should have matching verbs for taking action | struc | good | Y |  |  |
| 2711 | should have matching verbs for examining action | struc | good | Y |  |  |
| 2712 | should have matching verbs for going action (directions) | struc | good | Y |  |  |
#### grammar-scope-cross-location.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2713 | should parse examine for entities in current location | behav | good | Y |  |  |
| 2714 | should parse examine regardless of player location | behav | good | Y |  |  |
| 2715 | should see entities in adjacent locations with nearby scope | behav | good | Y |  |  |
| 2716 | should see carried items regardless of location | behav | good | Y |  |  |
#### grammar-scope.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2717 | should match visible entities in take command | behav | good | Y |  |  |
| 2718 | should parse take command even for invisible entities (scope checked i | behav | good | Y |  |  |
| 2719 | should match give command with animate recipient (trait constraint) | behav | good | Y |  |  |
| 2720 | should parse give command even when item not carried (scope checked in | behav | good | Y |  |  |
| 2721 | should parse give command when item is carried | behav | good | Y |  |  |
| 2722 | should parse take command for any entity (portability checked in actio | behav | good | Y |  |  |
| 2723 | should match throw command with carried item at visible target | behav | good | Y |  |  |
#### improved-error-messages.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2724 | should return NO_VERB for empty input | funct | good | Y |  |  |
| 2725 | should return UNKNOWN_VERB when no patterns matched first token | funct | good | Y |  |  |
| 2726 | should return MISSING_OBJECT when verb matched but slot failed due to  | funct | good | Y |  |  |
| 2727 | should return ENTITY_NOT_FOUND when slot could not resolve entity | funct | good | Y |  |  |
| 2728 | should return SCOPE_VIOLATION when entity found but out of scope | funct | good | Y |  |  |
| 2729 | should return AMBIGUOUS_INPUT when multiple entities match | funct | good | Y |  |  |
| 2730 | should prefer higher progress failures | funct | good | Y |  |  |
| 2731 | should return INVALID_SYNTAX for leftover tokens | funct | good | Y |  |  |
| 2732 | should return MISSING_INDIRECT for missing indirect object slot | funct | good | Y |  |  |
#### parser-integration.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2733 | should parse simple verb commands | behav | good | Y |  |  |
| 2734 | should parse verb-noun commands | behav | good | Y |  |  |
| 2735 | should parse verb-noun-prep-noun commands | behav | good | Y |  |  |
| 2736 | should parse the famous "hang cloak on hook" command | behav | good | Y |  |  |
| 2737 | should parse bare direction commands | behav | good | Y |  |  |
| 2738 | should parse direction abbreviations | behav | good | Y |  |  |
| 2739 | should parse "go direction" commands | behav | good | Y |  |  |
| 2740 | should parse "pick up" as a compound verb | behav | good | Y |  |  |
| 2741 | should parse "turn on" and "turn off" | behav | good | Y |  |  |
| 2742 | should handle multiple preposition alternatives | behav | good | Y |  |  |
| 2743 | should handle "on" vs "onto" prepositions | behav | good | Y |  |  |
| 2744 | should recognize all registered prepositions | funct | adeq | Y |  |  |
| 2745 | should handle unrecognized patterns | funct | good | Y |  |  |
| 2746 | should handle empty input | funct | good | Y |  |  |
| 2747 | should handle whitespace-only input | funct | good | Y |  |  |
| 2748 | should allow registration of custom grammar rules | behav | good | Y |  |  |
| 2749 | should parse "give item to recipient" commands | behav | good | Y |  |  |
| 2750 | should parse "give recipient item" commands | behav | good | Y |  |  |
| 2751 | should parse "show item to recipient" commands | behav | good | Y |  |  |
| 2752 | should parse "throw item at target" commands | behav | good | Y |  |  |
| 2753 | should handle multi-word noun phrases | behav | good | Y |  |  |
| 2754 | should handle articles in noun phrases | behav | good | Y |  |  |
| 2755 | should handle noun phrases with prepositions | behav | good | Y |  |  |
| 2756 | should parse "look at target" without optional adverb | behav | good | Y |  |  |
| 2757 | should parse "look carefully at target" with optional adverb | behav | good | Y |  |  |
| 2758 | should parse "look" without optional "around" | behav | good | Y |  |  |
| 2759 | should parse "look around" with optional "around" | behav | good | Y |  |  |
| 2760 | should parse "search" without optional adverb | behav | good | Y |  |  |
| 2761 | should parse "search carefully" with optional adverb | behav | good | Y |  |  |
| 2762 | should parse "say hello" | behav | good | Y |  |  |
| 2763 | should parse "say hello world to guard" | behav | good | Y |  |  |
| 2764 | should parse "write message" | behav | good | Y |  |  |
| 2765 | should parse "write message on paper" | behav | good | Y |  |  |
| 2766 | should parse "shout message" | behav | good | Y |  |  |
| 2767 | should parse "whisper message to recipient" | behav | good | Y |  |  |
| 2768 | should handle empty quoted strings | behav | good | Y |  |  |
| 2769 | should handle quoted strings with special characters | behav | good | Y |  |  |
| 2770 | should parse "take item from container with tool" | behav | good | N |  | Tests are failing - investigate whether grammar patterns for instrument slots ar |
| 2771 | should parse "unlock door with key" | behav | good | N |  | Tests are failing - investigate whether grammar patterns for instrument slots ar |
| 2772 | should parse "cut rope with knife" | behav | good | N |  | Tests are failing - investigate whether grammar patterns for instrument slots ar |
| 2773 | should parse "attack goblin with sword" | behav | good | N |  | Tests are failing - investigate whether grammar patterns for instrument slots ar |
| 2774 | should parse "open chest with crowbar" | behav | good | N |  | Tests are failing - investigate whether grammar patterns for instrument slots ar |
| 2775 | should parse "dig hole with shovel" | behav | good | N |  | Tests are failing - investigate whether grammar patterns for instrument slots ar |
#### pronoun-context.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2776 | should recognize standard object pronouns | funct | good | Y |  |  |
| 2777 | should recognize neopronouns | funct | good | Y |  |  |
| 2778 | should be case-insensitive | funct | good | Y |  |  |
| 2779 | should not recognize non-pronoun words | funct | good | Y |  |  |
| 2780 | should have correct INANIMATE_IT values | struc | good | Y |  |  |
| 2781 | should have correct INANIMATE_THEM values | struc | good | Y |  |  |
| 2782 | should return null when no context is set | funct | good | Y |  |  |
| 2783 | should resolve "it" to inanimate singular entity | funct | good | Y | Y |  |
| 2784 | should resolve "him" to he/him actor | funct | good | Y | Y |  |
| 2785 | should resolve "her" to she/her actor | funct | good | Y | Y |  |
| 2786 | should resolve "them" to plural inanimate first | funct | good | Y | Y |  |
| 2787 | should resolve "them" to they/them actor when no plural | funct | good | Y | Y |  |
| 2788 | should resolve neopronouns | funct | good | Y | Y |  |
| 2789 | should clear all pronoun references | funct | good | Y | Y |  |
| 2790 | should register inanimate entity for "it" | funct | good | Y | Y |  |
| 2791 | should register plural inanimate for "them" | funct | good | Y | Y |  |
| 2792 | should register actor by their object pronoun | funct | good | Y | Y |  |
| 2793 | should register all pronouns for actor with multiple pronoun sets | funct | good | Y | Y |  |
| 2794 | should store last command for "again" support | funct | good | Y | Y |  |
#### push-panel-pattern.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2795 | should match literal "push red panel" over "push :target" | behav | good | Y |  |  |
| 2796 | should match shorter "push red" literal pattern | behav | good | Y |  |  |
| 2797 | should still match core push for non-panel targets | behav | good | Y |  |  |
| 2798 | should prefer higher priority story pattern over lower priority core p | behav | good | Y |  |  |
| 2799 | should prefer literal pattern over slot pattern with same priority | behav | adeq | Y |  |  |
#### slot-consumer-registry.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2812 | should start empty | funct | good | Y |  |  |
| 2813 | should register a consumer for its declared slot types | funct | good | Y | Y |  |
| 2814 | should throw when consuming with unregistered slot type | funct | good | Y |  |  |
| 2815 | should delegate to registered consumer | funct | good | Y |  |  |
| 2816 | should have all slot types registered | struc | good | Y |  |  |
| 2817 | should return all registered types | struc | good | Y |  |  |
#### text-slot-consumer.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2818 | should consume single token | funct | good | Y |  |  |
| 2819 | should return null for empty tokens | funct | good | Y |  |  |
| 2820 | should return null when start index is out of bounds | funct | good | Y |  |  |
| 2821 | should consume all tokens to end | funct | good | Y |  |  |
| 2822 | should stop at pattern delimiter | funct | good | Y |  |  |
| 2823 | should consume single-token quoted text | funct | good | Y |  |  |
| 2824 | should consume multi-token quoted text | funct | good | Y |  |  |
| 2825 | should return null for unquoted text | funct | good | Y |  |  |
| 2826 | should return null for unclosed quote | funct | good | Y |  |  |
| 2827 | should consume tokens until delimiter | funct | good | Y |  |  |
| 2828 | should consume all tokens if no delimiter | funct | good | Y |  |  |
#### typed-slot-consumer.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2829 | should match digit numbers | funct | good | Y |  |  |
| 2830 | should match number words | funct | good | Y |  |  |
| 2831 | should not match non-numbers | funct | good | Y |  |  |
| 2832 | should match ordinal words | funct | good | Y |  |  |
| 2833 | should match suffixed ordinals | funct | good | Y |  |  |
| 2834 | should not match non-ordinals | funct | good | Y |  |  |
| 2835 | should match valid time formats | funct | good | Y |  |  |
| 2836 | should not match invalid time formats | funct | good | Y |  |  |
| 2837 | should match cardinal directions | funct | good | Y |  |  |
| 2838 | should match abbreviated directions | funct | good | Y |  |  |
| 2839 | should match up/down | funct | good | Y |  |  |
| 2840 | should not match non-directions | funct | good | Y |  |  |
#### story-grammar.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2800 | should register a simple story pattern | behav | good | Y |  |  |
| 2801 | should register pattern with constraints | behav | good | Y |  |  |
| 2802 | should allow .direction() for direction-constrained slots | behav | good | Y |  |  |
| 2803 | should allow .text() for raw text capture | behav | good | Y |  |  |
| 2804 | should handle multi-slot story patterns | behav | good | Y |  |  |
#### english-parser.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2841 | should parse verb-only command | behav | good | Y |  |  |
| 2842 | should parse verb-noun command | behav | good | Y |  |  |
| 2843 | should parse direction-only command | behav | good | Y |  |  |
| 2844 | should parse verb-noun-prep-noun command | behav | good | Y |  |  |
| 2845 | should preserve articles in text | behav | good | Y |  |  |
| 2846 | should handle multiple articles | behav | good | Y |  |  |
| 2847 | should expand verb abbreviations | behav | good | Y |  |  |
| 2848 | should expand direction abbreviations | behav | good | Y |  |  |
| 2849 | should handle unknown verb | funct | good | Y |  |  |
| 2850 | should handle empty input | funct | good | Y |  |  |
| 2851 | should handle pattern mismatch | funct | adeq | S |  | Test is skipped - investigate why take in box is parsing successfully and fix or |
| 2852 | should tokenize simple input | funct | good | Y |  |  |
| 2853 | should handle case normalization | funct | good | Y |  |  |
| 2854 | should track token positions | funct | good | Y |  |  |
| 2855 | should emit tokenize debug event | funct | good | Y |  |  |
| 2856 | should emit pattern match debug event | funct | good | Y |  |  |
| 2857 | should emit candidate selection debug event | funct | good | Y |  |  |
| 2858 | should emit parse error debug event on failure | funct | good | Y |  |  |
| 2859 | should return multiple candidates | funct | adeq | S |  | Test is skipped - parseWithErrors needs updating for new grammar engine |
| 2860 | should include partial matches | funct | good | Y |  |  |
| 2861 | should filter by confidence | funct | good | Y |  |  |
| 2862 | should handle multi-word nouns | behav | good | Y |  |  |
| 2863 | should handle compound verbs | behav | good | Y |  |  |
| 2864 | should choose highest confidence pattern | behav | adeq | S |  | Test is skipped - put down without object pattern matching needs investigation |
#### walk-through-pattern.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2805 | should match literal "walk through south wall" pattern | funct | good | Y |  |  |
| 2806 | should match "walk through curtain" with slot pattern | funct | good | Y |  |  |
| 2807 | should handle multi-word slot matches like "rusty key" | funct | good | Y |  |  |
| 2808 | should fail when entity not found in scope | behav | good | Y |  |  |
| 2809 | should match entity by attributes.name | behav | good | Y |  |  |
| 2810 | should match entity by IdentityTrait alias | behav | good | Y |  |  |
| 2811 | should try higher priority patterns first | funct | good | Y |  |  |
### stdlib

#### emit-illustrations.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1442 | should return empty array for entity with no annotations | funct | good | Y |  |  |
| 1443 | should emit events for matching trigger annotations | funct | good | Y |  |  |
| 1444 | should filter out annotations with non-matching trigger | funct | good | Y |  |  |
| 1445 | should only emit active conditional annotations | funct | good | Y |  |  |
| 1446 | should use default position and width when not specified | funct | good | Y |  |  |
| 1447 | should pass through targetPanel when present | funct | good | Y |  |  |
| 1448 | should not include targetPanel when absent | funct | good | Y |  |  |
| 1449 | should emit multiple illustrations for the same trigger | funct | good | Y |  |  |
#### action-language-integration.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1458 | should resolve action from verb using language provider | funct | good | Y |  |  |
| 1459 | should resolve action from alias | funct | good | Y |  |  |
| 1460 | should validate and execute action | behav | good | Y |  |  |
| 1461 | should resolve messages through language provider | behav | adeq | Y |  | Assertion is weak: accepts [Missing:...] as valid outcome, defeating the purpose |
| 1462 | should find actions by pattern through language provider | funct | adeq | Y |  |  |
| 1463 | example: action that checks preconditions | funct | adeq | Y |  | Uses a mock take action instead of the real one; does not verify actual world st |
#### container-visibility-knowledge.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1464 | actor cannot see ball in closed box | behav | good | Y |  |  |
| 1465 | actor can examine box when in same room | behav | good | Y |  |  |
| 1466 | actor cannot take ball that they do not know about | behav | good | Y |  |  |
| 1467 | actor can take ball after opening box | behav | good | Y |  |  |
| 1468 | full scenario: move, examine, try take, open, take | behav | good | Y | Y |  |
#### meta-commands.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1469 | should auto-register meta-actions | funct | good | Y |  |  |
| 1470 | should not register regular actions | funct | good | Y |  |  |
| 1471 | should include meta-action in getAll() | funct | good | Y |  |  |
| 1472 | should recognize SAVE as meta | funct | adeq | Y |  |  |
| 1473 | should recognize RESTORE as meta | funct | adeq | Y |  |  |
| 1474 | should recognize QUIT as meta | funct | adeq | Y |  |  |
| 1475 | should recognize SCORE as meta | funct | adeq | Y |  |  |
| 1476 | should recognize HELP as meta | funct | adeq | Y |  |  |
| 1477 | should recognize AGAIN as meta | funct | adeq | Y |  |  |
| 1478 | should recognize author.parser_events as meta | funct | dead | S |  | Skipped: ParserEventsAction not implemented. Remove or implement. |
| 1479 | should recognize author.validation_events as meta | funct | dead | S |  | Skipped: ValidationEventsAction not implemented. Remove or implement. |
| 1480 | should recognize author.system_events as meta | funct | dead | S |  | Skipped: SystemEventsAction not implemented. Remove or implement. |
| 1481 | should recognize author.trace as meta | funct | good | Y |  |  |
| 1482 | should not recognize TAKE as meta | funct | adeq | Y |  |  |
| 1483 | should not recognize DROP as meta | funct | adeq | Y |  |  |
| 1484 | should not recognize LOOK as meta | funct | adeq | Y |  |  |
| 1485 | should not recognize GO as meta | funct | adeq | Y |  |  |
| 1486 | should detect custom meta-commands | funct | good | Y |  |  |
| 1487 | should not have custom commands after reset | funct | good | Y | Y |  |
#### platform-handlers.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1488 | should handle quit confirmation queries | funct | good | Y |  |  |
| 1489 | should handle quit with unsaved changes queries | funct | good | Y |  |  |
| 1490 | should not handle non-quit queries | funct | good | Y |  |  |
| 1491 | should emit quit requested event for quit option | funct | good | Y |  |  |
| 1492 | should handle save and quit option | funct | good | Y |  |  |
| 1493 | should emit quit cancelled for cancel option | funct | good | Y |  |  |
| 1494 | should handle yes/no responses | funct | good | Y |  |  |
| 1495 | should emit quit cancelled on timeout | funct | good | Y |  |  |
| 1496 | should emit quit cancelled on cancellation | funct | good | Y |  |  |
| 1497 | should handle restart confirmation queries | funct | good | Y |  |  |
| 1498 | should handle restart with unsaved changes queries | funct | good | Y |  |  |
| 1499 | should not handle non-restart queries | funct | good | Y |  |  |
| 1500 | should emit restart requested event for restart option | funct | good | Y |  |  |
| 1501 | should handle save and restart option | funct | good | Y |  |  |
| 1502 | should emit restart cancelled for cancel option | funct | good | Y |  |  |
| 1503 | should emit restart cancelled on timeout | funct | good | Y |  |  |
| 1504 | should emit restart cancelled on cancellation | funct | good | Y |  |  |
#### scope-integration.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1450 | should fail when trying to take an object that is not reachable | behav | adeq | Y |  | Assertion is overly flexible: accepts either not-finding-gem or finding-chest as |
| 1451 | should succeed when object is reachable | behav | good | Y |  |  |
| 1452 | should resolve a non-carried object at REACHABLE scope for throwing | behav | good | Y |  |  |
| 1453 | should succeed when object is carried | behav | good | Y |  |  |
| 1454 | should succeed when listening to something audible from another room | behav | good | Y |  |  |
| 1455 | should succeed when smelling something smelly from another room | behav | good | Y |  |  |
| 1456 | should resolve entity behind closed door at AWARE scope (sound passes  | behav | good | Y |  |  |
| 1457 | should include scope info in validated command | funct | good | Y |  |  |
#### about-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1523 | should have correct ID | struc | adeq | Y |  |  |
| 1524 | should be in meta group | struc | adeq | Y |  |  |
| 1525 | should not require objects | struc | adeq | Y |  |  |
| 1526 | should implement three-phase pattern | struc | adeq | Y |  |  |
| 1527 | should always validate successfully | funct | good | Y |  |  |
| 1528 | should not throw | funct | adeq | Y |  |  |
| 1529 | should not modify world state | funct | good | Y | Y |  |
| 1530 | should emit about_displayed event | funct | good | Y |  |  |
| 1531 | should emit event with messageId and params | funct | good | Y |  |  |
| 1532 | should create well-formed semantic event | funct | good | Y |  |  |
| 1533 | should validate, execute, and report successfully | behav | good | Y |  |  |
#### attacking-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1534 | should have correct ID | struc | adeq | Y |  |  |
| 1535 | should declare required messages | struc | good | Y |  |  |
| 1536 | should belong to interaction group | struc | adeq | Y |  |  |
| 1537 | should fail when no target specified | funct | good | Y |  |  |
| 1538 | should prevent attacking self | funct | good | Y |  |  |
| 1539 | should report ineffective attack on non-combatant NPC | funct | good | Y |  |  |
| 1540 | should break a breakable object | funct | good | Y |  |  |
#### attacking.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1541 | should have required methods | struc | adeq | Y |  |  |
| 1542 | validate should return ValidationResult | struc | adeq | Y |  |  |
| 1543 | execute should return void | struc | adeq | Y |  |  |
| 1544 | report should return ISemanticEvent array | struc | adeq | Y |  |  |
| 1545 | should fail without target | funct | good | Y |  |  |
| 1546 | should fail if target not visible | funct | good | Y |  |  |
| 1547 | should fail if target not reachable | funct | good | Y |  |  |
| 1548 | should fail when attacking self | funct | good | Y |  |  |
| 1549 | should fail if specified weapon not reachable | funct | good | Y |  |  |
| 1550 | should pass validation with valid target | funct | good | Y |  |  |
| 1551 | should pass validation with held weapon | funct | good | Y |  |  |
| 1552 | should infer weapon for stab verb | funct | good | Y |  |  |
| 1553 | should infer weapon for slash verb | funct | good | Y |  |  |
| 1554 | should infer weapon for cut verb | funct | good | Y |  |  |
| 1555 | should not infer weapon for generic attack verb | funct | good | Y |  |  |
| 1556 | should not infer weapon if explicitly specified | funct | good | Y |  |  |
| 1557 | should store attack result in shared data | funct | good | Y |  |  |
| 1558 | should store weapon used in shared data | funct | good | Y |  |  |
| 1559 | should store custom message if provided | funct | adeq | Y |  |  |
| 1560 | should generate attacked event on success | funct | good | Y |  |  |
| 1561 | should generate attacked event with messageId | funct | good | Y |  |  |
| 1562 | should generate blocked event on validation failure | funct | good | Y |  |  |
| 1563 | should include weapon in attacked event when used | funct | good | Y |  |  |
| 1564 | should generate blocked event via blocked() method | funct | good | Y |  |  |
| 1565 | should handle broke result type | funct | good | Y |  |  |
| 1566 | should handle ineffective attack | funct | good | Y |  |  |
| 1567 | should have correct ID | struc | adeq | Y |  |  |
| 1568 | should have correct group | struc | adeq | Y |  |  |
| 1569 | should require direct object | struc | adeq | Y |  |  |
| 1570 | should not require indirect object | struc | adeq | Y |  |  |
| 1571 | should have reachable scope for direct object | struc | adeq | Y |  |  |
| 1572 | should declare all required messages | struc | good | Y |  |  |
#### climbing-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1573 | should have correct ID | struc | adeq | Y |  |  |
| 1574 | should declare required messages | struc | good | Y |  |  |
| 1575 | should belong to movement group | struc | adeq | Y |  |  |
| 1576 | should fail when no target or direction specified | funct | good | Y |  |  |
| 1577 | should fail when object is not climbable | funct | good | Y |  |  |
| 1578 | should fail when already on target | funct | good | Y |  |  |
| 1579 | should fail for invalid directions | funct | good | Y |  |  |
| 1580 | should fail when no exit in climb direction | funct | good | Y |  |  |
| 1581 | should fail when not in a room for directional climbing | funct | good | Y |  |  |
| 1582 | should climb up when exit exists | funct | good | Y |  | Add world state mutation check: verify player actually moved to destination room |
| 1583 | should climb down when exit exists | funct | good | Y |  | Add world state mutation check: verify player actually moved to destination room |
| 1584 | should climb onto enterable supporter | funct | good | Y |  | Add world state mutation check: verify player actually moved onto supporter |
| 1585 | should climb object with CLIMBABLE trait | funct | good | Y |  | Add world state mutation check: verify player location changed |
| 1586 | should handle direction normalization | funct | good | Y |  |  |
| 1587 | should include proper entities in all events | struc | good | Y |  |  |
#### closing-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1588 | should have required methods for three-phase pattern | struc | adeq | Y |  |  |
| 1589 | should use report() for ALL event generation | struc | adeq | Y |  |  |
| 1590 | should have correct ID | struc | adeq | Y |  |  |
| 1591 | should declare required messages | struc | good | Y |  |  |
| 1592 | should belong to container_manipulation group | struc | adeq | Y |  |  |
| 1593 | should fail when no target specified | funct | good | Y |  |  |
| 1594 | should fail when target is not closable | funct | good | Y |  |  |
| 1595 | should fail when already closed | funct | good | Y |  |  |
| 1596 | should close an open container | funct | good | Y |  |  |
| 1597 | should include container contents in event | funct | good | Y |  |  |
| 1598 | should handle closing a door | funct | good | Y |  |  |
| 1599 | should handle close requirements | funct | good | Y |  |  |
| 1600 | should include proper entities in all events | struc | good | Y |  |  |
| 1601 | should actually set isOpen to false after closing | funct | good | Y | Y |  |
| 1602 | should actually set isOpen to false for container with contents | funct | good | Y | Y |  |
| 1603 | should NOT change isOpen when already closed | funct | good | Y | Y |  |
| 1604 | should NOT change isOpen when canClose is false | funct | good | Y | Y |  |
| 1605 | should NOT change state when target is not closable | funct | good | Y | Y |  |
| 1606 | should actually close an open door | funct | good | Y | Y |  |
#### drinking-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1607 | should have correct ID | struc | adeq | Y |  |  |
| 1608 | should declare required messages | struc | good | Y |  |  |
| 1609 | should belong to interaction group | struc | adeq | Y |  |  |
| 1610 | should fail when no item specified | funct | good | Y |  |  |
| 1611 | should fail when item is not drinkable | funct | good | Y |  |  |
| 1612 | should fail when drink is already consumed | funct | good | Y |  |  |
| 1613 | should fail when container is closed | funct | good | Y |  |  |
| 1614 | should drink item from inventory | funct | good | Y |  |  |
| 1615 | should implicitly take and drink item from room | funct | good | Y |  |  |
| 1616 | should handle drink with portions | funct | good | Y |  |  |
| 1617 | should handle drinking last portion of multi-serving drink | funct | good | Y |  |  |
| 1618 | should handle refreshing drink | funct | good | Y |  |  |
| 1619 | should handle bitter drink | funct | good | Y |  |  |
| 1620 | should handle sweet drink | funct | good | Y |  |  |
| 1621 | should handle strong/alcoholic drink | funct | good | Y |  |  |
| 1622 | should handle magical drink | funct | good | Y |  |  |
| 1623 | should handle healing drink | funct | good | Y |  |  |
| 1624 | should handle thirst-quenching drink | funct | good | Y |  |  |
| 1625 | should handle non-thirst-quenching drink | funct | good | Y |  |  |
| 1626 | should handle drinking from container | funct | good | Y |  |  |
| 1627 | should handle emptying container | funct | good | Y |  |  |
| 1628 | should handle container without tracked amount | funct | good | Y |  |  |
| 1629 | should handle drink with nutrition value | funct | good | Y |  |  |
| 1630 | should handle sip verb | funct | good | Y |  |  |
| 1631 | should handle quaff verb | funct | good | Y |  |  |
| 1632 | should handle swallow/gulp verb | funct | good | Y |  |  |
| 1633 | should include proper entities in all events | struc | good | Y |  |  |
| 1634 | should actually move item to inventory on implicit take | funct | good | Y | Y |  |
| 1635 | should not move item that is already held | funct | good | Y | Y |  |
| 1636 | should actually consume drinkable item (set consumed flag) | funct | good | Y | Y |  |
| 1637 | should decrement servings when drinking multi-serving item | funct | good | Y | Y |  |
| 1638 | should actually decrement liquidAmount for containers | funct | good | Y | Y |  |
| 1639 | should set liquidAmount to 0 when emptying container | funct | good | Y | Y |  |
#### dropping-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1640 | should have required methods for three-phase pattern | struc | adeq | Y |  |  |
| 1641 | should use report() for ALL event generation | struc | adeq | Y |  |  |
| 1642 | should have correct ID | struc | adeq | Y |  |  |
| 1643 | should declare required messages | struc | good | Y |  |  |
| 1644 | should belong to object_manipulation group | struc | adeq | Y |  |  |
| 1645 | should fail when no target specified | funct | good | Y |  |  |
| 1646 | should fail when not holding the item | funct | good | Y |  |  |
| 1647 | should fail when item is still worn | funct | good | Y |  |  |
| 1648 | should allow dropping inside a closed container | funct | good | S |  |  |
| 1649 | should fail when container is full | funct | good | Y |  |  |
| 1650 | should drop item in room | funct | good | Y |  | Add world state mutation check: verify item actually moved from player to room |
| 1651 | should drop item in open container | funct | good | Y |  | Add world state mutation check: verify item actually moved to container |
| 1652 | should drop item on supporter | funct | good | Y |  | Add world state mutation check: verify item actually moved to supporter |
| 1653 | should use careful message for glass items | funct | good | Y |  |  |
| 1654 | should use careless message for discard verb | funct | good | Y |  |  |
| 1655 | should include proper entities in all events | struc | good | Y |  |  |
| 1656 | should handle dropping in container without capacity limits | funct | good | Y |  |  |
| 1657 | should handle dropping worn item that is not actually worn | funct | good | Y |  |  |
| 1658 | should handle edge case of player dropping item while not in a room | funct | good | S |  |  |
#### eating-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1659 | should have correct ID | struc | adeq | Y |  |  |
| 1660 | should declare required messages | struc | good | Y |  |  |
| 1661 | should belong to interaction group | struc | adeq | Y |  |  |
| 1662 | should fail when no item specified | funct | good | Y |  |  |
| 1663 | should fail when item is not edible | funct | good | Y |  |  |
| 1664 | should fail when item is a drink | funct | good | Y |  |  |
| 1665 | should fail when item is already consumed | funct | good | Y |  |  |
| 1666 | should eat item from inventory | funct | good | Y |  | Add mutation check: verify EdibleTrait.servings decremented or consumed flag set |
| 1667 | should handle food with servings | funct | good | Y |  |  |
| 1668 | should handle eating multi-serving food | behav | good | Y |  |  |
| 1669 | should handle delicious food | funct | good | Y |  |  |
| 1670 | should handle tasty food | funct | good | Y |  |  |
| 1671 | should handle bland food | funct | good | Y |  |  |
| 1672 | should handle awful food | funct | good | Y |  |  |
| 1673 | should handle poisonous food | funct | good | Y |  |  |
| 1674 | should handle filling food | funct | good | Y |  |  |
| 1675 | should handle non-filling food | funct | good | Y |  |  |
| 1676 | should handle food with nutrition value | funct | good | Y |  |  |
| 1677 | should include proper entities in all events | struc | good | Y |  |  |
#### entering-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1678 | should have correct ID | struc | adeq | Y |  |  |
| 1679 | should declare required messages | struc | good | Y |  |  |
| 1680 | should belong to movement group | struc | adeq | Y |  |  |
| 1681 | should fail when no target specified | funct | good | Y |  |  |
| 1682 | should fail when target is not enterable | funct | good | Y |  |  |
| 1683 | should fail when already inside target | funct | good | S |  |  |
| 1684 | should fail when entry is blocked | funct | good | S |  |  |
| 1685 | should fail when container is closed | funct | good | Y |  |  |
| 1686 | should fail when at maximum occupancy | funct | good | S |  |  |
| 1687 | should enter enterable container (car) | funct | good | Y |  |  |
| 1688 | should enter enterable container | funct | good | Y |  |  |
| 1689 | should enter enterable supporter | funct | good | Y |  |  |
| 1690 | should check occupancy for containers with actors | funct | good | Y |  |  |
| 1691 | should handle custom prepositions | funct | good | S |  |  |
| 1692 | should include proper entities in all events | struc | good | Y |  |  |
| 1693 | should actually move player into enterable container | funct | good | Y | Y |  |
| 1694 | should actually move player onto enterable supporter | funct | good | Y | Y |  |
| 1695 | should NOT move player when target is not enterable | funct | good | Y | Y |  |
| 1696 | should NOT move player when container is closed | funct | good | Y | Y |  |
| 1697 | should NOT move player when already inside target | funct | good | Y | Y |  |
| 1698 | should move player into open container | funct | good | Y | Y |  |
#### examining-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1699 | should have correct ID | struc | adeq | Y |  |  |
| 1700 | should declare required messages | struc | good | Y |  |  |
| 1701 | should belong to observation group | struc | adeq | Y |  |  |
| 1702 | should fail when no target specified | funct | good | Y |  |  |
| 1703 | should fail when target not visible | funct | good | Y |  |  |
| 1704 | should always allow examining self even if not visible | funct | good | Y |  |  |
| 1705 | should examine simple object | funct | good | Y |  |  |
| 1706 | should include description from identity trait | funct | good | Y |  |  |
| 1707 | should examine open container with contents | funct | good | Y |  |  |
| 1708 | should examine closed container | funct | good | Y |  |  |
| 1709 | should handle container without openable trait as always open | funct | good | Y |  |  |
| 1710 | should examine supporter with objects | funct | good | Y |  |  |
| 1711 | should examine switchable device | funct | good | Y |  |  |
| 1712 | should examine readable object | funct | good | Y |  |  |
| 1713 | should examine wearable object | funct | good | Y |  |  |
| 1714 | should examine locked door | funct | good | Y |  |  |
| 1715 | should handle object with multiple traits | funct | good | Y |  |  |
| 1716 | should include proper entities in all events | struc | good | Y |  |  |
| 1717 | should use report() to create all events | struc | good | Y |  |  |
| 1718 | should use blocked() to handle validation errors | funct | good | Y |  |  |
| 1719 | should handle readable object without text | funct | good | Y |  |  |
| 1720 | should handle container and supporter priority | funct | good | Y |  |  |
#### exiting-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1721 | should have correct ID | struc | adeq | Y |  |  |
| 1722 | should declare required messages | struc | good | Y |  |  |
| 1723 | should belong to movement group | struc | adeq | Y |  |  |
| 1724 | should fail when already in a room | funct | good | Y |  |  |
| 1725 | should fail when no location set | funct | good | S |  |  |
| 1726 | should fail when container has no parent location | funct | good | Y |  |  |
| 1727 | should fail when container is closed | funct | good | S |  |  |
| 1728 | should fail when exit is blocked | funct | good | S |  |  |
| 1729 | should exit from container | funct | good | Y |  |  |
| 1730 | should exit from supporter | funct | good | Y |  |  |
| 1731 | should exit from vehicle with ENTRY trait | funct | good | S |  |  |
| 1732 | should handle custom prepositions correctly | funct | good | S |  |  |
| 1733 | should exit from open container | funct | good | Y |  |  |
| 1734 | should include proper entities in all events | struc | good | Y |  |  |
| 1735 | should actually move player out of container to room | funct | good | Y | Y |  |
| 1736 | should actually move player off supporter to room | funct | good | Y | Y |  |
| 1737 | should NOT move player when already in a room | funct | good | Y | Y |  |
| 1738 | should NOT move player when container has no parent location | funct | good | Y | Y |  |
| 1739 | should actually move player out of open container | funct | good | Y | Y |  |
| 1740 | should NOT move player when container is closed | funct | good | Y | Y |  |
#### giving-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1741 | should have correct ID | struc | adeq | Y |  |  |
| 1742 | should declare required messages | struc | good | Y |  |  |
| 1743 | should belong to social group | struc | adeq | Y |  |  |
| 1744 | should fail when no item specified | funct | good | Y |  |  |
| 1745 | should fail when no recipient specified | funct | good | Y |  |  |
| 1746 | should fail when recipient is not an actor | funct | good | Y |  |  |
| 1747 | should fail when giving to self | funct | good | Y |  |  |
| 1748 | should fail when recipient inventory is full | funct | good | Y |  |  |
| 1749 | should fail when item too heavy for recipient | funct | good | Y |  |  |
| 1750 | should refuse items based on preferences | funct | good | Y |  |  |
| 1751 | should gratefully accept liked items | funct | good | Y |  |  |
| 1752 | should reluctantly accept disliked items | funct | good | Y |  |  |
| 1753 | should give item normally | funct | good | Y |  |  |
| 1754 | should handle giving to NPC with no special preferences | funct | good | Y |  |  |
| 1755 | should include proper entities in all events | struc | good | Y |  |  |
| 1756 | should handle giving to NPC with complex preferences | funct | good | Y |  |  |
| 1757 | should handle recipient with weight limit but current inventory empty | funct | good | Y |  |  |
| 1758 | should handle item without weight when recipient has weight limit | funct | good | Y |  |  |
| 1759 | should actually move item from player to recipient | funct | good | Y | Y |  |
| 1760 | should actually move item to NPC with preferences | funct | good | Y | Y |  |
| 1761 | should NOT move item when recipient inventory is full | funct | good | Y | Y |  |
| 1762 | should NOT move item when recipient refuses it | funct | good | Y | Y |  |
| 1763 | should NOT move item when giving to non-actor | funct | good | Y | Y |  |
| 1764 | should NOT move item when giving to self | funct | good | Y | Y |  |
#### going-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1765 | should have required methods for four-phase pattern | struc | adeq | Y |  |  |
| 1766 | should use report() for ALL event generation | struc | adeq | Y |  |  |
| 1767 | should have correct ID | struc | adeq | Y |  |  |
| 1768 | should declare required messages | struc | good | Y |  |  |
| 1769 | should belong to movement group | struc | adeq | Y |  |  |
| 1770 | should fail when no direction specified | funct | good | Y |  |  |
| 1771 | should fail when actor is not in a room | funct | good | Y |  |  |
| 1772 | should fail when room has no exits | funct | good | Y |  |  |
| 1773 | should fail when no exit in specified direction | funct | good | Y |  |  |
| 1774 | should fail when door is closed | funct | good | Y |  |  |
| 1775 | should fail when door is locked | funct | good | Y |  |  |
| 1776 | should fail when destination not found | funct | good | Y |  |  |
| 1777 | should allow movement to dark room (darkness affects visibility, not m | funct | good | Y |  |  |
| 1778 | should move in cardinal direction | funct | good | Y |  |  |
| 1779 | should handle direction abbreviations | funct | good | Y |  |  |
| 1780 | should track first visit to a room | funct | good | Y |  |  |
| 1781 | should move through open door | funct | good | Y |  |  |
| 1782 | should move to dark room with light | funct | good | Y |  |  |
| 1783 | should accept direction from directObject | funct | good | Y |  |  |
| 1784 | should include proper entities in all events | struc | good | Y |  |  |
| 1785 | should handle all opposite directions correctly | funct | good | Y |  |  |
| 1786 | should actually move player to destination room | funct | good | Y | Y |  |
| 1787 | should NOT move player when door is closed | funct | good | Y | Y |  |
| 1788 | should NOT move player when no exit in direction | funct | good | Y | Y |  |
| 1789 | should mark room as visited after first visit | funct | good | Y | Y |  |
#### implicit-take.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1790 | should succeed without implicit take when item is already carried | funct | good | Y | Y |  |
| 1791 | should perform implicit take when item is reachable but not carried | funct | good | Y | Y |  |
| 1792 | should emit if.event.implicit_take event | funct | good | Y |  |  |
| 1793 | should emit if.event.taken event after implicit take | funct | good | Y |  |  |
| 1794 | should store events in sharedData.implicitTakeEvents | funct | good | Y |  |  |
| 1795 | should return scope error when item is not reachable | funct | good | Y |  |  |
| 1796 | should not attempt to take item in different room | funct | good | Y | Y |  |
| 1797 | should return fixed_in_place error for scenery items | funct | good | Y |  |  |
| 1798 | should not attempt to take scenery | funct | good | Y | Y |  |
| 1799 | should return error when trying to take yourself | funct | good | Y |  |  |
| 1800 | should return error when trying to take a room | funct | good | Y |  |  |
| 1801 | should accumulate events from multiple implicit takes | funct | good | Y |  |  |
#### inserting-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1802 | should have required methods for three-phase pattern | struc | adeq | Y |  |  |
| 1803 | should use report() for ALL event generation | struc | adeq | Y |  |  |
| 1804 | should have correct ID | struc | adeq | Y |  |  |
| 1805 | should declare required messages | struc | good | Y |  |  |
| 1806 | should belong to object_manipulation group | struc | adeq | Y |  |  |
| 1807 | should delegate to putting action with in preposition | funct | good | Y |  |  |
| 1808 | should handle no target error from putting | funct | good | Y |  |  |
| 1809 | should handle no destination error from putting | funct | good | Y |  |  |
| 1810 | should successfully insert into open container | funct | good | Y |  |  |
| 1811 | should fail when container is closed | funct | good | Y |  |  |
| 1812 | should fail when target is not a container | funct | good | Y |  |  |
| 1813 | should respect container capacity | funct | good | Y |  |  |
| 1814 | should include proper entities in all events | struc | good | Y |  |  |
| 1815 | should maintain consistency with putting action | behav | good | Y |  |  |
| 1816 | should handle container within container | funct | good | Y |  |  |
| 1817 | should actually move item into container | funct | good | Y | Y |  |
| 1818 | should actually move item into open container with openable trait | funct | good | Y | Y |  |
| 1819 | should NOT move item when container is closed | funct | good | Y | Y |  |
| 1820 | should NOT move item when container is full | funct | good | Y | Y |  |
| 1821 | should move nested container into another container | funct | good | Y | Y |  |
#### inventory-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1822 | should have correct ID | struc | adeq | Y |  |  |
| 1823 | should declare required messages | struc | adeq | Y |  |  |
| 1824 | should belong to meta group | struc | adeq | Y |  |  |
| 1825 | should fire event for completely empty inventory | funct | good | Y |  |  |
| 1826 | should include carried items in event | funct | good | Y |  |  |
| 1827 | should include worn items in event | funct | good | Y |  |  |
| 1828 | should include both held and worn items | funct | good | Y |  |  |
| 1829 | should include weight data when player has weight limit | funct | good | S |  |  |
| 1830 | should not include weight data when no weight limit | funct | good | Y |  |  |
| 1831 | should detect brief format from "i" command | funct | good | Y |  |  |
| 1832 | should detect brief format from "inv" command | funct | good | Y |  |  |
| 1833 | should use full format for "inventory" command | funct | good | Y |  |  |
| 1834 | should be observable by NPCs in the room | funct | good | Y |  |  |
| 1835 | should include proper entities in all events | struc | good | Y |  |  |
| 1836 | should include complete inventory data in event | funct | good | Y |  |  |
| 1837 | pattern: inventory with various item types | funct | good | Y |  |  |
| 1838 | pattern: weight calculation | funct | good | S |  |  |
| 1839 | pattern: empty inventory variations | funct | good | Y |  |  |
#### listening-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1840 | should have correct ID | struc | adeq | Y |  |  |
| 1841 | should declare required messages | struc | good | Y |  |  |
| 1842 | should belong to sensory group | struc | adeq | Y |  |  |
| 1843 | should detect sound from active device | funct | good | Y |  |  |
| 1844 | should detect no sound from inactive device | funct | good | Y |  |  |
| 1845 | should detect sounds from container with contents | funct | good | Y |  |  |
| 1846 | should detect liquid sounds from container | funct | good | Y |  |  |
| 1847 | should detect no sound from empty container | funct | good | Y |  |  |
| 1848 | should detect no sound from ordinary objects | funct | good | Y |  |  |
| 1849 | should detect silence in quiet room | funct | good | Y |  |  |
| 1850 | should detect active devices in room | funct | good | Y |  |  |
| 1851 | should ignore inactive devices | funct | good | Y |  |  |
| 1852 | should detect mix of active and inactive devices | funct | good | Y |  |  |
| 1853 | should handle container with mixed contents | funct | good | Y |  |  |
| 1854 | should prioritize device sounds over container state | funct | good | Y |  |  |
| 1855 | should include proper entities in all events | struc | good | Y |  |  |
| 1856 | should include proper entities for environmental listening | struc | good | Y |  |  |
#### locking-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1857 | should have correct ID | struc | adeq | Y |  |  |
| 1858 | should declare required messages | struc | good | Y |  |  |
| 1859 | should belong to lock_manipulation group | struc | adeq | Y |  |  |
| 1860 | should fail when no target specified | funct | good | Y |  |  |
| 1861 | should fail when target is not lockable | funct | good | Y |  |  |
| 1862 | should fail when already locked | funct | good | Y |  |  |
| 1863 | should fail when target is open | funct | good | Y |  |  |
| 1864 | should fail when key required but not provided | funct | good | Y |  |  |
| 1865 | should fail when key not held by player | funct | good | Y |  |  |
| 1866 | should fail with wrong key | funct | good | Y |  |  |
| 1867 | should lock object without key requirement | funct | good | Y |  |  |
| 1868 | should lock with correct key | funct | good | Y |  |  |
| 1869 | should lock door with key | funct | good | Y |  |  |
| 1870 | should handle multiple valid keys | funct | good | Y |  |  |
| 1871 | should include lock sound if specified | funct | good | Y |  |  |
| 1872 | should include proper entities in all events | struc | good | Y |  |  |
| 1873 | should handle lockable without openable trait | funct | good | Y |  |  |
| 1874 | should prefer keyId over keyIds when both present | funct | good | Y |  |  |
| 1875 | should use backup key when primary not available | funct | good | Y |  |  |
| 1876 | should actually set isLocked to true after locking | funct | good | Y | Y |  |
| 1877 | should actually set isLocked to true when using correct key | funct | good | Y | Y |  |
| 1878 | should NOT change isLocked when already locked | funct | good | Y | Y |  |
| 1879 | should NOT change isLocked when target is open | funct | good | Y | Y |  |
| 1880 | should NOT change state when target is not lockable | funct | good | Y | Y |  |
| 1881 | should actually lock a door with key | funct | good | Y | Y |  |
#### looking-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1882 | should have correct ID | struc | adeq | Y |  |  |
| 1883 | should declare required messages | struc | adeq | Y |  |  |
| 1884 | should belong to observation group | struc | adeq | Y |  |  |
| 1885 | should describe current room | funct | good | Y |  |  |
| 1886 | should list visible items | funct | good | Y |  |  |
| 1887 | should handle empty rooms | funct | good | Y |  |  |
| 1888 | should handle dark room without light | funct | good | Y |  |  |
| 1889 | should see in dark room with light source | funct | good | Y |  |  |
| 1890 | should see with room light source | funct | good | Y |  |  |
| 1891 | should describe being in a container | funct | good | Y |  |  |
| 1892 | should describe being on a supporter | funct | good | Y |  |  |
| 1893 | should use brief description for visited rooms in brief mode | funct | adeq | Y |  | Test notes brief/verbose not implemented yet; both tests check verbose=true. Sho |
| 1894 | should use full description for first visit even in brief mode | funct | adeq | Y |  |  |
| 1895 | should handle short form "l" command | funct | good | Y |  |  |
| 1896 | should handle "examine" without object | funct | good | Y |  |  |
| 1897 | should include proper entities and timestamps | struc | good | Y |  |  |
| 1898 | should use report() to create all events | struc | adeq | Y |  |  |
| 1899 | should use blocked() to handle validation errors | funct | good | Y |  |  |
#### meta-registry.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1900 | should have standard system commands registered | funct | good | Y |  |  |
| 1901 | should have information commands registered | funct | good | Y |  |  |
| 1902 | should have transcript commands registered | funct | good | Y |  |  |
| 1903 | should not have regular game commands registered | funct | good | Y |  |  |
| 1904 | should allow registering new meta-commands | funct | good | Y | Y |  |
| 1905 | should handle empty action ID gracefully | funct | good | Y |  |  |
| 1906 | should allow unregistering commands | funct | good | Y | Y |  |
| 1907 | should return false when unregistering non-existent command | funct | good | Y |  |  |
| 1908 | should return all registered commands sorted | funct | good | Y |  |  |
| 1909 | should count registered commands | funct | good | Y | Y |  |
| 1910 | should detect custom commands | funct | good | Y | Y |  |
| 1911 | should reset to defaults | funct | good | Y | Y |  |
| 1912 | should clear and restore defaults | funct | adeq | Y | Y | Test asserts count equals initialCount after clear, but clear() restores default |
#### opening-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1913 | should have required methods for three-phase pattern | struc | adeq | Y |  |  |
| 1914 | should use report() for ALL event generation | struc | poor | Y |  | Test only checks events is defined and is an array. Does not verify any specific |
| 1915 | should have correct ID | struc | adeq | Y |  |  |
| 1916 | should declare required messages | struc | adeq | Y |  |  |
| 1917 | should belong to container_manipulation group | struc | adeq | Y |  |  |
| 1918 | should fail when no target specified | funct | good | Y |  |  |
| 1919 | should fail when target is not openable | funct | good | Y |  |  |
| 1920 | should fail when already open | funct | good | Y |  |  |
| 1921 | should fail when locked | funct | good | Y |  |  |
| 1922 | should emit atomic opened event with minimal data | funct | good | Y |  |  |
| 1923 | should emit separate revealed events for container contents | funct | adeq | S |  |  |
| 1924 | should report empty container with special message | funct | good | Y |  |  |
| 1925 | should open a door | funct | good | Y |  |  |
| 1926 | should include proper atomic events | struc | adeq | S |  |  |
| 1927 | should handle unlocked but not yet open container | funct | good | Y |  |  |
| 1928 | should handle non-container openable objects | funct | good | Y |  |  |
| 1929 | should emit multiple revealed events for multiple items | funct | adeq | S |  |  |
| 1930 | should actually set isOpen to true after opening | funct | good | Y | Y |  |
| 1931 | should actually set isOpen to true for container | funct | good | Y | Y |  |
| 1932 | should NOT change isOpen when already open | funct | good | Y | Y |  |
| 1933 | should NOT change isOpen when locked | funct | good | Y | Y |  |
| 1934 | should NOT change state when target is not openable | funct | good | Y | Y |  |
| 1935 | should actually open unlocked but closed container | funct | good | Y | Y |  |
#### pulling-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1936 | should have correct ID | struc | adeq | Y |  |  |
| 1937 | should declare required messages | struc | adeq | Y |  |  |
| 1938 | should belong to interaction group | struc | adeq | Y |  |  |
| 1939 | should fail when no target specified | funct | good | Y |  |  |
| 1940 | should fail when target is not pullable | funct | good | Y |  |  |
| 1941 | should fail when pulling worn items | funct | good | Y |  |  |
| 1942 | should fail when already pulled | funct | good | Y |  |  |
| 1943 | should execute pull successfully | funct | good | Y | Y |  |
| 1944 | should track pull count | funct | good | Y | Y |  |
| 1945 | story authors can handle complex pull mechanics via events | funct | adeq | Y |  |  |
#### pushing-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1946 | should have correct ID | struc | adeq | Y |  |  |
| 1947 | should declare required messages | struc | adeq | Y |  |  |
| 1948 | should belong to device_manipulation group | struc | adeq | Y |  |  |
| 1949 | should fail when no target specified | funct | good | Y |  |  |
| 1950 | should fail when pushing worn items | funct | good | Y |  |  |
| 1951 | should fail when object is not pushable | funct | good | Y |  |  |
| 1952 | should fail when scenery is not pushable | funct | good | Y |  |  |
| 1953 | should activate button with click sound | funct | good | Y |  |  |
| 1954 | should toggle switch state | funct | good | Y |  |  |
| 1955 | should use button_pushed for non-switchable buttons | funct | good | Y |  |  |
| 1956 | should push heavy objects with effort | funct | good | Y |  |  |
| 1957 | should show wont_budge for heavy objects without direction | funct | good | Y |  |  |
| 1958 | should push moveable objects in direction | funct | good | Y |  |  |
| 1959 | should nudge moveable objects without direction | funct | good | Y |  |  |
| 1960 | should reveal hidden passage when pushing special objects | funct | good | Y |  |  |
| 1961 | should nudge regular pushable objects | funct | good | Y |  |  |
| 1962 | should push object in direction | funct | good | Y |  |  |
| 1963 | should include proper entities in all events | struc | good | Y |  |  |
#### putting-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1964 | should have required methods for three-phase pattern | struc | adeq | Y |  |  |
| 1965 | should use report() for ALL event generation | struc | poor | Y |  | Test only checks events is defined and is an array. Does not verify any specific |
| 1966 | should have correct ID | struc | adeq | Y |  |  |
| 1967 | should declare required messages | struc | adeq | Y |  |  |
| 1968 | should belong to object_manipulation group | struc | adeq | Y |  |  |
| 1969 | should fail when no target specified | funct | good | Y |  |  |
| 1970 | should fail when no destination specified | funct | good | Y |  |  |
| 1971 | should fail when trying to put something in itself | funct | good | Y |  |  |
| 1972 | should fail when trying to put something on itself | funct | good | Y |  |  |
| 1973 | should fail when item already in destination | funct | poor | Y |  | Test has no final assertion on the events. It moves the key, runs the action, bu |
| 1974 | should put in open container with explicit preposition | funct | good | Y |  |  |
| 1975 | should auto-detect container without preposition | funct | good | Y |  |  |
| 1976 | should fail when container is closed | funct | good | Y |  |  |
| 1977 | should fail with wrong preposition for container | funct | good | Y |  |  |
| 1978 | should put on supporter with explicit preposition | funct | good | Y |  |  |
| 1979 | should auto-detect supporter without preposition | funct | good | Y |  |  |
| 1980 | should fail with wrong preposition for supporter | funct | good | Y |  |  |
| 1981 | should respect container item limit | funct | good | Y |  |  |
| 1982 | should respect container weight limit | funct | good | Y |  |  |
| 1983 | should respect supporter item limit | funct | good | Y |  |  |
| 1984 | should prefer container for dual-nature objects without preposition | funct | good | Y |  |  |
| 1985 | should respect explicit preposition for dual-nature objects | funct | good | Y |  |  |
| 1986 | should include proper entities in all events | struc | good | Y |  |  |
| 1987 | should actually move item into container | funct | good | Y | Y |  |
| 1988 | should actually move item onto supporter | funct | good | Y | Y |  |
| 1989 | should NOT move item when container is closed | funct | good | Y | Y |  |
| 1990 | should NOT move item when container is full | funct | good | Y | Y |  |
| 1991 | should handle volume capacity | funct | good | Y |  |  |
| 1992 | should handle items without weight/volume properties | funct | good | Y |  |  |
| 1993 | should handle target that is neither container nor supporter | funct | good | Y |  |  |
| 1994 | should handle alternative prepositions | funct | good | Y |  |  |
| 1995 | should handle container without capacity limits | funct | good | Y |  |  |
| 1996 | should handle complex capacity calculation with multiple items | funct | good | Y |  |  |
#### quitting.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1997 | should have correct ID | struc | adeq | Y |  |  |
| 1998 | should declare required messages | struc | adeq | Y |  |  |
| 1999 | should belong to meta group | struc | adeq | Y |  |  |
| 2000 | should emit platform quit requested event | funct | good | Y |  |  |
| 2001 | should emit if.event.quit_requested notification | funct | good | Y |  |  |
| 2002 | should detect unsaved progress | funct | good | Y |  |  |
| 2003 | should not show hint when no unsaved progress | funct | good | Y |  |  |
| 2004 | should handle force quit with extras.force | funct | good | Y |  |  |
| 2005 | should handle force quit with extras.now | funct | good | Y |  |  |
| 2006 | should handle force quit with exit action | funct | good | Y |  |  |
| 2007 | should detect near completion at 85% | funct | good | Y |  |  |
| 2008 | should not detect near completion at 75% | funct | good | Y |  |  |
| 2009 | should handle zero max score | funct | good | Y |  |  |
| 2010 | should handle missing getSharedData method | funct | good | Y |  |  |
| 2011 | should handle empty shared data | funct | good | Y |  |  |
| 2012 | should include all context fields | behav | good | Y |  |  |
#### reading-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2013 | should read a simple note | funct | good | Y | Y |  |
| 2014 | should read a book | funct | good | Y |  |  |
| 2015 | should read a sign | funct | good | Y |  |  |
| 2016 | should read an inscription | funct | good | Y |  |  |
| 2017 | should read current page of multi-page book | funct | good | Y |  |  |
| 2018 | should fail without direct object | funct | good | Y |  |  |
| 2019 | should fail for non-readable items | funct | good | Y |  |  |
| 2020 | should fail when text is not currently readable | funct | good | Y |  |  |
| 2021 | should handle items with language requirements | funct | adeq | Y |  | Test says "we assume the player has the ability" and checks valid=true. Language |
| 2022 | should track whether item has been read | funct | good | Y | Y |  |
| 2023 | should handle empty text gracefully | funct | good | Y |  |  |
#### registry-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2024 | should register a real action | funct | good | Y | Y |  |
| 2025 | should register multiple real actions | funct | good | Y | Y |  |
| 2026 | should override existing action | funct | good | Y | Y |  |
| 2027 | should return undefined for non-existent action | funct | good | Y |  |  |
| 2028 | should return all registered actions | funct | good | Y |  |  |
| 2029 | should maintain action properties | funct | good | Y |  |  |
| 2030 | should organize standard actions by group | funct | good | Y |  |  |
| 2031 | should handle actions without groups | funct | good | Y |  |  |
| 2032 | should store patterns from language provider | funct | good | Y |  |  |
| 2033 | should handle pattern updates when language provider changes | funct | adeq | Y |  |  |
| 2034 | should sort actions by priority in pattern results | struc | poor | Y |  | Test body is empty - no assertions at all. Either implement or remove. |
| 2035 | should store full pattern strings from language provider | funct | good | Y |  |  |
| 2036 | should handle case-insensitive pattern lookup | funct | good | Y |  |  |
| 2037 | should return empty array for unknown patterns | funct | good | Y |  |  |
| 2038 | should look up actions by ID in normal flow | funct | good | Y |  |  |
| 2039 | should maintain real action integrity | funct | good | Y |  |  |
| 2040 | should handle registration before language provider is set | behav | good | Y |  |  |
| 2041 | should handle empty pattern arrays from language provider | funct | good | Y |  |  |
| 2042 | should handle null or undefined language provider | funct | good | Y |  |  |
| 2043 | should support direct aliases on actions | funct | good | Y |  |  |
#### removing-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2044 | should have required methods for three-phase pattern | struc | adeq | Y |  |  |
| 2045 | should use report() for ALL event generation | struc | poor | Y |  | Test only checks events is defined and is an array. Does not verify any specific |
| 2046 | should have correct ID | struc | adeq | Y |  |  |
| 2047 | should declare required messages | struc | adeq | Y |  |  |
| 2048 | should belong to object_manipulation group | struc | adeq | Y |  |  |
| 2049 | should fail when no target specified | funct | good | Y |  |  |
| 2050 | should fail when no source specified | funct | good | Y |  |  |
| 2051 | should fail when item not in specified container | funct | good | Y |  |  |
| 2052 | should fail when item not on specified supporter | funct | good | Y |  |  |
| 2053 | should fail when player already has item | funct | good | Y |  |  |
| 2054 | should fail when container is closed | funct | good | Y |  |  |
| 2055 | should remove from open container | funct | good | Y |  |  |
| 2056 | should remove from container without openable trait | funct | good | Y |  |  |
| 2057 | should remove from supporter | funct | good | Y |  |  |
| 2058 | should handle source that is neither container nor supporter | funct | good | Y |  |  |
| 2059 | should handle container that is also a supporter | funct | good | Y |  |  |
| 2060 | should include proper entities in all events | struc | good | Y |  |  |
| 2061 | should handle removing last item from container | funct | good | Y |  |  |
| 2062 | should handle nested containers | funct | good | Y |  |  |
| 2063 | should provide specific error for wrong container | funct | good | Y |  |  |
| 2064 | should actually move item from container to player inventory | funct | good | Y | Y |  |
| 2065 | should actually move item from open container to player inventory | funct | good | Y | Y |  |
| 2066 | should actually move item from supporter to player inventory | funct | good | Y | Y |  |
| 2067 | should NOT move item when container is closed | funct | good | Y | Y |  |
| 2068 | should NOT move item when item is not in the specified container | funct | good | Y | Y |  |
| 2069 | should move item from nested container to player inventory | funct | good | Y | Y |  |
#### report-helpers.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2070 | should return null when validationResult is undefined | funct | good | Y |  |  |
| 2071 | should return null when validation passed | funct | good | Y |  |  |
| 2072 | should return error event when validation failed | funct | good | Y |  |  |
| 2073 | should include validation params in error event | funct | good | Y |  |  |
| 2074 | should use messageId from validationResult if provided | funct | good | Y |  |  |
| 2075 | should include target snapshot by default when directObject exists | funct | good | Y |  |  |
| 2076 | should exclude target snapshot when includeTargetSnapshot is false | funct | good | Y |  |  |
| 2077 | should include indirect target snapshot by default when indirectObject | funct | good | Y |  |  |
| 2078 | should exclude indirect target snapshot when includeIndirectSnapshot i | funct | good | Y |  |  |
| 2079 | should return null when executionError is undefined | funct | good | Y |  |  |
| 2080 | should return error event when execution error occurred | funct | good | Y |  |  |
| 2081 | should include action ID in error event | funct | good | Y |  |  |
| 2082 | should return null when validation passed and no execution error | funct | good | Y |  |  |
| 2083 | should return null when both validationResult and executionError are u | funct | good | Y |  |  |
| 2084 | should return validation error when validation failed | funct | good | Y |  |  |
| 2085 | should return validation error even when both validation failed and ex | funct | good | Y |  |  |
| 2086 | should return execution error when validation passed but execution fai | funct | good | Y |  |  |
| 2087 | should pass options through to handleValidationError | funct | good | Y |  |  |
| 2088 | should integrate correctly with actual action blocked phase | behav | good | Y |  |  |
| 2089 | should generate success events when no errors | behav | good | Y | Y |  |
#### searching-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2090 | should have correct ID | struc | adeq | Y |  |  |
| 2091 | should declare required messages | struc | adeq | Y |  |  |
| 2092 | should belong to sensory group | struc | adeq | Y |  |  |
| 2093 | should fail when container is closed | funct | good | Y |  |  |
| 2094 | should search empty container | funct | good | Y |  |  |
| 2095 | should list visible contents of container | funct | good | Y |  |  |
| 2096 | should find concealed items in container | funct | good | Y |  |  |
| 2097 | should list items on supporter | funct | good | Y |  |  |
| 2098 | should find concealed items on supporter | funct | good | Y |  |  |
| 2099 | should handle empty supporter | funct | good | Y |  |  |
| 2100 | should find nothing special in ordinary objects | funct | good | Y |  |  |
| 2101 | should find concealed items in/on regular objects | funct | good | Y |  |  |
| 2102 | should search current room when no target specified | funct | good | Y |  |  |
| 2103 | should find nothing when searching empty location | funct | good | Y |  |  |
| 2104 | should handle open container requirement | funct | good | Y |  |  |
| 2105 | should find multiple concealed items | funct | good | Y |  |  |
| 2106 | should include proper entities in all events | struc | good | Y |  |  |
| 2107 | should include location as target when searching room | struc | good | Y |  |  |
#### showing-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2108 | should have correct ID | struc | adeq | Y |  |  |
| 2109 | should declare required messages | struc | adeq | Y |  |  |
| 2110 | should belong to social group | struc | adeq | Y |  |  |
| 2111 | should fail when no item specified | funct | good | Y |  |  |
| 2112 | should fail when no viewer specified | funct | good | Y |  |  |
| 2113 | should fail when not carrying item | funct | adeq | S |  |  |
| 2114 | should succeed when showing worn item | funct | adeq | S |  |  |
| 2115 | should fail when viewer not visible | funct | adeq | S |  |  |
| 2116 | should fail when viewer too far away | funct | adeq | S |  |  |
| 2117 | should fail when viewer is not an actor | funct | adeq | S |  |  |
| 2118 | should fail when showing to self | funct | adeq | S |  |  |
| 2119 | should recognize specific items | funct | adeq | S |  |  |
| 2120 | should be impressed by certain items | funct | adeq | S |  |  |
| 2121 | should be unimpressed by certain items | funct | adeq | S |  |  |
| 2122 | should examine certain items closely | funct | adeq | S |  |  |
| 2123 | should nod at unspecified items | funct | adeq | S |  |  |
| 2124 | should show item normally | funct | adeq | S |  |  |
| 2125 | should show to NPC with no reactions defined | funct | adeq | S |  |  |
| 2126 | should include proper entities in all events | struc | adeq | S |  |  |
| 2127 | should handle showing worn item to viewer with reactions | funct | adeq | S |  |  |
| 2128 | should handle showing to multiple viewers sequentially | behav | adeq | S |  |  |
| 2129 | should handle viewer location check properly | funct | adeq | S |  |  |
| 2130 | pattern: proper name items | funct | adeq | S |  |  |
| 2131 | pattern: multiple reaction types priority | funct | adeq | S |  |  |
#### smelling-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2132 | should have correct ID | struc | adeq | Y |  |  |
| 2133 | should declare required messages | struc | adeq | Y |  |  |
| 2134 | should belong to sensory group | struc | adeq | Y |  |  |
| 2135 | should detect food scent | funct | good | Y |  |  |
| 2136 | should detect drink scent | funct | good | Y |  |  |
| 2137 | should detect burning scent from lit objects | funct | good | Y |  |  |
| 2138 | should detect no scent from unlit light source | funct | good | Y |  |  |
| 2139 | should detect food scent from open container | funct | good | Y |  |  |
| 2140 | should detect no scent from closed container with food | funct | good | Y |  |  |
| 2141 | should detect no scent from ordinary objects | funct | good | Y |  |  |
| 2142 | should detect no scents in empty room | funct | good | Y |  |  |
| 2143 | should detect food in the room | funct | good | Y |  |  |
| 2144 | should detect smoke in the room | funct | good | Y |  |  |
| 2145 | should prioritize smoke over food scents | funct | good | Y |  |  |
| 2146 | should detect general room scents | funct | good | Y |  |  |
| 2147 | should allow smelling items in inventory | funct | good | Y |  |  |
| 2148 | should allow smelling items in same room | funct | good | Y |  |  |
| 2149 | should include proper entities in all events | struc | good | Y |  |  |
#### switching_off-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2150 | should have correct ID | struc | adeq | Y |  |  |
| 2151 | should declare required messages | struc | adeq | Y |  |  |
| 2152 | should belong to device_manipulation group | struc | adeq | Y |  |  |
| 2153 | should fail when no target specified | funct | good | Y |  |  |
| 2154 | should fail when target is not switchable | funct | good | Y |  |  |
| 2155 | should fail when already off | funct | good | Y |  |  |
| 2156 | should switch off simple device | funct | good | Y |  |  |
| 2157 | should handle device with custom off sound | funct | good | Y |  |  |
| 2158 | should handle device with running sound | funct | good | Y |  |  |
| 2159 | should handle temporary device | funct | good | Y |  |  |
| 2160 | should darken room when turning off only light | funct | good | Y |  |  |
| 2161 | should not darken room with other lights | funct | good | Y |  |  |
| 2162 | should consider carried lights | funct | good | Y |  |  |
| 2163 | should free power consumption | funct | good | Y |  |  |
| 2164 | should close automatic door when turned off | funct | good | Y |  |  |
| 2165 | should not affect door without autoCloseOnOff | funct | good | Y |  |  |
| 2166 | should not close already closed door | funct | good | Y |  |  |
| 2167 | should include proper entities in all events | struc | good | Y |  |  |
| 2168 | should actually set isOn to false after switching off | funct | good | Y | Y |  |
| 2169 | should actually set isOn to false and clear autoOffCounter | funct | good | Y | Y |  |
| 2170 | should NOT change isOn when already off | funct | good | Y | Y |  |
| 2171 | should NOT change state when target is not switchable | funct | good | Y | Y |  |
| 2172 | should actually turn off a light source and coordinate with LightSourc | funct | good | Y | Y |  |
| 2173 | should turn off device with power requirements | funct | good | Y | Y |  |
#### switching_on-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2174 | should have correct ID | struc | adeq | Y |  |  |
| 2175 | should declare required messages | struc | adeq | Y |  |  |
| 2176 | should belong to device_manipulation group | struc | adeq | Y |  |  |
| 2177 | should fail when no target specified | funct | good | Y |  |  |
| 2178 | should fail when target is not switchable | funct | good | Y |  |  |
| 2179 | should fail when already on | funct | good | Y |  |  |
| 2180 | should fail when no power available | funct | good | Y |  |  |
| 2181 | should switch on simple device | funct | good | Y |  |  |
| 2182 | should handle device with custom sound | funct | good | Y |  |  |
| 2183 | should handle temporary activation | funct | good | Y |  |  |
| 2184 | should handle basic light source | funct | good | Y |  |  |
| 2185 | should illuminate dark room | funct | good | Y |  |  |
| 2186 | should not illuminate if other lights exist | funct | good | Y |  |  |
| 2187 | should work with available power | funct | good | Y |  |  |
| 2188 | should open automatic door when turned on | funct | good | Y |  |  |
| 2189 | should not affect already open door | funct | good | Y |  |  |
| 2190 | should include continuous sound | funct | good | Y |  |  |
| 2191 | should include proper entities in all events | struc | good | Y |  |  |
| 2192 | should actually set isOn to true after switching on | funct | good | Y | Y |  |
| 2193 | should actually set isOn to true for device with power available | funct | good | Y | Y |  |
| 2194 | should NOT change isOn when already on | funct | good | Y | Y |  |
| 2195 | should NOT change isOn when no power available | funct | good | Y | Y |  |
| 2196 | should NOT change state when target is not switchable | funct | good | Y | Y |  |
| 2197 | should actually turn on a light source and coordinate with LightSource | funct | good | Y | Y |  |
#### taking-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2198 | should have required methods for three-phase pattern | struc | adeq | Y |  |  |
| 2199 | should use report() for ALL event generation | struc | poor | Y |  | Test only checks events is defined and is an array. Does not verify any specific |
| 2200 | should have correct ID | struc | adeq | Y |  |  |
| 2201 | should declare required messages | struc | adeq | Y |  |  |
| 2202 | should belong to object_manipulation group | struc | adeq | Y |  |  |
| 2203 | should fail when no target specified | funct | good | Y |  |  |
| 2204 | should fail when trying to take yourself | funct | good | Y |  |  |
| 2205 | should fail when already holding the item | funct | good | Y |  |  |
| 2206 | should fail when trying to take a room | funct | good | Y |  |  |
| 2207 | should fail when object is scenery | funct | good | Y |  |  |
| 2208 | should fail when container is full | funct | good | Y |  |  |
| 2209 | should not count worn items toward capacity | funct | good | Y |  |  |
| 2210 | should fail when too heavy | funct | adeq | S |  |  |
| 2211 | should take object from room | funct | good | Y |  |  |
| 2212 | should take object from container | funct | good | Y |  |  |
| 2213 | should take object from supporter | funct | good | Y |  |  |
| 2214 | should implicitly remove worn item before taking | behav | good | Y |  |  |
| 2215 | should include proper entities in all events | struc | good | Y |  |  |
| 2216 | should not include container info when taking from room | funct | good | Y |  |  |
| 2217 | should actually move item from room to player inventory | funct | good | Y | Y |  |
| 2218 | should actually move item from container to player inventory | funct | good | Y | Y |  |
| 2219 | should actually move item from supporter to player inventory | funct | good | Y | Y |  |
| 2220 | should NOT move item when validation fails | funct | good | Y | Y |  |
| 2221 | should handle taking from nested containers | funct | good | Y |  |  |
| 2222 | should handle empty player without container trait | funct | good | Y |  |  |
#### taking_off-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2223 | should have correct ID | struc | adeq | Y |  |  |
| 2224 | should declare required messages | struc | adeq | Y |  |  |
| 2225 | should belong to wearable_manipulation group | struc | adeq | Y |  |  |
| 2226 | should fail when no target specified | funct | good | Y |  |  |
| 2227 | should fail when item not on actor | funct | good | Y |  |  |
| 2228 | should fail when item is not wearable | funct | good | Y |  |  |
| 2229 | should fail when item not actually worn | funct | good | Y |  |  |
| 2230 | should fail when blocked by outer layer | funct | good | Y |  |  |
| 2231 | should fail when item is cursed | funct | good | Y |  |  |
| 2232 | should remove worn item | funct | good | Y |  |  |
| 2233 | should remove item without body part | funct | good | Y |  |  |
| 2234 | should remove outermost layer | funct | good | Y |  |  |
| 2235 | should handle items on different body parts | funct | good | Y |  |  |
| 2236 | should include layer information in events | funct | good | Y |  |  |
| 2237 | should include proper entities in all events | struc | good | Y |  |  |
| 2238 | should actually set worn to false after taking off | funct | good | Y | Y |  |
| 2239 | should actually set worn to false with body part preserved | funct | good | Y | Y |  |
| 2240 | should NOT change worn when not wearing | funct | good | Y | Y |  |
| 2241 | should NOT change state when target is not wearable | funct | good | Y | Y |  |
| 2242 | should take off outermost layer without affecting inner layers | funct | good | Y | Y |  |
| 2243 | should take off item without bodyPart specified | funct | good | Y | Y |  |
#### talking-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2244 | should have correct ID | struc | adeq | Y |  |  |
| 2245 | should declare required messages | struc | adeq | Y |  |  |
| 2246 | should belong to social group | struc | adeq | Y |  |  |
| 2247 | should fail when no target specified | funct | good | Y |  |  |
| 2248 | should fail when target is not an actor | funct | good | Y |  |  |
| 2249 | should fail when trying to talk to self | funct | good | Y |  |  |
| 2250 | should fail when NPC is not available to talk | funct | good | Y |  |  |
| 2251 | should talk to NPC without conversation system | funct | good | Y |  |  |
| 2252 | should handle first meeting with NPC | funct | good | Y |  |  |
| 2253 | should handle formal personality on first meeting | funct | good | Y |  |  |
| 2254 | should handle casual personality on first meeting | funct | good | Y |  |  |
| 2255 | should handle subsequent meeting with friendly NPC | funct | good | Y |  |  |
| 2256 | should handle NPC that remembers player | funct | good | Y |  |  |
| 2257 | should handle regular subsequent greeting | funct | good | Y |  |  |
| 2258 | should detect NPC with topics to discuss | funct | good | Y |  |  |
| 2259 | should detect NPC with no topics | funct | good | Y |  |  |
| 2260 | should include proper entities in all events | struc | good | Y |  |  |
#### throwing-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2261 | should have correct ID | struc | adeq | Y |  |  |
| 2262 | should declare required messages | struc | adeq | Y |  |  |
| 2263 | should belong to interaction group | struc | adeq | Y |  |  |
| 2264 | should fail when no item specified | funct | good | Y |  |  |
| 2265 | should prevent throwing at self | funct | good | Y |  |  |
| 2266 | should fail when no exit in specified direction | funct | good | Y |  |  |
| 2267 | should fail when item is too heavy for distance throw | funct | good | Y |  |  |
| 2268 | should drop non-fragile item gently | funct | good | Y |  |  |
| 2269 | should handle fragile items gently thrown | funct | good | Y |  |  |
| 2270 | should break fragile item when dropped carelessly | funct | good | Y |  |  |
| 2271 | should hit stationary target | funct | good | Y |  |  |
| 2272 | should miss moving actor - implementation bug: duck/catch logic only r | funct | adeq | S |  | Skipped due to implementation bug: duck/catch logic only runs on hit. Fix the ac |
| 2273 | should allow NPC to catch thrown item - implementation bug: catch logi | funct | adeq | S |  | Skipped due to implementation bug: catch logic only runs on hit. Fix the action  |
| 2274 | should land on supporter when hit | funct | good | Y |  |  |
| 2275 | should land in open container | funct | good | Y |  |  |
| 2276 | should bounce off closed container | funct | good | Y |  |  |
| 2277 | should break fragile item on impact | funct | good | Y |  |  |
| 2278 | should anger hit NPC | funct | good | Y |  |  |
| 2279 | should allow throwing light objects far | funct | good | Y |  |  |
| 2280 | should allow dropping heavy items | funct | good | Y |  |  |
| 2281 | should detect various fragile materials | funct | adeq | Y |  | Test duplicates action internals (fragility detection logic) rather than testing |
| 2282 | should include proper entities in all events | struc | good | Y |  |  |
| 2283 | should actually move item to room floor on general throw | funct | good | Y | Y |  |
| 2284 | should actually move item onto supporter when thrown at it | funct | good | Y | Y |  |
| 2285 | should actually move item into open container when thrown at it | funct | good | Y | Y |  |
| 2286 | should move item to floor when bouncing off closed container | funct | good | Y | Y |  |
| 2287 | should NOT move item when validation fails (too heavy) | funct | good | Y | Y |  |
| 2288 | should NOT move item when throwing at self | funct | good | Y | Y |  |
#### touching-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2289 | should have correct ID | struc | adeq | Y |  |  |
| 2290 | should declare required messages | struc | adeq | Y |  |  |
| 2291 | should belong to sensory group | struc | adeq | Y |  |  |
| 2292 | should fail when no target specified | funct | good | Y |  |  |
| 2293 | should detect hot light source when lit | funct | good | Y |  |  |
| 2294 | should detect warm device when switched on | funct | good | Y |  |  |
| 2295 | should detect vibrating device | funct | good | Y |  |  |
| 2296 | should detect soft wearable items | funct | good | Y |  |  |
| 2297 | should detect smooth door surfaces | funct | good | Y |  |  |
| 2298 | should detect hard container surfaces | funct | good | Y |  |  |
| 2299 | should detect wet liquid items | funct | good | Y |  |  |
| 2300 | should detect container with liquid inside | funct | good | Y |  |  |
| 2301 | should detect immovable scenery | funct | good | Y |  |  |
| 2302 | should include size information when available | funct | adeq | Y |  |  |
| 2303 | should handle normal touch | funct | good | Y |  |  |
| 2304 | should handle poke verb | funct | good | Y |  |  |
| 2305 | should handle prod verb | funct | good | Y |  |  |
| 2306 | should handle pat verb | funct | good | Y |  |  |
| 2307 | should handle stroke verb | funct | good | Y |  |  |
| 2308 | should handle feel verb | funct | good | Y |  |  |
| 2309 | should prioritize temperature over texture | funct | good | Y |  |  |
| 2310 | should include proper entities in all events | struc | good | Y |  |  |
#### unlocking-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2311 | should have correct ID | struc | adeq | Y |  |  |
| 2312 | should declare required messages | struc | adeq | Y |  |  |
| 2313 | should belong to lock_manipulation group | struc | adeq | Y |  |  |
| 2314 | should fail when no target specified | funct | good | Y |  |  |
| 2315 | should fail when target is not lockable | funct | good | Y |  |  |
| 2316 | should fail when already unlocked | funct | good | Y |  |  |
| 2317 | should fail when key required but not provided | funct | good | Y |  |  |
| 2318 | should fail when key not held by player | funct | good | Y |  |  |
| 2319 | should fail with wrong key | funct | good | Y |  |  |
| 2320 | should unlock object without key requirement | funct | good | Y |  |  |
| 2321 | should unlock with correct key | funct | adeq | S |  |  |
| 2322 | should unlock door and note room connection | funct | adeq | S |  |  |
| 2323 | should handle multiple valid keys | funct | good | Y |  |  |
| 2324 | should include unlock sound if specified | funct | adeq | S |  |  |
| 2325 | should note container with contents | funct | adeq | S |  |  |
| 2326 | should detect auto-open on unlock | funct | adeq | S |  |  |
| 2327 | should not auto-open if not configured | funct | adeq | S |  |  |
| 2328 | should include proper entities in all events | struc | good | Y |  |  |
| 2329 | should handle lockable without openable trait | funct | good | Y |  |  |
| 2330 | should prefer keyId over keyIds when both present | funct | adeq | S |  |  |
| 2331 | should work with backup key when primary not available | funct | adeq | S |  |  |
| 2332 | should handle empty container unlock | funct | adeq | S |  |  |
| 2333 | should actually set isLocked to false after unlocking | funct | good | Y | Y |  |
| 2334 | should actually set isLocked to false when using correct key | funct | good | Y | Y |  |
| 2335 | should NOT change isLocked when already unlocked | funct | good | Y | Y |  |
| 2336 | should NOT change isLocked when wrong key provided | funct | good | Y | Y |  |
| 2337 | should NOT change state when target is not lockable | funct | good | Y | Y |  |
| 2338 | should actually unlock a door with key | funct | good | Y | Y |  |
#### waiting-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2339 | should have correct ID | struc | adeq | Y |  |  |
| 2340 | should declare required messages | struc | adeq | Y |  |  |
| 2341 | should belong to meta group | struc | adeq | Y |  |  |
| 2342 | should not require objects | struc | good | Y |  |  |
| 2343 | should have validate, execute, and report functions | struc | adeq | Y |  |  |
| 2344 | validate should always return valid | funct | good | Y |  |  |
| 2345 | execute should return void (not events) | funct | good | Y |  |  |
| 2346 | execute should store location in sharedData | funct | good | Y | Y |  |
| 2347 | report should return events array | funct | good | Y |  |  |
| 2348 | should emit if.event.waited with turnsPassed | funct | good | Y |  |  |
| 2349 | should emit if.event.waited with location info | funct | good | Y |  |  |
| 2350 | should include messageId in waited event for text rendering | funct | good | Y |  |  |
| 2351 | should not modify world state | funct | good | Y | Y |  |
| 2352 | should not modify entity traits | funct | good | Y | Y |  |
| 2353 | should be a minimal signal action | behav | good | Y |  |  |
#### wearing-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2354 | should have correct ID | struc | adeq | Y |  |  |
| 2355 | should declare required messages | struc | adeq | Y |  |  |
| 2356 | should belong to wearable_manipulation group | struc | adeq | Y |  |  |
| 2357 | should fail when no target specified | funct | good | Y |  |  |
| 2358 | should fail when item is not wearable | funct | good | Y |  |  |
| 2359 | should fail when already wearing item | funct | good | Y |  |  |
| 2360 | should fail when item not held and not in room | funct | adeq | S |  |  |
| 2361 | should fail when body part conflict exists | funct | good | Y |  |  |
| 2362 | should fail when layer conflict exists | funct | good | Y |  |  |
| 2363 | should wear item from inventory | funct | good | Y |  |  |
| 2364 | should implicitly take and wear item from room | behav | good | Y |  |  |
| 2365 | should wear item without body part specified | funct | good | Y |  |  |
| 2366 | should handle layered clothing correctly | funct | good | Y |  |  |
| 2367 | should wear multiple items on different body parts | funct | good | Y |  |  |
| 2368 | should include proper entities in all events | struc | good | Y |  |  |
| 2369 | should actually set worn to true after wearing | funct | good | Y | Y |  |
| 2370 | should actually set worn to true with body part preserved | funct | good | Y | Y |  |
| 2371 | should NOT change worn when already wearing | funct | good | Y | Y |  |
| 2372 | should NOT change state when target is not wearable | funct | good | Y | Y |  |
| 2373 | should wear item with layering system | funct | good | Y | Y |  |
| 2374 | should wear item without bodyPart specified | funct | good | Y | Y |  |
#### capability-refactoring.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1515 | should contain all standard capabilities | struc | good | Y |  |  |
| 1516 | should have valid schemas for each capability | struc | good | Y |  |  |
| 1517 | should register all capabilities by default | funct | good | Y | Y |  |
| 1518 | should register only specified capabilities | funct | good | Y | Y |  |
| 1519 | should define correct schema structure | struc | good | Y |  |  |
| 1520 | should support CommandHistoryData interface | struc | adeq | Y |  |  |
| 1521 | should handle entry trimming logic | funct | adeq | Y | Y | Implements trimming logic inline in the test instead of calling the real code. T |
| 1522 | should work with real WorldModel instance | behav | good | Y | Y |  |
#### opened-revealed.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2556 | should return revealed event when container has contents | funct | good | Y |  |  |
| 2557 | should return null for non-containers | funct | good | Y |  |  |
| 2558 | should return null for empty containers | funct | good | Y |  |  |
| 2559 | should return null when target entity not found | funct | good | Y |  |  |
| 2560 | should return null when targetId is missing | funct | good | Y |  |  |
| 2561 | should list all items in revealed event | funct | good | Y |  |  |
| 2562 | should include container in entities.target field | funct | good | Y |  |  |
| 2563 | should include item ids in entities.others field | funct | good | Y |  |  |
| 2564 | should generate unique event id | funct | good | Y |  |  |
| 2565 | should set event type to if.event.revealed | funct | good | Y |  |  |
| 2566 | should include timestamp | funct | good | Y |  |  |
| 2567 | should use item name as messageId | funct | good | Y |  |  |
| 2568 | should fall back to entity id if no name | funct | good | Y |  |  |
| 2569 | should export the chain key constant | struc | adeq | Y |  |  |
| 2570 | should use entity name from world if targetName not provided | funct | good | Y |  |  |
#### character-observer.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2465 | should pass events with accurate perception | funct | good | Y |  |  |
| 2466 | should miss filtered event categories | funct | good | Y |  |  |
| 2467 | should amplify matching event categories | funct | good | Y |  |  |
| 2468 | should pass events that match no filter patterns | funct | good | Y |  |  |
| 2469 | should pass events with filtered perception but no filter config | funct | good | Y |  |  |
| 2470 | should pass events through augmented perception | funct | good | Y |  |  |
| 2471 | should match filter patterns against event tags | funct | good | Y |  |  |
| 2472 | should inject hallucinated facts when lucidity state matches | funct | good | Y | Y |  |
| 2473 | should not inject when lucidity state does not match | funct | good | Y | Y |  |
| 2474 | should not re-inject already known hallucinated facts | funct | good | Y |  |  |
| 2475 | should return empty for non-augmented perception | funct | good | Y |  |  |
| 2476 | should return empty for NPC without CharacterModelTrait | funct | good | Y |  |  |
| 2477 | should add witnessed fact to knowledge | funct | good | Y | Y |  |
| 2478 | should increase threat when violence event observed | funct | good | Y | Y |  |
| 2479 | should adjust mood on violence event | funct | good | Y | Y |  |
| 2480 | should apply amplification for filtered+amplified events | funct | good | Y | Y |  |
| 2481 | should skip missed events entirely | funct | good | Y | Y |  |
| 2482 | should emit mood change event when mood word changes | funct | good | Y |  |  |
| 2483 | should emit threat change event when threat word changes | funct | good | Y |  |  |
| 2484 | should emit fact learned event | funct | good | Y |  |  |
| 2485 | should adjust disposition toward event actor on giving | funct | good | Y | Y |  |
| 2486 | should trigger lucidity state change on matching event | funct | good | Y | Y |  |
| 2487 | should accept custom state transition rules | funct | good | Y | Y |  |
| 2488 | should inject hallucinations during observation for augmented percepti | funct | good | Y | Y |  |
| 2489 | should return empty for NPC without CharacterModelTrait | funct | good | Y |  |  |
| 2490 | should return empty when no lucidity config | funct | good | Y |  |  |
| 2491 | should return empty when no active window | funct | good | Y |  |  |
| 2492 | should decay window and emit event when baseline restored | funct | good | Y | Y |  |
| 2493 | should verify actual trait field mutation after decay | funct | good | Y | Y |  |
| 2494 | should set window turns based on decay rate | funct | good | Y | Y |  |
| 2495 | should use fast decay rate | funct | good | Y | Y |  |
| 2496 | should enter state without window when no config | funct | good | Y | Y |  |
| 2497 | should have increasing turn counts from fast to slow | struc | good | Y |  |  |
| 2498 | should track cumulative state changes across multiple events | behav | good | Y | Y |  |
#### npc-service.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2499 | should register a behavior | funct | good | Y | Y |  |
| 2500 | should remove a behavior | funct | good | Y | Y |  |
| 2501 | should return undefined for unknown behavior | funct | good | Y |  |  |
| 2502 | should call onTurn for active NPCs | funct | good | Y |  |  |
| 2503 | should not call onTurn for dead NPCs | funct | good | Y |  |  |
| 2504 | should not call onTurn for unconscious NPCs | funct | good | Y |  |  |
| 2505 | should call onPlayerEnters for NPCs in room | funct | good | Y |  |  |
| 2506 | should call onPlayerLeaves for NPCs in room | funct | good | Y |  |  |
| 2507 | should call onSpokenTo when player speaks | funct | good | Y |  |  |
| 2508 | should return default response if no handler | funct | good | Y |  |  |
| 2509 | should call onAttacked when NPC is attacked | funct | good | Y |  |  |
| 2510 | should not move on turn | funct | good | Y |  |  |
| 2511 | should emote when player enters | funct | good | Y |  |  |
| 2512 | should counterattack when attacked | funct | good | Y |  |  |
| 2513 | should do nothing on turn | funct | good | Y |  |  |
| 2514 | should sometimes move | funct | good | Y |  |  |
| 2515 | should not move when no exits | funct | good | Y |  |  |
| 2516 | should create an NPC service | struc | adeq | Y |  |  |
#### parser-factory.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2452 | should register a parser for a language | funct | good | Y | Y |  |
| 2453 | should register both full code and language-only code | funct | good | Y | Y |  |
| 2454 | should handle case-insensitive language codes | funct | good | Y |  |  |
| 2455 | should create a parser for registered language | funct | good | Y |  |  |
| 2456 | should find parser by language code without region | funct | good | Y |  |  |
| 2457 | should throw error for unregistered language | funct | good | Y |  |  |
| 2458 | should list available languages in error message | funct | good | Y |  |  |
| 2459 | should return empty array when no parsers registered | funct | good | Y |  |  |
| 2460 | should return sorted list of registered languages | funct | good | Y |  |  |
| 2461 | should return false for unregistered language | funct | good | Y |  |  |
| 2462 | should return true for registered language | funct | good | Y |  |  |
| 2463 | should check language-only code as fallback | funct | good | Y |  |  |
| 2464 | should remove all registered parsers | funct | good | Y | Y |  |
#### scope-resolver.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2375 | should see objects in same room | funct | good | Y |  |  |
| 2376 | should not see objects in different room | funct | good | Y |  |  |
| 2377 | should see carried items | funct | good | Y |  |  |
| 2378 | should see objects in open containers | funct | good | Y |  |  |
| 2379 | should not see objects in closed containers | funct | good | Y |  |  |
| 2380 | should see nested containers when open | funct | good | Y |  |  |
| 2381 | should not see through any closed container in hierarchy | funct | good | Y |  |  |
| 2382 | should see objects on supporters | funct | good | Y |  |  |
| 2383 | should see objects on nested supporters | funct | good | Y |  |  |
| 2384 | should reach objects in same location | funct | good | Y |  |  |
| 2385 | should reach objects on supporters | funct | good | Y |  |  |
| 2386 | should reach objects in open containers | funct | good | Y |  |  |
| 2387 | should not reach objects in closed containers | funct | good | Y |  |  |
| 2388 | should not reach high objects | funct | dead | Y |  | Empty test body - no assertions. Either implement or remove. |
| 2389 | should return all visible entities | funct | good | Y |  |  |
| 2390 | should return only reachable entities | funct | good | Y |  |  |
| 2391 | should handle entities with no location | funct | good | Y |  |  |
| 2392 | should handle circular containment gracefully | funct | good | Y |  |  |
| 2393 | should make entity visible globally with setMinimumScope | funct | good | Y | Y |  |
| 2394 | should make entity reachable globally with setMinimumScope | funct | good | Y | Y |  |
| 2395 | should apply minimum scope only to specific rooms | funct | good | Y | Y |  |
| 2396 | should apply minimum scope to multiple specific rooms | funct | good | Y | Y |  |
| 2397 | should be additive - cannot lower physical scope | funct | good | Y | Y |  |
| 2398 | should raise scope from physical level | funct | good | Y | Y |  |
| 2399 | should clear minimum scope with clearMinimumScope | funct | good | Y | Y |  |
| 2400 | should clear minimum scope for specific rooms only | funct | good | Y | Y |  |
| 2401 | should include minimum scope entities in getVisible | funct | good | Y |  |  |
| 2402 | should include minimum scope entities in getReachable | funct | good | Y |  |  |
| 2403 | should include minimum scope entities in getAudible | funct | good | Y |  |  |
| 2404 | should persist minimum scope through clone | funct | good | Y |  |  |
| 2405 | should persist minimum scope through toJSON/fromJSON | funct | good | Y |  |  |
| 2406 | should make entity reachable from vehicle room via setMinimumScope | behav | good | Y | Y |  |
| 2407 | should NOT make entity reachable from wrong vehicle room | behav | good | Y |  |  |
| 2408 | should include vehicle-scoped entities in getReachable | behav | good | Y |  |  |
| 2409 | should preserve vehicle scope through WorldModel serialization round-t | behav | good | Y | Y |  |
| 2410 | should resolve entities by name + scope after serialization (command v | behav | adeq | Y |  | Test has excessive console.log tracing and reimplements command validator logic  |
| 2411 | REPRO: two wires with shared alias cause ENTITY_NOT_FOUND via modifier | behav | adeq | Y | Y | Bug reproduction test that reimplements command validator logic manually. Has ex |
| 2412 | should allow dynamic scope changes during gameplay | funct | good | Y | Y |  |
| 2413 | should return default priority of 100 when not set | funct | good | Y |  |  |
| 2414 | should set and get priority for specific action | funct | good | Y | Y |  |
| 2415 | should support deprioritizing entities | funct | good | Y | Y |  |
| 2416 | should clear priority for specific action | funct | good | Y | Y |  |
| 2417 | should clear all priorities with clearAllScopes | funct | good | Y | Y |  |
| 2418 | should get all priorities with getScopePriorities | funct | good | Y |  |  |
| 2419 | should persist priorities through clone | funct | good | Y |  |  |
| 2420 | should persist priorities through toJSON/fromJSON | funct | good | Y |  |  |
| 2421 | should allow setting extreme priorities | funct | good | Y | Y |  |
| 2422 | should allow updating priority by calling scope() again | funct | good | Y | Y |  |
| 2423 | should support multiple entities with different priorities | funct | good | Y | Y |  |
#### sensory-extensions.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2424 | should hear entities in same room | funct | good | Y |  |  |
| 2425 | should hear through open doors | funct | good | Y |  |  |
| 2426 | should hear through closed doors (muffled) | funct | good | Y |  |  |
| 2427 | should not hear in unconnected rooms | funct | good | Y |  |  |
| 2428 | should get all audible entities | funct | good | Y |  |  |
| 2429 | should smell food items in same room | funct | good | Y |  |  |
| 2430 | should smell actors in same room | funct | good | Y |  |  |
| 2431 | should smell through open doors | funct | good | Y |  |  |
| 2432 | should not smell through closed doors | funct | good | Y |  |  |
| 2433 | should not smell non-scented items | funct | good | Y |  |  |
| 2434 | should not see in dark rooms without light | funct | good | Y |  |  |
| 2435 | should see in dark rooms with carried light source | funct | good | Y |  |  |
| 2436 | should see if actor itself provides light | funct | good | Y |  |  |
| 2437 | should see in lit rooms | funct | good | Y |  |  |
#### witness-system.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2438 | should record witnesses for movement in same room | funct | good | Y | Y |  |
| 2439 | should not record actor as witness of their own action | funct | good | Y |  |  |
| 2440 | should not witness events in different rooms | funct | good | Y |  |  |
| 2441 | should track discovered entities | funct | good | Y | Y |  |
| 2442 | should track entity movement history | funct | good | Y | Y |  |
| 2443 | should update visual properties when witnessed | funct | adeq | Y | Y | Test notes visual property extraction not yet implemented. Only checks entity ex |
| 2444 | should mark entities as non-existent when destroyed | funct | good | Y | Y |  |
| 2445 | should emit action witness event | funct | dead | S |  | Skipped test. Uses module-level mock of createEvent but may need different appro |
| 2446 | should emit movement witness event | funct | dead | S |  | Skipped test. Uses module-level mock of createEvent. Enable or remove. |
| 2447 | should emit unknown entity for partial witness level | funct | dead | S |  | Skipped test. Uses module-level mock and spy on canReach. Enable or remove. |
| 2448 | should assign FULL level when can reach | funct | good | Y |  |  |
| 2449 | should assign PARTIAL level when can see but not reach | funct | good | Y |  |  |
| 2450 | should return all known entities for an actor | funct | good | Y | Y |  |
| 2451 | should return empty array for actor with no knowledge | funct | good | Y |  |  |
#### perception-service.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2540 | should return true for sight in a lit room | funct | good | Y |  |  |
| 2541 | should return false for sight in a dark room | funct | good | Y |  |  |
| 2542 | should return true for hearing in any room | funct | good | Y |  |  |
| 2543 | should return true for smell in any room | funct | good | Y |  |  |
| 2544 | should return true for touch in any room | funct | good | Y |  |  |
| 2545 | should pass through all events unchanged | funct | good | Y |  |  |
| 2546 | should transform room description to perception blocked | funct | good | Y |  |  |
| 2547 | should transform contents list to perception blocked | funct | good | Y |  |  |
| 2548 | should transform action.success with contents_list to perception block | funct | good | Y |  |  |
| 2549 | should NOT transform non-visual action.success events | funct | good | Y |  |  |
| 2550 | should NOT transform action.failure events | funct | good | Y |  |  |
| 2551 | should NOT transform game.message events | funct | good | Y |  |  |
| 2552 | should pass through events when player location cannot be determined | funct | good | Y |  |  |
| 2553 | should preserve original event data in blocked event | funct | good | Y |  |  |
| 2554 | should handle empty events array | funct | good | Y |  |  |
| 2555 | should handle mixed event types correctly | funct | good | Y |  |  |
#### command-validator-golden.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 2517 | validates unknown action | funct | good | Y |  |  |
| 2518 | validates action without object in parsed command | funct | dead | S |  | Skipped: parser currently requires object for take verb. Either fix parser or re |
| 2519 | validates simple entity resolution | funct | good | Y |  |  |
| 2520 | resolves entity with adjective | funct | good | Y |  |  |
| 2521 | distinguishes between similar objects by adjective | funct | good | Y |  |  |
| 2522 | handles wrong adjective | funct | good | Y |  |  |
| 2523 | adjective fallback: "press yellow" finds "yellow button" | funct | good | Y |  |  |
| 2524 | allows taking visible objects | funct | good | Y |  |  |
| 2525 | allows examining inventory items | funct | good | Y |  |  |
| 2526 | prevents taking objects from other rooms | funct | good | Y |  |  |
| 2527 | emits entity resolution debug events | funct | good | Y |  |  |
| 2528 | emits scope check debug events | funct | good | Y |  |  |
| 2529 | returns ambiguity error when multiple matches | funct | good | Y |  |  |
| 2530 | auto-resolves when adjectives disambiguate | funct | good | Y |  |  |
| 2531 | resolves entity by synonym | funct | good | Y |  |  |
| 2532 | resolves entity by type name | funct | good | Y |  |  |
| 2533 | validates commands with prepositions | behav | good | Y |  |  |
| 2534 | should resolve with explicit directObject selection | funct | good | Y |  |  |
| 2535 | should resolve with different explicit selection | funct | good | Y |  |  |
| 2536 | should fail if selected entity no longer exists | funct | good | Y |  |  |
| 2537 | should resolve indirectObject with explicit selection | funct | good | Y |  |  |
| 2538 | should use normal resolution for unspecified slots | funct | good | Y |  |  |
| 2539 | should still check scope constraints on selected entities | funct | good | Y |  |  |
#### entity-alias-resolution.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1505 | should find entity by its primary name | behav | good | Y |  |  |
| 1506 | should find entity by alias "hook" | behav | adeq | Y |  | Excessive console.log debug output (world state dump). Clean up debug logging. |
| 1507 | should find entity by alias "peg" | behav | good | Y |  |  |
| 1508 | should find entity as indirect object for PUT action | behav | good | Y |  |  |
| 1509 | should resolve multi-word alias "bush babies" via full text match | behav | good | Y |  |  |
| 1510 | should resolve single-word alias "galagos" normally | behav | good | Y |  |  |
| 1511 | should resolve multi-word entity name as primary name | behav | good | Y |  |  |
| 1512 | should prefer full text match over head-only match for disambiguation | behav | good | Y |  |  |
| 1513 | should fall back to head noun when full text has no match | behav | good | Y |  |  |
| 1514 | should handle entities with same aliases in different locations | behav | good | Y |  |  |
### world-model

#### annotations.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 265 | should add and retrieve annotations by kind | funct | good | Y | Y |  |
| 266 | should support multiple annotations per kind | funct | good | Y | Y |  |
| 267 | should return empty array for unknown kind | funct | good | Y |  |  |
| 268 | should support multiple kinds on the same entity | funct | good | Y | Y |  |
| 269 | should be chainable | funct | good | Y |  |  |
| 270 | should remove by kind and id | funct | good | Y | Y |  |
| 271 | should return false for non-existent annotation | funct | good | Y |  |  |
| 272 | should clean up empty kind map | funct | good | Y | Y |  |
| 273 | should return true when annotations exist | funct | good | Y |  |  |
| 274 | should return false when no annotations | funct | good | Y |  |  |
| 275 | should return all annotations when none have conditions | funct | good | Y |  |  |
| 276 | should filter by self trait condition | funct | good | Y |  |  |
| 277 | should filter by player trait condition | funct | good | Y | Y |  |
| 278 | should filter by location trait condition | funct | good | Y | Y |  |
| 279 | should return unconditional annotations alongside matching conditional | funct | good | Y |  |  |
| 280 | should return false for condition on missing trait | funct | good | Y |  |  |
| 281 | should deep-copy annotations | funct | good | Y | Y |  |
| 282 | should round-trip annotations | funct | good | Y |  |  |
| 283 | should handle entity with no annotations | funct | good | Y |  |  |
#### container-hierarchies.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 312 | should handle deeply nested containers | behav | good | Y | Y |  |
| 313 | should enforce maximum nesting depth | behav | adeq | Y |  | Conditional assertion (if/else) weakens the test; should assert a definite outco |
| 314 | should prevent circular containment | behav | good | Y |  |  |
| 315 | should calculate total weight including contents | behav | good | Y | Y |  |
| 316 | should handle container capacity limits | behav | adeq | Y | Y | Test documents that capacity limits are NOT enforced (comment says "Currently no |
| 317 | should handle supporter and container combinations | behav | good | Y | Y |  |
| 318 | should handle furniture with both surfaces and storage | behav | good | Y | Y |  |
| 319 | should handle moving containers with contents | behav | good | Y | Y |  |
| 320 | should update visibility when opening/closing containers | behav | good | N | Y |  |
| 321 | should find all containers of a specific type | funct | good | Y |  |  |
| 322 | should find containers matching complex criteria | funct | good | Y |  |  |
| 323 | should handle large numbers of containers efficiently | funct | good | Y |  |  |
| 324 | should efficiently check containment loops in complex hierarchies | funct | good | Y |  |  |
#### door-mechanics.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 325 | should create doors connecting two rooms | behav | good | Y | Y |  |
| 326 | should synchronize door state between rooms | behav | good | Y | Y |  |
| 327 | should prevent opening locked doors | behav | adeq | Y |  | Test only checks trait state, never actually tries to open a locked door via beh |
| 328 | should unlock doors with correct key | behav | adeq | Y | Y | Test manually sets isLocked=false rather than using unlock behavior with key ver |
| 329 | should handle multiple locked doors | behav | adeq | Y | Y |  |
| 330 | should handle secret doors | behav | good | Y | Y |  |
| 331 | should handle one-way doors | struc | adeq | Y |  | Test only verifies custom property values were set; does not test any behavior |
| 332 | should handle automatic closing doors | struc | adeq | Y |  | Test only verifies custom property values were set; does not test any auto-close |
| 333 | should affect visibility through doors | behav | good | Y | Y |  |
| 334 | should handle doors with windows | struc | adeq | Y |  | Only checks that hasWindow/windowTransparent properties were set on door trait;  |
| 335 | should handle rooms with multiple doors | behav | good | Y |  |  |
| 336 | should handle double doors | struc | adeq | Y |  |  |
| 337 | should track door usage | struc | adeq | Y |  | Test only sets and checks custom ad-hoc properties (useCount, lastUsedBy) -- no  |
| 338 | should handle door with special requirements | struc | adeq | Y |  | Test only sets and checks custom ad-hoc properties (puzzleSolved, requiresPuzzle |
| 339 | should handle buildings with many doors efficiently | behav | good | Y |  |  |
#### room-actor-containers.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 340 | should allow items to be placed in rooms without ContainerTrait | behav | good | Y | Y |  |
| 341 | should respect room capacity limits | struc | adeq | Y |  | Test only checks that trait property exists; does not verify capacity enforcemen |
| 342 | should handle nested containers in rooms | behav | good | Y | Y |  |
| 343 | should allow actors to carry items without ContainerTrait | behav | good | Y | Y |  |
| 344 | should handle actor inventory limits | struc | adeq | Y |  | Test only checks trait capacity property exists; does not verify capacity enforc |
| 345 | should prevent actors from being placed inside other actors | struc | adeq | Y |  | Test only checks excludedTypes property; does not verify that actor-in-actor pla |
| 346 | should correctly identify all container-capable entities | behav | good | Y | Y |  |
#### trait-combinations.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 347 | should not see contents of locked closed container | behav | good | Y |  |  |
| 348 | should not open locked container | behav | adeq | Y |  | Test manually sets isOpen=true on locked container and only checks lockable is s |
| 349 | should see contents after unlocking and opening | behav | good | Y | Y |  |
| 350 | should handle nested locked containers | behav | good | Y | Y |  |
| 351 | should see items on supporter but not in closed container | behav | good | Y |  |  |
| 352 | should handle complex containment hierarchy | behav | good | Y | Y |  |
| 353 | should include all scenery regardless of visibility | funct | good | Y |  |  |
| 354 | should handle wearing items with containers | behav | good | Y | Y |  |
| 355 | should exclude worn items when specified | behav | good | Y | Y |  |
| 356 | should track complex worn item hierarchies | behav | good | Y | Y |  |
| 357 | should navigate through doors between rooms | behav | good | Y |  |  |
| 358 | should see in lit rooms but not dark rooms | behav | good | Y | Y |  |
| 359 | should handle door state synchronization | behav | good | Y | Y |  |
| 360 | should track edible items in containers | behav | good | Y | Y |  |
| 361 | should handle consuming items from container | behav | adeq | Y |  | Test sets custom isConsumed property on edible trait via as-cast; no actual cons |
| 362 | should handle readable items in locked containers on supporters | behav | good | Y |  |  |
| 363 | should handle switchable light sources affecting room visibility | behav | good | Y | Y |  |
#### visibility-chains.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 364 | should see through open containers | behav | good | Y |  |  |
| 365 | should not see into closed containers | behav | good | Y |  |  |
| 366 | should handle mixed open/closed container chains | behav | good | Y |  |  |
| 367 | should see items on supporters | behav | good | Y |  |  |
| 368 | should see through containers on supporters | behav | good | Y |  |  |
| 369 | should not see in dark rooms | behav | good | Y |  |  |
| 370 | should see with carried light source | behav | good | Y |  |  |
| 371 | should see with light source in room | behav | good | Y |  |  |
| 372 | should handle light in containers | behav | good | Y | Y |  |
| 373 | should see items carried by actors | behav | good | Y |  |  |
| 374 | should see worn items on actors | behav | good | Y |  |  |
| 375 | should not see items in closed containers carried by actors | behav | good | Y |  |  |
| 376 | should see visible scenery | behav | good | Y |  |  |
| 377 | should not see invisible scenery | behav | good | Y |  |  |
| 378 | should see contents of visible scenery containers | behav | good | Y |  |  |
| 379 | should handle deep visibility chains | behav | good | Y |  |  |
| 380 | should handle multiple visibility blockers | behav | good | Y | Y |  |
| 381 | should handle visibility with movement | behav | good | Y | Y |  |
| 382 | should get all items in scope | behav | good | Y |  |  |
| 383 | should handle scope in dark rooms with light | behav | good | Y |  |  |
| 384 | should handle large visibility calculations efficiently | funct | adeq | Y |  |  |
| 385 | should cache visibility calculations | funct | adeq | Y |  | Test notes caching is aspirational and comments out the actual cache assertion - |
#### wearable-clothing.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 386 | should wear and remove simple items | behav | good | Y | Y |  |
| 387 | should prevent wearing already worn items | behav | good | Y |  |  |
| 388 | should track multiple worn items | behav | good | Y | Y |  |
| 389 | should create functional clothing with pockets | behav | good | Y | Y |  |
| 390 | should maintain pocket contents when wearing clothing | behav | good | Y | Y |  |
| 391 | should handle items in pockets visibility - SKIPPED: Complex visibilit | behav | dead | S |  | Test is skipped; needs review of complex visibility scenario |
| 392 | should support multiple layers of clothing | behav | good | Y | Y |  |
| 393 | should handle mixed clothing and accessories | behav | good | Y | Y |  |
| 394 | should handle nested containers in pockets | behav | good | Y | Y |  |
| 395 | should handle pocket access when clothing is in container | behav | good | Y |  |  |
| 396 | should handle clothing that blocks slots | behav | good | Y |  |  |
| 397 | should handle non-removable clothing | behav | adeq | Y |  | Test does not actually try to remove the cursed ring; only checks that canRemove |
| 398 | should track clothing condition | funct | good | Y | Y |  |
| 399 | should handle actors with many worn items efficiently | funct | good | Y |  |  |
| 400 | should efficiently filter worn vs carried items | funct | good | Y |  |  |
#### darkness-light.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 284 | should not see objects in dark room without light | behav | good | Y |  |  |
| 285 | should see objects when carrying lit light source | behav | good | Y |  |  |
| 286 | should not see when light source is off | behav | adeq | Y |  | Contains console.log debug statements that should be removed |
| 287 | should see when light source is turned on | behav | good | Y | Y |  |
| 288 | should see when room has light source | behav | good | Y |  |  |
| 289 | should work normally in lit rooms | behav | good | Y |  |  |
| 290 | should support partial darkness with specific visibility - SKIPPED: Sc | behav | dead | S |  |  |
| 291 | should handle underground darkness differently | behav | good | Y |  |  |
#### magic-sight.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 292 | should see invisible objects with true sight - SKIPPED: Magic sight sh | behav | dead | S |  |  |
| 293 | should see through walls with x-ray vision - SKIPPED: X-ray vision sho | behav | dead | S |  |  |
| 294 | should reveal concealed objects with detect magic | behav | good | Y | Y |  |
| 295 | should see inside closed containers with clairvoyance - SKIPPED: Clair | behav | dead | S |  |  |
| 296 | should have remote viewing through crystal orb | behav | good | Y |  |  |
| 297 | should combine multiple magical sight abilities - SKIPPED: Magic sight | behav | dead | S |  |  |
| 298 | should limit magical sight by power level | behav | good | Y | Y |  |
#### sound-traveling.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 299 | should hear sounds from adjacent rooms | behav | good | Y | Y |  |
| 300 | should hear loud sounds from further away | behav | good | Y |  |  |
| 301 | should not hear sounds through solid barriers | behav | good | Y | Y |  |
| 302 | should support directional sound | behav | good | Y | Y |  |
| 303 | should combine multiple sound rules | behav | good | Y |  |  |
| 304 | should filter sounds by action type | behav | good | Y |  |  |
#### window-visibility-fixed.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 305 | should not see garden entities when window is closed | behav | good | Y |  |  |
| 306 | should see garden entities when window is open with scope rule - SKIPP | behav | dead | S |  |  |
| 307 | should not see garden when window closes again - SKIPPED: Cross-room v | behav | dead | S |  |  |
| 308 | should support action-specific visibility | behav | good | Y |  |  |
| 309 | should support dynamic entity inclusion | behav | good | Y | Y |  |
| 310 | should support scope rule removal - SKIPPED: Cross-room visibility vio | behav | dead | S |  |  |
| 311 | should handle one-way visibility | behav | good | Y |  |  |
#### author-model.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 401 | should share entities between WorldModel and AuthorModel | funct | good | Y | Y |  |
| 402 | should share spatial relationships between models | funct | good | Y | Y |  |
| 403 | should share state between models | funct | good | Y | Y |  |
| 404 | should move entities into closed containers | funct | good | N | Y |  |
| 405 | should move entities into locked containers | funct | good | N | Y |  |
| 406 | should bypass container trait requirement | funct | good | Y | Y |  |
| 407 | should not check for loops | funct | good | Y | Y |  |
| 408 | should not emit events by default | funct | good | Y |  |  |
| 409 | should emit events when recordEvent is true | funct | good | N |  |  |
| 410 | should use author: prefix for events | funct | good | N |  |  |
| 411 | should populate containers with multiple items | funct | good | Y | Y |  |
| 412 | should connect rooms bidirectionally | funct | good | N | Y |  |
| 413 | should fill containers from specs | funct | good | N | Y |  |
| 414 | should setup container properties | funct | good | N | Y |  |
| 415 | should create entities with proper IDs | funct | good | Y |  |  |
| 416 | should remove entities completely | funct | good | Y | Y |  |
| 417 | should set entity properties directly | funct | good | N | Y |  |
| 418 | should set player without validation | funct | good | Y | Y |  |
| 419 | should clear all world data | funct | good | Y | Y |  |
| 420 | should handle complex world setup | behav | good | N | Y |  |
| 421 | should include items in closed containers in scope but not visible | behav | good | Y |  |  |
#### attack.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 494 | should break a breakable entity | funct | good | Y | Y |  |
| 495 | should not break already broken entity | funct | good | Y |  |  |
| 496 | should damage destructible entity with weapon | funct | good | Y | Y |  |
| 497 | should destroy destructible entity when HP reaches 0 | funct | good | Y | Y |  |
| 498 | should fail without required weapon | funct | good | Y |  |  |
| 499 | should fail with wrong weapon type | funct | good | Y |  |  |
| 500 | should damage combatant with weapon | funct | good | Y | Y |  |
| 501 | should kill combatant when health reaches 0 | funct | good | Y | Y |  |
| 502 | should do unarmed damage without weapon | funct | good | Y |  |  |
| 503 | should return ineffective for entity with no combat traits | funct | good | Y |  |  |
| 504 | should prioritize breakable over destructible | funct | good | Y |  |  |
| 505 | should try destructible if breakable is already broken | funct | good | Y |  |  |
#### behavior.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 506 | should validate entity has required traits | funct | good | Y |  |  |
| 507 | should get list of missing traits | funct | good | Y |  |  |
| 508 | should work with behaviors having no requirements | funct | good | Y |  |  |
| 509 | should return trait when present | funct | good | Y |  |  |
| 510 | should throw error when required trait is missing | funct | good | Y |  |  |
| 511 | should return trait when present | funct | good | Y |  |  |
| 512 | should return undefined when trait is missing | funct | good | Y |  |  |
| 513 | should support behaviors that check state | funct | good | Y | Y |  |
| 514 | should support behaviors with no requirements | funct | good | Y |  |  |
| 515 | should support behavior inheritance | funct | good | Y |  |  |
| 516 | should provide clear error messages for missing traits | funct | good | Y |  |  |
| 517 | should not require instantiation | struc | adeq | Y |  |  |
#### breakable.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 518 | should return true for unbroken breakable items | funct | good | Y |  |  |
| 519 | should return false for already broken items | funct | good | Y |  |  |
| 520 | should return false for non-breakable items | funct | good | Y |  |  |
| 521 | should mark item as broken | funct | good | Y | Y |  |
| 522 | should not create debris (handled by story) | funct | good | Y |  |  |
| 523 | should not remove items (handled by story) | funct | good | Y |  |  |
| 524 | should fail if item is already broken | funct | good | Y |  |  |
| 525 | should fail if item is not breakable | funct | good | Y |  |  |
| 526 | should return true for broken items | funct | good | Y |  |  |
| 527 | should return false for unbroken items | funct | good | Y |  |  |
| 528 | should return false for non-breakable items | funct | good | Y |  |  |
#### combat.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 529 | should reduce health by damage minus armor | funct | good | Y | Y |  |
| 530 | should handle armor reducing damage to 0 | funct | good | Y |  |  |
| 531 | should kill when health reaches 0 | funct | good | Y | Y |  |
| 532 | should drop inventory when killed | funct | good | Y | Y |  |
| 533 | should not drop inventory if dropsInventory is false | funct | good | Y |  |  |
| 534 | should fail when attacking dead combatant | funct | good | Y |  |  |
| 535 | should fail for non-combatant entities | funct | good | Y |  |  |
| 536 | should increase health up to max | funct | good | Y | Y |  |
| 537 | should cap healing at max health | funct | good | Y | Y |  |
| 538 | should fail when healing dead combatant | funct | good | Y |  |  |
| 539 | should bring dead combatant back to life | funct | good | Y | Y |  |
| 540 | should resurrect to full health if no health specified | funct | good | Y | Y |  |
| 541 | should fail when resurrecting living combatant | funct | good | Y |  |  |
| 542 | should return true for living combatants | funct | good | Y |  |  |
| 543 | should return false for dead combatants | funct | good | Y |  |  |
| 544 | should return true for non-combatant entities | funct | good | Y |  |  |
#### destructible.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 545 | should return true when weapon requirements are met | funct | good | Y |  |  |
| 546 | should return false when wrong weapon type | funct | good | Y |  |  |
| 547 | should return false when no weapon provided but required | funct | good | Y |  |  |
| 548 | should return true when no weapon required | funct | good | Y |  |  |
| 549 | should return false for non-destructible entities | funct | good | Y |  |  |
| 550 | should reduce hit points by damage amount | funct | good | Y | Y |  |
| 551 | should destroy entity when hit points reach 0 | funct | good | Y | Y |  |
| 552 | should create transformation entity when destroyed | funct | good | Y | Y |  |
| 553 | should reveal exit when destroyed | funct | good | Y |  |  |
| 554 | should handle overkill damage | funct | good | Y | Y |  |
| 555 | should fail for non-destructible entities | funct | good | Y |  |  |
| 556 | should return true when hit points are 0 | funct | good | Y |  |  |
| 557 | should return false when hit points are positive | funct | good | Y |  |  |
| 558 | should return false for non-destructible entities | funct | good | Y |  |  |
#### weapon.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 559 | should return damage within min-max range | funct | good | Y |  |  |
| 560 | should throw for non-weapon entities | funct | good | Y |  |  |
| 561 | should handle broken weapons | funct | good | Y |  |  |
| 562 | should return exact damage for equal min-max | funct | good | Y |  |  |
| 563 | should return true for most target types | funct | good | Y |  |  |
| 564 | should return false for ghosts without magic weapon | funct | good | Y |  |  |
| 565 | should return true when no specific type required | funct | good | Y |  |  |
| 566 | should return false for non-weapons | funct | good | Y |  |  |
| 567 | should return false for weapon without durability | funct | good | Y |  |  |
| 568 | should return true for weapon with 0 durability | funct | good | Y |  |  |
| 569 | should return false for weapon with positive durability | funct | good | Y |  |  |
| 570 | should return false for non-weapons | funct | good | Y |  |  |
#### capability-dispatch.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 571 | should find trait with matching capability | funct | good | Y |  |  |
| 572 | should return undefined if no trait has capability | funct | good | Y |  |  |
| 573 | should return undefined for empty entity | funct | good | Y |  |  |
| 574 | should return true if entity has trait with capability | funct | good | Y |  |  |
| 575 | should return false if entity lacks capability | funct | good | Y |  |  |
| 576 | should return all capabilities from all traits | funct | good | Y |  |  |
| 577 | should return empty array for entity without capable traits | funct | good | Y |  |  |
| 578 | should return true for trait with capability | funct | good | Y |  |  |
| 579 | should return false for trait without capability | funct | good | Y |  |  |
| 580 | should narrow type when traitType provided | struc | good | Y |  |  |
| 581 | should return only traits with capabilities | funct | good | Y |  |  |
| 582 | should register a behavior for trait+capability | funct | good | Y | Y |  |
| 583 | should throw on duplicate registration | funct | good | Y |  |  |
| 584 | should return registered behavior | funct | good | Y |  |  |
| 585 | should return undefined for unregistered | funct | good | Y |  |  |
| 586 | should remove registered behavior | funct | good | Y | Y |  |
| 587 | should validate successfully when preconditions met | funct | good | Y |  |  |
| 588 | should fail validation when preconditions not met | funct | good | Y |  |  |
| 589 | should execute mutations | funct | good | Y | Y |  |
| 590 | should report success effects | funct | good | Y |  |  |
| 591 | should report blocked effects | funct | good | Y |  |  |
| 592 | should add traits without capability conflicts | funct | good | Y | Y |  |
| 593 | should throw on capability conflict | funct | good | Y |  |  |
| 594 | should track claimed capabilities | funct | good | Y |  |  |
| 595 | should create builder from entity | funct | good | Y | Y |  |
| 596 | should create effect object | funct | good | Y |  |  |
#### direction-vocabulary.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 422 | should default to compass vocabulary | funct | good | Y |  |  |
| 423 | should have compass, naval, and minimal built-in | funct | good | Y |  |  |
| 424 | should return undefined for unknown vocabulary | funct | good | Y |  |  |
| 425 | should switch to naval vocabulary | funct | good | Y | Y |  |
| 426 | should switch to minimal vocabulary | funct | good | Y | Y |  |
| 427 | should switch back to compass | funct | good | Y | Y |  |
| 428 | should throw for unknown vocabulary | funct | good | Y |  |  |
| 429 | should return compass display names by default | funct | good | Y |  |  |
| 430 | should return naval display names after switching | funct | good | Y |  |  |
| 431 | should return minimal display names | funct | good | Y |  |  |
| 432 | should fall back to lowercase constant for directions not in vocabular | funct | good | Y |  |  |
| 433 | should rename a direction | funct | good | Y | Y |  |
| 434 | should not mutate the original named vocabulary | funct | good | Y |  |  |
| 435 | should create a custom vocabulary on first rename | funct | good | Y | Y |  |
| 436 | should preserve other directions when renaming one | funct | good | Y |  |  |
| 437 | should add words without removing existing ones | funct | good | Y | Y |  |
| 438 | should update display name | funct | good | Y | Y |  |
| 439 | should not duplicate words | funct | good | Y |  |  |
| 440 | should register a custom vocabulary | funct | good | Y | Y |  |
| 441 | should be activatable after registration | funct | good | Y | Y |  |
| 442 | should notify listener on useVocabulary | funct | good | Y |  |  |
| 443 | should notify listener on rename | funct | good | Y |  |  |
| 444 | should notify listener on alias | funct | good | Y |  |  |
| 445 | should notify multiple listeners | funct | good | Y |  |  |
| 446 | compass should have all 12 directions | struc | good | Y |  |  |
| 447 | naval should omit diagonals | struc | good | Y |  |  |
| 448 | minimal should have only 4 directions | struc | good | Y |  |  |
| 449 | naval fore/aft should map to north/south | struc | good | Y |  |  |
#### entity-store.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 597 | should add and retrieve entities | funct | good | Y | Y |  |
| 598 | should return undefined for non-existent entities | funct | good | Y |  |  |
| 599 | should remove entities and clear traits | funct | good | Y | Y |  |
| 600 | should clear all entities | funct | good | Y | Y |  |
| 601 | should get all entities | funct | good | Y |  |  |
| 602 | should get entities by type | funct | good | Y |  |  |
| 603 | should find entities with specific trait | funct | good | Y |  |  |
| 604 | should find entities with all specified traits | funct | good | Y |  |  |
| 605 | should find entities with any specified traits | funct | good | Y |  |  |
| 606 | should be iterable | funct | good | Y |  |  |
| 607 | should serialize to JSON | funct | good | Y |  |  |
| 608 | should deserialize from JSON | funct | good | Y |  |  |
| 609 | should reflect number of entities | funct | good | Y | Y |  |
| 610 | should handle removing non-existent entity | funct | good | Y |  |  |
| 611 | should handle duplicate adds gracefully | funct | good | Y |  |  |
| 612 | should work with empty store | funct | good | Y |  |  |
#### if-entity.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 613 | should create entity with id and type | funct | good | Y |  |  |
| 614 | should accept creation params | funct | good | Y |  |  |
| 615 | should add trait | funct | good | Y | Y |  |
| 616 | should remove trait | funct | good | Y | Y |  |
| 617 | should warn and ignore when adding duplicate trait | funct | good | Y |  |  |
| 618 | should check multiple traits with hasAll | funct | good | Y |  |  |
| 619 | should check multiple traits with hasAny | funct | good | Y |  |  |
| 620 | should get all traits | funct | good | Y |  |  |
| 621 | should get all trait types | funct | good | Y |  |  |
| 622 | should clear all traits | funct | good | Y | Y |  |
| 623 | should support trait aliases (getTrait, hasTrait) | funct | good | Y |  |  |
| 624 | should identify rooms | funct | good | Y |  |  |
| 625 | should identify containers | funct | good | Y |  |  |
| 626 | should identify takeable items | funct | good | Y |  |  |
| 627 | should get name from identity trait first | funct | good | Y |  |  |
| 628 | should get weight from attributes | funct | good | Y |  |  |
| 629 | should create deep copy with new ID | funct | good | Y |  |  |
| 630 | should serialize to JSON | funct | good | Y |  |  |
| 631 | should deserialize from JSON | funct | good | Y |  |  |
| 632 | should detect openable trait | funct | good | Y |  |  |
| 633 | should detect lockable trait | funct | good | Y |  |  |
| 634 | should detect light provision | funct | good | Y |  |  |
| 635 | should detect switchable state | funct | good | Y |  |  |
| 636 | should detect actors and players | funct | good | Y |  |  |
| 637 | should throw error for invalid traits | funct | good | Y |  |  |
#### entity-system-updates.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 450 | should store entity type in attributes | funct | good | Y |  |  |
| 451 | should handle name property correctly | funct | good | Y |  |  |
| 452 | should serialize with version number | funct | good | Y |  |  |
| 453 | should deserialize both old and new formats | funct | good | Y |  |  |
| 454 | should use IDs in room exits | funct | good | Y |  |  |
| 455 | should use IDs in door connections | funct | good | Y |  |  |
| 456 | should use IDs in exit traits | funct | good | Y |  |  |
| 457 | should save and restore entities with proper IDs | behav | good | Y | Y |  |
| 458 | should use IDs for all entity relationships | funct | good | Y | Y |  |
#### id-generation.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 459 | should generate sequential IDs with type prefixes | funct | good | Y |  |  |
| 460 | should throw error for unknown types | funct | good | Y |  |  |
| 461 | should use object type as default | funct | good | Y |  |  |
| 462 | should handle base36 conversion correctly | funct | good | Y |  |  |
| 463 | should store entity name in attributes | funct | good | Y |  |  |
| 464 | should allow duplicate names | funct | good | Y |  |  |
| 465 | should remove entities by ID | funct | good | Y | Y |  |
| 466 | should save and restore ID system state | behav | good | Y | Y |  |
| 467 | should set displayName in entity attributes | funct | good | Y |  |  |
#### parsed-command.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 468 | should support language-agnostic token representation | struc | good | Y |  |  |
| 469 | should support multiple parts of speech for a token | struc | good | Y |  |  |
| 470 | should handle unknown words | struc | good | Y |  |  |
| 471 | should represent simple verbs | struc | good | Y |  |  |
| 472 | should represent phrasal verbs with particles | struc | good | Y |  |  |
| 473 | should represent multi-word verbs | struc | good | Y |  |  |
| 474 | should represent simple nouns | struc | good | Y |  |  |
| 475 | should represent nouns with articles | struc | good | Y |  |  |
| 476 | should represent complex noun phrases | struc | good | Y |  |  |
| 477 | should support multiple candidates | struc | good | Y |  |  |
| 478 | should represent preposition phrases | struc | good | Y |  |  |
| 479 | should support multi-word prepositions | struc | good | Y |  |  |
| 480 | should represent a simple command | struc | good | Y |  |  |
| 481 | should represent a transitive command | struc | good | Y |  |  |
| 482 | should represent a ditransitive command | struc | good | Y |  |  |
| 483 | should support extras field for additional data | struc | good | Y |  |  |
| 484 | should represent unknown command errors | struc | good | Y |  |  |
| 485 | should represent syntax errors with position | struc | good | Y |  |  |
| 486 | should represent ambiguous input errors | struc | good | Y |  |  |
| 487 | should support legacy ParsedCommandV1 structure | struc | good | Y |  |  |
| 488 | should support ParsedObjectReference | struc | good | Y |  |  |
| 489 | should still have PartOfSpeech enum during migration | struc | good | Y |  |  |
| 490 | should not have language-specific parts of speech | struc | good | Y |  |  |
| 491 | ParsedCommand should not have language-specific fields at top level | struc | good | Y |  |  |
| 492 | Token structure should support language data extension | struc | adeq | Y |  |  |
| 493 | Pattern names should be opaque strings | struc | good | Y |  |  |
#### actor.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 643 | should create trait with default values | struc | adeq | Y |  |  |
| 644 | should create trait with provided data | struc | adeq | Y |  |  |
| 645 | should support multiple pronoun sets (ADR-089) | struc | adeq | Y |  |  |
| 646 | should handle partial inventory limits | struc | adeq | Y |  |  |
| 647 | should set pronouns using setPronouns method | funct | good | Y | Y |  |
| 648 | should set multiple pronoun sets | funct | good | Y | Y |  |
| 649 | should get primary pronouns from single set | funct | good | Y |  |  |
| 650 | should get primary pronouns from array (first element) | funct | good | Y |  |  |
| 651 | should set inventory limits using setInventoryLimit method | funct | good | Y | Y |  |
| 652 | should partially update inventory limits | funct | good | Y | Y |  |
| 653 | should create inventory limit if not exists | funct | good | Y | Y |  |
| 654 | should make actor a player using makePlayer method | funct | good | Y | Y |  |
| 655 | should ensure player is always playable | funct | adeq | Y | Y | Test name says "ensure player is always playable" but actually demonstrates the  |
| 656 | should set custom properties using setCustomProperty | funct | good | Y | Y |  |
| 657 | should get custom properties using getCustomProperty | funct | good | Y |  |  |
| 658 | should create customProperties object if not exists | funct | good | Y | Y |  |
| 659 | should overwrite existing custom properties | funct | good | Y | Y |  |
| 660 | should handle various data types in custom properties | funct | good | Y |  |  |
| 661 | should handle state changes | struc | adeq | Y | Y |  |
| 662 | should maintain state through other property changes | struc | adeq | Y |  |  |
| 663 | should attach to entity correctly | struc | adeq | Y |  |  |
| 664 | should work with container trait for inventory | struc | adeq | Y |  |  |
| 665 | should create NPCs with custom properties | struc | adeq | Y |  |  |
| 666 | should create player with inventory limits | struc | adeq | Y |  |  |
| 667 | should handle empty options object | struc | adeq | Y |  |  |
| 668 | should handle undefined options | struc | adeq | Y |  |  |
| 669 | should maintain type constant | struc | adeq | Y |  |  |
| 670 | should support custom pronoun sets | struc | adeq | Y |  |  |
| 671 | should preserve existing data during construction | funct | adeq | Y |  |  |
| 672 | should handle multiple actors in a world | struc | adeq | Y |  |  |
| 673 | should support actor transformation | funct | good | Y | Y |  |
| 674 | should support ADR-089 identity fields | struc | adeq | Y |  |  |
#### attached.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 675 | should create trait with default values | struc | adeq | Y |  |  |
| 676 | should create trait with provided data | struc | adeq | Y |  |  |
| 677 | should handle all attachment types | struc | adeq | Y |  |  |
| 678 | should track what object is attached to | struc | adeq | Y |  |  |
| 679 | should handle detachable attachments | struc | adeq | Y |  |  |
| 680 | should handle permanent attachments | struc | adeq | Y |  |  |
| 681 | should track loose state | struc | adeq | Y |  |  |
| 682 | should work with pullable trait | struc | adeq | Y |  |  |
| 683 | should handle various attached objects | struc | adeq | Y |  |  |
| 684 | should handle object breaking on detach | struc | adeq | Y |  |  |
| 685 | should handle attachment point breaking | struc | adeq | Y |  |  |
| 686 | should handle clean detachment | struc | adeq | Y |  |  |
| 687 | should store detach sound | struc | adeq | Y |  |  |
| 688 | should have appropriate sounds for attachment types | struc | adeq | Y |  |  |
| 689 | should handle empty options object | struc | adeq | Y |  |  |
| 690 | should handle undefined options | struc | adeq | Y |  |  |
| 691 | should maintain type constant | struc | adeq | Y |  |  |
| 692 | should handle very strong attachment | struc | adeq | Y |  |  |
| 693 | should handle attachment without target | struc | adeq | Y |  |  |
| 694 | should handle partial detach effects | struc | adeq | Y |  |  |
#### breakable.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 695 | should create trait with default values | struc | adeq | Y |  |  |
| 696 | should create trait with broken state false | struc | adeq | Y |  |  |
| 697 | should create trait with broken state true | struc | adeq | Y |  |  |
| 698 | should track broken state | struc | adeq | Y | Y |  |
| 699 | should handle already broken items | struc | adeq | Y |  |  |
| 700 | should be mutable | struc | adeq | Y | Y |  |
| 701 | should attach to entity correctly | struc | adeq | Y |  |  |
| 702 | should work with multiple breakable objects | struc | adeq | Y |  |  |
| 703 | should handle empty options object | struc | adeq | Y |  |  |
| 704 | should handle undefined options | struc | adeq | Y |  |  |
| 705 | should maintain type constant | struc | adeq | Y |  |  |
| 706 | should track state changes during gameplay | struc | adeq | Y | Y |  |
| 707 | should distinguish between broken and unbroken items | struc | adeq | Y |  |  |
#### button.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 708 | should create trait with default values | struc | adeq | Y |  |  |
| 709 | should create trait with provided data | struc | adeq | Y |  |  |
| 710 | should handle all button sizes | struc | adeq | Y |  |  |
| 711 | should handle all button shapes | struc | adeq | Y |  |  |
| 712 | should attach to entity correctly | struc | adeq | Y |  |  |
| 713 | should work with PushableTrait | struc | adeq | Y |  |  |
| 714 | should handle momentary button | struc | adeq | Y | Y |  |
| 715 | should handle latching button | struc | adeq | Y | Y |  |
| 716 | should store button appearance | struc | adeq | Y |  |  |
| 717 | should handle labeled buttons | struc | adeq | Y |  |  |
| 718 | should handle various button materials | struc | adeq | Y |  |  |
| 719 | should track pressed state | struc | adeq | Y | Y |  |
| 720 | should initialize with pressed state | struc | adeq | Y |  |  |
| 721 | should handle empty options object | struc | adeq | Y |  |  |
| 722 | should handle undefined options | struc | adeq | Y |  |  |
| 723 | should maintain type constant | struc | adeq | Y |  |  |
| 724 | should handle complex button configurations | struc | adeq | Y |  |  |
| 725 | should create emergency stop button | struc | adeq | Y |  |  |
| 726 | should create elevator call button | struc | adeq | Y |  |  |
#### character-model.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 727 | should parse bare trait to default intensity | funct | good | Y |  |  |
| 728 | should parse intensity-qualified trait | funct | good | Y |  |  |
| 729 | should parse all intensity levels | funct | good | Y |  |  |
| 730 | should resolve each word to its midpoint | funct | good | Y |  |  |
| 731 | should resolve numeric values back to words | funct | good | Y |  |  |
| 732 | should handle boundary values | funct | good | Y |  |  |
| 733 | should return exact mood when coordinates match | funct | good | Y |  |  |
| 734 | should return nearest mood for intermediate coordinates | funct | good | Y |  |  |
| 735 | should resolve boundary values correctly | funct | good | Y |  |  |
| 736 | should have the correct trait type | struc | adeq | Y |  |  |
| 737 | should initialize with sensible defaults | struc | good | Y |  |  |
| 738 | should accept full initialization data | struc | good | Y |  |  |
| 739 | should accept raw mood axes instead of mood word | struc | adeq | Y |  |  |
| 740 | should accept raw threat value instead of threat word | funct | good | Y |  |  |
| 741 | should set personality from expressions | funct | good | Y | Y |  |
| 742 | should return 0 for unset traits | funct | good | Y |  |  |
| 743 | should set disposition by word | funct | good | Y | Y |  |
| 744 | should adjust disposition by delta | funct | good | Y | Y |  |
| 745 | should clamp disposition to -100..100 | funct | good | Y | Y |  |
| 746 | should default to neutral (0) for unknown entities | funct | good | Y |  |  |
| 747 | should set mood by word | funct | good | Y | Y |  |
| 748 | should adjust mood axes by delta | funct | good | Y | Y |  |
| 749 | should clamp mood axes | funct | good | Y | Y |  |
| 750 | should set threat by word | funct | good | Y | Y |  |
| 751 | should adjust threat by delta | funct | good | Y | Y |  |
| 752 | should clamp threat to 0..100 | funct | good | Y | Y |  |
| 753 | should add and retrieve facts | funct | good | Y | Y |  |
| 754 | should return false for unknown topics | funct | good | Y |  |  |
| 755 | should overwrite existing facts | funct | good | Y | Y |  |
| 756 | should add and retrieve beliefs | funct | good | Y | Y |  |
| 757 | should default resistance to none | funct | good | Y | Y |  |
| 758 | should add goals sorted by priority | funct | good | Y | Y |  |
| 759 | should update existing goal priority | funct | good | Y | Y |  |
| 760 | should remove goals | funct | good | Y | Y |  |
| 761 | should update goal priority | funct | good | Y | Y |  |
| 762 | should return undefined for empty goals | funct | good | Y |  |  |
| 763 | should enter a lucidity state with window duration | funct | good | Y | Y |  |
| 764 | should decay lucidity window and return to baseline | funct | good | Y | Y |  |
| 765 | should not decay when no active window | funct | good | Y |  |  |
| 766 | should evaluate disposition predicates | funct | good | Y |  |  |
| 767 | should evaluate threat predicates | funct | good | Y |  |  |
| 768 | should evaluate personality predicates | funct | good | Y |  |  |
| 769 | should evaluate mood predicates | funct | good | Y |  |  |
| 770 | should evaluate cognitive state predicates | funct | good | Y |  |  |
| 771 | should evaluate lucidity predicates | funct | good | Y |  |  |
| 772 | should negate with "not" prefix | funct | good | Y |  |  |
| 773 | should register and evaluate custom predicates | funct | good | Y |  |  |
| 774 | should throw on unknown predicate | funct | good | Y |  |  |
| 775 | should report predicate existence | funct | good | Y |  |  |
| 776 | should default to stable profile | struc | adeq | Y |  |  |
| 777 | should merge partial profile with stable defaults | funct | good | Y |  |  |
| 778 | should accept a full schizophrenic profile | struc | adeq | Y |  |  |
| 779 | should accept a PTSD profile | struc | adeq | Y |  |  |
| 780 | should track multiple state changes across a scenario | behav | good | Y | Y |  |
#### clothing.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 781 | should create trait with default values | struc | adeq | Y |  |  |
| 782 | should create trait with provided data | struc | adeq | Y |  |  |
| 783 | should have all wearable properties | struc | adeq | Y |  |  |
| 784 | should support various materials | struc | adeq | Y |  |  |
| 785 | should support composite materials | struc | adeq | Y |  |  |
| 786 | should track condition states | struc | adeq | Y |  |  |
| 787 | should handle condition degradation | struc | adeq | Y | Y |  |
| 788 | should handle non-damageable items | struc | adeq | Y |  |  |
| 789 | should support various styles | struc | adeq | Y |  |  |
| 790 | should support custom style descriptions | struc | adeq | Y |  |  |
| 791 | should create clothing that can contain pockets | struc | adeq | Y |  |  |
| 792 | should attach pockets to clothing | struc | adeq | Y |  |  |
| 793 | should maintain pocket contents when clothing is worn | struc | adeq | Y |  |  |
| 794 | should support standard clothing slots | struc | adeq | Y |  |  |
| 795 | should support layered clothing | struc | adeq | Y |  |  |
| 796 | should handle clothing that blocks other slots | struc | adeq | Y |  |  |
| 797 | should handle non-removable clothing | struc | adeq | Y |  |  |
| 798 | should handle custom wear/remove messages | struc | adeq | Y |  |  |
| 799 | should create various clothing items | struc | adeq | Y |  |  |
| 800 | should distinguish between clothing and simple wearables | struc | adeq | Y |  |  |
| 801 | should handle multi-pocket utility clothing | struc | adeq | Y |  |  |
| 802 | should handle outfit sets with matching properties | struc | adeq | Y |  |  |
| 803 | should handle damaged clothing states | struc | adeq | Y | Y |  |
#### container-capability.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 804 | should have container properties | struc | adeq | Y |  |  |
| 805 | should be recognized as container capable | funct | good | Y |  |  |
| 806 | should work with canContain utility | funct | good | Y |  |  |
| 807 | should have container properties | struc | adeq | Y |  |  |
| 808 | should be recognized as container capable | funct | good | Y |  |  |
| 809 | should work with canContain utility | funct | good | Y |  |  |
| 810 | should update capacity through setInventoryLimit | funct | good | Y | Y |  |
| 811 | should get container trait from room | funct | good | Y |  |  |
| 812 | should get container trait from actor | funct | good | Y |  |  |
| 813 | should get explicit container trait first | funct | good | Y |  |  |
| 814 | should return undefined for non-container entities | funct | good | Y |  |  |
| 815 | should allow moving items into rooms without explicit ContainerTrait | funct | adeq | Y |  | Test claims to verify moving items into rooms but only checks canContain/getCont |
| 816 | should allow actors to carry items without explicit ContainerTrait | funct | adeq | Y |  |  |
#### container.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 817 | should create trait with default values | struc | adeq | Y |  |  |
| 818 | should create trait with provided data | struc | adeq | Y |  |  |
| 819 | should handle weight limit | struc | adeq | Y |  |  |
| 820 | should handle volume limit | struc | adeq | Y |  |  |
| 821 | should handle item count limit | struc | adeq | Y |  |  |
| 822 | should handle multiple constraints | struc | adeq | Y |  |  |
| 823 | should handle unlimited capacity | struc | adeq | Y |  |  |
| 824 | should default to opaque | struc | adeq | Y |  |  |
| 825 | should handle transparent containers | struc | adeq | Y |  |  |
| 826 | should default to not enterable | struc | adeq | Y |  |  |
| 827 | should handle enterable containers | struc | adeq | Y |  |  |
| 828 | should handle allowed types | struc | adeq | Y |  |  |
| 829 | should handle excluded types | struc | adeq | Y |  |  |
| 830 | should handle both allowed and excluded types | struc | adeq | Y |  |  |
| 831 | should handle no type restrictions | struc | adeq | Y |  |  |
| 832 | should attach to entity correctly | struc | adeq | Y |  |  |
| 833 | should warn and keep original container trait | funct | good | Y |  |  |
| 834 | should handle transparent container setup | struc | adeq | Y |  |  |
| 835 | should handle secure container setup | struc | adeq | Y |  |  |
| 836 | should handle nested container setup | struc | adeq | Y |  |  |
| 837 | should handle empty capacity object | struc | adeq | Y |  |  |
| 838 | should handle empty arrays for type restrictions | struc | adeq | Y |  |  |
| 839 | should handle zero capacity values | struc | adeq | Y |  |  |
#### door.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 840 | should create trait with required room connections | struc | adeq | Y |  |  |
| 841 | should throw error without room connections | funct | good | Y |  |  |
| 842 | should handle unidirectional doors | struc | adeq | Y |  |  |
| 843 | should maintain bidirectional as default | struc | adeq | Y |  |  |
| 844 | should attach to entity correctly | struc | adeq | Y |  |  |
| 845 | should work with test fixture | struc | adeq | Y |  |  |
| 846 | should create door with openable trait | struc | adeq | Y |  |  |
| 847 | should create lockable door | struc | adeq | Y |  |  |
| 848 | should connect two specific rooms | struc | adeq | Y |  |  |
| 849 | should handle room order consistently | struc | adeq | Y |  |  |
| 850 | should create complete room-door-room setup | struc | adeq | Y |  |  |
| 851 | should create locked door between rooms | struc | adeq | Y |  |  |
| 852 | should handle self-connecting door | struc | adeq | Y |  |  |
| 853 | should preserve all properties during assignment | struc | adeq | Y |  |  |
| 854 | should maintain type constant | struc | adeq | Y |  |  |
| 855 | should support standard room door | struc | adeq | Y |  |  |
| 856 | should support locked exterior door | struc | adeq | Y |  |  |
| 857 | should support archway (always open) | struc | adeq | Y |  |  |
#### edible.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 858 | should create trait with default values | struc | adeq | Y |  |  |
| 859 | should create trait with provided data | struc | adeq | Y |  |  |
| 860 | should handle partial initialization | struc | adeq | Y |  |  |
| 861 | should allow zero nutrition value | struc | adeq | Y |  |  |
| 862 | should handle solid food | struc | adeq | Y |  |  |
| 863 | should handle liquids | struc | adeq | Y |  |  |
| 864 | should support various food types | struc | adeq | Y |  |  |
| 865 | should handle single serving items | struc | adeq | Y |  |  |
| 866 | should handle multi-serving items | struc | adeq | Y |  |  |
| 867 | should allow fractional servings | struc | adeq | Y |  |  |
| 868 | should track serving consumption | struc | adeq | Y | Y |  |
| 869 | should specify remains type | struc | adeq | Y |  |  |
| 870 | should handle items with no remains | struc | adeq | Y |  |  |
| 871 | should support various remain types | struc | adeq | Y |  |  |
| 872 | should handle items with no effects | struc | adeq | Y |  |  |
| 873 | should handle items with effects | struc | adeq | Y |  |  |
| 874 | should support various effect types | struc | adeq | Y |  |  |
| 875 | should allow effect without description | struc | adeq | Y |  |  |
| 876 | should support custom consume messages | struc | adeq | Y |  |  |
| 877 | should handle no consume message | struc | adeq | Y |  |  |
| 878 | should have appropriate messages for food vs liquid | struc | adeq | Y |  |  |
| 879 | should handle weight and bulk | struc | adeq | Y |  |  |
| 880 | should handle zero weight items | struc | adeq | Y |  |  |
| 881 | should attach to entity correctly | struc | adeq | Y |  |  |
| 882 | should create various edible entities | struc | adeq | Y |  |  |
| 883 | should work with containers for liquids | struc | adeq | Y |  |  |
| 884 | should handle empty options object | struc | adeq | Y |  |  |
| 885 | should handle undefined options | struc | adeq | Y |  |  |
| 886 | should maintain type constant | struc | adeq | Y |  |  |
| 887 | should handle negative values | struc | adeq | Y |  |  |
| 888 | should handle very large values | struc | adeq | Y |  |  |
| 889 | should handle magical food with multiple effects | struc | adeq | Y |  |  |
| 890 | should handle rations with multiple servings | struc | adeq | Y |  |  |
| 891 | should handle transformation items | struc | adeq | Y |  |  |
| 892 | should handle poisoned or cursed food | struc | adeq | Y |  |  |
#### exit.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 893 | should create trait with required values | struc | adeq | Y |  |  |
| 894 | should throw error if required fields are missing | funct | good | Y |  |  |
| 895 | should create trait with all optional values | struc | adeq | Y |  |  |
| 896 | should handle north direction | struc | adeq | Y |  |  |
| 897 | should handle south direction | struc | adeq | Y |  |  |
| 898 | should handle east direction | struc | adeq | Y |  |  |
| 899 | should handle west direction | struc | adeq | Y |  |  |
| 900 | should handle up direction | struc | adeq | Y |  |  |
| 901 | should handle down direction | struc | adeq | Y |  |  |
| 902 | should handle in direction | struc | adeq | Y |  |  |
| 903 | should handle out direction | struc | adeq | Y |  |  |
| 904 | should handle diagonal directions | struc | adeq | Y |  |  |
| 905 | should handle magic words | struc | adeq | Y |  |  |
| 906 | should handle action-based exits | struc | adeq | Y |  |  |
| 907 | should handle object-interaction exits | struc | adeq | Y |  |  |
| 908 | should handle simple bidirectional exit | struc | adeq | Y |  |  |
| 909 | should handle bidirectional portal | struc | adeq | Y |  |  |
| 910 | should handle hidden exits | struc | adeq | Y |  |  |
| 911 | should handle visible but unlisted exits | struc | adeq | Y |  |  |
| 912 | should handle discovered exits | struc | adeq | Y |  |  |
| 913 | should handle simple condition | struc | adeq | Y |  |  |
| 914 | should handle complex condition | struc | adeq | Y |  |  |
| 915 | should handle time-based condition | struc | adeq | Y |  |  |
| 916 | should handle custom use messages | struc | adeq | Y |  |  |
| 917 | should handle custom blocked messages | struc | adeq | Y |  |  |
| 918 | should allow no custom messages | struc | adeq | Y |  |  |
| 919 | should attach to entity correctly | struc | adeq | Y |  |  |
| 920 | should warn and keep original exit trait | funct | good | Y |  |  |
| 921 | should handle one-way exit | struc | adeq | Y |  |  |
| 922 | should handle teleporter | struc | adeq | Y |  |  |
| 923 | should handle vehicle-based exit | struc | adeq | Y |  |  |
#### identity.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 924 | should create trait with default values | struc | adeq | Y |  |  |
| 925 | should create trait with provided data | struc | adeq | Y |  |  |
| 926 | should handle "a" article | struc | adeq | Y |  |  |
| 927 | should handle "an" article | struc | adeq | Y |  |  |
| 928 | should handle "the" article | struc | adeq | Y |  |  |
| 929 | should handle "some" article for plural/mass nouns | struc | adeq | Y |  |  |
| 930 | should handle empty article for proper names | struc | adeq | Y |  |  |
| 931 | should start with empty aliases | struc | adeq | Y |  |  |
| 932 | should store multiple aliases | struc | adeq | Y |  |  |
| 933 | should handle full description | struc | adeq | Y |  |  |
| 934 | should handle brief description separately | struc | adeq | Y |  |  |
| 935 | should allow empty descriptions | struc | adeq | Y |  |  |
| 936 | should default to not concealed | struc | adeq | Y |  |  |
| 937 | should handle concealed objects | struc | adeq | Y |  |  |
| 938 | should handle weight | struc | adeq | Y |  |  |
| 939 | should handle volume | struc | adeq | Y |  |  |
| 940 | should handle size categories | struc | adeq | Y |  |  |
| 941 | should allow undefined physical properties | struc | adeq | Y |  |  |
| 942 | should attach to entity correctly | struc | adeq | Y |  |  |
| 943 | should warn and keep original identity trait | funct | good | Y |  |  |
| 944 | should handle proper names correctly | struc | adeq | Y |  |  |
| 945 | should handle mass nouns | struc | adeq | Y |  |  |
| 946 | should handle unique items | struc | adeq | Y |  |  |
#### light-source.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 947 | should create trait with default values | struc | adeq | Y |  |  |
| 948 | should create trait with provided data | struc | adeq | Y |  |  |
| 949 | should handle partial initialization | struc | adeq | Y |  |  |
| 950 | should handle fuel-based initialization | struc | adeq | Y |  |  |
| 951 | should support various brightness levels | struc | adeq | Y |  |  |
| 952 | should handle edge brightness values | struc | adeq | Y |  |  |
| 953 | should allow out-of-range brightness values | struc | adeq | Y |  |  |
| 954 | should track lit status | struc | adeq | Y | Y |  |
| 955 | should maintain brightness when lit state changes | struc | adeq | Y |  |  |
| 956 | should handle infinite fuel sources | struc | adeq | Y |  |  |
| 957 | should handle fuel-based sources | struc | adeq | Y |  |  |
| 958 | should track fuel consumption | struc | adeq | Y | Y |  |
| 959 | should handle various consumption rates | struc | adeq | Y |  |  |
| 960 | should handle partial fuel properties | struc | adeq | Y |  |  |
| 961 | should attach to entity correctly | struc | adeq | Y |  |  |
| 962 | should create various light source entities | struc | adeq | Y |  |  |
| 963 | should work with switchable light sources | struc | adeq | Y |  |  |
| 964 | should work with wearable light sources | struc | adeq | Y |  |  |
| 965 | should handle flame-based sources | struc | adeq | Y |  |  |
| 966 | should handle electric sources | struc | adeq | Y |  |  |
| 967 | should handle magical sources | struc | adeq | Y |  |  |
| 968 | should handle empty options object | struc | adeq | Y |  |  |
| 969 | should handle undefined options | struc | adeq | Y |  |  |
| 970 | should maintain type constant | struc | adeq | Y |  |  |
| 971 | should handle zero values | struc | adeq | Y |  |  |
| 972 | should handle negative values | struc | adeq | Y |  |  |
| 973 | should handle fractional values | struc | adeq | Y |  |  |
| 974 | should handle refillable light sources | struc | adeq | Y | Y |  |
| 975 | should handle multi-mode light sources | struc | adeq | Y | Y |  |
| 976 | should handle degrading light sources | struc | adeq | Y | Y |  |
| 977 | should handle emergency light sources | struc | adeq | Y |  |  |
| 978 | should handle combined light sources | struc | adeq | Y |  |  |
#### lockable.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 979 | should create trait with default values | struc | adeq | Y |  |  |
| 980 | should create trait with provided data | struc | adeq | Y |  |  |
| 981 | should use startsLocked to set initial isLocked if not provided | funct | good | Y |  |  |
| 982 | should prefer explicit isLocked over startsLocked | funct | good | Y |  |  |
| 983 | should handle single key | struc | adeq | Y |  |  |
| 984 | should handle multiple keys | struc | adeq | Y |  |  |
| 985 | should handle both single and multiple keys | struc | adeq | Y |  |  |
| 986 | should handle master key acceptance | struc | adeq | Y |  |  |
| 987 | should allow changing lock state | struc | adeq | Y | Y |  |
| 988 | should handle auto-lock behavior flag | struc | adeq | Y |  |  |
| 989 | should attach to entity correctly | struc | adeq | Y |  |  |
| 990 | should work with lockable container | struc | adeq | Y |  |  |
| 991 | should create matching key entity | struc | adeq | Y |  |  |
| 992 | should store all lock-related messages | struc | adeq | Y |  |  |
| 993 | should allow partial message customization | struc | adeq | Y |  |  |
| 994 | should support lock/unlock sounds | struc | adeq | Y |  |  |
| 995 | should handle empty options object | struc | adeq | Y |  |  |
| 996 | should handle undefined options | struc | adeq | Y |  |  |
| 997 | should handle entity without key requirement | struc | adeq | Y |  |  |
| 998 | should maintain type constant | struc | adeq | Y |  |  |
#### moveable-scenery.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 999 | should create trait with default values | struc | adeq | Y |  |  |
| 1000 | should create trait with provided data | struc | adeq | Y |  |  |
| 1001 | should handle all weight classes | struc | adeq | Y |  |  |
| 1002 | should track blocked exits | struc | adeq | Y |  |  |
| 1003 | should handle single blocked exit | struc | adeq | Y |  |  |
| 1004 | should handle no blocked exits when not blocking | struc | adeq | Y |  |  |
| 1005 | should track what is revealed when moved | struc | adeq | Y |  |  |
| 1006 | should handle no reveal | struc | adeq | Y |  |  |
| 1007 | should track if moved | struc | adeq | Y | Y |  |
| 1008 | should track original room | struc | adeq | Y |  |  |
| 1009 | should attach to entity correctly | struc | adeq | Y |  |  |
| 1010 | should work with PushableTrait | struc | adeq | Y |  |  |
| 1011 | should work with both PushableTrait and PullableTrait | struc | adeq | Y |  |  |
| 1012 | should handle single person movement | struc | adeq | Y |  |  |
| 1013 | should handle multi-person movement | struc | adeq | Y |  |  |
| 1014 | should default people required when multi-person is true | struc | adeq | Y |  |  |
| 1015 | should store movement sounds | struc | adeq | Y |  |  |
| 1016 | should handle no sound | struc | adeq | Y |  |  |
| 1017 | should handle empty options object | struc | adeq | Y |  |  |
| 1018 | should handle undefined options | struc | adeq | Y |  |  |
| 1019 | should maintain type constant | struc | adeq | Y |  |  |
| 1020 | should create a blocking boulder | struc | adeq | Y |  |  |
| 1021 | should create a moveable bookshelf | struc | adeq | Y |  |  |
| 1022 | should create a light moveable crate | struc | adeq | Y |  |  |
#### openable.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1023 | should create trait with default values | struc | adeq | Y |  |  |
| 1024 | should create trait with provided data | struc | adeq | Y |  |  |
| 1025 | should use startsOpen to set initial isOpen if not provided | funct | good | Y |  |  |
| 1026 | should prefer explicit isOpen over startsOpen | funct | good | Y |  |  |
| 1027 | should allow changing open state | struc | adeq | Y | Y |  |
| 1028 | should maintain other properties when state changes | struc | adeq | Y |  |  |
| 1029 | should attach to entity correctly | struc | adeq | Y |  |  |
| 1030 | should work with container entities | struc | adeq | Y |  |  |
| 1031 | should handle entity with multiple state traits | struc | adeq | Y |  |  |
| 1032 | should handle one-way openable (canClose = false) | struc | adeq | Y | Y |  |
| 1033 | should handle revealsContents setting | struc | adeq | Y |  |  |
| 1034 | should support sound effects | struc | adeq | Y |  |  |
| 1035 | should store all custom messages | struc | adeq | Y |  |  |
| 1036 | should allow partial message customization | struc | adeq | Y |  |  |
| 1037 | should handle empty options object | struc | adeq | Y |  |  |
| 1038 | should handle undefined options | struc | adeq | Y |  |  |
| 1039 | should maintain type constant | struc | adeq | Y |  |  |
#### pullable.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1040 | should create trait with default values | struc | adeq | Y |  |  |
| 1041 | should create trait with provided data | struc | adeq | Y |  |  |
| 1042 | should handle all pull types | struc | adeq | Y |  |  |
| 1043 | should track pull count | struc | adeq | Y | Y |  |
| 1044 | should manage state transitions | struc | adeq | Y | Y |  |
| 1045 | should respect max pulls | struc | adeq | Y | Y |  |
| 1046 | should attach to entity correctly | struc | adeq | Y |  |  |
| 1047 | should work with multiple pullable objects | struc | adeq | Y |  |  |
| 1048 | should handle lever configuration | struc | adeq | Y |  |  |
| 1049 | should handle cord configuration | struc | adeq | Y |  |  |
| 1050 | should handle attached configuration | struc | adeq | Y |  |  |
| 1051 | should handle heavy configuration | struc | adeq | Y |  |  |
| 1052 | should store custom effect events | struc | adeq | Y |  |  |
| 1053 | should handle partial effects | struc | adeq | Y |  |  |
| 1054 | should handle empty options object | struc | adeq | Y |  |  |
| 1055 | should handle undefined options | struc | adeq | Y |  |  |
| 1056 | should maintain type constant | struc | adeq | Y |  |  |
| 1057 | should handle strength requirements | struc | adeq | Y |  |  |
| 1058 | should handle non-repeatable pulls | struc | adeq | Y |  |  |
#### pushable.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1059 | should create trait with default values | struc | adeq | Y |  |  |
| 1060 | should create trait with provided data | struc | adeq | Y |  |  |
| 1061 | should handle all push types | struc | adeq | Y |  |  |
| 1062 | should track push count | struc | adeq | Y | Y |  |
| 1063 | should manage state transitions | struc | adeq | Y | Y |  |
| 1064 | should respect max pushes | struc | adeq | Y | Y |  |
| 1065 | should attach to entity correctly | struc | adeq | Y |  |  |
| 1066 | should work with multiple pushable objects | struc | adeq | Y |  |  |
| 1067 | should handle button configuration | struc | adeq | Y |  |  |
| 1068 | should handle heavy configuration | struc | adeq | Y |  |  |
| 1069 | should handle moveable configuration | struc | adeq | Y |  |  |
| 1070 | should handle all push directions | struc | adeq | Y |  |  |
| 1071 | should default to no specific direction | struc | adeq | Y |  |  |
| 1072 | should store custom effect events | struc | adeq | Y |  |  |
| 1073 | should handle partial effects | struc | adeq | Y |  |  |
| 1074 | should handle empty options object | struc | adeq | Y |  |  |
| 1075 | should handle undefined options | struc | adeq | Y |  |  |
| 1076 | should maintain type constant | struc | adeq | Y |  |  |
| 1077 | should handle strength requirements | struc | adeq | Y |  |  |
| 1078 | should handle non-repeatable pushes | struc | adeq | Y |  |  |
| 1079 | should handle passage revealing | struc | adeq | Y |  |  |
#### readable.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1080 | should create trait with default values | struc | adeq | Y |  |  |
| 1081 | should create trait with provided data | struc | adeq | Y |  |  |
| 1082 | should auto-initialize pages from pageContent | funct | good | Y |  |  |
| 1083 | should not override currentPage if already set | funct | good | Y |  |  |
| 1084 | should handle simple text | struc | adeq | Y |  |  |
| 1085 | should handle multi-line text | struc | adeq | Y |  |  |
| 1086 | should handle preview text | struc | adeq | Y |  |  |
| 1087 | should handle empty text | struc | adeq | Y |  |  |
| 1088 | should support different languages | struc | adeq | Y |  |  |
| 1089 | should handle ability requirements | struc | adeq | Y |  |  |
| 1090 | should handle item requirements | struc | adeq | Y |  |  |
| 1091 | should handle no requirements | struc | adeq | Y |  |  |
| 1092 | should support various readable types | struc | adeq | Y |  |  |
| 1093 | should allow custom readable types | struc | adeq | Y |  |  |
| 1094 | should handle books with multiple pages | struc | adeq | Y |  |  |
| 1095 | should handle current page navigation | struc | adeq | Y | Y |  |
| 1096 | should handle single page with pageContent | struc | adeq | Y |  |  |
| 1097 | should handle empty pageContent array | struc | adeq | Y |  |  |
| 1098 | should track read status | struc | adeq | Y | Y |  |
| 1099 | should handle readability state | struc | adeq | Y | Y |  |
| 1100 | should maintain state through changes | struc | adeq | Y | Y |  |
| 1101 | should attach to entity correctly | struc | adeq | Y |  |  |
| 1102 | should create various readable entities | struc | adeq | Y |  |  |
| 1103 | should work with openable books | struc | adeq | Y |  |  |
| 1104 | should handle empty options object | struc | adeq | Y |  |  |
| 1105 | should handle undefined options | struc | adeq | Y |  |  |
| 1106 | should maintain type constant | struc | adeq | Y |  |  |
| 1107 | should handle page bounds | struc | adeq | Y |  |  |
| 1108 | should preserve data integrity | struc | adeq | Y |  |  |
| 1109 | should handle special text content | struc | adeq | Y |  |  |
| 1110 | should handle magical tome with requirements | struc | adeq | Y |  |  |
| 1111 | should handle inscribed objects | struc | adeq | Y |  |  |
| 1112 | should handle dynamic readability | struc | adeq | Y | Y |  |
#### room.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1113 | should create trait with default values | struc | adeq | Y |  |  |
| 1114 | should create trait with provided data | struc | adeq | Y |  |  |
| 1115 | should handle simple exits | struc | adeq | Y |  |  |
| 1116 | should handle exits with doors | struc | adeq | Y |  |  |
| 1117 | should handle blocked exits | struc | adeq | Y |  |  |
| 1118 | should handle custom exits | struc | adeq | Y |  |  |
| 1119 | should handle dark rooms | struc | adeq | Y |  |  |
| 1120 | should handle lit rooms | struc | adeq | Y |  |  |
| 1121 | should handle outdoor lighting | struc | adeq | Y |  |  |
| 1122 | should handle underground rooms | struc | adeq | Y |  |  |
| 1123 | should start unvisited | struc | adeq | Y |  |  |
| 1124 | should track visited state | struc | adeq | Y | Y |  |
| 1125 | should handle initial description | struc | adeq | Y |  |  |
| 1126 | should handle ambient sounds | struc | adeq | Y |  |  |
| 1127 | should handle ambient smells | struc | adeq | Y |  |  |
| 1128 | should handle both sound and smell | struc | adeq | Y |  |  |
| 1129 | should handle region assignment | struc | adeq | Y |  |  |
| 1130 | should handle multiple tags | struc | adeq | Y |  |  |
| 1131 | should handle rooms without regions or tags | struc | adeq | Y |  |  |
| 1132 | should attach to entity correctly | struc | adeq | Y |  |  |
| 1133 | should work with container trait | struc | adeq | Y |  |  |
| 1134 | should handle maze-like connections | struc | adeq | Y |  |  |
| 1135 | should handle multi-level connections | struc | adeq | Y |  |  |
| 1136 | should handle outdoor/indoor transitions | struc | adeq | Y |  |  |
#### scenery.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1137 | should create trait with default values | struc | adeq | Y |  |  |
| 1138 | should create trait with provided data | struc | adeq | Y |  |  |
| 1139 | should handle partial initialization | struc | adeq | Y |  |  |
| 1140 | should handle only mentioned property | struc | adeq | Y |  |  |
| 1141 | should support custom messages for different items | struc | adeq | Y |  |  |
| 1142 | should allow undefined message for default handling | struc | adeq | Y |  |  |
| 1143 | should support humorous messages | struc | adeq | Y |  |  |
| 1144 | should handle mentioned scenery | struc | adeq | Y |  |  |
| 1145 | should handle unmentioned scenery | struc | adeq | Y |  |  |
| 1146 | should allow toggling mentioned state | struc | adeq | Y | Y |  |
| 1147 | should attach to entity correctly | struc | adeq | Y |  |  |
| 1148 | should create various scenery entities | struc | adeq | Y |  |  |
| 1149 | should work with room decorations | struc | adeq | Y |  |  |
| 1150 | should work with interactive scenery | struc | adeq | Y |  |  |
| 1151 | should handle architectural features | struc | adeq | Y |  |  |
| 1152 | should handle natural features | struc | adeq | Y |  |  |
| 1153 | should handle furniture | struc | adeq | Y |  |  |
| 1154 | should handle always-mentioned scenery | struc | adeq | Y |  |  |
| 1155 | should handle hidden scenery | struc | adeq | Y |  |  |
| 1156 | should handle discoverable scenery | struc | adeq | Y | Y |  |
| 1157 | should handle empty options object | struc | adeq | Y |  |  |
| 1158 | should handle undefined options | struc | adeq | Y |  |  |
| 1159 | should maintain type constant | struc | adeq | Y |  |  |
| 1160 | should handle null values | struc | adeq | Y |  |  |
| 1161 | should preserve object reference | struc | adeq | Y |  |  |
| 1162 | should handle scenery with state changes | struc | adeq | Y | Y |  |
| 1163 | should handle scenery containers | struc | adeq | Y |  |  |
| 1164 | should handle scenery with multiple states | struc | adeq | Y |  |  |
| 1165 | should handle room-defining scenery | struc | adeq | Y |  |  |
#### supporter.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1166 | should create trait with default values | struc | adeq | Y |  |  |
| 1167 | should create trait with provided data | struc | adeq | Y |  |  |
| 1168 | should handle partial capacity initialization | struc | adeq | Y |  |  |
| 1169 | should handle only enterable property | struc | adeq | Y |  |  |
| 1170 | should support weight-based capacity | struc | adeq | Y |  |  |
| 1171 | should support item count capacity | struc | adeq | Y |  |  |
| 1172 | should support both weight and item limits | struc | adeq | Y |  |  |
| 1173 | should handle unlimited capacity | struc | adeq | Y |  |  |
| 1174 | should handle zero capacity | struc | adeq | Y |  |  |
| 1175 | should handle allowed types | struc | adeq | Y |  |  |
| 1176 | should handle excluded types | struc | adeq | Y |  |  |
| 1177 | should handle both allowed and excluded types | struc | adeq | Y |  |  |
| 1178 | should handle empty type arrays | struc | adeq | Y |  |  |
| 1179 | should handle non-enterable supporters | struc | adeq | Y |  |  |
| 1180 | should handle enterable supporters | struc | adeq | Y |  |  |
| 1181 | should default to non-enterable | struc | adeq | Y |  |  |
| 1182 | should attach to entity correctly | struc | adeq | Y |  |  |
| 1183 | should create various supporter entities | struc | adeq | Y |  |  |
| 1184 | should work with scenery supporters | struc | adeq | Y |  |  |
| 1185 | should work with enterable supporters | struc | adeq | Y |  |  |
| 1186 | should handle furniture supporters | struc | adeq | Y |  |  |
| 1187 | should handle specialized supporters | struc | adeq | Y |  |  |
| 1188 | should handle natural supporters | struc | adeq | Y |  |  |
| 1189 | should handle empty options object | struc | adeq | Y |  |  |
| 1190 | should handle undefined options | struc | adeq | Y |  |  |
| 1191 | should maintain type constant | struc | adeq | Y |  |  |
| 1192 | should handle negative capacity values | struc | adeq | Y |  |  |
| 1193 | should handle fractional capacity values | struc | adeq | Y |  |  |
| 1194 | should preserve array references | struc | adeq | Y |  |  |
| 1195 | should handle multi-purpose supporters | struc | adeq | Y |  |  |
| 1196 | should handle tiered supporters | struc | adeq | Y |  |  |
| 1197 | should handle magical supporters | struc | adeq | Y |  |  |
| 1198 | should handle dynamic supporter states | struc | adeq | Y | Y |  |
#### switchable.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1199 | should create trait with default values | struc | adeq | Y |  |  |
| 1200 | should create trait with provided data | struc | adeq | Y |  |  |
| 1201 | should handle power requirements correctly | struc | adeq | Y |  |  |
| 1202 | should set autoOffCounter when starting on with autoOffTime | funct | good | Y |  |  |
| 1203 | should not set autoOffCounter when starting off | funct | good | Y |  |  |
| 1204 | should allow changing on/off state | struc | adeq | Y | Y |  |
| 1205 | should track power availability | struc | adeq | Y | Y |  |
| 1206 | should handle auto-off counter | struc | adeq | Y | Y |  |
| 1207 | should attach to entity correctly | struc | adeq | Y |  |  |
| 1208 | should work with test fixture | struc | adeq | Y |  |  |
| 1209 | should handle device with power requirements | struc | adeq | Y |  |  |
| 1210 | should store all switch-related messages | struc | adeq | Y |  |  |
| 1211 | should allow partial message customization | struc | adeq | Y |  |  |
| 1212 | should support all sound types | struc | adeq | Y |  |  |
| 1213 | should handle empty options object | struc | adeq | Y |  |  |
| 1214 | should handle undefined options | struc | adeq | Y |  |  |
| 1215 | should handle device with no auto-off | struc | adeq | Y |  |  |
| 1216 | should maintain type constant | struc | adeq | Y |  |  |
#### vehicle-composition.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1217 | should allow VehicleTrait + ContainerTrait on same entity | struc | adeq | Y |  |  |
| 1218 | should allow VehicleTrait + SupporterTrait on same entity | struc | adeq | Y |  |  |
| 1219 | should find enterable property on ContainerTrait | struc | adeq | Y |  |  |
| 1220 | should find enterable property on SupporterTrait | struc | adeq | Y |  |  |
| 1221 | should allow player to enter the boat | behav | good | Y | Y |  |
| 1222 | should move player with boat when boat moves | behav | good | Y | Y |  |
| 1223 | should allow player to exit boat | behav | good | Y | Y |  |
| 1224 | should allow entering elevator when open | behav | good | Y | Y |  |
| 1225 | should transport player between floors | behav | good | Y | Y |  |
| 1226 | should allow boarding tram (supporter) | behav | good | Y | Y |  |
| 1227 | should transport player on tram | behav | good | Y | Y |  |
| 1228 | isVehicle should return true for entities with VehicleTrait | funct | good | Y |  |  |
| 1229 | isActorInVehicle should detect when player is in a vehicle | funct | good | Y | Y |  |
| 1230 | canActorWalkInVehicle should return false when in blocking vehicle | funct | good | Y | Y |  |
#### wearable.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1231 | should create trait with default values | struc | adeq | Y |  |  |
| 1232 | should create trait with provided data | struc | adeq | Y |  |  |
| 1233 | should handle partial initialization | struc | adeq | Y |  |  |
| 1234 | should handle empty blocksSlots array | struc | adeq | Y |  |  |
| 1235 | should support various body slots | struc | adeq | Y |  |  |
| 1236 | should handle custom slot names | struc | adeq | Y |  |  |
| 1237 | should block multiple slots | struc | adeq | Y |  |  |
| 1238 | should support different layers | struc | adeq | Y |  |  |
| 1239 | should handle wearableOver property | struc | adeq | Y |  |  |
| 1240 | should track worn status | struc | adeq | Y | Y |  |
| 1241 | should handle different wearers | struc | adeq | Y | Y |  |
| 1242 | should clear wornBy when not worn | struc | adeq | Y | Y |  |
| 1243 | should store custom wear and remove messages | struc | adeq | Y |  |  |
| 1244 | should allow undefined messages | struc | adeq | Y |  |  |
| 1245 | should allow only wear message | struc | adeq | Y |  |  |
| 1246 | should handle weight and bulk | struc | adeq | Y |  |  |
| 1247 | should handle zero weight items | struc | adeq | Y |  |  |
| 1248 | should handle fractional values | struc | adeq | Y |  |  |
| 1249 | should attach to entity correctly | struc | adeq | Y |  |  |
| 1250 | should create various wearable items | struc | adeq | Y |  |  |
| 1251 | should work with actor wearing items | struc | adeq | Y |  |  |
| 1252 | should handle layered armor system | struc | adeq | Y |  |  |
| 1253 | should handle jewelry with multiple items per slot | struc | adeq | Y |  |  |
| 1254 | should handle outfit sets | struc | adeq | Y |  |  |
| 1255 | should handle empty options object | struc | adeq | Y |  |  |
| 1256 | should handle undefined as parameter | struc | adeq | Y |  |  |
| 1257 | should maintain type constant | struc | adeq | Y |  |  |
| 1258 | should handle boolean false values correctly | struc | adeq | Y |  |  |
| 1259 | should handle zero and negative values | struc | adeq | Y |  |  |
| 1260 | should preserve array reference for blocksSlots | struc | adeq | Y |  |  |
#### container-state-visibility.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 638 | should not see medicine when cabinet is closed | funct | good | Y |  |  |
| 639 | should see medicine when cabinet is open | funct | good | Y | Y |  |
| 640 | should handle multiple state changes | funct | good | Y | Y |  |
| 641 | should verify canSee works correctly | funct | good | Y | Y |  |
| 642 | should verify medicine is in scope regardless of cabinet state | behav | good | Y |  |  |
#### event-chaining.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1261 | should register a chain handler | funct | good | Y | Y |  |
| 1262 | should invoke chain handler and return events | funct | good | Y |  |  |
| 1263 | should return empty array when handler returns null | funct | good | Y |  |  |
| 1264 | should return empty array when handler returns undefined | funct | good | Y |  |  |
| 1265 | should handle handler returning multiple events | funct | good | Y |  |  |
| 1266 | should fire all cascaded chains | funct | good | Y |  |  |
| 1267 | should replace all existing chains | funct | good | Y | Y |  |
| 1268 | should replace chain with same key | funct | good | Y | Y |  |
| 1269 | should not replace chain with different key | funct | good | Y |  |  |
| 1270 | should execute chains in priority order (lower first) | funct | good | Y |  |  |
| 1271 | should add _chainedFrom to data | funct | good | Y |  |  |
| 1272 | should add _chainSourceId to data | funct | good | Y |  |  |
| 1273 | should track _chainDepth | funct | good | Y |  |  |
| 1274 | should increment _chainDepth for nested chains | funct | good | Y |  |  |
| 1275 | should pass through _transactionId from trigger event (ADR-094) | funct | good | Y |  |  |
| 1276 | should not add _transactionId if trigger event lacks it | funct | good | Y |  |  |
| 1277 | should skip events that exceed max chain depth | funct | good | Y |  |  |
| 1278 | should allow events at depth 9 | funct | good | Y |  |  |
| 1279 | should wire chains registered before connection | funct | good | Y |  |  |
| 1280 | should wire chains registered after connection | funct | good | Y |  |  |
| 1281 | should clear all registered chains | funct | good | Y | Y |  |
| 1282 | should auto-generate id if not provided | funct | good | Y |  |  |
| 1283 | should use provided id if given | funct | good | Y |  |  |
| 1284 | should auto-generate timestamp if not provided | funct | good | Y |  |  |
| 1285 | should provide world access in chain handler | funct | good | Y |  |  |
#### get-in-scope.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1286 | should include the room the observer is in | funct | good | Y |  |  |
| 1287 | should include items in the same room | funct | good | Y |  |  |
| 1288 | should include items in containers in the room | funct | good | Y |  |  |
| 1289 | should include deeply nested items - SKIPPED: Default scope rules may  | funct | dead | S |  | Test is skipped; default scope rules may need adjustment for deep nesting -- con |
| 1290 | should include items carried by the observer | funct | good | Y |  |  |
| 1291 | should include items in containers carried by the observer | funct | good | Y |  |  |
| 1292 | should include the observer itself | funct | good | Y |  |  |
| 1293 | should handle empty room | funct | good | Y |  |  |
| 1294 | should return empty array if observer not in a room | funct | good | Y |  |  |
| 1295 | should handle unique entities (no duplicates) | funct | good | Y |  |  |
#### spatial-index.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1296 | should add child to parent | funct | good | Y | Y |  |
| 1297 | should add multiple children to parent | funct | good | Y | Y |  |
| 1298 | should remove child from parent | funct | good | Y | Y |  |
| 1299 | should move child to new parent | funct | good | Y | Y |  |
| 1300 | should handle non-existent parent | funct | good | Y |  |  |
| 1301 | should handle non-existent child | funct | good | Y |  |  |
| 1302 | should remove entity and its relationships | funct | good | Y | Y |  |
| 1303 | should remove only specified child | funct | good | Y | Y |  |
| 1304 | should handle removing non-existent child | funct | good | Y |  |  |
| 1305 | should clean up empty parent sets | funct | good | Y | Y |  |
| 1306 | should return true for parent with children | funct | good | Y |  |  |
| 1307 | should return false for parent without children | funct | good | Y |  |  |
| 1308 | should return false after removing all children | funct | good | Y | Y |  |
| 1309 | should get all descendants | funct | good | Y |  |  |
| 1310 | should respect max depth | funct | good | Y |  |  |
| 1311 | should handle entity with no descendants | funct | good | Y |  |  |
| 1312 | should handle circular references | funct | good | Y |  |  |
| 1313 | should collect all descendants up to max depth | funct | good | Y |  |  |
| 1314 | should get all ancestors | funct | good | Y |  |  |
| 1315 | should get ancestors up to depth | funct | good | Y |  |  |
| 1316 | should handle entity with no ancestors | funct | good | Y |  |  |
| 1317 | should handle missing entity | funct | good | Y |  |  |
| 1318 | should clear all relationships | funct | good | Y | Y |  |
| 1319 | should serialize to JSON | funct | good | Y |  |  |
| 1320 | should load from JSON | funct | good | Y |  |  |
| 1321 | should handle empty JSON | funct | good | Y |  |  |
| 1322 | should clear before loading | funct | good | Y | Y |  |
| 1323 | should handle adding same child multiple times | funct | good | Y |  |  |
| 1324 | should handle removing child from wrong parent | funct | good | Y |  |  |
| 1325 | should handle self-parenting | funct | good | Y |  |  |
| 1326 | should handle very deep hierarchies | funct | good | Y |  |  |
| 1327 | should maintain consistency when moving entities | funct | good | Y | Y |  |
#### visibility-behavior.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1328 | should always see self | funct | good | Y |  |  |
| 1329 | should see entities in same room | funct | good | Y |  |  |
| 1330 | should not see entities in different room | funct | good | Y |  |  |
| 1331 | should see the room observer is in | funct | good | Y |  |  |
| 1332 | should not see invisible entities | funct | good | Y |  |  |
| 1333 | should see entities in transparent containers | funct | good | Y |  |  |
| 1334 | should see entities in open opaque containers | funct | good | Y |  |  |
| 1335 | should not see entities in closed opaque containers | funct | good | Y |  |  |
| 1336 | should handle nested containers | funct | good | Y |  |  |
| 1337 | should block sight through any closed container in path | funct | good | Y |  |  |
| 1338 | should not see anything in dark room without light | funct | good | Y |  |  |
| 1339 | should only see lit light sources in dark room | funct | good | Y | Y |  |
| 1340 | should see everything when carrying lit lamp | funct | good | Y | Y |  |
| 1341 | should not benefit from light in closed container | funct | good | Y | Y |  |
| 1342 | should handle room lighting toggle | funct | good | Y | Y |  |
| 1343 | should return all visible entities | funct | good | Y |  |  |
| 1344 | should include carried items | funct | good | Y |  |  |
| 1345 | should handle empty room | funct | good | Y |  |  |
| 1346 | should handle observer not in room | funct | good | Y |  |  |
| 1347 | should return true for uncontained entities | funct | good | Y |  |  |
| 1348 | should return false for invisible scenery | funct | good | Y |  |  |
| 1349 | should return true for entity in transparent container | funct | good | Y |  |  |
| 1350 | should return true for entity in open opaque container | funct | good | Y |  |  |
| 1351 | should return false for entity in closed opaque container | funct | good | Y | Y |  |
| 1352 | should handle opaque container without openable trait | funct | good | Y |  |  |
| 1353 | should handle deeply nested visibility | behav | good | Y | Y |  |
| 1354 | should handle supporter visibility | funct | good | Y |  |  |
| 1355 | should handle visibility in nested containers | behav | good | Y | Y |  |
| 1356 | should handle circular containment gracefully | funct | good | Y |  |  |
| 1357 | should handle missing entities gracefully | funct | good | Y |  |  |
| 1358 | should handle entities with no location | funct | good | Y |  |  |
| 1359 | should handle max depth in containment path | funct | good | Y |  |  |
| 1360 | should return true for dark room with no lights | funct | good | Y |  |  |
| 1361 | should return false for room not marked dark | funct | good | Y |  |  |
| 1362 | should return false when player carries lit torch | funct | good | Y |  |  |
| 1363 | should return false when lit lamp on floor | funct | good | Y |  |  |
| 1364 | should return false when lit candle in open box | funct | good | Y |  |  |
| 1365 | should return true when lit candle in closed box | funct | good | Y |  |  |
| 1366 | should return false when switchable flashlight is on | funct | good | Y |  |  |
| 1367 | should return true when switchable flashlight is off | funct | good | Y |  |  |
| 1368 | should return false for glowing gem with no isLit property | funct | good | Y |  |  |
| 1369 | should return false when player wearing lit headlamp | funct | good | Y |  |  |
| 1370 | should return false when NPC carries lantern | funct | good | Y |  |  |
| 1371 | should return true when light only in adjacent room | funct | good | Y |  |  |
| 1372 | should return true when light source has isLit: false | funct | good | Y |  |  |
| 1373 | should use isLit over switchable state when both present | funct | good | Y |  |  |
| 1374 | should return false when light in transparent closed container | funct | good | Y | Y |  |
#### world-model.test.ts

| ID | Test Name | Type | Quality | Runs? | Mut? | Mitigation |
|----|-----------|------|---------|-------|------|-----------|
| 1375 | should create empty world model | funct | good | Y |  |  |
| 1376 | should accept configuration | funct | good | Y |  |  |
| 1377 | should create entity with auto-generated ID | funct | good | Y |  |  |
| 1378 | should generate correct type-prefixed IDs | funct | good | Y |  |  |
| 1379 | should allow multiple entities with same displayName | funct | good | Y |  |  |
| 1380 | should create entities with displayName | funct | good | Y |  |  |
| 1381 | should get entity by id | funct | good | Y |  |  |
| 1382 | should return undefined for missing entity | funct | good | Y |  |  |
| 1383 | should check entity existence | funct | good | Y |  |  |
| 1384 | should remove entity | funct | good | Y | Y |  |
| 1385 | should return false when removing non-existent entity | funct | good | Y |  |  |
| 1386 | should get all entities | funct | good | Y |  |  |
| 1387 | should update entity | funct | good | Y | Y |  |
| 1388 | should handle updating non-existent entity | funct | good | Y |  |  |
| 1389 | should throw in strict mode when updating non-existent entity | funct | good | Y |  |  |
| 1390 | should store displayName in entity attributes | funct | good | Y |  |  |
| 1391 | should increment ID counters correctly | funct | good | Y |  |  |
| 1392 | should handle ID counter overflow | funct | good | Y |  |  |
| 1393 | should get entity location | funct | good | Y | Y |  |
| 1394 | should get container contents | funct | good | Y | Y |  |
| 1395 | should move entity | funct | good | Y | Y |  |
| 1396 | should remove entity from world | funct | good | Y | Y |  |
| 1397 | should check if move is valid | funct | good | Y |  |  |
| 1398 | should prevent moving to non-container | funct | good | Y |  |  |
| 1399 | should prevent containment loops | funct | good | Y |  |  |
| 1400 | should get containing room | funct | good | Y | Y |  |
| 1401 | should get all contents recursively | funct | good | Y | Y |  |
| 1402 | should handle max depth limit | funct | good | Y |  |  |
| 1403 | should work with entity IDs | funct | good | Y | Y |  |
| 1404 | should get and set state | funct | good | Y | Y |  |
| 1405 | should get and set state values | funct | good | Y | Y |  |
| 1406 | should handle nested state values | funct | good | Y |  |  |
| 1407 | should find entities by trait | funct | good | Y |  |  |
| 1408 | should find entities by type | funct | good | Y |  |  |
| 1409 | should find entities with predicate | funct | good | Y |  |  |
| 1410 | should find all entities without filtering | funct | good | Y |  |  |
| 1411 | should get entities in scope | funct | good | Y |  |  |
| 1412 | should include carried items in scope | funct | good | Y |  |  |
| 1413 | should check visibility | funct | adeq | Y |  |  |
| 1414 | should work with direct IDs for visibility | funct | adeq | Y |  |  |
| 1415 | should add relationship | funct | good | Y | Y |  |
| 1416 | should get related entities | funct | good | Y |  |  |
| 1417 | should remove relationship | funct | good | Y | Y |  |
| 1418 | should handle multiple relationship types | funct | good | Y |  |  |
| 1419 | should handle non-existent entities in non-strict mode | funct | good | Y |  |  |
| 1420 | should throw in strict mode for non-existent entities | funct | good | Y |  |  |
| 1421 | should calculate total weight | funct | good | Y |  |  |
| 1422 | should detect containment loops | funct | good | Y |  |  |
| 1423 | should find path between rooms | funct | good | Y |  |  |
| 1424 | should get and set player | funct | good | Y | Y |  |
| 1425 | should throw when setting non-existent player | funct | good | Y |  |  |
| 1426 | should serialize to JSON | funct | good | Y |  |  |
| 1427 | should load from JSON | behav | good | Y | Y |  |
| 1428 | should handle loading old saves without ID system data | behav | good | Y | Y |  |
| 1429 | should clear world | funct | good | Y | Y |  |
| 1430 | should register and apply event handler | funct | good | Y |  |  |
| 1431 | should validate events | funct | good | Y |  |  |
| 1432 | should throw when applying invalid event | funct | good | Y |  |  |
| 1433 | should preview event changes | funct | good | Y |  |  |
| 1434 | should track event history | funct | good | Y |  |  |
| 1435 | should get events since timestamp | funct | good | Y |  |  |
| 1436 | should clear event history | funct | good | Y | Y |  |
| 1437 | should unregister event handler | funct | good | Y | Y |  |
| 1438 | should handle unregistered events silently | funct | good | Y |  |  |
| 1439 | should handle empty world operations | funct | good | Y |  |  |
| 1440 | should handle removing entity with contents | funct | good | Y | Y |  |
| 1441 | should handle circular references in toJSON | funct | good | Y |  |  |