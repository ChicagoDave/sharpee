# ADR-005: Entity ID System Design

Date: 2024-01-06
Status: Implemented (2025-07-06)
Implementation: Complete

## Context

The world-model package needs a consistent system for identifying entities. Currently, tests use human-readable strings as IDs (e.g., 'player', 'kitchen', 'door1'), but this approach has several issues:

1. **Ambiguity**: No clear distinction between entity IDs and display names
2. **Collision Risk**: Multiple entities could accidentally use the same ID
3. **Author Experience**: Future Forge authors will want to use meaningful names, not manage IDs
4. **Reference Resolution**: Exits and doors reference other entities by string, unclear if ID or name
5. **Type Indication**: IDs don't indicate what type of entity they represent

## Decision Drivers

- **Developer Experience**: Tests should be readable and easy to write
- **Author Experience**: Forge authors should never see or manage IDs
- **Debugging**: IDs should be short and indicate entity type
- **Uniqueness**: System must guarantee no ID collisions
- **Flexibility**: Support both programmatic and authored content

## Considered Options

### Option 1: Keep Current System (Human-Readable IDs)
- Use meaningful strings as IDs ('player', 'kitchen')
- Enforce uniqueness at creation time
- Let Forge layer handle name-to-ID mapping

**Pros:**
- Tests remain readable
- No refactoring needed
- Simple to understand

**Cons:**
- Risk of collisions
- No type indication
- Mixes concerns (ID vs display name)

### Option 2: Auto-Generated Numeric IDs
- Generate IDs like 'entity_1', 'entity_2'
- Maintain name-to-ID mapping
- All methods use IDs only

**Pros:**
- Guaranteed uniqueness
- Clear separation of ID and name

**Cons:**
- Hard to debug
- Tests become unreadable
- No type indication

### Option 3: Type-Prefixed 3-Character IDs
- Format: `[type-prefix][2-char-base36]` (e.g., r01, d01, i01, a01)
- Auto-generated with type indication
- Maintain bidirectional name-ID mapping

**Pros:**
- Readable in logs and debugging
- Type indication built-in
- Guaranteed uniqueness
- Short and efficient

**Cons:**
- Requires refactoring
- Tests need updating

## Decision

We will implement **Option 3: Type-Prefixed 3-Character IDs** with the following design:

### ID Format
```
[type-prefix][2-character-base36-counter]

Examples:
- r01, r02, r03 (rooms)
- d01, d02 (doors)  
- i01, i02 (items)
- a01 (actors)
- c01 (containers)
- s01 (supporters)
```

### Type Prefixes
```typescript
const TYPE_PREFIXES = {
  'room': 'r',
  'door': 'd',
  'item': 'i',
  'actor': 'a',
  'container': 'c',
  'supporter': 's',
  'scenery': 'y',
  'exit': 'e'
};
```

### API Design
```typescript
class WorldModel {
  // Entity creation returns entity with generated ID
  createEntity(displayName: string, type: string = 'object'): IFEntity;
  
  // All methods use IDs only
  getEntity(id: string): IFEntity | undefined;
  moveEntity(entityId: string, targetId: string | null): boolean;
  
  // Helper for name resolution
  getId(name: string): string | undefined;
  getName(id: string): string | undefined;
}
```

### Usage Pattern
```typescript
// Creation
const kitchen = world.createEntity('Kitchen', 'room'); // Returns entity with id='r01'
const player = world.createEntity('Player', 'actor');  // Returns entity with id='a01'

// Usage with returned references
world.moveEntity(player.id, kitchen.id);

// Usage with name lookup (when needed)
world.moveEntity(world.getId('Player')!, world.getId('Kitchen')!);
```

## Implementation Plan

1. **Phase 1**: Implement ID generator and update WorldModel.createEntity
2. **Phase 2**: Add name-to-ID mapping and helper methods
3. **Phase 3**: Update all integration tests to use new pattern
4. **Phase 4**: Update stdlib to use IDs consistently
5. **Phase 5**: Document patterns for Forge integration

## Consequences

### Positive
- **Unique IDs**: No collision risk
- **Debugging**: Type-prefixed IDs make logs readable
- **Clean API**: Clear separation between IDs and names
- **Future-Proof**: Forge can build on top without changes

### Negative
- **Refactoring Required**: All tests need updating
- **Learning Curve**: Developers must understand ID vs name
- **Verbosity**: Some test code becomes slightly longer

### Neutral
- Test readability changes from `'kitchen'` to `kitchen.id`
- Error messages will show IDs like 'r01' instead of 'kitchen'

## Notes

- The 3-character limit provides 46,656 possible IDs per type (36^2), far exceeding any IF game needs
- Case-insensitive name lookup will prevent common errors
- Forge will completely hide this ID system from authors
- Migration can be done incrementally by updating tests one at a time

## Implementation Details (Added 2025-01-06)

### What Was Built

1. **ID Generation System**
   - Auto-generates IDs like r01, d02, i03 based on entity type
   - Maintains per-type counters in WorldModel
   - Throws error on overflow (>1295 entities per type)

2. **Name/ID Mapping**
   - Bidirectional maps: nameToId and idToName
   - Case-insensitive name lookup
   - Automatic mapping on entity creation

3. **Entity Name Resolution**
   - entity.name getter with priority chain:
     1. attributes.displayName (highest)
     2. Identity trait name
     3. attributes.name
     4. ID (fallback)

4. **Backwards Compatibility**
   - Old createEntity(id, name) signature still works with deprecation warning
   - Save/load system preserves ID mappings
   - Automatic ID system rebuild for old saves

5. **Test Infrastructure**
   - Helper functions: getTestEntity, expectEntity, moveEntityByName
   - Updated all integration tests
   - Updated fixture functions

### Key Insights

1. **Separation of Concerns Works**: The existing architecture already separated names (for users) from IDs (for system), making the refactor smooth.

2. **Command System Unchanged**: The CommandValidator already used entity.name for resolution and entity.id for operations, so no changes needed.

3. **Test Readability Maintained**: Helper functions keep tests readable while using the new system.

### Actual ID Limits

- Format: [prefix][00-zz] gives 1296 IDs per type (36^2)
- More than sufficient for any IF game
- Clear error on overflow

### Migration Path

1. Update entity creation calls
2. Use entity references or name resolution
3. Update test assertions
4. Old saves auto-migrate
