# Visibility Behavior Test Updates

## Summary of Changes Needed

The visibility-behavior.test.ts file needs systematic updates to use the new ID generation system:

1. Change all `world.createEntity(id, name)` calls to `world.createEntity(name, type)`
2. Change all `world.moveEntity('string-id', 'target-id')` to use entity.id references
3. Update assertions that check for specific IDs

## Pattern Replacements

### Entity Creation
```typescript
// OLD
const target = world.createEntity('target', 'Target');
const room = world.createEntity('room-1', 'Test Room');

// NEW  
const target = world.createEntity('Target', 'object');
const room = world.createEntity('Test Room', 'room');
```

### Entity Movement
```typescript
// OLD
world.moveEntity('target', 'room-1');

// NEW
world.moveEntity(target.id, room.id);
```

### Visibility Checks in getVisible
```typescript
// OLD
expect(visibleIds).toContain('room-1');
expect(visibleIds).toContain('item-1');

// NEW
expect(visibleIds).toContain(room.id);
expect(visibleIds).toContain(item1.id);
```

## Key Test Sections to Update

1. **canSee tests** - Basic visibility checks
2. **dark rooms** - Light source tests
3. **getVisible** - Visible entity lists
4. **isVisible** - Individual entity visibility
5. **complex scenarios** - Nested containers
6. **edge cases** - Error handling

## Notes

- Observer typically uses 'actor' type
- Rooms use 'room' type
- Containers use 'container' type
- General items use 'object' or 'item' type
- Light sources use 'item' type with LightSourceTrait

The test logic remains the same, only the ID handling changes.
