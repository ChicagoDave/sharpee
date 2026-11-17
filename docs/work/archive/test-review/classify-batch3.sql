-- Batch 3: stdlib action tests classification
-- All 39 action test files (about-golden through wearing-golden, plus attacking.test and implicit-take.test)
-- 803 tests total

-- ============================================================
-- about-golden.test.ts (IDs 1523-1533)
-- ============================================================

-- structure tests: verify action shape/properties
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1523; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1524; -- should be in meta group
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1525; -- should not require objects
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1526; -- should implement three-phase pattern

-- validate phase
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1527; -- should always validate successfully

-- execute phase
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1528; -- should not throw (weak - only checks no throw)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1529; -- should not modify world state (verifies state snapshot)

-- report phase
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1530; -- should emit about_displayed event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1531; -- should emit event with messageId and params
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1532; -- should create well-formed semantic event

-- full flow
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1533; -- should validate, execute, and report successfully

-- ============================================================
-- attacking-golden.test.ts (IDs 1534-1540)
-- ============================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1534; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1535; -- should declare required messages (thorough check)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1536; -- should belong to interaction group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1537; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1538; -- should prevent attacking self
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1539; -- should report ineffective attack on non-combatant NPC

-- Attacking Objects with BREAKABLE trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1540; -- should break a breakable object

-- ============================================================
-- attacking.test.ts (IDs 1541-1572)
-- ============================================================

-- Three-Phase Pattern Compliance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1541; -- should have required methods
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1542; -- validate should return ValidationResult
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1543; -- execute should return void
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1544; -- report should return ISemanticEvent array

-- Validation Logic
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1545; -- should fail without target
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1546; -- should fail if target not visible
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1547; -- should fail if target not reachable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1548; -- should fail when attacking self
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1549; -- should fail if specified weapon not reachable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1550; -- should pass validation with valid target
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1551; -- should pass validation with held weapon

-- Weapon Inference
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1552; -- should infer weapon for stab verb
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1553; -- should infer weapon for slash verb
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1554; -- should infer weapon for cut verb
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1555; -- should not infer weapon for generic attack verb
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1556; -- should not infer weapon if explicitly specified

-- Shared Data Handling
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1557; -- should store attack result in shared data
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1558; -- should store weapon used in shared data
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1559; -- should store custom message if provided (weak: only checks toHaveProperty)

-- Event Generation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1560; -- should generate attacked event on success
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1561; -- should generate attacked event with messageId
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1562; -- should generate blocked event on validation failure
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1563; -- should include weapon in attacked event when used
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1564; -- should generate blocked event via blocked() method

-- Attack Result Types
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1565; -- should handle broke result type
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1566; -- should handle ineffective attack

-- Action Metadata (duplication with golden file)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1567; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1568; -- should have correct group
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1569; -- should require direct object
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1570; -- should not require indirect object
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1571; -- should have reachable scope for direct object
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1572; -- should declare all required messages

-- ============================================================
-- climbing-golden.test.ts (IDs 1573-1587)
-- ============================================================

UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1573; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1574; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1575; -- should belong to movement group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1576; -- should fail when no target or direction specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1577; -- should fail when object is not climbable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1578; -- should fail when already on target
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1579; -- should fail for invalid directions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1580; -- should fail when no exit in climb direction
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1581; -- should fail when not in a room for directional climbing

-- Successful Climbing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Add world state mutation check: verify player actually moved to destination room' WHERE id=1582; -- should climb up when exit exists
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Add world state mutation check: verify player actually moved to destination room' WHERE id=1583; -- should climb down when exit exists
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Add world state mutation check: verify player actually moved onto supporter' WHERE id=1584; -- should climb onto enterable supporter
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Add world state mutation check: verify player location changed' WHERE id=1585; -- should climb object with CLIMBABLE trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1586; -- should handle direction normalization

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1587; -- should include proper entities in all events

-- ============================================================
-- closing-golden.test.ts (IDs 1588-1606)
-- ============================================================

-- Three-Phase Pattern Compliance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1588; -- should have required methods for three-phase pattern
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1589; -- should use report() for ALL event generation

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1590; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1591; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1592; -- should belong to container_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1593; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1594; -- should fail when target is not closable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1595; -- should fail when already closed

-- Successful Closing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1596; -- should close an open container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1597; -- should include container contents in event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1598; -- should handle closing a door

-- Special Cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1599; -- should handle close requirements

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1600; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1601; -- should actually set isOpen to false after closing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1602; -- should actually set isOpen to false for container with contents
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1603; -- should NOT change isOpen when already closed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1604; -- should NOT change isOpen when canClose is false
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1605; -- should NOT change state when target is not closable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1606; -- should actually close an open door

-- ============================================================
-- drinking-golden.test.ts (IDs 1607-1639)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1607; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1608; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1609; -- should belong to interaction group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1610; -- should fail when no item specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1611; -- should fail when item is not drinkable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1612; -- should fail when drink is already consumed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1613; -- should fail when container is closed

-- Successful Drinking
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1614; -- should drink item from inventory
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1615; -- should implicitly take and drink item from room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1616; -- should handle drink with portions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1617; -- should handle drinking last portion of multi-serving drink
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1618; -- should handle refreshing drink
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1619; -- should handle bitter drink
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1620; -- should handle sweet drink
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1621; -- should handle strong/alcoholic drink
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1622; -- should handle magical drink
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1623; -- should handle healing drink
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1624; -- should handle thirst-quenching drink
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1625; -- should handle non-thirst-quenching drink
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1626; -- should handle drinking from container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1627; -- should handle emptying container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1628; -- should handle container without tracked amount
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1629; -- should handle drink with nutrition value

-- Verb Variations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1630; -- should handle sip verb
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1631; -- should handle quaff verb
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1632; -- should handle swallow/gulp verb

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1633; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1634; -- should actually move item to inventory on implicit take
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1635; -- should not move item that is already held
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1636; -- should actually consume drinkable item (set consumed flag)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1637; -- should decrement servings when drinking multi-serving item
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1638; -- should actually decrement liquidAmount for containers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1639; -- should set liquidAmount to 0 when emptying container

-- ============================================================
-- dropping-golden.test.ts (IDs 1640-1658)
-- ============================================================

-- Three-Phase Pattern Compliance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1640; -- should have required methods for three-phase pattern
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1641; -- should use report() for ALL event generation

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1642; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1643; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1644; -- should belong to object_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1645; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1646; -- should fail when not holding the item
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1647; -- should fail when item is still worn

-- Container Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1648; -- should allow dropping inside a closed container (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1649; -- should fail when container is full

-- Successful Dropping
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Add world state mutation check: verify item actually moved from player to room' WHERE id=1650; -- should drop item in room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Add world state mutation check: verify item actually moved to container' WHERE id=1651; -- should drop item in open container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Add world state mutation check: verify item actually moved to supporter' WHERE id=1652; -- should drop item on supporter

-- Message Variations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1653; -- should use careful message for glass items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1654; -- should use careless message for discard verb

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1655; -- should include proper entities in all events

-- Edge Cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1656; -- should handle dropping in container without capacity limits
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1657; -- should handle dropping worn item that is not actually worn
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1658; -- should handle edge case of player dropping item while not in a room (SKIPPED)

-- ============================================================
-- eating-golden.test.ts (IDs 1659-1677)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1659; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1660; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1661; -- should belong to interaction group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1662; -- should fail when no item specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1663; -- should fail when item is not edible
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1664; -- should fail when item is a drink
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1665; -- should fail when item is already consumed

-- Successful Eating
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=1, mitigation='Add mutation check: verify EdibleTrait.servings decremented or consumed flag set' WHERE id=1666; -- should eat item from inventory
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1667; -- should handle food with servings
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1668; -- should handle eating multi-serving food (multi-step workflow)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1669; -- should handle delicious food
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1670; -- should handle tasty food
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1671; -- should handle bland food
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1672; -- should handle awful food
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1673; -- should handle poisonous food
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1674; -- should handle filling food
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1675; -- should handle non-filling food
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1676; -- should handle food with nutrition value

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1677; -- should include proper entities in all events

-- ============================================================
-- entering-golden.test.ts (IDs 1678-1698)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1678; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1679; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1680; -- should belong to movement group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1681; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1682; -- should fail when target is not enterable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1683; -- should fail when already inside target (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1684; -- should fail when entry is blocked (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1685; -- should fail when container is closed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1686; -- should fail when at maximum occupancy (SKIPPED)

-- Successful Entry
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1687; -- should enter enterable container (car)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1688; -- should enter enterable container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1689; -- should enter enterable supporter
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1690; -- should check occupancy for containers with actors
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1691; -- should handle custom prepositions (SKIPPED)

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1692; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1693; -- should actually move player into enterable container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1694; -- should actually move player onto enterable supporter
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1695; -- should NOT move player when target is not enterable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1696; -- should NOT move player when container is closed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1697; -- should NOT move player when already inside target
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1698; -- should move player into open container

-- ============================================================
-- examining-golden.test.ts (IDs 1699-1720)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1699; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1700; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1701; -- should belong to observation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1702; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1703; -- should fail when target not visible
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1704; -- should always allow examining self even if not visible

-- Basic Examining
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1705; -- should examine simple object
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1706; -- should include description from identity trait

-- Container Examining
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1707; -- should examine open container with contents
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1708; -- should examine closed container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1709; -- should handle container without openable trait as always open

-- Supporter Examining
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1710; -- should examine supporter with objects

-- Special Object Types
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1711; -- should examine switchable device
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1712; -- should examine readable object
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1713; -- should examine wearable object
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1714; -- should examine locked door

-- Complex Objects
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1715; -- should handle object with multiple traits

-- Event Structure + Pattern Compliance
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1716; -- should include proper entities in all events
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1717; -- should use report() to create all events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1718; -- should use blocked() to handle validation errors

-- Edge Cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1719; -- should handle readable object without text
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1720; -- should handle container and supporter priority

-- ============================================================
-- exiting-golden.test.ts (IDs 1721-1740)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1721; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1722; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1723; -- should belong to movement group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1724; -- should fail when already in a room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1725; -- should fail when no location set (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1726; -- should fail when container has no parent location
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1727; -- should fail when container is closed (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1728; -- should fail when exit is blocked (SKIPPED)

-- Successful Exit
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1729; -- should exit from container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1730; -- should exit from supporter
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1731; -- should exit from vehicle with ENTRY trait (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1732; -- should handle custom prepositions correctly (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1733; -- should exit from open container

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1734; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1735; -- should actually move player out of container to room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1736; -- should actually move player off supporter to room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1737; -- should NOT move player when already in a room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1738; -- should NOT move player when container has no parent location
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1739; -- should actually move player out of open container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1740; -- should NOT move player when container is closed

-- ============================================================
-- giving-golden.test.ts (IDs 1741-1764)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1741; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1742; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1743; -- should belong to social group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1744; -- should fail when no item specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1745; -- should fail when no recipient specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1746; -- should fail when recipient is not an actor
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1747; -- should fail when giving to self

-- Recipient Capacity Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1748; -- should fail when recipient inventory is full
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1749; -- should fail when item too heavy for recipient

-- Recipient Preferences
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1750; -- should refuse items based on preferences
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1751; -- should gratefully accept liked items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1752; -- should reluctantly accept disliked items

-- Successful Giving
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1753; -- should give item normally
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1754; -- should handle giving to NPC with no special preferences

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1755; -- should include proper entities in all events

-- Edge Cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1756; -- should handle giving to NPC with complex preferences
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1757; -- should handle recipient with weight limit but current inventory empty
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1758; -- should handle item without weight when recipient has weight limit

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1759; -- should actually move item from player to recipient
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1760; -- should actually move item to NPC with preferences
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1761; -- should NOT move item when recipient inventory is full
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1762; -- should NOT move item when recipient refuses it
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1763; -- should NOT move item when giving to non-actor
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1764; -- should NOT move item when giving to self

-- ============================================================
-- going-golden.test.ts (IDs 1765-1789)
-- ============================================================

-- Four-Phase Pattern Compliance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1765; -- should have required methods for four-phase pattern
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1766; -- should use report() for ALL event generation

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1767; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1768; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1769; -- should belong to movement group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1770; -- should fail when no direction specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1771; -- should fail when actor is not in a room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1772; -- should fail when room has no exits
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1773; -- should fail when no exit in specified direction
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1774; -- should fail when door is closed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1775; -- should fail when door is locked
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1776; -- should fail when destination not found
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1777; -- should allow movement to dark room

-- Successful Movement
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1778; -- should move in cardinal direction
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1779; -- should handle direction abbreviations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1780; -- should track first visit to a room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1781; -- should move through open door
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1782; -- should move to dark room with light
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1783; -- should accept direction from directObject

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1784; -- should include proper entities in all events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1785; -- should handle all opposite directions correctly

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1786; -- should actually move player to destination room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1787; -- should NOT move player when door is closed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1788; -- should NOT move player when no exit in direction
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1789; -- should mark room as visited after first visit

-- ============================================================
-- implicit-take.test.ts (IDs 1790-1801)
-- ============================================================

UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1790; -- should succeed without implicit take when item is already carried
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1791; -- should perform implicit take when item is reachable but not carried
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1792; -- should emit if.event.implicit_take event
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1793; -- should emit if.event.taken event after implicit take
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1794; -- should store events in sharedData.implicitTakeEvents
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1795; -- should return scope error when item is not reachable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1796; -- should not attempt to take item in different room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1797; -- should return fixed_in_place error for scenery items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1798; -- should not attempt to take scenery
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1799; -- should return error when trying to take yourself
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1800; -- should return error when trying to take a room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1801; -- should accumulate events from multiple implicit takes

-- ============================================================
-- inserting-golden.test.ts (IDs 1802-1821)
-- ============================================================

-- Three-Phase Pattern Compliance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1802; -- should have required methods for three-phase pattern
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1803; -- should use report() for ALL event generation

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1804; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1805; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1806; -- should belong to object_manipulation group

-- Delegation to Putting Action
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1807; -- should delegate to putting action with in preposition
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1808; -- should handle no target error from putting
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1809; -- should handle no destination error from putting

-- Container-Specific Behavior
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1810; -- should successfully insert into open container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1811; -- should fail when container is closed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1812; -- should fail when target is not a container

-- Capacity and State Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1813; -- should respect container capacity

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1814; -- should include proper entities in all events

-- Integration
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1815; -- should maintain consistency with putting action
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1816; -- should handle container within container

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1817; -- should actually move item into container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1818; -- should actually move item into open container with openable trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1819; -- should NOT move item when container is closed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1820; -- should NOT move item when container is full
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1821; -- should move nested container into another container

-- ============================================================
-- inventory-golden.test.ts (IDs 1822-1838)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1822; -- should have correct ID
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1823; -- should declare required messages (weak: only toBeDefined)
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1824; -- should belong to meta group

-- Empty Inventory
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1825; -- should fire event for completely empty inventory

-- Held Items Only
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1826; -- should include carried items in event

-- Worn Items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1827; -- should include worn items in event

-- Mixed Inventory
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1828; -- should include both held and worn items

-- Weight Information
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1829; -- should include weight data when player has weight limit (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1830; -- should not include weight data when no weight limit

-- Brief Format Detection
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1831; -- should detect brief format from "i" command
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1832; -- should detect brief format from "inv" command
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1833; -- should use full format for "inventory" command

-- Observable Action
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1834; -- should be observable by NPCs in the room

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1835; -- should include proper entities in all events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1836; -- should include complete inventory data in event

-- Testing Pattern Examples
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1837; -- pattern: inventory with various item types
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1838; -- pattern: weight calculation (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1839; -- pattern: empty inventory variations

-- ============================================================
-- listening-golden.test.ts (IDs 1840-1856)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1840; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1841; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1842; -- should belong to sensory group

-- Listening to Specific Objects
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1843; -- should detect sound from active device
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1844; -- should detect no sound from inactive device
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1845; -- should detect sounds from container with contents
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1846; -- should detect liquid sounds from container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1847; -- should detect no sound from empty container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1848; -- should detect no sound from ordinary objects

-- Listening to the Environment
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1849; -- should detect silence in quiet room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1850; -- should detect active devices in room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1851; -- should ignore inactive devices
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1852; -- should detect mix of active and inactive devices

-- Complex Sound Scenarios
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1853; -- should handle container with mixed contents
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1854; -- should prioritize device sounds over container state

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1855; -- should include proper entities in all events
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1856; -- should include proper entities for environmental listening

-- ============================================================
-- locking-golden.test.ts (IDs 1857-1881)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1857; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1858; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1859; -- should belong to lock_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1860; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1861; -- should fail when target is not lockable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1862; -- should fail when already locked
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1863; -- should fail when target is open

-- Key Requirements
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1864; -- should fail when key required but not provided
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1865; -- should fail when key not held by player
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1866; -- should fail with wrong key

-- Successful Locking
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1867; -- should lock object without key requirement
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1868; -- should lock with correct key
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1869; -- should lock door with key
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1870; -- should handle multiple valid keys
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1871; -- should include lock sound if specified

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1872; -- should include proper entities in all events

-- Edge Cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1873; -- should handle lockable without openable trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1874; -- should prefer keyId over keyIds when both present
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1875; -- should use backup key when primary not available

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1876; -- should actually set isLocked to true after locking
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1877; -- should actually set isLocked to true when using correct key
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1878; -- should NOT change isLocked when already locked
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1879; -- should NOT change isLocked when target is open
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1880; -- should NOT change state when target is not lockable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1881; -- should actually lock a door with key

-- ============================================================
-- looking-golden.test.ts (IDs 1882-1899)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1882; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1883; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1884; -- should belong to observation group

-- Basic Looking
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1885; -- should describe current room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1886; -- should list visible items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1887; -- should handle empty rooms

-- Darkness Handling
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1888; -- should handle dark room without light
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1889; -- should see in dark room with light source
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1890; -- should see with room light source

-- Special Locations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1891; -- should describe being in a container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1892; -- should describe being on a supporter

-- Brief/Verbose Modes
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1893; -- should use brief description for visited rooms in brief mode
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1894; -- should use full description for first visit even in brief mode

-- Command Variations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1895; -- should handle short form "l" command
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1896; -- should handle "examine" without object

-- Event Structure + Pattern Compliance
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1897; -- should include proper entities and timestamps
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1898; -- should use report() to create all events
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1899; -- should use blocked() to handle validation errors

-- ============================================================
-- opening-golden.test.ts (IDs 1913-1935)
-- ============================================================

-- Three-Phase Pattern Compliance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1913; -- should have required methods for three-phase pattern
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1914; -- should use report() for ALL event generation

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1915; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1916; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1917; -- should belong to container_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1918; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1919; -- should fail when target is not openable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1920; -- should fail when already open
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1921; -- should fail when locked

-- Successful Opening
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1922; -- should emit atomic opened event with minimal data
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1923; -- should emit separate revealed events for container contents (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1924; -- should report empty container with special message
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1925; -- should open a door

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1926; -- should include proper atomic events (SKIPPED)

-- Edge Cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1927; -- should handle unlocked but not yet open container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1928; -- should handle non-container openable objects
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1929; -- should emit multiple revealed events for multiple items (SKIPPED)

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1930; -- should actually set isOpen to true after opening
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1931; -- should actually set isOpen to true for container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1932; -- should NOT change isOpen when already open
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1933; -- should NOT change isOpen when locked
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1934; -- should NOT change state when target is not openable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=1935; -- should actually open unlocked but closed container

-- ============================================================
-- pulling-golden.test.ts (IDs 1936-1945)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1936; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1937; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1938; -- should belong to interaction group

-- Basic Validation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1939; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1940; -- should fail when target is not pullable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1941; -- should fail when pulling worn items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1942; -- should fail when already pulled

-- Basic Execution
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1943; -- should execute pull successfully
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1944; -- should track pull count

-- Event Handler Integration
UPDATE tests SET test_type='behavioral', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1945; -- story authors can handle complex pull mechanics via events

-- ============================================================
-- pushing-golden.test.ts (IDs 1946-1963)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1946; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1947; -- should declare required messages
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

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1963; -- should include proper entities in all events

-- ============================================================
-- putting-golden.test.ts (IDs 1964-1996)
-- ============================================================

-- Three-Phase Pattern Compliance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1964; -- should have required methods for three-phase pattern
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1965; -- should use report() for ALL event generation

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1966; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1967; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1968; -- should belong to object_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1969; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1970; -- should fail when no destination specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1971; -- should fail when trying to put something in itself
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1972; -- should fail when trying to put something on itself
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=1973; -- should fail when item already in destination

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

-- Event Structure
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
-- reading-golden.test.ts (IDs 2013-2023)
-- ============================================================

-- Basic Reading
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2013; -- should read a simple note
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2014; -- should read a book
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2015; -- should read a sign
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2016; -- should read an inscription

-- Multi-page Books
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2017; -- should read current page of multi-page book

-- Validation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2018; -- should fail without direct object
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2019; -- should fail for non-readable items
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2020; -- should fail when text is not currently readable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2021; -- should handle items with language requirements

-- Integration with ReadableTrait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2022; -- should track whether item has been read
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2023; -- should handle empty text gracefully

-- ============================================================
-- registry-golden.test.ts (IDs 2024-2043)
-- ============================================================

-- Basic Registration
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2024; -- should register a real action
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2025; -- should register multiple real actions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2026; -- should override existing action

-- Action Retrieval
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2027; -- should return undefined for non-existent action
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2028; -- should return all registered actions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2029; -- should maintain action properties

-- Group Management
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2030; -- should organize standard actions by group
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2031; -- should handle actions without groups

-- Language Provider Integration
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2032; -- should store patterns from language provider
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2033; -- should handle pattern updates when language provider changes
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2034; -- should sort actions by priority in pattern results

-- Pattern Storage
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2035; -- should store full pattern strings from language provider
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2036; -- should handle case-insensitive pattern lookup
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2037; -- should return empty array for unknown patterns

-- Direct Action Lookup
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2038; -- should look up actions by ID in normal flow
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2039; -- should maintain real action integrity

-- Edge Cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2040; -- should handle registration before language provider is set
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2041; -- should handle empty pattern arrays from language provider
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2042; -- should handle null or undefined language provider

-- Backward Compatibility
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2043; -- should support direct aliases on actions

-- ============================================================
-- removing-golden.test.ts (IDs 2044-2069)
-- ============================================================

-- Three-Phase Pattern Compliance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2044; -- should have required methods for three-phase pattern
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2045; -- should use report() for ALL event generation

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2046; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2047; -- should declare required messages
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

-- Event Structure
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
-- searching-golden.test.ts (IDs 2090-2107)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2090; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2091; -- should declare required messages
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

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2106; -- should include proper entities in all events
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2107; -- should include location as target when searching room

-- ============================================================
-- showing-golden.test.ts (IDs 2108-2131)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2108; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2109; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2110; -- should belong to social group

-- Precondition Checks (mix of pass and skipped)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2111; -- should fail when no item specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2112; -- should fail when no viewer specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2113; -- should fail when not carrying item (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2114; -- should succeed when showing worn item (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2115; -- should fail when viewer not visible (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2116; -- should fail when viewer too far away (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2117; -- should fail when viewer is not an actor (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2118; -- should fail when showing to self (SKIPPED)

-- Viewer Reactions (all SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2119; -- should recognize specific items (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2120; -- should be impressed by certain items (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2121; -- should be unimpressed by certain items (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2122; -- should examine certain items closely (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2123; -- should nod at unspecified items (SKIPPED)

-- Successful Showing (all SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2124; -- should show item normally (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2125; -- should show to NPC with no reactions defined (SKIPPED)

-- Event Structure (SKIPPED)
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2126; -- should include proper entities in all events (SKIPPED)

-- Edge Cases (all SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2127; -- should handle showing worn item to viewer with reactions (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2128; -- should handle showing to multiple viewers sequentially (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2129; -- should handle viewer location check properly (SKIPPED)

-- Testing Pattern Examples (all SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2130; -- pattern: proper name items (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2131; -- pattern: multiple reaction types priority (SKIPPED)

-- ============================================================
-- smelling-golden.test.ts (IDs 2132-2149)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2132; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2133; -- should declare required messages
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

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2149; -- should include proper entities in all events

-- ============================================================
-- switching_off-golden.test.ts (IDs 2150-2173)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2150; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2151; -- should declare required messages
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

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2167; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2168; -- should actually set isOn to false after switching off
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2169; -- should actually set isOn to false and clear autoOffCounter
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2170; -- should NOT change isOn when already off
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2171; -- should NOT change state when target is not switchable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2172; -- should actually turn off a light source and coordinate with LightSourceBehavior
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2173; -- should turn off device with power requirements

-- ============================================================
-- switching_on-golden.test.ts (IDs 2174-2197)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2174; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2175; -- should declare required messages
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

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2191; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2192; -- should actually set isOn to true after switching on
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2193; -- should actually set isOn to true for device with power available
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2194; -- should NOT change isOn when already on
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2195; -- should NOT change isOn when no power available
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2196; -- should NOT change state when target is not switchable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2197; -- should actually turn on a light source and coordinate with LightSourceBehavior

-- ============================================================
-- taking-golden.test.ts (IDs 2198-2222)
-- ============================================================

-- Three-Phase Pattern Compliance
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2198; -- should have required methods for three-phase pattern
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2199; -- should use report() for ALL event generation

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2200; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2201; -- should declare required messages
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
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2210; -- should fail when too heavy (SKIPPED)

-- Successful Taking
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2211; -- should take object from room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2212; -- should take object from container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2213; -- should take object from supporter
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2214; -- should implicitly remove worn item before taking

-- Event Structure
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
-- taking_off-golden.test.ts (IDs 2223-2243)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2223; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2224; -- should declare required messages
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

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2237; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2238; -- should actually set worn to false after taking off
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2239; -- should actually set worn to false with body part preserved
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2240; -- should NOT change worn when not wearing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2241; -- should NOT change state when target is not wearable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2242; -- should take off outermost layer without affecting inner layers
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2243; -- should take off item without bodyPart specified

-- ============================================================
-- talking-golden.test.ts (IDs 2244-2260)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2244; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2245; -- should declare required messages
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

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2260; -- should include proper entities in all events

-- ============================================================
-- throwing-golden.test.ts (IDs 2261-2288)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2261; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2262; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2263; -- should belong to interaction group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2264; -- should fail when no item specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2265; -- should prevent throwing at self
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2266; -- should fail when no exit in specified direction
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2267; -- should fail when item is too heavy for distance throw

-- General Throwing (Drop)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2268; -- should drop non-fragile item gently
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2269; -- should handle fragile items gently thrown
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2270; -- should break fragile item when dropped carelessly

-- Targeted Throwing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2271; -- should hit stationary target
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2272; -- should miss moving actor (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2273; -- should allow NPC to catch thrown item (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2274; -- should land on supporter when hit
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2275; -- should land in open container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2276; -- should bounce off closed container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2277; -- should break fragile item on impact
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2278; -- should anger hit NPC

-- Weight Considerations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2279; -- should allow throwing light objects far
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2280; -- should allow dropping heavy items

-- Fragility Detection
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2281; -- should detect various fragile materials

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2282; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2283; -- should actually move item to room floor on general throw
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2284; -- should actually move item onto supporter when thrown at it
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2285; -- should actually move item into open container when thrown at it
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2286; -- should move item to floor when bouncing off closed container
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2287; -- should NOT move item when validation fails (too heavy)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2288; -- should NOT move item when throwing at self

-- ============================================================
-- touching-golden.test.ts (IDs 2289-2310)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2289; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2290; -- should declare required messages
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
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2302; -- should include size information when available

-- Verb Variations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2303; -- should handle normal touch
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2304; -- should handle poke verb
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2305; -- should handle prod verb
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2306; -- should handle pat verb
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2307; -- should handle stroke verb
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2308; -- should handle feel verb

-- Complex Combinations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2309; -- should prioritize temperature over texture

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2310; -- should include proper entities in all events

-- ============================================================
-- unlocking-golden.test.ts (IDs 2311-2338)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2311; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2312; -- should declare required messages
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
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2321; -- should unlock with correct key (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2322; -- should unlock door and note room connection (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2323; -- should handle multiple valid keys
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2324; -- should include unlock sound if specified (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2325; -- should note container with contents (SKIPPED)

-- Auto-Open Behavior
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2326; -- should detect auto-open on unlock (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2327; -- should not auto-open if not configured (SKIPPED)

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2328; -- should include proper entities in all events

-- Edge Cases
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2329; -- should handle lockable without openable trait
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2330; -- should prefer keyId over keyIds when both present (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2331; -- should work with backup key when primary not available (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2332; -- should handle empty container unlock (SKIPPED)

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2333; -- should actually set isLocked to false after unlocking
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2334; -- should actually set isLocked to false when using correct key
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2335; -- should NOT change isLocked when already unlocked
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2336; -- should NOT change isLocked when wrong key provided
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2337; -- should NOT change state when target is not lockable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2338; -- should actually unlock a door with key

-- ============================================================
-- waiting-golden.test.ts (IDs 2339-2353)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2339; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2340; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2341; -- should belong to meta group
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2342; -- should not require objects

-- Three-Phase Pattern
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2343; -- should have validate, execute, and report functions
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2344; -- validate should always return valid
UPDATE tests SET test_type='functional', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2345; -- execute should return void (not events)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2346; -- execute should store location in sharedData
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2347; -- report should return events array

-- Event Emission
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2348; -- should emit if.event.waited with turnsPassed
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2349; -- should emit if.event.waited with location info
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2350; -- should include messageId in waited event for text rendering

-- No State Mutation
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2351; -- should not modify world state
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2352; -- should not modify entity traits

-- Signal Action Pattern
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2353; -- should be a minimal signal action

-- ============================================================
-- wearing-golden.test.ts (IDs 2354-2374)
-- ============================================================

-- Action Metadata
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2354; -- should have correct ID
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2355; -- should declare required messages
UPDATE tests SET test_type='structural', quality='adequate', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2356; -- should belong to wearable_manipulation group

-- Precondition Checks
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2357; -- should fail when no target specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2358; -- should fail when item is not wearable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2359; -- should fail when already wearing item
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2360; -- should fail when item not held and not in room (SKIPPED)
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2361; -- should fail when body part conflict exists
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2362; -- should fail when layer conflict exists

-- Successful Wearing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2363; -- should wear item from inventory
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2364; -- should implicitly take and wear item from room
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2365; -- should wear item without body part specified
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2366; -- should handle layered clothing correctly
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2367; -- should wear multiple items on different body parts

-- Event Structure
UPDATE tests SET test_type='structural', quality='good', has_mutation_check=0, has_assertion=1, needs_mitigation=0 WHERE id=2368; -- should include proper entities in all events

-- World State Mutations
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2369; -- should actually set worn to true after wearing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2370; -- should actually set worn to true with body part preserved
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2371; -- should NOT change worn when already wearing
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2372; -- should NOT change state when target is not wearable
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2373; -- should wear item with layering system
UPDATE tests SET test_type='functional', quality='good', has_mutation_check=1, has_assertion=1, needs_mitigation=0 WHERE id=2374; -- should wear item without bodyPart specified
