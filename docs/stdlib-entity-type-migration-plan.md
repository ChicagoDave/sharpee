# Stdlib Entity Type Migration Plan

## Overview

The stdlib tests were written before entity type validation was implemented in ADR-047. Many tests use invalid entity types like `'thing'`, `'vehicle'`, `'furniture'`, and `'fixture'` which need to be migrated to valid EntityType constants.

## Valid Entity Types (from ADR-047)

```typescript
EntityType.ROOM       // Locations in the game world
EntityType.DOOR       // Doorways or portals between rooms
EntityType.ITEM       // Generic takeable objects
EntityType.ACTOR      // Characters (NPC or player)
EntityType.CONTAINER  // Objects that can contain other objects
EntityType.SUPPORTER  // Objects that can support other objects on top
EntityType.SCENERY    // Fixed decorative objects that can't be taken
EntityType.EXIT       // Directional exits (rarely used as entity)
EntityType.OBJECT     // Generic object type (default)
```

## Migration Strategy

### Phase 1: Direct Type Mappings

These invalid types have straightforward replacements:

| Invalid Type | Valid Type | Usage |
|-------------|------------|--------|
| `'thing'` | `EntityType.OBJECT` | Generic items (coins, balls, keys, etc.) |
| `'location'` | `EntityType.ROOM` | Rooms and locations |
| `'ball'` | `EntityType.OBJECT` | Specific object instances |

### Phase 2: Context-Dependent Mappings

These types require analysis of how the entity is used in tests:

#### `'fixture'` - Fixed/Immovable Objects

**Analysis**: These represent objects that are part of the environment and can't be taken.

**Mapping Strategy**:
- Default: `EntityType.SCENERY` (for truly fixed objects like trees, phone booths)
- Alternative: `EntityType.OBJECT` with traits when the object has special behaviors

**Examples**:
```typescript
// Phone booth (can be entered)
const booth = world.createEntity('phone booth', EntityType.SCENERY);
booth.add(new EntryTrait());
booth.add(new ContainerTrait());

// Tree (can be climbed)
const tree = world.createEntity('oak tree', EntityType.SCENERY);
tree.add(new EntryTrait({ enterable: true }));

// Ladder (portable fixture)
const ladder = world.createEntity('wooden ladder', EntityType.OBJECT);
ladder.add(new EntryTrait());
```

#### `'vehicle'` - Enterable Transport

**Analysis**: These are objects that can be entered and may move between locations.

**Mapping Strategy**:
- Use `EntityType.OBJECT` as base type
- Add `EntryTrait` for enter/exit capability
- Add `ContainerTrait` to hold passengers/cargo
- Optionally add `SupporterTrait` for sitting

**Examples**:
```typescript
// Car
const car = world.createEntity('red car', EntityType.OBJECT);
car.add(new EntryTrait());
car.add(new ContainerTrait());

// Escape pod
const pod = world.createEntity('escape pod', EntityType.OBJECT);
pod.add(new EntryTrait({ 
  maxOccupants: 2,
  enterMessage: 'You climb into the escape pod.'
}));
pod.add(new ContainerTrait());
```

#### `'furniture'` - Sittable/Lieable Objects

**Analysis**: These are objects designed for sitting or lying on.

**Mapping Strategy**:
- Use `EntityType.SUPPORTER` for surfaces (beds, chairs, desks)
- Set `enterable: true` in SupporterTrait for sit/lie functionality
- Add `ContainerTrait` if the furniture has storage (desk drawers)

**Examples**:
```typescript
// Bed
const bed = world.createEntity('comfortable bed', EntityType.SUPPORTER);
bed.add(new SupporterTrait({ 
  enterable: true,
  capacity: { maxWeight: 200 }
}));

// Desk (can put things on it and has drawers)
const desk = world.createEntity('wooden desk', EntityType.SUPPORTER);
desk.add(new SupporterTrait({ 
  capacity: { maxItems: 10 }
}));
desk.add(new ContainerTrait()); // For drawers
```

## Implementation Steps

### Step 1: Update Imports
Add EntityType import to all affected test files:
```typescript
import { EntityType } from '@sharpee/world-model';
```

### Step 2: Replace Entity Creation Calls
Update all `createEntity` calls to use valid types:
```typescript
// Before
const coin = world.createEntity('gold coin', 'thing');

// After
const coin = world.createEntity('gold coin', EntityType.OBJECT);
```

### Step 3: Add Required Traits
For entities that need specific behaviors, add appropriate traits:
```typescript
// Vehicle example
const car = world.createEntity('sports car', EntityType.OBJECT);
car.add(new EntryTrait());
car.add(new ContainerTrait());

// Furniture example  
const chair = world.createEntity('wooden chair', EntityType.SUPPORTER);
chair.add(new SupporterTrait({ enterable: true }));
```

### Step 4: Verify Test Intent
Ensure that the migrated entities still serve their purpose in tests:
- Check if tests rely on specific behaviors
- Verify scope and visibility requirements
- Ensure action preconditions are met

## Files Requiring Updates

Based on grep analysis, these test files need updates:
- `tests/world-model-debug.test.ts`
- `tests/scope-debug.test.ts`
- `tests/scope-integration.test.ts`
- `tests/unit/scope/witness-system.test.ts`
- `tests/unit/scope/sensory-extensions.test.ts`
- `tests/unit/scope/scope-resolver.test.ts`
- `tests/unit/actions/exiting-golden.test.ts`
- `tests/unit/actions/entering-golden.test.ts`
- `tests/unit/actions/dropping-golden.test.ts`
- `tests/unit/actions/closing-golden.test.ts`
- `tests/unit/actions/climbing-golden.test.ts`
- `tests/unit/actions/attacking-golden.test.ts`
- `tests/unit/actions/putting-golden.test.ts`
- `tests/validation/entity-alias-resolution.test.ts`
- `tests/unit/validation/command-validator-golden.test.ts`

## Future Considerations

### Potential New Traits
Consider creating these traits to better represent entity behaviors:
- **VehicleTrait**: For objects that can be driven/piloted
- **FurnitureTrait**: Metadata about sitting/lying positions
- **FixtureTrait**: For permanently attached objects

### Helper Functions
Create test utilities to simplify common patterns:
```typescript
function createVehicle(world: WorldModel, name: string): IFEntity {
  const vehicle = world.createEntity(name, EntityType.OBJECT);
  vehicle.add(new EntryTrait());
  vehicle.add(new ContainerTrait());
  return vehicle;
}

function createFurniture(world: WorldModel, name: string, enterable = true): IFEntity {
  const furniture = world.createEntity(name, EntityType.SUPPORTER);
  furniture.add(new SupporterTrait({ enterable }));
  return furniture;
}
```

## Testing Guidelines

After migration:
1. Run all stdlib tests to ensure they pass
2. Verify that test behaviors haven't changed
3. Check that entity scoping works correctly
4. Ensure actions still have proper preconditions

## Notes

- The `'thing'` type is by far the most common invalid type
- Many "types" are really combinations of base type + traits
- This migration enforces better entity modeling practices
- Future tests should use EntityType constants from the start