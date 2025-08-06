# ADR-009: Deep Cloning Strategy for Entity Copies

**Date:** 2025-07-04
**Status:** Accepted
**Context:** Entity cloning implementation caused shared reference bugs

## Context

The Interactive Fiction engine requires entity cloning for numerous gameplay scenarios:
- Magic/supernatural effects (duplication spells, illusions)
- Puzzle mechanics (template items, crafting)
- Game state management (save/load, undo)
- Procedural generation (spawning, loot)
- Development tools (debugging, world building)

The initial `IFEntity.clone()` implementation used shallow copying:
```typescript
clone(newId: string): IFEntity {
  const cloned = new IFEntity(newId, this.type, {
    attributes: { ...this.attributes },  // Shallow copy - PROBLEM!
    relationships: JSON.parse(JSON.stringify(this.relationships))
  });
  
  // Clone traits (shallow copy for now)
  for (const [type, trait] of this.traits) {
    cloned.traits.set(type, { ...trait });  // Shallow copy - PROBLEM!
  }
  
  return cloned;
}
```

This caused critical bugs where modifying a clone would affect the original:
```typescript
const sword = createSword();
sword.attributes.enchantments = ['fire'];

const duplicate = sword.clone('sword-2');
duplicate.attributes.enchantments.push('frost');

// BUG: Original sword now has frost too!
// sword.attributes.enchantments = ['fire', 'frost']
```

## Decision

Implement deep cloning for all entity data using JSON serialization:

```typescript
clone(newId: string): IFEntity {
  const cloned = new IFEntity(newId, this.type, {
    attributes: JSON.parse(JSON.stringify(this.attributes)),
    relationships: JSON.parse(JSON.stringify(this.relationships))
  });
  
  // Clone traits (deep copy)
  for (const [type, trait] of this.traits) {
    cloned.traits.set(type, JSON.parse(JSON.stringify(trait)));
  }
  
  return cloned;
}
```

## Consequences

### Positive
- **True Independence**: Clones are completely independent entities
- **Predictable Behavior**: No surprising side effects from shared state
- **Consistency**: All entity data uses the same cloning approach
- **Simplicity**: No external dependencies, uses standard JSON methods
- **IF-Appropriate**: Matches mental model of "duplicating" objects in games

### Negative
- **Performance**: JSON serialization slower than spread operator
  - *Mitigation*: IF entities are small, impact negligible
- **Serialization Limits**:
  - Functions are stripped (not cloned)
  - Dates become strings
  - `undefined` values removed
  - Circular references throw errors
  - *Mitigation*: Entity data should be serializable by design
- **Type Information Loss**: Custom classes become plain objects
  - *Mitigation*: Traits should store data, not behavior

## Implementation

Already implemented in commit fixing test failures. The change was minimal:
- Replace spread operators with `JSON.parse(JSON.stringify(...))`
- Update comment from "shallow copy for now" to "deep copy"
- All tests now pass with proper deep cloning behavior

## Alternatives Considered

1. **Keep Shallow Clone**
   - Rejected: Causes bugs in every cloning use case
   
2. **Custom Deep Clone Function**
   - Rejected: More complex, needs maintenance
   - JSON approach is proven and sufficient
   
3. **External Library (lodash.cloneDeep)**
   - Rejected: Unnecessary dependency
   - JSON serialization meets our needs

4. **Hybrid Approach**
   - Rejected: Inconsistency would confuse developers
   - All-or-nothing is clearer

## References
- Test failure in `test-wm-20250704-131607.log`
- IF use cases discussion in implementation chat
- Existing pattern: relationships already used JSON deep copy
