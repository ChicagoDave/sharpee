-- Batch 4: stdlib action tests (looking through wearing, plus meta-registry, quitting, registry-golden, report-helpers)
-- 493 tests across 24 files

-- ============================================================
-- looking-golden.test.ts (18 tests)
-- ============================================================

-- Action Metadata (structural - check static properties)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1882; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1883; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1884; -- should belong to observation group

-- Basic Looking
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1885; -- should describe current room - checks looked event with actor/location/isDark and room.description event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1886; -- should list visible items - checks categorized items in list.contents event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1887; -- should handle empty rooms - verifies no list event for empty room

-- Darkness Handling
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1888; -- should handle dark room without light - checks isDark true, no room description
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1889; -- should see in dark room with light source - player carries torch
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1890; -- should see with room light source

-- Special Locations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1891; -- should describe being in a container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1892; -- should describe being on a supporter

-- Brief/Verbose Modes
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test notes brief/verbose not implemented yet; both tests check verbose=true. Should be updated when brief mode is implemented.' WHERE id=1893; -- brief mode
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1894; -- full description for first visit

-- Command Variations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1895; -- should handle short form "l" command
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1896; -- should handle "examine" without object

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1897; -- should include proper entities and timestamps

-- Four-Phase Pattern Compliance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1898; -- should use report() to create all events - uses spies to verify phase ordering
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1899; -- should use blocked() to handle validation errors

-- ============================================================
-- meta-registry.test.ts (13 tests)
-- ============================================================

-- Pre-registered commands
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1900; -- should have standard system commands registered
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1901; -- should have information commands registered
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1902; -- should have transcript commands registered
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1903; -- should not have regular game commands registered

-- Registration
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1904; -- should allow registering new meta-commands - verifies state change
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1905; -- should handle empty action ID gracefully
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1906; -- should allow unregistering commands - verifies removal
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1907; -- should return false when unregistering non-existent command

-- Query methods
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1908; -- should return all registered commands sorted
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1909; -- should count registered commands - checks count before/after add
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1910; -- should detect custom commands - checks hasCustomCommands before/after

-- Reset and clear
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1911; -- should reset to defaults - verifies custom removed, defaults restored
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=1, has_assertion=1, needs_mitigation=1, mitigation='Test asserts count equals initialCount after clear, but clear() restores defaults. The name says "clear and restore defaults" but the assertion is essentially testing that clear behaves like reset, not clear.' WHERE id=1912; -- should clear and restore defaults

-- ============================================================
-- opening-golden.test.ts (18 tests, 2 skipped)
-- ============================================================

-- Three-Phase Pattern Compliance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1913; -- should have required methods for three-phase pattern
UPDATE tests SET test_type='structural', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test only checks events is defined and is an array. Does not verify any specific event content.' WHERE id=1914; -- should use report() for ALL event generation

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1915; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1916; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1917; -- should belong to container_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1918; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1919; -- should fail when target is not openable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1920; -- should fail when already open
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1921; -- should fail when locked

-- Successful Opening - Atomic Events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1922; -- should emit atomic opened event with minimal data - also checks old fields absent
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1923; -- should emit separate revealed events for container contents (skip - hangs)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1924; -- should report empty container with special message
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1925; -- should open a door

-- Event Structure Validation (skipped)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1926; -- should include proper atomic events (skip - hangs)

-- Edge Cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1927; -- should handle unlocked but not yet open container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1928; -- should handle non-container openable objects
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1929; -- should emit multiple revealed events for multiple items (skip - hangs)

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1930; -- should actually set isOpen to true after opening
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1931; -- should actually set isOpen to true for container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1932; -- should NOT change isOpen when already open
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1933; -- should NOT change isOpen when locked
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1934; -- should NOT change state when target is not openable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1935; -- should actually open unlocked but closed container

-- ============================================================
-- pulling-golden.test.ts (10 tests)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1936; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1937; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1938; -- should belong to interaction group

-- Basic Validation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1939; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1940; -- should fail when target is not pullable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1941; -- should fail when pulling worn items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1942; -- should fail when already pulled

-- Basic Execution
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1943; -- should execute pull successfully - verifies state=pulled, pullCount=1
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1944; -- should track pull count - verifies pullCount incremented to 6

-- Event Handler Integration
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1945; -- story authors can handle complex pull mechanics via events - documents pattern, checks pullType

-- ============================================================
-- pushing-golden.test.ts (13 tests)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1946; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1947; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1948; -- should belong to device_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1949; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1950; -- should fail when pushing worn items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1951; -- should fail when object is not pushable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1952; -- should fail when scenery is not pushable

-- Button and Switch Pushing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1953; -- should activate button with click sound
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1954; -- should toggle switch state
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1955; -- should use button_pushed for non-switchable buttons

-- Heavy Object Pushing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1956; -- should push heavy objects with effort
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1957; -- should show wont_budge for heavy objects without direction
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1958; -- should push moveable objects in direction
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1959; -- should nudge moveable objects without direction
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1960; -- should reveal hidden passage when pushing special objects

-- Regular Object Pushing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1961; -- should nudge regular pushable objects
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1962; -- should push object in direction

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1963; -- should include proper entities in all events

-- ============================================================
-- putting-golden.test.ts (24 tests)
-- ============================================================

-- Three-Phase Pattern Compliance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1964; -- should have required methods for three-phase pattern
UPDATE tests SET test_type='structural', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test only checks events is defined and is an array. Does not verify any specific event content.' WHERE id=1965; -- should use report() for ALL event generation

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1966; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1967; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1968; -- should belong to object_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1969; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1970; -- should fail when no destination specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1971; -- should fail when trying to put something in itself
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1972; -- should fail when trying to put something on itself
UPDATE tests SET test_type='functional', quality='poor', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Test has no final assertion on the events. It moves the key, runs the action, but does not verify any specific outcome. Add expectEvent assertion.' WHERE id=1973; -- should fail when item already in destination

-- Container Placement
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1974; -- should put in open container with explicit preposition
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1975; -- should auto-detect container without preposition
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1976; -- should fail when container is closed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1977; -- should fail with wrong preposition for container

-- Supporter Placement
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1978; -- should put on supporter with explicit preposition
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1979; -- should auto-detect supporter without preposition
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1980; -- should fail with wrong preposition for supporter

-- Capacity Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1981; -- should respect container item limit
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1982; -- should respect container weight limit
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1983; -- should respect supporter item limit

-- Container/Supporter Dual Nature
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1984; -- should prefer container for dual-nature objects without preposition
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1985; -- should respect explicit preposition for dual-nature objects

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1986; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1987; -- should actually move item into container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1988; -- should actually move item onto supporter
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1989; -- should NOT move item when container is closed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1990; -- should NOT move item when container is full

-- Edge Cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1991; -- should handle volume capacity
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1992; -- should handle items without weight/volume properties
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1993; -- should handle target that is neither container nor supporter
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1994; -- should handle alternative prepositions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1995; -- should handle container without capacity limits
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1996; -- should handle complex capacity calculation with multiple items

-- ============================================================
-- quitting.test.ts (16 tests)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1997; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1998; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1999; -- should belong to meta group

-- Basic Quit Behavior
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2000; -- should emit platform quit requested event - checks full context payload
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2001; -- should emit if.event.quit_requested notification

-- Unsaved Progress Detection
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2002; -- should detect unsaved progress
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2003; -- should not show hint when no unsaved progress

-- Force Quit
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2004; -- should handle force quit with extras.force
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2005; -- should handle force quit with extras.now
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2006; -- should handle force quit with exit action

-- Near Completion Detection
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2007; -- should detect near completion at 85%
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2008; -- should not detect near completion at 75%
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2009; -- should handle zero max score

-- Missing Shared Data
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2010; -- should handle missing getSharedData method - verifies defaults
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2011; -- should handle empty shared data

-- Complete Quit Context
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2012; -- should include all context fields - end-to-end quit context verification

-- ============================================================
-- reading-golden.test.ts (11 tests)
-- ============================================================

-- Basic Reading
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2013; -- should read a simple note - checks messageId, params, hasBeenRead=true
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2014; -- should read a book - checks read_book messageId
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2015; -- should read a sign - checks read_sign messageId
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2016; -- should read an inscription - checks read_inscription messageId

-- Multi-page Books
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2017; -- should read current page of multi-page book - checks page/total

-- Validation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2018; -- should fail without direct object
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2019; -- should fail for non-readable items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2020; -- should fail when text is not currently readable - checks cannotReadMessage
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test says "we assume the player has the ability" and checks valid=true. Language requirement is not actually tested. Add test for when ability is missing once implemented.' WHERE id=2021; -- should handle items with language requirements

-- Integration with ReadableTrait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2022; -- should track whether item has been read - checks hasBeenRead before/after
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2023; -- should handle empty text gracefully

-- ============================================================
-- registry-golden.test.ts (16 tests)
-- ============================================================

-- Basic Registration
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2024; -- should register a real action
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2025; -- should register multiple real actions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2026; -- should override existing action

-- Action Retrieval
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2027; -- should return undefined for non-existent action
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2028; -- should return all registered actions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2029; -- should maintain action properties

-- Group Management
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2030; -- should organize standard actions by group
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2031; -- should handle actions without groups

-- Language Provider Integration
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2032; -- should store patterns from language provider
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2033; -- should handle pattern updates when language provider changes
UPDATE tests SET test_type='structural', quality='poor', has_mutation_check=0, has_assertion=0, needs_mitigation=1, mitigation='Test body is empty - no assertions at all. Either implement or remove.' WHERE id=2034; -- should sort actions by priority in pattern results

-- Pattern Storage
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2035; -- should store full pattern strings from language provider
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2036; -- should handle case-insensitive pattern lookup
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2037; -- should return empty array for unknown patterns

-- Direct Action Lookup
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2038; -- should look up actions by ID in normal flow
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2039; -- should maintain real action integrity

-- Edge Cases
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2040; -- should handle registration before language provider is set - tests lifecycle
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2041; -- should handle empty pattern arrays from language provider
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2042; -- should handle null or undefined language provider

-- Backward Compatibility
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2043; -- should support direct aliases on actions

-- ============================================================
-- removing-golden.test.ts (21 tests)
-- ============================================================

-- Three-Phase Pattern Compliance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2044; -- should have required methods for three-phase pattern
UPDATE tests SET test_type='structural', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test only checks events is defined and is an array. Does not verify any specific event content.' WHERE id=2045; -- should use report() for ALL event generation

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2046; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2047; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2048; -- should belong to object_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2049; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2050; -- should fail when no source specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2051; -- should fail when item not in specified container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2052; -- should fail when item not on specified supporter
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2053; -- should fail when player already has item
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2054; -- should fail when container is closed

-- Successful Removal
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2055; -- should remove from open container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2056; -- should remove from container without openable trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2057; -- should remove from supporter

-- Source Type Handling
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2058; -- should handle source that is neither container nor supporter
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2059; -- should handle container that is also a supporter

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2060; -- should include proper entities in all events

-- Edge Cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2061; -- should handle removing last item from container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2062; -- should handle nested containers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2063; -- should provide specific error for wrong container

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2064; -- should actually move item from container to player inventory
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2065; -- should actually move item from open container to player inventory
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2066; -- should actually move item from supporter to player inventory
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2067; -- should NOT move item when container is closed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2068; -- should NOT move item when item is not in the specified container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2069; -- should move item from nested container to player inventory

-- ============================================================
-- report-helpers.test.ts (20 tests)
-- ============================================================

-- handleValidationError
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2070; -- should return null when validationResult is undefined
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2071; -- should return null when validation passed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2072; -- should return error event when validation failed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2073; -- should include validation params in error event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2074; -- should use messageId from validationResult if provided
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2075; -- should include target snapshot by default when directObject exists
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2076; -- should exclude target snapshot when includeTargetSnapshot is false
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2077; -- should include indirect target snapshot by default when indirectObject exists
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2078; -- should exclude indirect target snapshot when includeIndirectSnapshot is false

-- handleExecutionError
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2079; -- should return null when executionError is undefined
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2080; -- should return error event when execution error occurred
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2081; -- should include action ID in error event

-- handleReportErrors
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2082; -- should return null when validation passed and no execution error
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2083; -- should return null when both validationResult and executionError are undefined
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2084; -- should return validation error when validation failed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2085; -- should return validation error even when both validation failed and execution error occurred
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2086; -- should return execution error when validation passed but execution failed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2087; -- should pass options through to handleValidationError

-- Integration with three-phase pattern
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2088; -- should integrate correctly with actual action blocked phase
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2089; -- should generate success events when no errors - full four-phase execution

-- ============================================================
-- searching-golden.test.ts (15 tests)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2090; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2091; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2092; -- should belong to sensory group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2093; -- should fail when container is closed

-- Searching Containers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2094; -- should search empty container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2095; -- should list visible contents of container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2096; -- should find concealed items in container

-- Searching Supporters
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2097; -- should list items on supporter
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2098; -- should find concealed items on supporter
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2099; -- should handle empty supporter

-- Searching Regular Objects
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2100; -- should find nothing special in ordinary objects
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2101; -- should find concealed items in/on regular objects

-- Searching Current Location
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2102; -- should search current room when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2103; -- should find nothing when searching empty location

-- Complex Search Scenarios
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2104; -- should handle open container requirement
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2105; -- should find multiple concealed items

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2106; -- should include proper entities in all events
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2107; -- should include location as target when searching room

-- ============================================================
-- showing-golden.test.ts (21 tests, 15 skipped)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2108; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2109; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2110; -- should belong to social group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2111; -- should fail when no item specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2112; -- should fail when no viewer specified
-- Skipped tests (2113-2118) - depend on scope logic
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2113; -- should fail when not carrying item (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2114; -- should succeed when showing worn item (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2115; -- should fail when viewer not visible (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2116; -- should fail when viewer too far away (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2117; -- should fail when viewer is not an actor (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2118; -- should fail when showing to self (skip)

-- Viewer Reactions (all skipped)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2119; -- should recognize specific items (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2120; -- should be impressed by certain items (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2121; -- should be unimpressed by certain items (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2122; -- should examine certain items closely (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2123; -- should nod at unspecified items (skip)

-- Successful Showing (skipped)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2124; -- should show item normally (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2125; -- should show to NPC with no reactions defined (skip)

-- Event Structure Validation (skipped)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2126; -- should include proper entities in all events (skip)

-- Edge Cases (all skipped)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2127; -- should handle showing worn item to viewer with reactions (skip)
UPDATE tests SET test_type='behavioral', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2128; -- should handle showing to multiple viewers sequentially (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2129; -- should handle viewer location check properly (skip)

-- Testing Pattern Examples (all skipped)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2130; -- pattern: proper name items (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2131; -- pattern: multiple reaction types priority (skip)

-- ============================================================
-- smelling-golden.test.ts (16 tests)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2132; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2133; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2134; -- should belong to sensory group

-- Smelling Specific Objects
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2135; -- should detect food scent
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2136; -- should detect drink scent
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2137; -- should detect burning scent from lit objects
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2138; -- should detect no scent from unlit light source
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2139; -- should detect food scent from open container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2140; -- should detect no scent from closed container with food
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2141; -- should detect no scent from ordinary objects

-- Smelling the Environment
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2142; -- should detect no scents in empty room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2143; -- should detect food in the room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2144; -- should detect smoke in the room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2145; -- should prioritize smoke over food scents
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2146; -- should detect general room scents

-- Distance and Accessibility
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2147; -- should allow smelling items in inventory
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2148; -- should allow smelling items in same room

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2149; -- should include proper entities in all events

-- ============================================================
-- switching_off-golden.test.ts (23 tests)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2150; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2151; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2152; -- should belong to device_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2153; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2154; -- should fail when target is not switchable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2155; -- should fail when already off

-- Basic Device Switching
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2156; -- should switch off simple device
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2157; -- should handle device with custom off sound
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2158; -- should handle device with running sound
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2159; -- should handle temporary device

-- Light Source Handling
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2160; -- should darken room when turning off only light
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2161; -- should not darken room with other lights
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2162; -- should consider carried lights

-- Power Management
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2163; -- should free power consumption

-- Side Effects
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2164; -- should close automatic door when turned off
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2165; -- should not affect door without autoCloseOnOff
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2166; -- should not close already closed door

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2167; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2168; -- should actually set isOn to false after switching off
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2169; -- should actually set isOn to false and clear autoOffCounter
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2170; -- should NOT change isOn when already off
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2171; -- should NOT change state when target is not switchable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2172; -- should actually turn off a light source and coordinate with LightSourceBehavior
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2173; -- should turn off device with power requirements

-- ============================================================
-- switching_on-golden.test.ts (23 tests)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2174; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2175; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2176; -- should belong to device_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2177; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2178; -- should fail when target is not switchable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2179; -- should fail when already on
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2180; -- should fail when no power available

-- Basic Device Switching
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2181; -- should switch on simple device
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2182; -- should handle device with custom sound
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2183; -- should handle temporary activation

-- Light Source Handling
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2184; -- should handle basic light source
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2185; -- should illuminate dark room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2186; -- should not illuminate if other lights exist

-- Power Requirements
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2187; -- should work with available power

-- Side Effects
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2188; -- should open automatic door when turned on
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2189; -- should not affect already open door

-- Device Properties
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2190; -- should include continuous sound

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2191; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2192; -- should actually set isOn to true after switching on
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2193; -- should actually set isOn to true for device with power available
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2194; -- should NOT change isOn when already on
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2195; -- should NOT change isOn when no power available
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2196; -- should NOT change state when target is not switchable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2197; -- should actually turn on a light source and coordinate with LightSourceBehavior

-- ============================================================
-- taking-golden.test.ts (20 tests, 1 skipped)
-- ============================================================

-- Three-Phase Pattern Compliance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2198; -- should have required methods for three-phase pattern
UPDATE tests SET test_type='structural', quality='poor', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test only checks events is defined and is an array. Does not verify any specific event content.' WHERE id=2199; -- should use report() for ALL event generation

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2200; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2201; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2202; -- should belong to object_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2203; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2204; -- should fail when trying to take yourself
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2205; -- should fail when already holding the item
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2206; -- should fail when trying to take a room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2207; -- should fail when object is scenery

-- Container Capacity Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2208; -- should fail when container is full
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2209; -- should not count worn items toward capacity
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2210; -- should fail when too heavy (skip - weight handling incomplete)

-- Successful Taking
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2211; -- should take object from room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2212; -- should take object from container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2213; -- should take object from supporter
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2214; -- should implicitly remove worn item before taking - multi-step flow

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2215; -- should include proper entities in all events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2216; -- should not include container info when taking from room

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2217; -- should actually move item from room to player inventory
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2218; -- should actually move item from container to player inventory
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2219; -- should actually move item from supporter to player inventory
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2220; -- should NOT move item when validation fails

-- Edge Cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2221; -- should handle taking from nested containers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2222; -- should handle empty player without container trait

-- ============================================================
-- taking_off-golden.test.ts (20 tests)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2223; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2224; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2225; -- should belong to wearable_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2226; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2227; -- should fail when item not on actor
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2228; -- should fail when item is not wearable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2229; -- should fail when item not actually worn
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2230; -- should fail when blocked by outer layer
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2231; -- should fail when item is cursed

-- Successful Removal
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2232; -- should remove worn item
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2233; -- should remove item without body part
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2234; -- should remove outermost layer
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2235; -- should handle items on different body parts
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2236; -- should include layer information in events

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2237; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2238; -- should actually set worn to false after taking off
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2239; -- should actually set worn to false with body part preserved
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2240; -- should NOT change worn when not wearing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2241; -- should NOT change state when target is not wearable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2242; -- should take off outermost layer without affecting inner layers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2243; -- should take off item without bodyPart specified

-- ============================================================
-- talking-golden.test.ts (16 tests)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2244; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2245; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2246; -- should belong to social group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2247; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2248; -- should fail when target is not an actor
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2249; -- should fail when trying to talk to self
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2250; -- should fail when NPC is not available to talk

-- Basic Conversation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2251; -- should talk to NPC without conversation system

-- First Meeting
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2252; -- should handle first meeting with NPC
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2253; -- should handle formal personality on first meeting
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2254; -- should handle casual personality on first meeting

-- Subsequent Meetings
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2255; -- should handle subsequent meeting with friendly NPC
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2256; -- should handle NPC that remembers player
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2257; -- should handle regular subsequent greeting

-- Conversation Topics
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2258; -- should detect NPC with topics to discuss
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2259; -- should detect NPC with no topics

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2260; -- should include proper entities in all events

-- ============================================================
-- throwing-golden.test.ts (22 tests, 2 skipped)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2261; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2262; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2263; -- should belong to interaction group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2264; -- should fail when no item specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2265; -- should prevent throwing at self
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2266; -- should fail when no exit in specified direction
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2267; -- should fail when item is too heavy for distance throw

-- General Throwing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2268; -- should drop non-fragile item gently
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2269; -- should handle fragile items gently thrown - uses mocked random
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2270; -- should break fragile item when dropped carelessly - checks destruction event

-- Targeted Throwing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2271; -- should hit stationary target
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Skipped due to implementation bug: duck/catch logic only runs on hit. Fix the action logic then unskip.' WHERE id=2272; -- should miss moving actor (skip - bug)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Skipped due to implementation bug: catch logic only runs on hit. Fix the action logic then unskip.' WHERE id=2273; -- should allow NPC to catch thrown item (skip - bug)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2274; -- should land on supporter when hit
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2275; -- should land in open container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2276; -- should bounce off closed container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2277; -- should break fragile item on impact
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2278; -- should anger hit NPC

-- Weight Considerations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2279; -- should allow throwing light objects far
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2280; -- should allow dropping heavy items

-- Fragility Detection
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Test duplicates action internals (fragility detection logic) rather than testing through the action API. Should test via the action and check isFragile in event data instead.' WHERE id=2281; -- should detect various fragile materials

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2282; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2283; -- should actually move item to room floor on general throw
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2284; -- should actually move item onto supporter when thrown at it
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2285; -- should actually move item into open container when thrown at it
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2286; -- should move item to floor when bouncing off closed container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2287; -- should NOT move item when validation fails (too heavy)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2288; -- should NOT move item when throwing at self

-- ============================================================
-- touching-golden.test.ts (17 tests)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2289; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2290; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2291; -- should belong to sensory group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2292; -- should fail when no target specified

-- Temperature Detection
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2293; -- should detect hot light source when lit
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2294; -- should detect warm device when switched on
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2295; -- should detect vibrating device

-- Texture Detection
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2296; -- should detect soft wearable items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2297; -- should detect smooth door surfaces
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2298; -- should detect hard container surfaces
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2299; -- should detect wet liquid items

-- Special Cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2300; -- should detect container with liquid inside
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2301; -- should detect immovable scenery
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2302; -- should include size information when available - weak assertion (just checks target id)

-- Verb Variations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2303; -- should handle normal touch
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2304; -- should handle poke verb
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2305; -- should handle prod verb
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2306; -- should handle pat verb
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2307; -- should handle stroke verb
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2308; -- should handle feel verb

-- Complex Combinations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2309; -- should prioritize temperature over texture

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2310; -- should include proper entities in all events

-- ============================================================
-- unlocking-golden.test.ts (22 tests, 7 skipped)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2311; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2312; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2313; -- should belong to lock_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2314; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2315; -- should fail when target is not lockable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2316; -- should fail when already unlocked

-- Key Requirements
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2317; -- should fail when key required but not provided
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2318; -- should fail when key not held by player
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2319; -- should fail with wrong key

-- Successful Unlocking
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2320; -- should unlock object without key requirement
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2321; -- should unlock with correct key (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2322; -- should unlock door and note room connection (skip)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2323; -- should handle multiple valid keys
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2324; -- should include unlock sound if specified (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2325; -- should note container with contents (skip)

-- Auto-Open Behavior
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2326; -- should detect auto-open on unlock (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2327; -- should not auto-open if not configured (skip)

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2328; -- should include proper entities in all events

-- Edge Cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2329; -- should handle lockable without openable trait
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2330; -- should prefer keyId over keyIds when both present (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2331; -- should work with backup key when primary not available (skip)
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2332; -- should handle empty container unlock (skip)

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2333; -- should actually set isLocked to false after unlocking
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2334; -- should actually set isLocked to false when using correct key
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2335; -- should NOT change isLocked when already unlocked
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2336; -- should NOT change isLocked when wrong key provided
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2337; -- should NOT change state when target is not lockable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2338; -- should actually unlock a door with key

-- ============================================================
-- waiting-golden.test.ts (14 tests)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2339; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2340; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2341; -- should belong to meta group
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2342; -- should not require objects - checks metadata fields

-- Three-Phase Pattern
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2343; -- should have validate, execute, and report functions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2344; -- validate should always return valid
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2345; -- execute should return void (not events)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2346; -- execute should store location in sharedData - checks sharedData mutation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2347; -- report should return events array

-- Event Emission
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2348; -- should emit if.event.waited with turnsPassed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2349; -- should emit if.event.waited with location info
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2350; -- should include messageId in waited event for text rendering

-- No State Mutation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2351; -- should not modify world state - spies verify no mutation calls
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2352; -- should not modify entity traits - spies verify no add/remove

-- Signal Action Pattern
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2353; -- should be a minimal signal action - verifies full pattern

-- ============================================================
-- wearing-golden.test.ts (18 tests, 1 skipped)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2354; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2355; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2356; -- should belong to wearable_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2357; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2358; -- should fail when item is not wearable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2359; -- should fail when already wearing item
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2360; -- should fail when item not held and not in room (skip)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2361; -- should fail when body part conflict exists
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2362; -- should fail when layer conflict exists

-- Successful Wearing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2363; -- should wear item from inventory
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2364; -- should implicitly take and wear item from room - multi-step flow
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2365; -- should wear item without body part specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2366; -- should handle layered clothing correctly
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2367; -- should wear multiple items on different body parts

-- Event Structure Validation
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2368; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2369; -- should actually set worn to true after wearing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2370; -- should actually set worn to true with body part preserved
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2371; -- should NOT change worn when already wearing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2372; -- should NOT change state when target is not wearable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2373; -- should wear item with layering system
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2374; -- should wear item without bodyPart specified
