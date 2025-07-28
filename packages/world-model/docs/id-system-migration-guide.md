# World Model ID System Migration Guide

## Overview

The Sharpee Interactive Fiction platform has migrated from human-readable string IDs to auto-generated type-prefixed IDs. This change improves debugging, prevents ID collisions, and provides clear entity type identification.

## What Changed

### Old System
```typescript
// Entities created with custom IDs
const room = world.createEntity('kitchen', 'Kitchen');
const item = world.createEntity('brass-key', 'Brass Key');
```

### New System
```typescript
// Entities created with display names, IDs auto-generated
const room = world.createEntity('Kitchen', 'room');     // ID: r01
const item = world.createEntity('Brass Key', 'item');   // ID: i03
```

## ID Format

IDs follow the pattern: `[type-prefix][2-digit-base36]`

### Type Prefixes
- `r` - room
- `d` - door
- `i` - item
- `a` - actor
- `c` - container
- `s` - supporter
- `y` - scenery
- `e` - exit
- `o` - object (default)

### Examples
- `r01` - First room
- `i2f` - Item #87 (2f in base36)
- `a01` - First actor (usually the player)

## Migration Steps

### 1. Update Entity Creation

**Before:**
```typescript
const kitchen = world.createEntity('kitchen', 'Kitchen');
const player = world.createEntity('player', 'Player');
```

**After:**
```typescript
const kitchen = world.createEntity('Kitchen', 'room');
const player = world.createEntity('Player', 'actor');
```

### 2. Use Name Resolution

**Before:**
```typescript
// Direct ID usage
world.moveEntity('player', 'kitchen');
const room = world.getEntity('kitchen');
```

**After:**
```typescript
// Option 1: Use entity references
world.moveEntity(player.id, kitchen.id);

// Option 2: Use name resolution
const playerId = world.getId('Player');
const kitchenId = world.getId('Kitchen');
world.moveEntity(playerId, kitchenId);
```

### 3. Update Tests

**Before:**
```typescript
expect(entity.id).toBe('kitchen');
expect(world.getLocation('player')).toBe('kitchen');
```

**After:**
```typescript
expect(entity.id).toMatch(/^r[0-9a-z]{2}$/);
expect(world.getLocation(player.id)).toBe(kitchen.id);

// Or use test helpers
expect(getEntityLocationName(world, 'Player')).toBe('Kitchen');
```

### 4. Handle Save Files

The system automatically handles old save files:
- Old IDs are preserved when loading
- Name mappings are rebuilt from entity attributes
- New entities get new-style IDs

## API Reference

### Core Methods

#### `world.createEntity(displayName: string, type: string = 'object'): IFEntity`
Creates entity with auto-generated ID based on type.

#### `world.getId(name: string): string | undefined`
Get entity ID by name (case-insensitive).

#### `world.getName(id: string): string | undefined`
Get entity display name by ID.

### Entity Properties

#### `entity.id: string`
The auto-generated ID (e.g., 'r01').

#### `entity.name: string`
Display name from (in priority order):
1. `attributes.displayName`
2. Identity trait name
3. `attributes.name`
4. ID (fallback)

## Best Practices

### DO
- ✅ Use meaningful display names
- ✅ Specify entity types for clear IDs
- ✅ Use entity references in code
- ✅ Use name resolution for dynamic lookups

### DON'T
- ❌ Hardcode IDs in tests
- ❌ Expose IDs to players
- ❌ Assume ID formats
- ❌ Create entities with old signature (except for compatibility)

## Common Patterns

### Creating Connected Rooms
```typescript
const kitchen = world.createEntity('Kitchen', 'room');
const hallway = world.createEntity('Hallway', 'room');
const door = world.createEntity('Kitchen Door', 'door');

door.add(new DoorTrait({
  room1: kitchen.id,
  room2: hallway.id
}));
```

### Finding Entities by Name
```typescript
const itemName = 'Brass Key';
const itemId = world.getId(itemName);
if (itemId) {
  const item = world.getEntity(itemId);
  // Work with item...
}
```

### Test Helpers
```typescript
import { expectEntity, moveEntityByName } from './test-helpers';

const player = expectEntity(world, 'Player');
moveEntityByName(world, 'Brass Key', 'Player');
```

## Troubleshooting

### "Entity with name 'X' already exists"
Each entity must have a unique display name. Use descriptive names:
- ❌ `world.createEntity('Box', 'container')`
- ❌ `world.createEntity('Box', 'container')` // Duplicate!
- ✅ `world.createEntity('Wooden Box', 'container')`
- ✅ `world.createEntity('Metal Box', 'container')`

### ID Overflow Error
Each type is limited to 1296 entities (00-zz in base36). This is rarely an issue, but if hit:
- Review if all entities are needed
- Consider using different types
- Clean up unused entities

### Case Sensitivity
Name lookup is case-insensitive:
```typescript
world.createEntity('Magic Sword', 'item');
world.getId('magic sword');  // Works
world.getId('MAGIC SWORD');  // Works
world.getId('Magic Sword');  // Works
```

## Backwards Compatibility

The old signature is deprecated but still works:
```typescript
// Deprecated but functional
const entity = world.createEntity('custom-id', 'Display Name');

// Logs deprecation warning
// Uses 'custom-id' as ID and 'Display Name' as type
```

Use only for:
- Loading old save files
- Gradual migration
- Special compatibility needs

## Summary

The new ID system provides:
- **Automatic ID generation** - No more manual ID management
- **Type identification** - IDs show entity type at a glance
- **Collision prevention** - Guaranteed unique IDs per type
- **Better debugging** - Clear entity identification in logs
- **Name flexibility** - Change display names without breaking references

The migration requires updating entity creation calls and using name resolution or entity references instead of hardcoded IDs, but the benefits in maintainability and debugging make it worthwhile.
