# Trait Behavior Guidelines

## Core Architecture

### Trait vs Behavior Separation
- **Trait**: Holds state/data only
- **Behavior**: Contains all mutation logic and business rules
- **Action**: Orchestrates behaviors, never mutates directly

### Behavior Responsibilities

Each behavior class should:
1. **Validate** before mutating
2. **Mutate** atomically (all or nothing)
3. **Emit** events for extensibility
4. **Return** success/failure status
5. **Maintain** consistency across related entities

## Behavior Method Patterns

### Standard Mutation Pattern
```typescript
class SomeBehavior {
  mutateState(entity: Entity, newValue: any): boolean {
    // 1. Validate preconditions
    if (!this.canMutate(entity, newValue)) {
      return false;
    }
    
    // 2. Store original state (for rollback)
    const originalState = entity.trait.value;
    
    // 3. Perform mutation
    entity.trait.value = newValue;
    
    // 4. Update related entities
    this.updateRelated(entity);
    
    // 5. Emit event
    this.emit('trait.mutated', { entity, oldValue: originalState, newValue });
    
    // 6. Return success
    return true;
  }
}
```

### Validation Pattern
```typescript
canMutate(entity: Entity, newValue: any): boolean {
  // Check entity has required trait
  if (!entity.hasTrait(TraitType.REQUIRED)) {
    return false;
  }
  
  // Check business rules
  if (!this.isValidValue(newValue)) {
    return false;
  }
  
  // Check relationships
  if (!this.areRelationshipsValid(entity)) {
    return false;
  }
  
  return true;
}
```

### Relationship Management Pattern
```typescript
moveEntity(entity: Entity, newParent: Entity): boolean {
  // 1. Validate move
  if (!this.canMove(entity, newParent)) {
    return false;
  }
  
  // 2. Update old parent
  const oldParent = this.getParent(entity);
  if (oldParent) {
    this.removeChild(oldParent, entity);
  }
  
  // 3. Update entity
  entity.identity.parent = newParent.id;
  
  // 4. Update new parent
  this.addChild(newParent, entity);
  
  // 5. Emit events
  this.emit('entity.moved', { entity, from: oldParent, to: newParent });
  
  return true;
}
```

## Common Behavior Patterns

### Container Operations
```typescript
class ContainerBehavior {
  // Add item to container
  addItem(container: Entity, item: Entity): boolean {
    if (!container.hasTrait(TraitType.CONTAINER)) return false;
    if (!this.canContain(container, item)) return false;
    
    container.container.contents.push(item.id);
    item.identity.parent = container.id;
    
    this.emit('container.itemAdded', { container, item });
    return true;
  }
  
  // Remove item from container
  removeItem(container: Entity, item: Entity): boolean {
    const index = container.container.contents.indexOf(item.id);
    if (index === -1) return false;
    
    container.container.contents.splice(index, 1);
    item.identity.parent = null;
    
    this.emit('container.itemRemoved', { container, item });
    return true;
  }
}
```

### State Toggle Operations
```typescript
class SwitchableBehavior {
  switchOn(entity: Entity): boolean {
    if (!entity.hasTrait(TraitType.SWITCHABLE)) return false;
    if (entity.switchable.isOn) return false;
    
    entity.switchable.isOn = true;
    this.emit('switchable.turnedOn', { entity });
    return true;
  }
  
  switchOff(entity: Entity): boolean {
    if (!entity.hasTrait(TraitType.SWITCHABLE)) return false;
    if (!entity.switchable.isOn) return false;
    
    entity.switchable.isOn = false;
    this.emit('switchable.turnedOff', { entity });
    return true;
  }
}
```

### Inventory Management
```typescript
class ActorBehavior {
  take(actor: Entity, item: Entity): boolean {
    if (!actor.hasTrait(TraitType.ACTOR)) return false;
    if (item.hasTrait(TraitType.SCENERY)) return false;
    
    // Remove from current location
    const parent = this.getParent(item);
    if (parent) {
      this.removeFromParent(parent, item);
    }
    
    // Add to inventory
    actor.actor.inventory.push(item.id);
    item.identity.parent = actor.id;
    
    this.emit('actor.tookItem', { actor, item });
    return true;
  }
}
```

## Error Handling

### Return Values
- **Boolean**: For simple success/failure
- **Result<T>**: For operations that return data
- **ValidationResult**: For detailed validation feedback

### Error Messages
Store error messages in behaviors, not actions:
```typescript
class ContainerBehavior {
  getError(reason: string): string {
    const messages = {
      'full': "The container is full.",
      'tooBig': "That's too big to fit.",
      'closed': "The container is closed."
    };
    return messages[reason] || "You can't do that.";
  }
}
```

## Event System Integration

### Event Emission
```typescript
class Behavior {
  protected emit(eventType: string, data: any): void {
    EventBus.emit(eventType, {
      ...data,
      timestamp: Date.now(),
      behaviorType: this.constructor.name
    });
  }
}
```

### Extensibility Hooks
```typescript
class OpenableBehavior {
  open(entity: Entity): boolean {
    // Pre-open hook
    if (!this.emit('openable.beforeOpen', { entity, cancelable: true })) {
      return false;
    }
    
    // Perform operation
    entity.openable.isOpen = true;
    
    // Post-open hook
    this.emit('openable.afterOpen', { entity });
    
    return true;
  }
}
```

## Testing Behaviors

### Unit Test Structure
```typescript
describe('ContainerBehavior', () => {
  it('should add item to container', () => {
    const container = createEntity({ container: { contents: [] } });
    const item = createEntity();
    
    const result = behavior.addItem(container, item);
    
    expect(result).toBe(true);
    expect(container.container.contents).toContain(item.id);
    expect(item.identity.parent).toBe(container.id);
  });
  
  it('should not add item to full container', () => {
    const container = createEntity({ 
      container: { contents: [], capacity: 0 } 
    });
    const item = createEntity();
    
    const result = behavior.addItem(container, item);
    
    expect(result).toBe(false);
    expect(container.container.contents).not.toContain(item.id);
  });
});
```

## Anti-Patterns to Avoid

### ❌ Direct Mutation in Actions
```typescript
// WRONG
execute(context: ActionContext) {
  target.parent = actor.id;  // Direct mutation
}
```

### ❌ Validation in Actions
```typescript
// WRONG
validate(context: ActionContext) {
  if (container.contents.length >= container.capacity) {
    return { valid: false };  // Should be in behavior
  }
}
```

### ❌ Partial Updates
```typescript
// WRONG
moveItem(item, newParent) {
  item.parent = newParent.id;
  // Forgot to update newParent.children!
}
```

### ❌ No Event Emission
```typescript
// WRONG
open(entity) {
  entity.isOpen = true;
  // No event emitted - not extensible
}
```

## Best Practices

1. **Atomic Operations**: Either complete fully or rollback
2. **Consistent State**: Never leave entities in inconsistent state
3. **Event-Driven**: Always emit events for extensibility
4. **Validate First**: Check all preconditions before mutating
5. **Test Thoroughly**: Test success, failure, and edge cases
6. **Document Assumptions**: Be clear about preconditions
7. **Use TypeScript**: Leverage types for safety
8. **Keep It Simple**: One behavior, one responsibility