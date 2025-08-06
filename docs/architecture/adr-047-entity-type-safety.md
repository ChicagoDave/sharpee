# ADR-047: Entity Type Safety and Validation

## Status
Date: 2025-08-04
Status: Proposed

## Context

Currently, the `WorldModel.createEntity(displayName: string, type: string)` method accepts any string as the entity type. This has led to bugs where developers accidentally pass parameters in the wrong order:

```typescript
// Common mistake - parameters reversed
world.createEntity('room', 'Test Room');  // Creates entity with type "Test Room"!

// Correct usage
world.createEntity('Test Room', 'room');  // Creates room entity with display name "Test Room"
```

Additionally:
- No compile-time type checking for entity types
- No validation that entity types are known/valid
- No automatic trait assignment based on entity type
- Confusion between entity display names, types, and identities

## Decision

We will implement type safety for entity creation through:

1. **Define known entity types as constants** (not enums, per project conventions):
```typescript
const EntityType = {
  ROOM: 'room',
  DOOR: 'door',
  ITEM: 'item',
  ACTOR: 'actor',
  CONTAINER: 'container',
  SUPPORTER: 'supporter',
  SCENERY: 'scenery',
  EXIT: 'exit',
  OBJECT: 'object'
} as const;

type EntityType = typeof EntityType[keyof typeof EntityType];
```

2. **Add validation to existing createEntity method**:
```typescript
createEntity(displayName: string, type: string): IFEntity {
  if (!isKnownEntityType(type)) {
    throw new Error(`Unknown entity type: ${type}. Valid types are: ${Object.values(EntityType).join(', ')}`);
  }
  // ... existing implementation
}
```

3. **Add new type-safe convenience method**:
```typescript
createEntityWithTraits(type: EntityType): IFEntity {
  const id = this.generateId(type);
  const entity = new IFEntity(id, type);
  
  // Auto-add appropriate default trait
  switch (type) {
    case EntityType.ROOM:
      entity.add(new RoomTrait({ exits: {} }));
      break;
    case EntityType.CONTAINER:
      entity.add(new ContainerTrait());
      break;
    case EntityType.SUPPORTER:
      entity.add(new SupporterTrait());
      break;
    case EntityType.ACTOR:
      entity.add(new ActorTrait());
      break;
    case EntityType.DOOR:
      entity.add(new DoorTrait());
      break;
    case EntityType.SCENERY:
      entity.add(new SceneryTrait());
      break;
    // ITEM and OBJECT don't need special traits by default
  }
  
  return entity;
}
```

## Blast Radius Analysis

### Breaking Changes
- **Existing createEntity calls with invalid types will throw errors**
  - This is intentional - it catches bugs
  - Clear error messages guide fixes
  - May break tests that use arbitrary type strings

### Non-Breaking Changes
- Existing valid createEntity calls continue to work
- New createEntityWithTraits is additive
- Entity ID generation unchanged
- All existing entity methods/properties unchanged

### Migration Path
1. Run tests to identify createEntity calls with invalid types
2. Fix by either:
   - Using valid type string: `createEntity('Hook', 'object')`
   - Switching to new method: `createEntityWithTraits(EntityType.OBJECT)`

### Areas to Check
- **Tests**: Many tests use createEntity with test types like "Test Room"
- **Stories**: Existing stories may need entity type updates
- **Engine**: GameEngine.createPlayer and other entity creation
- **Stdlib**: Actions that create entities
- **Documentation**: Examples showing entity creation

## Consequences

### Positive
- Compile-time type safety with new method
- Runtime validation catches type errors early
- Clearer API intent - display name vs type
- Auto-traits reduce boilerplate
- Foundation for Forge fluent API

### Negative
- Breaking change for invalid entity types
- Two ways to create entities (though this provides migration path)
- Need to update tests and examples

### Neutral
- Entity types remain strings at runtime
- Trait system remains unchanged
- Can still add/remove traits after creation

## Implementation Notes

1. Add EntityType constants to world-model package
2. Update WorldModel with validation and new method
3. Update tests to use valid entity types
4. Update documentation with examples
5. Consider deprecation path for old createEntity method in future

## Future Considerations

- Forge layer will build on this with methods like `forge.room()`, `forge.object()`
- Could add entity type hierarchies later (e.g., "treasure" is a kind of "item")
- Validation could be extended to check trait compatibility
- Could generate TypeScript types from entity definitions