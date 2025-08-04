# Test Fixes Summary

## Changes Made

### 1. Quitting Tests
- Fixed shared data mocking by using `world.getCapability('sharedData')` instead of `world.getSharedData()`
- The action retrieves shared data through the capability system

### 2. Command Validator Tests  
- Updated tests to pass action IDs (e.g., 'if.action.taking') instead of verbs
- Added proper command structure with noun phrases for entity resolution
- The validator expects commands with action IDs already resolved by the parser

### 3. Sleeping Tests
- Changed event type expectations from 'message.success' to 'action.success' and 'message.error' to 'action.error'
- Fixed trait usage - tests now add specific traits like 'if.trait.dangerous' instead of properties on ROOM trait
- Note: The sleeping action uses random chance for sleep quality, so some tests may need adjustment

### 4. Locking/Unlocking Tests
- Fixed key matching by using actual entity IDs instead of trying to match string IDs
- When creating keys, the tests now update the lockable trait to use the key entity's actual ID
- Example: `keyId: key.id` instead of `keyId: 'safe_key'`

## Key Design Insights

1. **Action IDs vs Verbs**: The system expects the parser to resolve verbs to action IDs. The validator just looks up actions by ID.

2. **Entity ID Matching**: Lock/unlock actions compare actual entity IDs, not string identifiers.

3. **Event Types**: The context helpers emit 'action.success' and 'action.error', not 'message.success/error'.

4. **Trait System**: Actions check for specific trait types using `has()` method, not properties on traits.

## Remaining Issues

Some tests may still fail due to:
- Actions that don't implement expected behavior (e.g., sleeping doesn't check player state)
- Tests expecting specific message IDs that don't match actual implementation
- Entity event data mismatches (IDs vs names)
