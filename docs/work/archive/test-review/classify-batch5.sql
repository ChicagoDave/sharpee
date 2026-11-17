-- Batch 5: stdlib tests NOT in actions/ directory
-- 137 tests across 17 files

-- ==========================================================================
-- packages/stdlib/tests/emit-illustrations.test.ts (IDs 1442-1449)
-- Tests for emitIllustrations helper that produces illustration events
-- from entity annotations. All functional, all good quality.
-- ==========================================================================

-- 1442: should return empty array for entity with no annotations
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1442;

-- 1443: should emit events for matching trigger annotations
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1443;

-- 1444: should filter out annotations with non-matching trigger
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1444;

-- 1445: should only emit active conditional annotations
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1445;

-- 1446: should use default position and width when not specified
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1446;

-- 1447: should pass through targetPanel when present
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1447;

-- 1448: should not include targetPanel when absent
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1448;

-- 1449: should emit multiple illustrations for the same trigger
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1449;

-- ==========================================================================
-- packages/stdlib/tests/integration/action-language-integration.test.ts (IDs 1458-1463)
-- Integration tests: command -> action flow with language provider.
-- Mixed quality: some are genuine integration tests, one uses a mock take action.
-- ==========================================================================

-- 1458: should resolve action from verb using language provider
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1458;

-- 1459: should resolve action from alias
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1459;

-- 1460: should validate and execute action
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1460;

-- 1461: should resolve messages through language provider
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Assertion is weak: accepts [Missing:...] as valid outcome, defeating the purpose of verifying message resolution'
WHERE id = 1461;

-- 1462: should find actions by pattern through language provider
UPDATE tests SET
  test_type = 'functional',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1462;

-- 1463: example: action that checks preconditions
UPDATE tests SET
  test_type = 'functional',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Uses a mock take action instead of the real one; does not verify actual world state change (moveEntity never called)'
WHERE id = 1463;

-- ==========================================================================
-- packages/stdlib/tests/integration/container-visibility-knowledge.test.ts (IDs 1464-1468)
-- Integration tests: container visibility, scope, and knowledge.
-- All behavioral, testing user workflows (open->take, scope through containers).
-- ==========================================================================

-- 1464: actor cannot see ball in closed box
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1464;

-- 1465: actor can examine box when in same room
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1465;

-- 1466: actor cannot take ball that they do not know about
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1466;

-- 1467: actor can take ball after opening box
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1467;

-- 1468: full scenario: move, examine, try take, open, take
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1468;

-- ==========================================================================
-- packages/stdlib/tests/integration/meta-commands.test.ts (IDs 1469-1487)
-- Tests for meta-command registry (isMeta, getAll, hasCustomCommands, reset).
-- Mostly functional checks of registry state.
-- ==========================================================================

-- 1469: should auto-register meta-actions
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1469;

-- 1470: should not register regular actions
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1470;

-- 1471: should include meta-action in getAll()
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1471;

-- 1472: should recognize SAVE as meta
UPDATE tests SET
  test_type = 'functional',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1472;

-- 1473: should recognize RESTORE as meta
UPDATE tests SET
  test_type = 'functional',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1473;

-- 1474: should recognize QUIT as meta
UPDATE tests SET
  test_type = 'functional',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1474;

-- 1475: should recognize SCORE as meta
UPDATE tests SET
  test_type = 'functional',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1475;

-- 1476: should recognize HELP as meta
UPDATE tests SET
  test_type = 'functional',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1476;

-- 1477: should recognize AGAIN as meta
UPDATE tests SET
  test_type = 'functional',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1477;

-- 1478: should recognize author.parser_events as meta (SKIPPED)
UPDATE tests SET
  test_type = 'functional',
  quality = 'dead',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Skipped: ParserEventsAction not implemented. Remove or implement.'
WHERE id = 1478;

-- 1479: should recognize author.validation_events as meta (SKIPPED)
UPDATE tests SET
  test_type = 'functional',
  quality = 'dead',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Skipped: ValidationEventsAction not implemented. Remove or implement.'
WHERE id = 1479;

-- 1480: should recognize author.system_events as meta (SKIPPED)
UPDATE tests SET
  test_type = 'functional',
  quality = 'dead',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Skipped: SystemEventsAction not implemented. Remove or implement.'
WHERE id = 1480;

-- 1481: should recognize author.trace as meta
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1481;

-- 1482: should not recognize TAKE as meta
UPDATE tests SET
  test_type = 'functional',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1482;

-- 1483: should not recognize DROP as meta
UPDATE tests SET
  test_type = 'functional',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1483;

-- 1484: should not recognize LOOK as meta
UPDATE tests SET
  test_type = 'functional',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1484;

-- 1485: should not recognize GO as meta
UPDATE tests SET
  test_type = 'functional',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1485;

-- 1486: should detect custom meta-commands
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1486;

-- 1487: should not have custom commands after reset
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1487;

-- ==========================================================================
-- packages/stdlib/tests/query-handlers/platform-handlers.test.ts (IDs 1488-1504)
-- Tests for QuitQueryHandler and RestartQueryHandler.
-- All functional, verifying event emission for various query responses.
-- ==========================================================================

-- 1488: QuitQueryHandler > canHandle > should handle quit confirmation queries
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1488;

-- 1489: QuitQueryHandler > canHandle > should handle quit with unsaved changes queries
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1489;

-- 1490: QuitQueryHandler > canHandle > should not handle non-quit queries
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1490;

-- 1491: QuitQueryHandler > handleResponse > should emit quit requested event for quit option
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1491;

-- 1492: QuitQueryHandler > handleResponse > should handle save and quit option
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1492;

-- 1493: QuitQueryHandler > handleResponse > should emit quit cancelled for cancel option
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1493;

-- 1494: QuitQueryHandler > handleResponse > should handle yes/no responses
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1494;

-- 1495: QuitQueryHandler > handleTimeout > should emit quit cancelled on timeout
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1495;

-- 1496: QuitQueryHandler > handleCancel > should emit quit cancelled on cancellation
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1496;

-- 1497: RestartQueryHandler > canHandle > should handle restart confirmation queries
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1497;

-- 1498: RestartQueryHandler > canHandle > should handle restart with unsaved changes queries
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1498;

-- 1499: RestartQueryHandler > canHandle > should not handle non-restart queries
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1499;

-- 1500: RestartQueryHandler > handleResponse > should emit restart requested event for restart option
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1500;

-- 1501: RestartQueryHandler > handleResponse > should handle save and restart option
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1501;

-- 1502: RestartQueryHandler > handleResponse > should emit restart cancelled for cancel option
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1502;

-- 1503: RestartQueryHandler > handleTimeout > should emit restart cancelled on timeout
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1503;

-- 1504: RestartQueryHandler > handleCancel > should emit restart cancelled on cancellation
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1504;

-- ==========================================================================
-- packages/stdlib/tests/scope-integration.test.ts (IDs 1450-1457)
-- Integration tests for scope validation with CommandValidator.
-- Behavioral tests: realistic commands validated through scope system.
-- ==========================================================================

-- 1450: REACHABLE scope validation > should fail when trying to take an object that is not reachable
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Assertion is overly flexible: accepts either not-finding-gem or finding-chest as success. Should specifically assert the gem is unreachable.'
WHERE id = 1450;

-- 1451: REACHABLE scope validation > should succeed when object is reachable
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1451;

-- 1452: CARRIED scope validation > should resolve a non-carried object at REACHABLE scope for throwing
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1452;

-- 1453: CARRIED scope validation > should succeed when object is carried
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1453;

-- 1454: AUDIBLE scope validation > should succeed when listening to something audible from another room
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1454;

-- 1455: DETECTABLE scope validation > should succeed when smelling something smelly from another room
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1455;

-- 1456: DETECTABLE scope validation > should resolve entity behind closed door at AWARE scope
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1456;

-- 1457: Scope info in ValidatedCommand > should include scope info in validated command
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1457;

-- ==========================================================================
-- packages/stdlib/tests/unit/capabilities/capability-refactoring.test.ts (IDs 1515-1522)
-- Tests for capability registration system.
-- Mix of structural (schema shape) and functional (registration/retrieval).
-- ==========================================================================

-- 1515: StandardCapabilitySchemas > should contain all standard capabilities
UPDATE tests SET
  test_type = 'structural',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1515;

-- 1516: StandardCapabilitySchemas > should have valid schemas for each capability
UPDATE tests SET
  test_type = 'structural',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1516;

-- 1517: registerStandardCapabilities > should register all capabilities by default
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1517;

-- 1518: registerStandardCapabilities > should register only specified capabilities
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1518;

-- 1519: CommandHistoryCapability > should define correct schema structure
UPDATE tests SET
  test_type = 'structural',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1519;

-- 1520: CommandHistoryCapability > should support CommandHistoryData interface
UPDATE tests SET
  test_type = 'structural',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1520;

-- 1521: CommandHistoryCapability > should handle entry trimming logic
UPDATE tests SET
  test_type = 'functional',
  quality = 'adequate',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Implements trimming logic inline in the test instead of calling the real code. Tests its own mock, not the actual capability implementation.'
WHERE id = 1521;

-- 1522: Capability integration with WorldModel > should work with real WorldModel instance
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1522;

-- ==========================================================================
-- packages/stdlib/tests/unit/chains/opened-revealed.test.ts (IDs 2556-2570)
-- Tests for the opened->revealed event chain (ADR-094).
-- All functional, testing chain handler output for various container states.
-- ==========================================================================

-- 2556: basic behavior > should return revealed event when container has contents
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2556;

-- 2557: basic behavior > should return null for non-containers
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2557;

-- 2558: basic behavior > should return null for empty containers
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2558;

-- 2559: basic behavior > should return null when target entity not found
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2559;

-- 2560: basic behavior > should return null when targetId is missing
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2560;

-- 2561: multiple items > should list all items in revealed event
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2561;

-- 2562: event data structure > should include container in entities.target field
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2562;

-- 2563: event data structure > should include item ids in entities.others field
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2563;

-- 2564: event data structure > should generate unique event id
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2564;

-- 2565: event data structure > should set event type to if.event.revealed
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2565;

-- 2566: event data structure > should include timestamp
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2566;

-- 2567: item message IDs > should use item name as messageId
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2567;

-- 2568: item message IDs > should fall back to entity id if no name
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2568;

-- 2569: chain key constant > should export the chain key constant
UPDATE tests SET
  test_type = 'structural',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2569;

-- 2570: handler uses entity name from world when not in event
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2570;

-- ==========================================================================
-- packages/stdlib/tests/unit/npc/character-observer.test.ts (IDs 2465-2498)
-- Tests for NPC character observation, perception filtering, lucidity,
-- hallucination injection, and multi-turn state tracking (ADR-141).
-- ==========================================================================

-- 2465: filterPerception > should pass events with accurate perception
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2465;

-- 2466: filterPerception > should miss filtered event categories
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2466;

-- 2467: filterPerception > should amplify matching event categories
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2467;

-- 2468: filterPerception > should pass events that match no filter patterns
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2468;

-- 2469: filterPerception > should pass events with filtered perception but no filter config
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2469;

-- 2470: filterPerception > should pass events through augmented perception
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2470;

-- 2471: filterPerception > should match filter patterns against event tags
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2471;

-- 2472: injectHallucinations > should inject hallucinated facts when lucidity state matches
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2472;

-- 2473: injectHallucinations > should not inject when lucidity state does not match
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2473;

-- 2474: injectHallucinations > should not re-inject already known hallucinated facts
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2474;

-- 2475: injectHallucinations > should return empty for non-augmented perception
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2475;

-- 2476: observeEvent > should return empty for NPC without CharacterModelTrait
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2476;

-- 2477: observeEvent > should add witnessed fact to knowledge
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2477;

-- 2478: observeEvent > should increase threat when violence event observed
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2478;

-- 2479: observeEvent > should adjust mood on violence event
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2479;

-- 2480: observeEvent > should apply amplification for filtered+amplified events
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2480;

-- 2481: observeEvent > should skip missed events entirely
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2481;

-- 2482: observeEvent > should emit mood change event when mood word changes
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2482;

-- 2483: observeEvent > should emit threat change event when threat word changes
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2483;

-- 2484: observeEvent > should emit fact learned event
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2484;

-- 2485: observeEvent > should adjust disposition toward event actor on giving
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2485;

-- 2486: observeEvent > should trigger lucidity state change on matching event
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2486;

-- 2487: observeEvent > should accept custom state transition rules
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2487;

-- 2488: observeEvent > should inject hallucinations during observation for augmented perception
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2488;

-- 2489: processLucidityDecay > should return empty for NPC without CharacterModelTrait
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2489;

-- 2490: processLucidityDecay > should return empty when no lucidity config
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2490;

-- 2491: processLucidityDecay > should return empty when no active window
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2491;

-- 2492: processLucidityDecay > should decay window and emit event when baseline restored
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2492;

-- 2493: processLucidityDecay > should verify actual trait field mutation after decay
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2493;

-- 2494: enterLucidityWindow > should set window turns based on decay rate
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2494;

-- 2495: enterLucidityWindow > should use fast decay rate
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2495;

-- 2496: enterLucidityWindow > should enter state without window when no config
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2496;

-- 2497: DECAY_RATE_TURNS > should have increasing turn counts from fast to slow
UPDATE tests SET
  test_type = 'structural',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2497;

-- 2498: multi-turn observation scenario > should track cumulative state changes across multiple events
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2498;

-- ==========================================================================
-- packages/stdlib/tests/unit/npc/npc-service.test.ts (IDs 2499-2516)
-- Tests for NpcService: behavior management, tick, player interactions,
-- and standard behaviors (guard, passive, wanderer).
-- ==========================================================================

-- 2499: NpcService > behavior management > should register a behavior
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2499;

-- 2500: NpcService > behavior management > should remove a behavior
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2500;

-- 2501: NpcService > behavior management > should return undefined for unknown behavior
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2501;

-- 2502: NpcService > tick > should call onTurn for active NPCs
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2502;

-- 2503: NpcService > tick > should not call onTurn for dead NPCs
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2503;

-- 2504: NpcService > tick > should not call onTurn for unconscious NPCs
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2504;

-- 2505: NpcService > onPlayerEnters > should call onPlayerEnters for NPCs in room
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2505;

-- 2506: NpcService > onPlayerLeaves > should call onPlayerLeaves for NPCs in room
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2506;

-- 2507: NpcService > onPlayerSpeaks > should call onSpokenTo when player speaks
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2507;

-- 2508: NpcService > onPlayerSpeaks > should return default response if no handler
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2508;

-- 2509: NpcService > onNpcAttacked > should call onAttacked when NPC is attacked
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2509;

-- 2510: standard behaviors > guardBehavior > should not move on turn
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2510;

-- 2511: standard behaviors > guardBehavior > should emote when player enters
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2511;

-- 2512: standard behaviors > guardBehavior > should counterattack when attacked
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2512;

-- 2513: standard behaviors > passiveBehavior > should do nothing on turn
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2513;

-- 2514: standard behaviors > wandererBehavior > should sometimes move
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2514;

-- 2515: standard behaviors > wandererBehavior > should not move when no exits
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2515;

-- 2516: createNpcService > should create an NPC service
UPDATE tests SET
  test_type = 'structural',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2516;

-- ==========================================================================
-- packages/stdlib/tests/unit/parser/parser-factory.test.ts (IDs 2452-2464)
-- Tests for ParserFactory: registration, creation, language lookup, clearing.
-- All functional, verifying factory behavior.
-- ==========================================================================

-- 2452: registerParser > should register a parser for a language
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2452;

-- 2453: registerParser > should register both full code and language-only code
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2453;

-- 2454: registerParser > should handle case-insensitive language codes
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2454;

-- 2455: createParser > should create a parser for registered language
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2455;

-- 2456: createParser > should find parser by language code without region
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2456;

-- 2457: createParser > should throw error for unregistered language
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2457;

-- 2458: createParser > should list available languages in error message
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2458;

-- 2459: getRegisteredLanguages > should return empty array when no parsers registered
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2459;

-- 2460: getRegisteredLanguages > should return sorted list of registered languages
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2460;

-- 2461: isLanguageRegistered > should return false for unregistered language
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2461;

-- 2462: isLanguageRegistered > should return true for registered language
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2462;

-- 2463: isLanguageRegistered > should check language-only code as fallback
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2463;

-- 2464: clearRegistry > should remove all registered parsers
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2464;

-- ==========================================================================
-- packages/stdlib/tests/unit/scope/scope-resolver.test.ts (IDs 2375-2423)
-- Tests for StandardScopeResolver: visibility, reachability, containers,
-- supporters, minimum scope, vehicle scope, disambiguation priorities,
-- serialization round-trips. Core scope system tests.
-- ==========================================================================

-- 2375: Basic Visibility > should see objects in same room
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2375;

-- 2376: Basic Visibility > should not see objects in different room
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2376;

-- 2377: Basic Visibility > should see carried items
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2377;

-- 2378: Container Visibility > should see objects in open containers
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2378;

-- 2379: Container Visibility > should not see objects in closed containers
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2379;

-- 2380: Container Visibility > should see nested containers when open
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2380;

-- 2381: Container Visibility > should not see through any closed container in hierarchy
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2381;

-- 2382: Supporter Visibility > should see objects on supporters
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2382;

-- 2383: Supporter Visibility > should see objects on nested supporters
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2383;

-- 2384: Reachability > should reach objects in same location
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2384;

-- 2385: Reachability > should reach objects on supporters
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2385;

-- 2386: Reachability > should reach objects in open containers
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2386;

-- 2387: Reachability > should not reach objects in closed containers
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2387;

-- 2388: Reachability > should not reach high objects
UPDATE tests SET
  test_type = 'functional',
  quality = 'dead',
  has_mutation_check = 0,
  has_assertion = 0,
  needs_mitigation = 1,
  mitigation = 'Empty test body - no assertions. Either implement or remove.'
WHERE id = 2388;

-- 2389: getVisible and getReachable > should return all visible entities
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2389;

-- 2390: getVisible and getReachable > should return only reachable entities
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2390;

-- 2391: Edge Cases > should handle entities with no location
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2391;

-- 2392: Edge Cases > should handle circular containment gracefully
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2392;

-- 2393: Minimum Scope > should make entity visible globally with setMinimumScope
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2393;

-- 2394: Minimum Scope > should make entity reachable globally with setMinimumScope
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2394;

-- 2395: Minimum Scope > should apply minimum scope only to specific rooms
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2395;

-- 2396: Minimum Scope > should apply minimum scope to multiple specific rooms
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2396;

-- 2397: Minimum Scope > should be additive - cannot lower physical scope
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2397;

-- 2398: Minimum Scope > should raise scope from physical level
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2398;

-- 2399: Minimum Scope > should clear minimum scope with clearMinimumScope
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2399;

-- 2400: Minimum Scope > should clear minimum scope for specific rooms only
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2400;

-- 2401: Minimum Scope > should include minimum scope entities in getVisible
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2401;

-- 2402: Minimum Scope > should include minimum scope entities in getReachable
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2402;

-- 2403: Minimum Scope > should include minimum scope entities in getAudible
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2403;

-- 2404: Minimum Scope > should persist minimum scope through clone
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2404;

-- 2405: Minimum Scope > should persist minimum scope through toJSON/fromJSON
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2405;

-- 2406: Minimum Scope > should make entity reachable from vehicle room via setMinimumScope
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2406;

-- 2407: Minimum Scope > should NOT make entity reachable from wrong vehicle room
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2407;

-- 2408: Minimum Scope > should include vehicle-scoped entities in getReachable
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2408;

-- 2409: Minimum Scope > should preserve vehicle scope through WorldModel serialization round-trip
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2409;

-- 2410: Minimum Scope > should resolve entities by name + scope after serialization (command validator flow)
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Test has excessive console.log tracing and reimplements command validator logic inline. Should use actual CommandValidator instead of manual findWhere+filter simulation.'
WHERE id = 2410;

-- 2411: Minimum Scope > REPRO: two wires with shared alias cause ENTITY_NOT_FOUND via modifier mismatch
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'adequate',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Bug reproduction test that reimplements command validator logic manually. Has excessive console.log statements. Should be converted to use real CommandValidator, and the fix assertion (mutating entity mid-test) should be a separate test.'
WHERE id = 2411;

-- 2412: Minimum Scope > should allow dynamic scope changes during gameplay
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2412;

-- 2413: Disambiguation Priorities > should return default priority of 100 when not set
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2413;

-- 2414: Disambiguation Priorities > should set and get priority for specific action
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2414;

-- 2415: Disambiguation Priorities > should support deprioritizing entities
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2415;

-- 2416: Disambiguation Priorities > should clear priority for specific action
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2416;

-- 2417: Disambiguation Priorities > should clear all priorities with clearAllScopes
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2417;

-- 2418: Disambiguation Priorities > should get all priorities with getScopePriorities
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2418;

-- 2419: Disambiguation Priorities > should persist priorities through clone
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2419;

-- 2420: Disambiguation Priorities > should persist priorities through toJSON/fromJSON
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2420;

-- 2421: Disambiguation Priorities > should allow setting extreme priorities
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2421;

-- 2422: Disambiguation Priorities > should allow updating priority by calling scope() again
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2422;

-- 2423: Disambiguation Priorities > should support multiple entities with different priorities
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2423;

-- ==========================================================================
-- packages/stdlib/tests/unit/scope/sensory-extensions.test.ts (IDs 2424-2437)
-- Tests for hearing, smell, and darkness in the scope system.
-- All functional, testing sensory scope resolution with real world model.
-- ==========================================================================

-- 2424: Hearing > should hear entities in same room
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2424;

-- 2425: Hearing > should hear through open doors
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2425;

-- 2426: Hearing > should hear through closed doors (muffled)
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2426;

-- 2427: Hearing > should not hear in unconnected rooms
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2427;

-- 2428: Hearing > should get all audible entities
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2428;

-- 2429: Smell > should smell food items in same room
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2429;

-- 2430: Smell > should smell actors in same room
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2430;

-- 2431: Smell > should smell through open doors
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2431;

-- 2432: Smell > should not smell through closed doors
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2432;

-- 2433: Smell > should not smell non-scented items
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2433;

-- 2434: Darkness > should not see in dark rooms without light
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2434;

-- 2435: Darkness > should see in dark rooms with carried light source
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2435;

-- 2436: Darkness > should see if actor itself provides light
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2436;

-- 2437: Darkness > should see in lit rooms
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2437;

-- ==========================================================================
-- packages/stdlib/tests/unit/scope/witness-system.test.ts (IDs 2438-2451)
-- Tests for StandardWitnessSystem: witnessing, knowledge tracking,
-- witness events, and witness levels.
-- ==========================================================================

-- 2438: Basic Witnessing > should record witnesses for movement in same room
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2438;

-- 2439: Basic Witnessing > should not record actor as witness of their own action
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2439;

-- 2440: Basic Witnessing > should not witness events in different rooms
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2440;

-- 2441: Knowledge Management > should track discovered entities
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2441;

-- 2442: Knowledge Management > should track entity movement history
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2442;

-- 2443: Knowledge Management > should update visual properties when witnessed
UPDATE tests SET
  test_type = 'functional',
  quality = 'adequate',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Test notes visual property extraction not yet implemented. Only checks entity exists=true; should verify visual properties once feature lands.'
WHERE id = 2443;

-- 2444: Knowledge Management > should mark entities as non-existent when destroyed
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2444;

-- 2445: Witness Events > should emit action witness event (SKIPPED)
UPDATE tests SET
  test_type = 'functional',
  quality = 'dead',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Skipped test. Uses module-level mock of createEvent but may need different approach. Enable or remove.'
WHERE id = 2445;

-- 2446: Witness Events > should emit movement witness event (SKIPPED)
UPDATE tests SET
  test_type = 'functional',
  quality = 'dead',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Skipped test. Uses module-level mock of createEvent. Enable or remove.'
WHERE id = 2446;

-- 2447: Witness Events > should emit unknown entity for partial witness level (SKIPPED)
UPDATE tests SET
  test_type = 'functional',
  quality = 'dead',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Skipped test. Uses module-level mock and spy on canReach. Enable or remove.'
WHERE id = 2447;

-- 2448: Witness Levels > should assign FULL level when can reach
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2448;

-- 2449: Witness Levels > should assign PARTIAL level when can see but not reach
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2449;

-- 2450: getKnownEntities > should return all known entities for an actor
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 1,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2450;

-- 2451: getKnownEntities > should return empty array for actor with no knowledge
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2451;

-- ==========================================================================
-- packages/stdlib/tests/unit/services/perception-service.test.ts (IDs 2540-2555)
-- Tests for PerceptionService: canPerceive and filterEvents for
-- darkness-based event filtering (ADR-069).
-- ==========================================================================

-- 2540: canPerceive > should return true for sight in a lit room
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2540;

-- 2541: canPerceive > should return false for sight in a dark room
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2541;

-- 2542: canPerceive > should return true for hearing in any room
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2542;

-- 2543: canPerceive > should return true for smell in any room
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2543;

-- 2544: canPerceive > should return true for touch in any room
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2544;

-- 2545: filterEvents - in lit room > should pass through all events unchanged
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2545;

-- 2546: filterEvents - in dark room > should transform room description to perception blocked
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2546;

-- 2547: filterEvents - in dark room > should transform contents list to perception blocked
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2547;

-- 2548: filterEvents - in dark room > should transform action.success with contents_list to perception blocked
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2548;

-- 2549: filterEvents - in dark room > should NOT transform non-visual action.success events
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2549;

-- 2550: filterEvents - in dark room > should NOT transform action.failure events
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2550;

-- 2551: filterEvents - in dark room > should NOT transform game.message events
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2551;

-- 2552: filterEvents - edge cases > should pass through events when player location cannot be determined
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2552;

-- 2553: filterEvents - edge cases > should preserve original event data in blocked event
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2553;

-- 2554: filterEvents - edge cases > should handle empty events array
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2554;

-- 2555: filterEvents - edge cases > should handle mixed event types correctly
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2555;

-- ==========================================================================
-- packages/stdlib/tests/unit/validation/command-validator-golden.test.ts (IDs 2517-2539)
-- Golden pattern tests for CommandValidator: entity resolution, adjectives,
-- scope rules, debug events, ambiguity, synonyms, complex commands,
-- and disambiguation with resolveWithSelection.
-- ==========================================================================

-- 2517: Basic Validation > validates unknown action
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2517;

-- 2518: Basic Validation > validates action without object in parsed command (SKIPPED)
UPDATE tests SET
  test_type = 'functional',
  quality = 'dead',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Skipped: parser currently requires object for take verb. Either fix parser or remove test.'
WHERE id = 2518;

-- 2519: Basic Validation > validates simple entity resolution
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2519;

-- 2520: Adjective Matching > resolves entity with adjective
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2520;

-- 2521: Adjective Matching > distinguishes between similar objects by adjective
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2521;

-- 2522: Adjective Matching > handles wrong adjective
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2522;

-- 2523: Adjective Matching > adjective fallback: "press yellow" finds "yellow button"
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2523;

-- 2524: Scope Rules > allows taking visible objects
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2524;

-- 2525: Scope Rules > allows examining inventory items
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2525;

-- 2526: Scope Rules > prevents taking objects from other rooms
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2526;

-- 2527: Debug Events > emits entity resolution debug events
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2527;

-- 2528: Debug Events > emits scope check debug events
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2528;

-- 2529: Ambiguity Resolution > returns ambiguity error when multiple matches
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2529;

-- 2530: Ambiguity Resolution > auto-resolves when adjectives disambiguate
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2530;

-- 2531: Synonym Resolution > resolves entity by synonym
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2531;

-- 2532: Synonym Resolution > resolves entity by type name
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2532;

-- 2533: Complex Commands > validates commands with prepositions
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2533;

-- 2534: resolveWithSelection > should resolve with explicit directObject selection
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2534;

-- 2535: resolveWithSelection > should resolve with different explicit selection
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2535;

-- 2536: resolveWithSelection > should fail if selected entity no longer exists
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2536;

-- 2537: resolveWithSelection > should resolve indirectObject with explicit selection
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2537;

-- 2538: resolveWithSelection > should use normal resolution for unspecified slots
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2538;

-- 2539: resolveWithSelection > should still check scope constraints on selected entities
UPDATE tests SET
  test_type = 'functional',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 2539;

-- ==========================================================================
-- packages/stdlib/tests/validation/entity-alias-resolution.test.ts (IDs 1505-1514)
-- Tests for entity alias resolution in the command validator.
-- All behavioral, testing real validation flow with aliases and multi-word names.
-- ==========================================================================

-- 1505: should find entity by its primary name
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1505;

-- 1506: should find entity by alias "hook"
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'adequate',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 1,
  mitigation = 'Excessive console.log debug output (world state dump). Clean up debug logging.'
WHERE id = 1506;

-- 1507: should find entity by alias "peg"
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1507;

-- 1508: should find entity as indirect object for PUT action
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1508;

-- 1509: multi-word alias resolution > should resolve multi-word alias "bush babies" via full text match
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1509;

-- 1510: multi-word alias resolution > should resolve single-word alias "galagos" normally
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1510;

-- 1511: multi-word alias resolution > should resolve multi-word entity name as primary name
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1511;

-- 1512: multi-word alias resolution > should prefer full text match over head-only match for disambiguation
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1512;

-- 1513: multi-word alias resolution > should fall back to head noun when full text has no match
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1513;

-- 1514: should handle entities with same aliases in different locations
UPDATE tests SET
  test_type = 'behavioral',
  quality = 'good',
  has_mutation_check = 0,
  has_assertion = 1,
  needs_mitigation = 0,
  mitigation = NULL
WHERE id = 1514;
