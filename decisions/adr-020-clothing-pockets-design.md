# ADR-20: Clothing and Pockets Design

**Status:** Proposed  
**Date:** 2025-01-08  
**Decision:** Use composition of existing traits for clothing with pockets

## Context

The test suite revealed ambiguity in how clothing items with pockets should work:
- Should pockets be accessible when clothing is worn vs. carried?
- Are pockets "worn" when their parent clothing is worn?
- How do we model complex clothing with multiple pockets?

Initial attempts to solve this with special logic for "worn containers" created conceptual confusion.

## Decision

We will model clothing and pockets using composition of existing traits:

1. **ClothingTrait extends WearableTrait** - Marks items as clothing (coats, pants, dresses)
2. **Pockets are separate entities** - Each pocket is its own container entity
3. **Pockets use SceneryTrait** - They cannot be removed from their parent clothing
4. **No special "worn container" logic** - Pockets are accessible through normal containment

### Example Implementation

```typescript
// Create a coat with multiple pockets
const coat = world.createEntity('Winter Coat', 'item');
coat.add(new ClothingTrait({ 
  slot: 'torso',
  material: 'wool',
  style: 'formal'
}));
coat.add(new ContainerTrait()); // Coat can contain pockets

// Create individual pockets as scenery containers
const pockets = [
  { name: 'inside left pocket', capacity: 3 },
  { name: 'inside right pocket', capacity: 3 },
  { name: 'outside left pocket', capacity: 5 },
  { name: 'outside right pocket', capacity: 5 },
  { name: 'breast pocket', capacity: 2 }
];

pockets.forEach(({ name, capacity }) => {
  const pocket = world.createEntity(name, 'container');
  pocket.add(new ContainerTrait({ capacity }));
  pocket.add(new SceneryTrait({ 
    cantTakeMessage: "The pocket is sewn into the coat."
  }));
  world.moveEntity(pocket.id, coat.id);
});
```

## Consequences

### Positive
- **Compositional** - Uses existing traits without special cases
- **Flexible** - Any pocket configuration is possible
- **Realistic** - Each pocket has individual properties
- **Discoverable** - Players might find hidden pockets
- **Simple** - No complex "worn inheritance" logic
- **Consistent** - Pockets work the same whether coat is worn or carried

### Negative
- **More entities** - Each pocket is a separate entity (but this mirrors reality)
- **Manual setup** - Creating clothing with pockets requires multiple steps
- **No automatic pocket creation** - Could be solved with factory functions

### Neutral
- Pockets being scenery means they're listed in room descriptions by default
  - This could be controlled with the `mentioned` property
- Authors need to understand the containment hierarchy

## Alternatives Considered

1. **PocketsTrait** - Rejected as it complicates the model
2. **Pockets as properties of ClothingTrait** - Too rigid for complex clothing
3. **Special "worn container" logic** - Conceptually confusing
4. **Inheritance of worn status** - Breaks trait independence

## Implementation Notes

- `getAllContents()` naturally finds pockets and their contents through recursion
- The `includeWorn` flag only affects whether worn items are included, not their contents
- Pockets can have different accessibility (some might be lockable, hidden, etc.)
- This pattern can extend to other containers (backpack compartments, box dividers)

## Related Decisions

- ADR-03: Trait System Design - We're following the composition pattern
- ADR-09: Container and Supporter Traits - Pockets are just containers
- ADR-18: Scenery Trait - Perfect for non-takeable parts
