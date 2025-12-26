# Trait Mutation Principles

## Core Principle
**Actions should NEVER directly mutate entity state. All mutations must go through trait behaviors.**

## Why This Matters
1. **Single Source of Truth**: Each piece of state has one owner (a trait)
2. **Consistency**: All mutations follow the same validation rules
3. **Extensibility**: Behaviors can be customized via events
4. **Testability**: Behaviors can be tested in isolation
5. **Maintainability**: State changes are predictable and traceable

## Current Trait System

### Object Portability
- **Default**: Objects are takeable/portable by default
- **Fixed Objects**: Use `SceneryTrait` to mark as fixed
- **No PortableTrait**: Portability is the default state

### Existing Traits and Their Responsibilities

| Trait | State Managed | Key Behaviors |
|-------|--------------|---------------|
| **Identity** | name, description, parent, children | move(), addChild(), removeChild() |
| **Container** | contents, capacity, open/closed | addItem(), removeItem(), canContain() |
| **Supporter** | supported items, enterable | addSupported(), removeSupported() |
| **Openable** | open/closed state | open(), close() |
| **Lockable** | locked state, key | lock(), unlock() |
| **Switchable** | on/off state | switchOn(), switchOff() |
| **Wearable** | worn state, wearer | wear(), remove() |
| **Edible** | consumed state | consume() |
| **Room** | exits, visited | addExit(), removeExit(), visit() |
| **Actor** | inventory, worn items | take(), drop(), wear(), remove() |
| **Door** | connected rooms, open state | open(), close(), pass() |
| **LightSource** | lit state, brightness | light(), extinguish() |
| **Readable** | text content | read() |
| **Scenery** | fixed state | (prevents taking) |
| **Climbable** | climb state, destination | climb() |

## Missing Traits/Behaviors

Based on common IF mutations, we may need:

### Potential New Traits
1. **Breakable** - For objects that can be destroyed
   - State: broken, breaksInto
   - Behaviors: break(), repair()

2. **Liquid** - For liquids and containers of liquids
   - State: volume, liquidType
   - Behaviors: pour(), fill(), empty()

3. **Countable/Stackable** - For multiple identical items
   - State: quantity
   - Behaviors: split(), combine()

4. **Sittable/Lieable** - For furniture (extends Supporter?)
   - State: occupied, occupant
   - Behaviors: sit(), stand(), lie()

5. **Vehicle** - For rideable/driveable objects
   - State: occupied, destination
   - Behaviors: enter(), exit(), drive()

## Action Refactoring Implications

When refactoring each action:

### 1. Identify All Mutations
For each action, list every state change it makes:
- What entity properties change?
- What relationships change?
- What world state changes?

### 2. Map to Trait Behaviors
For each mutation:
- Which trait owns this state?
- Does a behavior exist for this mutation?
- If not, should we:
  - Add to existing trait?
  - Create new trait?
  - Use events for custom mutations?

### 3. Never Do This
```typescript
// BAD - Direct mutation
execute(context: ActionContext): SemanticEvent[] {
  target.parent = actor.id;  // WRONG!
  actor.inventory.push(target.id);  // WRONG!
}
```

### 4. Always Do This
```typescript
// GOOD - Use trait behaviors
execute(context: ActionContext): SemanticEvent[] {
  identityBehavior.move(target, actor);  // Handles parent/children
  actorBehavior.addToInventory(actor, target);  // Handles inventory
}
```

## Event-Driven Mutations

For story-specific mutations:
1. Emit events with mutation requests
2. Let event handlers perform custom mutations
3. Use trait behaviors even in event handlers

Example:
```typescript
// Action emits event
events.push({
  type: 'taking.afterTake',
  data: { actor, object, customData }
});

// Story handler uses behaviors
on('taking.afterTake', (event) => {
  if (event.object.id === 'cursed-gem') {
    actorBehavior.curse(event.actor);  // Custom behavior
  }
});
```

## Validation in Behaviors

Behaviors should validate before mutating:
```typescript
class ContainerBehavior {
  addItem(container: Entity, item: Entity): boolean {
    // Validate first
    if (!this.canContain(container, item)) {
      return false;
    }
    // Then mutate
    container.contents.push(item.id);
    item.parent = container.id;
    return true;
  }
}
```

## Testing Strategy

For each trait behavior:
1. Test valid mutations succeed
2. Test invalid mutations fail safely
3. Test events are emitted
4. Test state consistency maintained
5. Test rollback on failure

## Migration Notes

When refactoring actions:
1. Audit all direct mutations
2. Find or create appropriate behaviors
3. Replace mutations with behavior calls
4. Test thoroughly
5. Document any new traits needed

## Red Flags in Code Review

Watch for:
- Direct property assignments (except in behaviors)
- Array push/splice outside behaviors
- Parent/child manipulation outside Identity
- Inventory changes outside Actor
- Any state change not through a behavior