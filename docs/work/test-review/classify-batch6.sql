-- Batch 6: world-model traits/ tests classification
-- 377 tests across 25 trait test files (IDs 643-1260)
--
-- Summary pattern: Most trait tests are structural (property storage verification).
-- Exceptions:
--   - ActorTrait methods (setPronouns, setInventoryLimit, makePlayer, setCustomProperty, getCustomProperty) → functional
--   - CharacterModelTrait vocabulary parsing, predicate eval, state mutation → functional
--   - ContainerCapability utility functions (canContain, getContainerTrait, isContainerCapable) → functional
--   - VehicleComposition scenarios (boat, elevator, tram with WorldModel moves) → behavioral
--   - VehicleBehavior utility functions (isVehicle, isActorInVehicle, canActorWalkInVehicle) → functional

-- ============================================================================
-- actor.test.ts (IDs 643-674)
-- ============================================================================

-- initialization: property storage checks
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=643; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=644; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=645; -- multiple pronoun sets
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=646; -- partial inventory limits

-- pronoun management: tests method behavior (setPronouns, getPrimaryPronouns)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=647; -- setPronouns method
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=648; -- set multiple pronoun sets
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=649; -- get primary pronouns single
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=650; -- get primary pronouns array

-- inventory limit management: tests method behavior (setInventoryLimit)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=651; -- setInventoryLimit
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=652; -- partial update
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=653; -- create if not exists

-- player management: tests method behavior (makePlayer)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=654; -- makePlayer
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=1, mitigation='Test name says "ensure player is always playable" but actually demonstrates the limitation that isPlayable can be set false after makePlayer. Rename test or add enforcement.' WHERE id=655; -- ensure player always playable

-- custom properties: tests method behavior (setCustomProperty, getCustomProperty)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=656; -- setCustomProperty
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=657; -- getCustomProperty
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=658; -- create customProperties if not exists
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=659; -- overwrite existing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=660; -- various data types

-- state management: direct property mutation
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=661; -- state changes
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=662; -- maintain state through changes

-- entity integration: trait attachment to entities
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=663; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=664; -- work with container trait
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=665; -- NPCs with custom properties
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=666; -- player with inventory limits

-- edge cases: constructor edge cases
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=667; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=668; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=669; -- type constant
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=670; -- custom pronoun sets
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=671; -- preserve existing data (tests reference sharing behavior)

-- complex scenarios: multi-entity setups, still mostly property verification
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=672; -- multiple actors
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=673; -- actor transformation (mutates state)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=674; -- ADR-089 identity fields

-- ============================================================================
-- attached.test.ts (IDs 675-694)
-- ============================================================================

-- initialization: property storage
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=675; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=676; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=677; -- all attachment types

-- attachment mechanics: property checks
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=678; -- track what attached to
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=679; -- detachable attachments
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=680; -- permanent attachments
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=681; -- loose state

-- entity integration: trait composition
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=682; -- work with pullable trait
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=683; -- various attached objects

-- detachment effects: property storage
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=684; -- object breaking on detach
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=685; -- attachment point breaking
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=686; -- clean detachment

-- sound effects: property storage
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=687; -- detach sound
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=688; -- sounds for attachment types

-- edge cases
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=689; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=690; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=691; -- type constant
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=692; -- very strong attachment
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=693; -- attachment without target
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=694; -- partial detach effects

-- ============================================================================
-- breakable.test.ts (IDs 695-707)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=695; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=696; -- broken state false
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=697; -- broken state true
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=698; -- track broken state (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=699; -- already broken items
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=700; -- mutable (mutates back and forth)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=701; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=702; -- multiple breakable objects
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=703; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=704; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=705; -- type constant
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=706; -- track state changes gameplay
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=707; -- distinguish broken vs unbroken

-- ============================================================================
-- button.test.ts (IDs 708-726)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=708; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=709; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=710; -- all button sizes
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=711; -- all button shapes
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=712; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=713; -- work with PushableTrait
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=714; -- momentary button (mutates pressed)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=715; -- latching button (mutates pressed)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=716; -- button appearance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=717; -- labeled buttons
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=718; -- button materials
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=719; -- track pressed state
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=720; -- initialize with pressed
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=721; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=722; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=723; -- type constant
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=724; -- complex configurations
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=725; -- emergency stop button
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=726; -- elevator call button

-- ============================================================================
-- character-model.test.ts (IDs 727-780)
-- These are genuinely functional: parsing functions, method behavior, predicates
-- ============================================================================

-- vocabulary parsing: pure function tests
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=727; -- parse bare trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=728; -- parse intensity-qualified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=729; -- parse all intensity levels
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=730; -- dispositionToValue/valueToDisposition midpoint
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=731; -- numeric values back to words
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=732; -- boundary values
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=733; -- nearestMood exact
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=734; -- nearestMood intermediate
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=735; -- valueToThreat boundaries

-- construction
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=736; -- correct trait type
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=737; -- sensible defaults
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=738; -- full init data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=739; -- raw mood axes
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=740; -- raw threat to word (tests getThreat computation)

-- personality: method behavior
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=741; -- setPersonality from expressions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=742; -- return 0 for unset

-- disposition: method behavior with mutation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=743; -- set by word
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=744; -- adjust by delta
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=745; -- clamp -100..100
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=746; -- default neutral for unknown

-- mood: method behavior with mutation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=747; -- set by word
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=748; -- adjust axes by delta
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=749; -- clamp mood axes

-- threat: method behavior with mutation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=750; -- set by word
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=751; -- adjust by delta
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=752; -- clamp 0..100

-- knowledge: method behavior
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=753; -- add and retrieve facts
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=754; -- false for unknown
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=755; -- overwrite existing

-- beliefs: method behavior
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=756; -- add and retrieve
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=757; -- default resistance

-- goals: method behavior with sorting
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=758; -- sorted by priority
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=759; -- update existing priority
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=760; -- remove goals
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=761; -- update goal priority
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=762; -- undefined for empty

-- lucidity: method behavior with state machine
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=763; -- enter lucidity state
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=764; -- decay and return to baseline
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=765; -- no decay when no window

-- predicates: complex behavior evaluation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=766; -- disposition predicates
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=767; -- threat predicates
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=768; -- personality predicates
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=769; -- mood predicates
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=770; -- cognitive state predicates
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=771; -- lucidity predicates
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=772; -- negation with "not"
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=773; -- custom predicates
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=774; -- throw on unknown
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=775; -- report predicate existence

-- cognitive profile: construction/defaults
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=776; -- default stable profile
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=777; -- merge partial with defaults
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=778; -- schizophrenic profile
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=779; -- PTSD profile

-- state mutation verification: end-to-end scenario
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=780; -- multi-state scenario

-- ============================================================================
-- clothing.test.ts (IDs 781-803)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=781; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=782; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=783; -- all wearable properties
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=784; -- various materials
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=785; -- composite materials
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=786; -- condition states
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=787; -- condition degradation (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=788; -- non-damageable items
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=789; -- various styles
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=790; -- custom style descriptions
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=791; -- clothing can contain pockets
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=792; -- attach pockets to clothing
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=793; -- pocket contents when worn
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=794; -- standard clothing slots
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=795; -- layered clothing
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=796; -- blocks other slots
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=797; -- non-removable clothing
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=798; -- custom wear/remove messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=799; -- various clothing items
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=800; -- distinguish clothing vs wearable
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=801; -- multi-pocket utility
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=802; -- outfit sets
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=803; -- damaged clothing states

-- ============================================================================
-- container-capability.test.ts (IDs 804-816)
-- Tests utility functions: canContain, getContainerTrait, isContainerCapable
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=804; -- RoomTrait container properties
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=805; -- isContainerCapable room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=806; -- canContain room
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=807; -- ActorTrait container properties
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=808; -- isContainerCapable actor
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=809; -- canContain actor
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=810; -- setInventoryLimit updates capacity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=811; -- getContainerTrait from room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=812; -- getContainerTrait from actor
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=813; -- explicit container first
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=814; -- undefined for non-container
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test claims to verify moving items into rooms but only checks canContain/getContainerTrait, never actually moves anything. Rename or add actual move test.' WHERE id=815; -- integration: rooms
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=816; -- integration: actors carry items

-- ============================================================================
-- container.test.ts (IDs 817-839)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=817; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=818; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=819; -- weight limit
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=820; -- volume limit
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=821; -- item count limit
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=822; -- multiple constraints
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=823; -- unlimited capacity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=824; -- default opaque
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=825; -- transparent containers
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=826; -- default not enterable
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=827; -- enterable containers
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=828; -- allowed types
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=829; -- excluded types
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=830; -- both allowed and excluded
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=831; -- no type restrictions
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=832; -- attach to entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=833; -- warn and keep original (tests dedup behavior)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=834; -- transparent container setup
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=835; -- secure container setup
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=836; -- nested container setup
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=837; -- empty capacity object
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=838; -- empty arrays type restrictions
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=839; -- zero capacity values

-- ============================================================================
-- door.test.ts (IDs 840-857)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=840; -- required room connections
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=841; -- throw error without rooms
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=842; -- unidirectional doors
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=843; -- bidirectional default
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=844; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=845; -- work with test fixture
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=846; -- door with openable trait
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=847; -- lockable door
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=848; -- connect two rooms
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=849; -- room order consistent
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=850; -- complete room-door-room
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=851; -- locked door between rooms
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=852; -- self-connecting door
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=853; -- preserve properties
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=854; -- type constant
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=855; -- standard room door
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=856; -- locked exterior door
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=857; -- archway always open

-- ============================================================================
-- edible.test.ts (IDs 858-892)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=858; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=859; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=860; -- partial init
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=861; -- zero nutrition
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=862; -- solid food
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=863; -- liquids
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=864; -- various food types
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=865; -- single serving
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=866; -- multi-serving
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=867; -- fractional servings
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=868; -- track serving consumption (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=869; -- remains type
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=870; -- no remains
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=871; -- various remain types
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=872; -- no effects
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=873; -- with effects
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=874; -- various effect types
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=875; -- effect without description
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=876; -- custom consume messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=877; -- no consume message
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=878; -- food vs liquid messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=879; -- weight and bulk
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=880; -- zero weight
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=881; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=882; -- various edible entities
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=883; -- containers for liquids
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=884; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=885; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=886; -- type constant
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=887; -- negative values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=888; -- very large values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=889; -- magical food
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=890; -- rations
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=891; -- transformation items
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=892; -- poisoned food

-- ============================================================================
-- exit.test.ts (IDs 893-923)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=893; -- required values
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=894; -- throw error missing fields
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=895; -- all optional values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=896; -- north
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=897; -- south
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=898; -- east
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=899; -- west
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=900; -- up
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=901; -- down
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=902; -- in
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=903; -- out
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=904; -- diagonal
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=905; -- magic words
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=906; -- action-based exits
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=907; -- object-interaction exits
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=908; -- bidirectional simple
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=909; -- bidirectional portal
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=910; -- hidden exits
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=911; -- visible but unlisted
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=912; -- discovered exits
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=913; -- simple condition
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=914; -- complex condition
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=915; -- time-based condition
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=916; -- custom use messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=917; -- custom blocked messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=918; -- no custom messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=919; -- attach to entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=920; -- warn and keep original exit trait
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=921; -- one-way exit
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=922; -- teleporter
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=923; -- vehicle-based exit

-- ============================================================================
-- identity.test.ts (IDs 924-946)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=924; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=925; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=926; -- "a" article
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=927; -- "an" article
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=928; -- "the" article
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=929; -- "some" article
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=930; -- empty article proper names
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=931; -- empty aliases
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=932; -- multiple aliases
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=933; -- full description
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=934; -- brief description
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=935; -- empty descriptions
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=936; -- default not concealed
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=937; -- concealed objects
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=938; -- weight
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=939; -- volume
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=940; -- size categories
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=941; -- undefined physical props
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=942; -- attach to entity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=943; -- warn and keep original
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=944; -- proper names
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=945; -- mass nouns
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=946; -- unique items

-- ============================================================================
-- light-source.test.ts (IDs 947-978)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=947; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=948; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=949; -- partial init
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=950; -- fuel-based init
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=951; -- various brightness
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=952; -- edge brightness
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=953; -- out-of-range brightness
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=954; -- track lit status (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=955; -- brightness when lit changes
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=956; -- infinite fuel
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=957; -- fuel-based sources
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=958; -- fuel consumption (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=959; -- various consumption rates
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=960; -- partial fuel properties
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=961; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=962; -- various light source entities
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=963; -- switchable light sources
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=964; -- wearable light sources
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=965; -- flame-based
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=966; -- electric
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=967; -- magical
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=968; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=969; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=970; -- type constant
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=971; -- zero values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=972; -- negative values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=973; -- fractional values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=974; -- refillable (mutates fuel)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=975; -- multi-mode (mutates brightness)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=976; -- degrading (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=977; -- emergency
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=978; -- combined

-- ============================================================================
-- lockable.test.ts (IDs 979-998)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=979; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=980; -- provided data
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=981; -- startsLocked sets initial isLocked
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=982; -- explicit isLocked overrides startsLocked
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=983; -- single key
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=984; -- multiple keys
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=985; -- both single and multiple keys
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=986; -- master key acceptance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=987; -- changing lock state (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=988; -- auto-lock flag
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=989; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=990; -- lockable container
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=991; -- matching key entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=992; -- all lock-related messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=993; -- partial message customization
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=994; -- lock/unlock sounds
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=995; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=996; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=997; -- without key requirement
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=998; -- type constant

-- ============================================================================
-- moveable-scenery.test.ts (IDs 999-1022)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=999;  -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1000; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1001; -- all weight classes
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1002; -- blocked exits
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1003; -- single blocked exit
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1004; -- no blocked exits
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1005; -- revealed on move
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1006; -- no reveal
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1007; -- track if moved (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1008; -- original room
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1009; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1010; -- with PushableTrait
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1011; -- PushableTrait and PullableTrait
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1012; -- single person
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1013; -- multi-person
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1014; -- default people required
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1015; -- movement sounds
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1016; -- no sound
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1017; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1018; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1019; -- type constant
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1020; -- blocking boulder
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1021; -- moveable bookshelf
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1022; -- light moveable crate

-- ============================================================================
-- openable.test.ts (IDs 1023-1039)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1023; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1024; -- provided data
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1025; -- startsOpen sets initial isOpen
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1026; -- explicit isOpen overrides startsOpen
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1027; -- changing open state (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1028; -- maintain properties on state change
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1029; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1030; -- container entities
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1031; -- multiple state traits
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1032; -- one-way openable (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1033; -- revealsContents
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1034; -- sound effects
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1035; -- all custom messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1036; -- partial messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1037; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1038; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1039; -- type constant

-- ============================================================================
-- pullable.test.ts (IDs 1040-1058)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1040; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1041; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1042; -- all pull types
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1043; -- track pull count (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1044; -- state transitions (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1045; -- respect max pulls (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1046; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1047; -- multiple pullable objects
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1048; -- lever config
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1049; -- cord config
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1050; -- attached config
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1051; -- heavy config
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1052; -- custom effect events
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1053; -- partial effects
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1054; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1055; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1056; -- type constant
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1057; -- strength requirements
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1058; -- non-repeatable pulls

-- ============================================================================
-- pushable.test.ts (IDs 1059-1079)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1059; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1060; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1061; -- all push types
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1062; -- track push count (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1063; -- state transitions (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1064; -- respect max pushes (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1065; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1066; -- multiple pushable objects
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1067; -- button config
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1068; -- heavy config
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1069; -- moveable config
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1070; -- all push directions
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1071; -- default no direction
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1072; -- custom effect events
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1073; -- partial effects
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1074; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1075; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1076; -- type constant
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1077; -- strength requirements
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1078; -- non-repeatable pushes
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1079; -- passage revealing

-- ============================================================================
-- readable.test.ts (IDs 1080-1112)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1080; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1081; -- provided data
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1082; -- auto-init pages from pageContent
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1083; -- not override currentPage
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1084; -- simple text
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1085; -- multi-line text
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1086; -- preview text
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1087; -- empty text
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1088; -- different languages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1089; -- ability requirements
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1090; -- item requirements
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1091; -- no requirements
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1092; -- various readable types
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1093; -- custom readable types
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1094; -- books with pages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1095; -- page navigation (mutates currentPage)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1096; -- single page
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1097; -- empty pageContent
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1098; -- track read status (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1099; -- readability state (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1100; -- maintain state through changes
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1101; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1102; -- various readable entities
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1103; -- openable books
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1104; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1105; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1106; -- type constant
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1107; -- page bounds
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1108; -- data integrity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1109; -- special text content
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1110; -- magical tome
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1111; -- inscribed objects
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1112; -- dynamic readability (mutates)

-- ============================================================================
-- room.test.ts (IDs 1113-1136)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1113; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1114; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1115; -- simple exits
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1116; -- exits with doors
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1117; -- blocked exits
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1118; -- custom exits
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1119; -- dark rooms
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1120; -- lit rooms
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1121; -- outdoor lighting
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1122; -- underground rooms
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1123; -- start unvisited
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1124; -- track visited (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1125; -- initial description
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1126; -- ambient sounds
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1127; -- ambient smells
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1128; -- both sound and smell
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1129; -- region assignment
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1130; -- multiple tags
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1131; -- no regions or tags
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1132; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1133; -- with container trait
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1134; -- maze-like connections
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1135; -- multi-level connections
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1136; -- outdoor/indoor transitions

-- ============================================================================
-- scenery.test.ts (IDs 1137-1165)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1137; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1138; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1139; -- partial init
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1140; -- only mentioned property
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1141; -- custom messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1142; -- undefined message
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1143; -- humorous messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1144; -- mentioned scenery
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1145; -- unmentioned scenery
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1146; -- toggle mentioned (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1147; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1148; -- various scenery entities
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1149; -- room decorations
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1150; -- interactive scenery
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1151; -- architectural features
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1152; -- natural features
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1153; -- furniture
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1154; -- always-mentioned
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1155; -- hidden scenery
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1156; -- discoverable (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1157; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1158; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1159; -- type constant
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1160; -- null values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1161; -- preserve object reference
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1162; -- state changes (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1163; -- scenery containers
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1164; -- multiple states
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1165; -- room-defining scenery

-- ============================================================================
-- supporter.test.ts (IDs 1166-1198)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1166; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1167; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1168; -- partial capacity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1169; -- only enterable
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1170; -- weight-based capacity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1171; -- item count capacity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1172; -- both weight and item
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1173; -- unlimited capacity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1174; -- zero capacity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1175; -- allowed types
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1176; -- excluded types
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1177; -- both allowed and excluded
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1178; -- empty type arrays
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1179; -- non-enterable
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1180; -- enterable
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1181; -- default non-enterable
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1182; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1183; -- various supporter entities
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1184; -- scenery supporters
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1185; -- enterable supporters
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1186; -- furniture supporters
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1187; -- specialized supporters
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1188; -- natural supporters
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1189; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1190; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1191; -- type constant
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1192; -- negative capacity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1193; -- fractional capacity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1194; -- preserve array references
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1195; -- multi-purpose
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1196; -- tiered
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1197; -- magical
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1198; -- dynamic states (mutates)

-- ============================================================================
-- switchable.test.ts (IDs 1199-1216)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1199; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1200; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1201; -- power requirements
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1202; -- autoOffCounter when starting on
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1203; -- no autoOffCounter when starting off
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1204; -- changing on/off (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1205; -- track power availability
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1206; -- auto-off counter (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1207; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1208; -- test fixture
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1209; -- device with power reqs
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1210; -- switch-related messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1211; -- partial messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1212; -- all sound types
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1213; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1214; -- undefined options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1215; -- no auto-off
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1216; -- type constant

-- ============================================================================
-- vehicle-composition.test.ts (IDs 1217-1231)
-- These are stronger tests -- behavioral scenarios with actual WorldModel moves
-- ============================================================================

-- Trait Composition Basics: property/structure verification
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1217; -- VehicleTrait + ContainerTrait
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1218; -- VehicleTrait + SupporterTrait
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1219; -- enterable on ContainerTrait
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1220; -- enterable on SupporterTrait

-- Boat scenario: behavioral, uses WorldModel.moveEntity
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1221; -- enter boat
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1222; -- move player with boat
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1223; -- exit boat

-- Elevator scenario: behavioral
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1224; -- enter elevator
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1225; -- transport between floors

-- Cable tram scenario: behavioral
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1226; -- board tram
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1227; -- transport on tram

-- Vehicle behavior utilities: functional (test utility functions)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1228; -- isVehicle
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1229; -- isActorInVehicle
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1230; -- canActorWalkInVehicle

-- ============================================================================
-- wearable.test.ts (IDs 1231-1260)
-- ============================================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1231; -- default values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1232; -- provided data
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1233; -- partial init
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1234; -- empty blocksSlots
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1235; -- various body slots
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1236; -- custom slot names
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1237; -- block multiple slots
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1238; -- different layers
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1239; -- wearableOver property
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1240; -- track worn status (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1241; -- different wearers (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1242; -- clear wornBy (mutates)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1243; -- custom wear/remove messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1244; -- undefined messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1245; -- only wear message
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1246; -- weight and bulk
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1247; -- zero weight
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1248; -- fractional values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1249; -- attach to entity
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1250; -- various wearable items
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1251; -- actor wearing items
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1252; -- layered armor
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1253; -- jewelry multiple per slot
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1254; -- outfit sets
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1255; -- empty options
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1256; -- undefined as parameter
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1257; -- type constant
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1258; -- boolean false values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1259; -- zero and negative values
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1260; -- preserve array reference
