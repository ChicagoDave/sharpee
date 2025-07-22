# Stdlib Action Tests - Failure List

Based on the test log from `test-stdlib-20250721-232747.log`, here are the actions with failing tests:

## Test Summary
- Total test suites: 48 run (34 passed, 14 failed)
- Total tests: 1024 run (894 passed, 130 failed)

## Failed Test Files

### 1. again.test.ts
**All execute tests fail** - Player location issue in test setup
- ✓ Action Metadata (3 tests pass)
- ✕ All execute tests (7 tests fail with "Player has no location" error)

### 2. answering-golden.test.ts
**Message ID and validation issues**
- ✓ Action Metadata (3 tests pass)
- ✕ should fail with unclear response when no response text provided
- ✕ should detect expected answer and add acceptance message
- ✕ should detect unexpected answer and add rejection message
- ✕ should note answer when no expected response
- ✕ should provide default response when none given

### 3. attacking-golden.test.ts
**Weapon requirement and message issues**
- ✓ Action Metadata (3 tests pass)
- ✕ should require holding weapon
- ✕ should perform basic unarmed attack
- ✕ should attack with held weapon
- ✕ should use hit_with for hit verb
- ✕ pattern: fragility detection

### 4. drinking-golden.test.ts
**Container handling issues**
- ✓ Most tests pass (28/33)
- ✕ should handle emptying container
- ✕ should handle container without tracked amount

### 5. dropping-golden.test.ts
**Container and event data issues**
- ✓ Action Metadata (3 tests pass)
- ✕ should fail when dropping into closed container
- ✕ should drop item in open container (extra "location" field)
- ✕ should drop item on supporter (extra "location" field)
- ✕ should handle edge case of player dropping item while not in a room

### 6. giving-golden.test.ts
**Trait validation issue**
- ✓ Most tests pass (20/21)
- ✕ should fail when recipient not reachable (Invalid trait error)

### 7. inserting-golden.test.ts
**Test setup issues**
- ✓ Action Metadata (3 tests pass)
- ✕ All other tests fail with "TestData.basicSetup is not a function"

### 8. locking-golden.test.ts
**Key handling issues**
- ✓ Most precondition checks pass
- ✕ should lock with correct key
- ✕ should lock door with key
- ✕ should handle multiple valid keys
- ✕ should include lock sound if specified
- ✕ should prefer keyId over keyIds when both present
- ✕ should use backup key when primary not available

### 9. looking-golden.test.ts
**Message ID issues**
- ✓ Most tests pass (18/20)
- ✕ should list visible items
- ✕ should handle "examine" without object

### 10. opening-golden.test.ts
**Content revelation issues**
- ✓ Action Metadata and basic checks pass
- ✕ should reveal contents when opening container
- ✕ should report empty container
- ✕ should handle door that is also a container

### 11. pulling-golden.test.ts
**Reachability and event data issues**
- ✓ Action Metadata (3 tests pass)
- ✕ should fail when target is not reachable
- ✕ should fail when object is too heavy to pull
- ✕ should ring bell when pulling bell cord
- ✕ should fail to detach firmly attached objects
- ✕ should pull light objects in direction

### 12. putting-golden.test.ts
**Event data issue**
- ✓ Most tests pass (26/27)
- ✕ should respect explicit preposition for dual-nature objects

### 13. quitting.test.ts
**Shared data access issues**
- ✓ Action Metadata (3 tests pass)
- ✕ All execute tests fail (missing shared data properties)

### 14. sleeping.test.ts
**Event type and message ID mismatches**
- ✓ Action Metadata (3 tests pass)
- ✕ All functional tests fail (wrong event types/messages)

### 15. smelling-golden.test.ts
**Distance check issue**
- ✓ Most tests pass (24/25)
- ✕ should fail when target is too far away

### 16. taking-golden.test.ts
**Player location and trait issues**
- ✓ Most tests pass
- ✕ Container capacity tests (player location issues)
- ✕ should take object from container (extra event data)
- ✕ should handle empty player without container trait

### 17. talking-golden.test.ts
**Topic detection issues**
- ✓ Most tests pass (20/22)
- ✕ should detect NPC with topics to discuss
- ✕ should detect NPC with no topics

### 18. throwing-golden.test.ts
**Fragility and probability issues**
- ✓ Basic metadata and some preconditions pass
- ✕ should handle fragile items gently thrown
- ✕ should break fragile item when dropped carelessly
- ✕ should miss moving actor
- ✕ should allow NPC to catch thrown item
- ✕ should break fragile item on impact
- ✕ should break fragile item thrown in direction

### 19. turning-golden.test.ts
**Key and message issues**
- ✓ Most tests pass (28/31)
- ✕ should fail when key not in lock
- ✕ should use rotate for rotate verb
- ✕ should use spin for spin verb

### 20. unlocking-golden.test.ts
**Key handling issues**
- ✓ Basic metadata passes
- ✕ should unlock with correct key
- ✕ should unlock door with key
- ✕ should handle multiple valid keys
- ✕ should unlock with key in container
- ✕ should include unlock sound if specified

### 21. using-golden.test.ts
**Visibility and tool usage issues**
- ✓ Basic metadata and some tests pass
- ✕ should fail when item is not reachable and not held
- ✕ should fail when target is not visible
- ✕ should fail when target is not reachable
- ✕ should toggle from on to off
- ✕ should fix device with screwdriver
- ✕ should break glass with hammer
- ✕ should modify non-glass targets with hammer
- ✕ Key usage tests (8 failures)
- ✕ should include both item and target entities

### 22. wearing-golden.test.ts
**Implicit take issue**
- ✓ Most tests pass (15/16)
- ✕ should implicitly take and wear item from room

## Common Failure Patterns

1. **Test Setup Issues**: 
   - "Player has no location" errors in test utilities
   - "TestData.basicSetup is not a function" errors

2. **Event Data Mismatches**:
   - Extra fields in event data (e.g., "location" field)
   - Missing expected fields
   - Different field values than expected

3. **Message ID Mismatches**:
   - Actions returning different message IDs than tests expect
   - Wrong error message types

4. **Entity Resolution**:
   - Visibility/reachability checks behaving differently
   - Key handling and validation issues

5. **Shared Data Access**:
   - Missing or undefined shared data properties
   - Score/stats access issues

## Next Steps

1. Fix test setup utilities (createRealTestContext, TestData.basicSetup)
2. Review and align message IDs between actions and tests
3. Standardize event data structures
4. Review entity resolution and validation logic
5. Ensure shared data is properly initialized in tests
