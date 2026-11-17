-- Batch 7: world-model tests NOT in traits/ directory
-- Classifications for annotations, integration, scope, unit tests

-- =============================================================================
-- annotations.test.ts (IDs 265-283)
-- =============================================================================

-- annotate() and getAnnotations()
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=265; -- should add and retrieve annotations by kind
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=266; -- should support multiple annotations per kind
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=267; -- should return empty array for unknown kind
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=268; -- should support multiple kinds on the same entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=269; -- should be chainable

-- removeAnnotation()
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=270; -- should remove by kind and id
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=271; -- should return false for non-existent annotation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=272; -- should clean up empty kind map

-- hasAnnotations()
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=273; -- should return true when annotations exist
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=274; -- should return false when no annotations

-- getActiveAnnotations() - condition evaluation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=275; -- should return all annotations when none have conditions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=276; -- should filter by self trait condition
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=277; -- should filter by player trait condition
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=278; -- should filter by location trait condition
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=279; -- should return unconditional annotations alongside matching conditional ones
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=280; -- should return false for condition on missing trait

-- clone()
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=281; -- should deep-copy annotations

-- toJSON() / fromJSON()
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=282; -- should round-trip annotations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=283; -- should handle entity with no annotations

-- =============================================================================
-- integration/container-hierarchies.test.ts (IDs 312-324)
-- =============================================================================

UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=312; -- should handle deeply nested containers
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Conditional assertion (if/else) weakens the test; should assert a definite outcome' WHERE id=313; -- should enforce maximum nesting depth
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=314; -- should prevent circular containment
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=315; -- should calculate total weight including contents
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=1, mitigation='Test documents that capacity limits are NOT enforced (comment says "Currently no limit enforced") -- either implement limits or remove the test' WHERE id=316; -- should handle container capacity limits
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=317; -- should handle supporter and container combinations
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=318; -- should handle furniture with both surfaces and storage
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=319; -- should handle moving containers with contents
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=320; -- should update visibility when opening/closing containers (FAIL - needs investigation)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=321; -- should find all containers of a specific type
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=322; -- should find containers matching complex criteria
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=323; -- should handle large numbers of containers efficiently
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=324; -- should efficiently check containment loops in complex hierarchies

-- =============================================================================
-- integration/door-mechanics.test.ts (IDs 325-339)
-- =============================================================================

UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=325; -- should create doors connecting two rooms
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=326; -- should synchronize door state between rooms
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test only checks trait state, never actually tries to open a locked door via behavior; it just re-asserts the state it set up' WHERE id=327; -- should prevent opening locked doors
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=1, mitigation='Test manually sets isLocked=false rather than using unlock behavior with key verification' WHERE id=328; -- should unlock doors with correct key
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=329; -- should handle multiple locked doors
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=330; -- should handle secret doors
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test only verifies custom property values were set; does not test any behavior' WHERE id=331; -- should handle one-way doors
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test only verifies custom property values were set; does not test any auto-close behavior' WHERE id=332; -- should handle automatic closing doors
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=333; -- should affect visibility through doors
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Only checks that hasWindow/windowTransparent properties were set on door trait; no behavior tested' WHERE id=334; -- should handle doors with windows
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=335; -- should handle rooms with multiple doors
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=336; -- should handle double doors
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test only sets and checks custom ad-hoc properties (useCount, lastUsedBy) -- no actual door usage behavior is tested' WHERE id=337; -- should track door usage
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test only sets and checks custom ad-hoc properties (puzzleSolved, requiresPuzzle) -- no puzzle behavior is tested' WHERE id=338; -- should handle door with special requirements
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=339; -- should handle buildings with many doors efficiently

-- =============================================================================
-- integration/room-actor-containers.test.ts (IDs 340-346)
-- =============================================================================

UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=340; -- should allow items to be placed in rooms without ContainerTrait
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test only checks that trait property exists; does not verify capacity enforcement' WHERE id=341; -- should respect room capacity limits
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=342; -- should handle nested containers in rooms
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=343; -- should allow actors to carry items without ContainerTrait
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test only checks trait capacity property exists; does not verify capacity enforcement' WHERE id=344; -- should handle actor inventory limits
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test only checks excludedTypes property; does not verify that actor-in-actor placement is actually blocked' WHERE id=345; -- should prevent actors from being placed inside other actors
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=346; -- should correctly identify all container-capable entities

-- =============================================================================
-- integration/trait-combinations.test.ts (IDs 347-363)
-- =============================================================================

UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=347; -- should not see contents of locked closed container
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test manually sets isOpen=true on locked container and only checks lockable is still true -- does not verify that the open was actually blocked' WHERE id=348; -- should not open locked container
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=349; -- should see contents after unlocking and opening
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=350; -- should handle nested locked containers
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=351; -- should see items on supporter but not in closed container
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=352; -- should handle complex containment hierarchy
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=353; -- should include all scenery regardless of visibility
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=354; -- should handle wearing items with containers
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=355; -- should exclude worn items when specified
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=356; -- should track complex worn item hierarchies
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=357; -- should navigate through doors between rooms
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=358; -- should see in lit rooms but not dark rooms
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=359; -- should handle door state synchronization
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=360; -- should track edible items in containers
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test sets custom isConsumed property on edible trait via as-cast; no actual consume behavior tested' WHERE id=361; -- should handle consuming items from container
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=362; -- should handle readable items in locked containers on supporters
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=363; -- should handle switchable light sources affecting room visibility

-- =============================================================================
-- integration/visibility-chains.test.ts (IDs 364-385)
-- =============================================================================

UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=364; -- should see through open containers
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=365; -- should not see into closed containers
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=366; -- should handle mixed open/closed container chains
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=367; -- should see items on supporters
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=368; -- should see through containers on supporters
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=369; -- should not see in dark rooms
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=370; -- should see with carried light source
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=371; -- should see with light source in room
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=372; -- should handle light in containers
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=373; -- should see items carried by actors
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=374; -- should see worn items on actors
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=375; -- should not see items in closed containers carried by actors
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=376; -- should see visible scenery
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=377; -- should not see invisible scenery
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=378; -- should see contents of visible scenery containers
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=379; -- should handle deep visibility chains
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=380; -- should handle multiple visibility blockers
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=381; -- should handle visibility with movement
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=382; -- should get all items in scope
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=383; -- should handle scope in dark rooms with light
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=384; -- should handle large visibility calculations efficiently
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test notes caching is aspirational and comments out the actual cache assertion -- either implement caching or rewrite as a pure equality check' WHERE id=385; -- should cache visibility calculations

-- =============================================================================
-- integration/wearable-clothing.test.ts (IDs 386-400)
-- =============================================================================

UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=386; -- should wear and remove simple items
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=387; -- should prevent wearing already worn items
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=388; -- should track multiple worn items
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=389; -- should create functional clothing with pockets
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=390; -- should maintain pocket contents when wearing clothing
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Test is skipped; needs review of complex visibility scenario' WHERE id=391; -- should handle items in pockets visibility - SKIPPED
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=392; -- should support multiple layers of clothing
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=393; -- should handle mixed clothing and accessories
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=394; -- should handle nested containers in pockets
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=395; -- should handle pocket access when clothing is in container
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=396; -- should handle clothing that blocks slots
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test does not actually try to remove the cursed ring; only checks that canRemove property is false' WHERE id=397; -- should handle non-removable clothing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=398; -- should track clothing condition
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=399; -- should handle actors with many worn items efficiently
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=400; -- should efficiently filter worn vs carried items

-- =============================================================================
-- scope/darkness-light.test.ts (IDs 284-291)
-- =============================================================================

UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=284; -- should not see objects in dark room without light
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=285; -- should see objects when carrying lit light source
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Contains console.log debug statements that should be removed' WHERE id=286; -- should not see when light source is off
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=287; -- should see when light source is turned on
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=288; -- should see when room has light source
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=289; -- should work normally in lit rooms
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=0 WHERE id=290; -- should support partial darkness with specific visibility - SKIPPED
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=291; -- should handle underground darkness differently

-- =============================================================================
-- scope/magic-sight.test.ts (IDs 292-298)
-- =============================================================================

UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=0 WHERE id=292; -- should see invisible objects with true sight - SKIPPED
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=0 WHERE id=293; -- should see through walls with x-ray vision - SKIPPED
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=294; -- should reveal concealed objects with detect magic
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=0 WHERE id=295; -- should see inside closed containers with clairvoyance - SKIPPED
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=296; -- should have remote viewing through crystal orb
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=0 WHERE id=297; -- should combine multiple magical sight abilities - SKIPPED
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=298; -- should limit magical sight by power level

-- =============================================================================
-- scope/sound-traveling.test.ts (IDs 299-304)
-- =============================================================================

UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=299; -- should hear sounds from adjacent rooms
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=300; -- should hear loud sounds from further away
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=301; -- should not hear sounds through solid barriers
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=302; -- should support directional sound
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=303; -- should combine multiple sound rules
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=304; -- should filter sounds by action type

-- =============================================================================
-- scope/window-visibility-fixed.test.ts (IDs 305-311)
-- =============================================================================

UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=305; -- should not see garden entities when window is closed
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=0 WHERE id=306; -- should see garden entities when window is open - SKIPPED
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=0 WHERE id=307; -- should not see garden when window closes again - SKIPPED
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=308; -- should support action-specific visibility
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=309; -- should support dynamic entity inclusion
UPDATE tests SET test_type='behavioral', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=0 WHERE id=310; -- should support scope rule removal - SKIPPED
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=311; -- should handle one-way visibility

-- =============================================================================
-- unit/author-model.test.ts (IDs 401-421)
-- =============================================================================

-- Shared Data Store
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=401; -- should share entities between WorldModel and AuthorModel
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=402; -- should share spatial relationships between models
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=403; -- should share state between models

-- Unrestricted Movement
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=404; -- should move entities into closed containers (FAIL)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=405; -- should move entities into locked containers (FAIL)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=406; -- should bypass container trait requirement
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=407; -- should not check for loops

-- Event Recording
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=408; -- should not emit events by default
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=409; -- should emit events when recordEvent is true (FAIL)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=410; -- should use author: prefix for events (FAIL)

-- Convenience Methods
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=411; -- should populate containers with multiple items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=412; -- should connect rooms bidirectionally (FAIL)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=413; -- should fill containers from specs (FAIL)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=414; -- should setup container properties (FAIL)

-- Entity Management
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=415; -- should create entities with proper IDs
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=416; -- should remove entities completely

-- Note: ID 417 tests setEntityProperty which fails
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=417; -- should set entity properties directly (FAIL)

-- State Management
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=418; -- should set player without validation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=419; -- should clear all world data

-- Real-World Usage Patterns
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=420; -- should handle complex world setup (FAIL)

-- Scope and Visibility Integration
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=421; -- should include items in closed containers in scope but not visible

-- =============================================================================
-- unit/behaviors/attack.test.ts (IDs 494-505)
-- =============================================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=494; -- should break a breakable entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=495; -- should not break already broken entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=496; -- should damage destructible entity with weapon
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=497; -- should destroy destructible entity when HP reaches 0
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=498; -- should fail without required weapon
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=499; -- should fail with wrong weapon type
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=500; -- should damage combatant with weapon
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=501; -- should kill combatant when health reaches 0
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=502; -- should do unarmed damage without weapon
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=503; -- should return ineffective for entity with no combat traits
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=504; -- should prioritize breakable over destructible
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=505; -- should try destructible if breakable is already broken

-- =============================================================================
-- unit/behaviors/behavior.test.ts (IDs 506-517)
-- =============================================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=506; -- should validate entity has required traits
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=507; -- should get list of missing traits
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=508; -- should work with behaviors having no requirements
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=509; -- should return trait when present (require)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=510; -- should throw error when required trait is missing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=511; -- should return trait when present (optional)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=512; -- should return undefined when trait is missing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=513; -- should support behaviors that check state
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=514; -- should support behaviors with no requirements
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=515; -- should support behavior inheritance
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=516; -- should provide clear error messages for missing traits
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=517; -- should not require instantiation

-- =============================================================================
-- unit/behaviors/breakable.test.ts (IDs 518-528)
-- =============================================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=518; -- canBreak should return true for unbroken breakable items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=519; -- canBreak should return false for already broken items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=520; -- canBreak should return false for non-breakable items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=521; -- break should mark item as broken
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=522; -- break should not create debris
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=523; -- break should not remove items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=524; -- break should fail if item is already broken
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=525; -- break should fail if item is not breakable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=526; -- isBroken should return true for broken items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=527; -- isBroken should return false for unbroken items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=528; -- isBroken should return false for non-breakable items

-- =============================================================================
-- unit/behaviors/combat.test.ts (IDs 529-544)
-- =============================================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=529; -- attack should reduce health by damage minus armor
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=530; -- attack should handle armor reducing damage to 0
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=531; -- attack should kill when health reaches 0
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=532; -- attack should drop inventory when killed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=533; -- attack should not drop inventory if dropsInventory is false
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=534; -- attack should fail when attacking dead combatant
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=535; -- attack should fail for non-combatant entities
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=536; -- heal should increase health up to max
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=537; -- heal should cap healing at max health
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=538; -- heal should fail when healing dead combatant
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=539; -- resurrect should bring dead combatant back to life
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=540; -- resurrect should resurrect to full health if no health specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=541; -- resurrect should fail when resurrecting living combatant
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=542; -- isAlive should return true for living combatants
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=543; -- isAlive should return false for dead combatants
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=544; -- isAlive should return true for non-combatant entities

-- =============================================================================
-- unit/behaviors/destructible.test.ts (IDs 545-558)
-- =============================================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=545; -- canDamage should return true when weapon requirements are met
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=546; -- canDamage should return false when wrong weapon type
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=547; -- canDamage should return false when no weapon provided but required
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=548; -- canDamage should return true when no weapon required
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=549; -- canDamage should return false for non-destructible entities
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=550; -- damage should reduce hit points by damage amount
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=551; -- damage should destroy entity when hit points reach 0
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=552; -- damage should create transformation entity when destroyed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=553; -- damage should reveal exit when destroyed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=554; -- damage should handle overkill damage
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=555; -- damage should fail for non-destructible entities
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=556; -- isDestroyed should return true when hit points are 0
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=557; -- isDestroyed should return false when hit points are positive
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=558; -- isDestroyed should return false for non-destructible entities

-- =============================================================================
-- unit/behaviors/weapon.test.ts (IDs 559-570)
-- =============================================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=559; -- calculateDamage should return damage within min-max range
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=560; -- calculateDamage should throw for non-weapon entities
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=561; -- calculateDamage should handle broken weapons
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=562; -- calculateDamage should return exact damage for equal min-max
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=563; -- canDamage should return true for most target types
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=564; -- canDamage should return false for ghosts without magic weapon
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=565; -- canDamage should return true when no specific type required
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=566; -- canDamage should return false for non-weapons
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=567; -- isBroken should return false for weapon without durability
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=568; -- isBroken should return true for weapon with 0 durability
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=569; -- isBroken should return false for weapon with positive durability
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=570; -- isBroken should return false for non-weapons

-- =============================================================================
-- unit/capabilities/capability-dispatch.test.ts (IDs 571-596)
-- =============================================================================

-- Capability Helpers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=571; -- findTraitWithCapability should find trait with matching capability
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=572; -- findTraitWithCapability should return undefined if no trait has capability
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=573; -- findTraitWithCapability should return undefined for empty entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=574; -- hasCapability should return true if entity has trait with capability
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=575; -- hasCapability should return false if entity lacks capability
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=576; -- getEntityCapabilities should return all capabilities from all traits
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=577; -- getEntityCapabilities should return empty array for entity without capable traits
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=578; -- traitHasCapability should return true for trait with capability
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=579; -- traitHasCapability should return false for trait without capability
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=580; -- traitHasCapability should narrow type when traitType provided
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=581; -- getCapableTraits should return only traits with capabilities

-- Capability Registry
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=582; -- registerCapabilityBehavior should register a behavior for trait+capability
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=583; -- registerCapabilityBehavior should throw on duplicate registration
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=584; -- getBehaviorForCapability should return registered behavior
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=585; -- getBehaviorForCapability should return undefined for unregistered
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=586; -- unregisterCapabilityBehavior should remove registered behavior

-- CapabilityBehavior
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=587; -- should validate successfully when preconditions met
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=588; -- should fail validation when preconditions not met
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=589; -- should execute mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=590; -- should report success effects
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=591; -- should report blocked effects

-- EntityBuilder
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=592; -- add should add traits without capability conflicts
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=593; -- add should throw on capability conflict
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=594; -- add should track claimed capabilities
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=595; -- buildEntity helper should create builder from entity

-- createEffect helper
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=596; -- should create effect object

-- =============================================================================
-- unit/direction-vocabulary.test.ts (IDs 422-449)
-- =============================================================================

-- initialization
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=422; -- should default to compass vocabulary
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=423; -- should have compass, naval, and minimal built-in
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=424; -- should return undefined for unknown vocabulary

-- useVocabulary
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=425; -- should switch to naval vocabulary
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=426; -- should switch to minimal vocabulary
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=427; -- should switch back to compass
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=428; -- should throw for unknown vocabulary

-- getDisplayName
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=429; -- should return compass display names by default
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=430; -- should return naval display names after switching
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=431; -- should return minimal display names
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=432; -- should fall back to lowercase constant

-- rename
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=433; -- should rename a direction
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=434; -- should not mutate the original named vocabulary
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=435; -- should create a custom vocabulary on first rename
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=436; -- should preserve other directions when renaming one

-- alias
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=437; -- should add words without removing existing ones
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=438; -- should update display name
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=439; -- should not duplicate words

-- define
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=440; -- should register a custom vocabulary
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=441; -- should be activatable after registration

-- change listeners
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=442; -- should notify listener on useVocabulary
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=443; -- should notify listener on rename
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=444; -- should notify listener on alias
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=445; -- should notify multiple listeners

-- pre-defined vocabularies
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=446; -- compass should have all 12 directions
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=447; -- naval should omit diagonals
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=448; -- minimal should have only 4 directions
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=449; -- naval fore/aft should map to north/south

-- =============================================================================
-- unit/entities/entity-store.test.ts (IDs 597-612)
-- =============================================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=597; -- should add and retrieve entities
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=598; -- should return undefined for non-existent entities
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=599; -- should remove entities and clear traits
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=600; -- should clear all entities
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=601; -- should get all entities
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=602; -- should get entities by type
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=603; -- should find entities with specific trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=604; -- should find entities with all specified traits
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=605; -- should find entities with any specified traits
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=606; -- should be iterable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=607; -- should serialize to JSON
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=608; -- should deserialize from JSON
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=609; -- should reflect number of entities (size)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=610; -- should handle removing non-existent entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=611; -- should handle duplicate adds gracefully
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=612; -- should work with empty store

-- =============================================================================
-- unit/entities/if-entity.test.ts (IDs 613-637)
-- =============================================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=613; -- constructor should create entity with id and type
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=614; -- constructor should accept creation params
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=615; -- should add trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=616; -- should remove trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=617; -- should warn and ignore when adding duplicate trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=618; -- should check multiple traits with hasAll
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=619; -- should check multiple traits with hasAny
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=620; -- should get all traits
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=621; -- should get all trait types
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=622; -- should clear all traits
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=623; -- should support trait aliases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=624; -- should identify rooms
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=625; -- should identify containers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=626; -- should identify takeable items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=627; -- should get name from identity trait first
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=628; -- should get weight from attributes
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=629; -- should create deep copy with new ID
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=630; -- should serialize to JSON
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=631; -- should deserialize from JSON
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=632; -- should detect openable trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=633; -- should detect lockable trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=634; -- should detect light provision
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=635; -- should detect switchable state
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=636; -- should detect actors and players
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=637; -- should throw error for invalid traits

-- =============================================================================
-- unit/entity-system-updates.test.ts (IDs 450-458)
-- =============================================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=450; -- should store entity type in attributes
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=451; -- should handle name property correctly
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=452; -- should serialize with version number
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=453; -- should deserialize both old and new formats
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=454; -- should use IDs in room exits
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=455; -- should use IDs in door connections
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=456; -- should use IDs in exit traits
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=457; -- should save and restore entities with proper IDs
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=458; -- should use IDs for all entity relationships

-- =============================================================================
-- unit/id-generation.test.ts (IDs 459-467)
-- =============================================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=459; -- should generate sequential IDs with type prefixes
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=460; -- should throw error for unknown types
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=461; -- should use object type as default
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=462; -- should handle base36 conversion correctly
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=463; -- should store entity name in attributes
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=464; -- should allow duplicate names
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=465; -- should remove entities by ID
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=466; -- should save and restore ID system state
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=467; -- should set displayName in entity attributes

-- =============================================================================
-- unit/parsed-command.test.ts (IDs 468-493)
-- =============================================================================

UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=468; -- Token: should support language-agnostic token representation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=469; -- Token: should support multiple parts of speech
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=470; -- Token: should handle unknown words
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=471; -- VerbPhrase: should represent simple verbs
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=472; -- VerbPhrase: should represent phrasal verbs with particles
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=473; -- VerbPhrase: should represent multi-word verbs
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=474; -- NounPhrase: should represent simple nouns
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=475; -- NounPhrase: should represent nouns with articles
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=476; -- NounPhrase: should represent complex noun phrases
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=477; -- NounPhrase: should support multiple candidates
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=478; -- PrepPhrase: should represent preposition phrases
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=479; -- PrepPhrase: should support multi-word prepositions
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=480; -- ParsedCommand: should represent a simple command
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=481; -- ParsedCommand: should represent a transitive command
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=482; -- ParsedCommand: should represent a ditransitive command
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=483; -- ParsedCommand: should support extras field
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=484; -- ParseError: should represent unknown command errors
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=485; -- ParseError: should represent syntax errors with position
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=486; -- ParseError: should represent ambiguous input errors
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=487; -- Backward compatibility: should support legacy ParsedCommandV1
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=488; -- Backward compatibility: should support ParsedObjectReference
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=489; -- PartOfSpeech enum should still exist during migration
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=490; -- should not have language-specific parts of speech
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=491; -- ParsedCommand should not have language-specific fields
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=492; -- Token structure should support language data extension
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=493; -- Pattern names should be opaque strings

-- =============================================================================
-- unit/visibility/container-state-visibility.test.ts (IDs 638-642)
-- =============================================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=638; -- should not see medicine when cabinet is closed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=639; -- should see medicine when cabinet is open
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=640; -- should handle multiple state changes
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=641; -- should verify canSee works correctly
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=642; -- should verify medicine is in scope regardless of cabinet state

-- =============================================================================
-- unit/world/event-chaining.test.ts (IDs 1261-1285)
-- =============================================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1261; -- should register a chain handler
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1262; -- should invoke chain handler and return events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1263; -- should return empty array when handler returns null
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1264; -- should return empty array when handler returns undefined
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1265; -- should handle handler returning multiple events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1266; -- cascade mode should fire all cascaded chains
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1267; -- override mode should replace all existing chains
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1268; -- keyed chains should replace chain with same key
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1269; -- keyed chains should not replace chain with different key
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1270; -- priority ordering should execute chains in priority order
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1271; -- should add _chainedFrom to data
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1272; -- should add _chainSourceId to data
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1273; -- should track _chainDepth
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1274; -- should increment _chainDepth for nested chains
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1275; -- should pass through _transactionId from trigger event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1276; -- should not add _transactionId if trigger event lacks it
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1277; -- should skip events that exceed max chain depth
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1278; -- should allow events at depth 9
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1279; -- should wire chains registered before connection
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1280; -- should wire chains registered after connection
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1281; -- world.clear() should clear all registered chains
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1282; -- should auto-generate id if not provided
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1283; -- should use provided id if given
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1284; -- should auto-generate timestamp if not provided
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1285; -- should provide world access in chain handler

-- =============================================================================
-- unit/world/get-in-scope.test.ts (IDs 1286-1295)
-- =============================================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1286; -- should include the room the observer is in
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1287; -- should include items in the same room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1288; -- should include items in containers in the room
UPDATE tests SET test_type='functional', quality='dead', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Test is skipped; default scope rules may need adjustment for deep nesting -- contains debug console.log statements' WHERE id=1289; -- should include deeply nested items - SKIPPED
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1290; -- should include items carried by the observer
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1291; -- should include items in containers carried by the observer
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1292; -- should include the observer itself
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1293; -- should handle empty room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1294; -- should return empty array if observer not in a room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1295; -- should handle unique entities (no duplicates)

-- =============================================================================
-- unit/world/spatial-index.test.ts (IDs 1296-1327)
-- =============================================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1296; -- should add child to parent
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1297; -- should add multiple children to parent
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1298; -- should remove child from parent
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1299; -- should move child to new parent
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1300; -- should handle non-existent parent
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1301; -- should handle non-existent child
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1302; -- should remove entity and its relationships
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1303; -- should remove only specified child
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1304; -- should handle removing non-existent child
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1305; -- should clean up empty parent sets
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1306; -- hasChildren should return true for parent with children
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1307; -- hasChildren should return false for parent without children
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1308; -- hasChildren should return false after removing all children
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1309; -- getAllDescendants should get all descendants
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1310; -- getAllDescendants should respect max depth
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1311; -- getAllDescendants should handle entity with no descendants
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1312; -- getAllDescendants should handle circular references
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1313; -- getAllDescendants should collect all descendants up to max depth
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1314; -- getAncestors should get all ancestors
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1315; -- getAncestors should get ancestors up to depth
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1316; -- getAncestors should handle entity with no ancestors
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1317; -- getAncestors should handle missing entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1318; -- clear should clear all relationships
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1319; -- should serialize to JSON
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1320; -- should load from JSON
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1321; -- should handle empty JSON
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1322; -- should clear before loading
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1323; -- should handle adding same child multiple times
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1324; -- should handle removing child from wrong parent
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1325; -- should handle self-parenting
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1326; -- should handle very deep hierarchies
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1327; -- should maintain consistency when moving entities

-- =============================================================================
-- unit/world/visibility-behavior.test.ts (IDs 1328-1375)
-- =============================================================================

-- canSee
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1328; -- should always see self
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1329; -- should see entities in same room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1330; -- should not see entities in different room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1331; -- should see the room observer is in
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1332; -- should not see invisible entities
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1333; -- should see entities in transparent containers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1334; -- should see entities in open opaque containers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1335; -- should not see entities in closed opaque containers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1336; -- should handle nested containers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1337; -- should block sight through any closed container in path

-- dark rooms
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1338; -- should not see anything in dark room without light
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1339; -- should only see lit light sources in dark room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1340; -- should see everything when carrying lit lamp
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1341; -- should not benefit from light in closed container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1342; -- should handle room lighting toggle

-- getVisible
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1343; -- should return all visible entities
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1344; -- should include carried items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1345; -- should handle empty room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1346; -- should handle observer not in room

-- isVisible
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1347; -- should return true for uncontained entities
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1348; -- should return false for invisible scenery
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1349; -- should return true for entity in transparent container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1350; -- should return true for entity in open opaque container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1351; -- should return false for entity in closed opaque container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1352; -- should handle opaque container without openable trait

-- complex scenarios
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1353; -- should handle deeply nested visibility
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1354; -- should handle supporter visibility
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1355; -- should handle visibility in nested containers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1356; -- should handle circular containment gracefully

-- edge cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1357; -- should handle missing entities gracefully
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1358; -- should handle entities with no location
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1359; -- should handle max depth in containment path

-- isDark
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1360; -- should return true for dark room with no lights
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1361; -- should return false for room not marked dark
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1362; -- should return false when player carries lit torch
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1363; -- should return false when lit lamp on floor
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1364; -- should return false when lit candle in open box
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1365; -- should return true when lit candle in closed box
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1366; -- should return false when switchable flashlight is on
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1367; -- should return true when switchable flashlight is off
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1368; -- should return false for glowing gem with no isLit property
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1369; -- should return false when player wearing lit headlamp
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1370; -- should return false when NPC carries lantern
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1371; -- should return true when light only in adjacent room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1372; -- should return true when light source has isLit: false
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1373; -- should use isLit over switchable state when both present
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1374; -- should return false when light in transparent closed container

-- =============================================================================
-- unit/world/world-model.test.ts (IDs 1375-1441)
-- =============================================================================

-- initialization
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1375; -- should create empty world model
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1376; -- should accept configuration

-- entity management
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1377; -- should create entity with auto-generated ID
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1378; -- should generate correct type-prefixed IDs
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1379; -- should allow multiple entities with same displayName
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1380; -- should create entities with displayName
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1381; -- should get entity by id
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1382; -- should return undefined for missing entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1383; -- should check entity existence
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1384; -- should remove entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1385; -- should return false when removing non-existent entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1386; -- should get all entities
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1387; -- should update entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1388; -- should handle updating non-existent entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1389; -- should throw in strict mode when updating non-existent entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1390; -- should store displayName in entity attributes
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1391; -- should increment ID counters correctly
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1392; -- should handle ID counter overflow

-- spatial management
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1393; -- should get entity location
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1394; -- should get container contents
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1395; -- should move entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1396; -- should remove entity from world
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1397; -- should check if move is valid
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1398; -- should prevent moving to non-container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1399; -- should prevent containment loops
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1400; -- should get containing room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1401; -- should get all contents recursively
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1402; -- should handle max depth limit
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1403; -- should work with entity IDs

-- world state management
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1404; -- should get and set state
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1405; -- should get and set state values
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1406; -- should handle nested state values

-- query operations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1407; -- should find entities by trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1408; -- should find entities by type
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1409; -- should find entities with predicate
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1410; -- should find all entities without filtering

-- visibility and scope
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1411; -- should get entities in scope
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1412; -- should include carried items in scope
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1413; -- should check visibility
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1414; -- should work with direct IDs for visibility

-- relationships
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1415; -- should add relationship
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1416; -- should get related entities
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1417; -- should remove relationship
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1418; -- should handle multiple relationship types
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1419; -- should handle non-existent entities in non-strict mode
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1420; -- should throw in strict mode for non-existent entities

-- utility methods
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1421; -- should calculate total weight
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1422; -- should detect containment loops
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1423; -- should find path between rooms
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1424; -- should get and set player
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1425; -- should throw when setting non-existent player

-- persistence
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1426; -- should serialize to JSON
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1427; -- should load from JSON
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1428; -- should handle loading old saves without ID system data
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1429; -- should clear world

-- event sourcing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1430; -- should register and apply event handler
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1431; -- should validate events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1432; -- should throw when applying invalid event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1433; -- should preview event changes
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1434; -- should track event history
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1435; -- should get events since timestamp
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1436; -- should clear event history
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1437; -- should unregister event handler
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1438; -- should handle unregistered events silently

-- edge cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1439; -- should handle empty world operations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1440; -- should handle removing entity with contents
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1441; -- should handle circular references in toJSON
