# Sharpee Test Fixes Summary

## Test Pattern Issues Fixed

### 1. **Quitting Action Tests**
**Issue**: Tests were mocking `world.getSharedData()` but the action uses `world.getCapability('sharedData')`
**Fix**: Changed mocking to use `world.getCapability = (name) => { if (name === 'sharedData') return {...} }`

### 2. **Command Validator Tests**
**Issue**: Tests were passing verb strings to validator, but the design expects action IDs
**Fix**: Updated tests to use action IDs (e.g., 'if.action.taking') and added proper command structure with noun phrases

### 3. **Sleeping Action Tests**
**Issues**:
- Expected 'message.success' but actions emit 'action.success'
- Tests added properties to ROOM trait but action checks for specific traits
**Fixes**:
- Changed event type expectations to 'action.success' and 'action.error'
- Changed to add specific traits like `{ type: 'if.trait.dangerous' as TraitType }`

### 4. **Locking/Unlocking Action Tests**
**Issue**: Tests expected key matching by string ID, but actions compare actual entity IDs
**Fix**: Updated tests to create keys first, then set the lockable trait's keyId to the key entity's actual ID

### 5. **Inserting Action Tests**
**Issue**: Tests called non-existent `TestData.basicSetup()` method
**Fix**: Changed all calls to use `setupBasicWorld()` instead

## Key Design Patterns Discovered

### 1. **Action ID Resolution**
- Parser resolves verbs to action IDs
- Validator receives commands with action IDs already resolved
- Validator can fall back to pattern matching if needed

### 2. **Entity ID Matching**
- Lock/unlock actions compare actual entity IDs (e.g., "e_123")
- Not string identifiers stored in traits
- Keys must be created first to get their IDs

### 3. **Event Types**
- Context helpers emit 'action.success' and 'action.error'
- Not 'message.success' or 'message.error'
- This is consistent across all actions

### 4. **Trait System**
- Actions check for specific trait types using `has()` method
- Traits are identified by type strings (e.g., 'if.trait.dangerous')
- Properties on traits are secondary to trait type checking

### 5. **Capability System**
- World model capabilities are accessed via `getCapability(name)`
- Not direct method calls on world
- Capabilities provide extensible data storage

## Common Test Patterns

### Creating a Test World
```typescript
const { world, player, room } = setupBasicWorld();
```

### Creating a Test Command
```typescript
const command = createCommand('if.action.taking', {
  entity: box,
  secondEntity: container,
  preposition: 'in'
});
```

### Creating Test Context
```typescript
const context = createRealTestContext(action, world, command);
```

### Expecting Events
```typescript
expectEvent(events, 'action.success', {
  messageId: expect.stringContaining('locked'),
  params: { item: 'box' }
});
```

### Setting Up Keys for Locks
```typescript
const key = world.createEntity('brass key', 'object');
lockable.add({
  type: TraitType.LOCKABLE,
  isLocked: true,
  keyId: key.id  // Use actual entity ID
});
```

## Remaining Issues

Some tests may still fail due to:
1. Actions not implementing expected behavior (e.g., sleeping uses random chance)
2. Event data mismatches (expecting entity IDs vs names)
3. Missing trait implementations
4. Tests expecting features not yet implemented

The core architectural patterns are now correctly reflected in the tests.
