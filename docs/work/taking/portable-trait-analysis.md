# PortableTrait Analysis for Taking Action

## Current System
- **Default**: Objects are portable/takeable by default
- **SceneryTrait**: Marks objects as fixed/not takeable
- **No PortableTrait**: Portability is implicit (absence of SceneryTrait)

## Option 1: Keep Current System (No PortableTrait)

### How Mutations Work
```typescript
// Taking action
ActorBehavior.take(actor, item) {
  // Check if item has SceneryTrait
  if (item.has(TraitType.SCENERY)) {
    return false; // Can't take
  }
  
  // Move to actor's inventory
  IdentityBehavior.move(item, actor);
  actor.inventory.add(item.id);
  return true;
}
```

### Pros
- Simple, follows IF conventions
- No migration needed
- Less traits to manage
- Clear semantics: scenery = fixed

### Cons
- No explicit state for portable items
- Can't track portable-specific data easily
- Making something portable/fixed requires adding/removing SceneryTrait

## Option 2: Add Explicit PortableTrait

### Design
```typescript
interface PortableTrait {
  type: TraitType.PORTABLE;
  weight?: number;
  size?: number;
  bulk?: number;
  twoHanded?: boolean;
}
```

### How Mutations Work
```typescript
// Taking action
PortableBehavior.take(actor, item) {
  if (!item.has(TraitType.PORTABLE)) {
    return false; // Not portable
  }
  
  const portable = item.get(TraitType.PORTABLE);
  // Check weight/size constraints
  if (!ActorBehavior.canCarry(actor, portable)) {
    return false;
  }
  
  // Move to inventory
  IdentityBehavior.move(item, actor);
  return true;
}

// Making something portable at runtime
PortableBehavior.makePortable(item) {
  if (item.has(TraitType.SCENERY)) {
    item.removeTrait(TraitType.SCENERY);
  }
  item.addTrait(new PortableTrait());
}
```

### Pros
- Explicit state management
- Can track weight, size, bulk
- Clear mutation points
- Runtime changes are explicit

### Cons
- Breaks "portable by default" convention
- Requires migration of all takeable objects
- More complex than necessary?

## Option 3: Hybrid Approach

### Design
- Keep "portable by default" (no trait needed)
- Add optional PortableTrait for items with special properties
- SceneryTrait still marks fixed items

### How It Works
```typescript
// Check if portable
function isPortable(item: Entity): boolean {
  // Scenery is never portable
  if (item.has(TraitType.SCENERY)) return false;
  
  // Everything else is portable by default
  return true;
}

// Get portable properties
function getPortableProperties(item: Entity) {
  if (item.has(TraitType.PORTABLE)) {
    return item.get(TraitType.PORTABLE);
  }
  // Default properties
  return { weight: 1, size: 'small' };
}

// Taking action uses both
ActorBehavior.take(actor, item) {
  if (!isPortable(item)) return false;
  
  const props = getPortableProperties(item);
  if (!this.canCarry(actor, props)) return false;
  
  IdentityBehavior.move(item, actor);
  return true;
}
```

### Pros
- Maintains backward compatibility
- Explicit when needed, implicit when not
- Can add properties without requiring trait on everything
- Follows IF conventions

### Cons
- Two ways to check portability
- Slightly more complex logic

## Option 4: Use Existing Traits

### Design
Instead of PortableTrait, use existing traits for mutations:
- **IdentityTrait**: Already has parent/location
- **ActorTrait**: Already has inventory
- **SceneryTrait**: Already marks fixed items

### How Mutations Work
```typescript
// IdentityBehavior handles all movement
IdentityBehavior.moveToInventory(item, actor) {
  if (item.has(TraitType.SCENERY)) {
    throw new Error("Cannot move scenery");
  }
  
  // Update parent/child relationships
  const oldParent = this.getParent(item);
  if (oldParent) {
    this.removeChild(oldParent, item);
  }
  
  item.identity.parent = actor.id;
  actor.identity.children.push(item.id);
  
  // Update actor's inventory
  if (actor.has(TraitType.ACTOR)) {
    actor.actor.inventory.push(item.id);
  }
  
  // Emit events for witness system
  this.emit('entity.moved', { 
    entity: item, 
    from: oldParent, 
    to: actor,
    toInventory: true 
  });
}
```

### Pros
- No new traits needed
- Leverages existing infrastructure
- Clear separation of concerns
- Witness system tracks changes

### Cons
- No place for weight/size properties
- Taking logic spread across behaviors

## Recommendation

**Option 4 (Use Existing Traits) with Option 3 fallback**

1. **Primary approach**: Use IdentityBehavior for all movement mutations
   - Clean, uses existing infrastructure
   - Witness system automatically tracks changes
   - No context pollution needed

2. **If we need properties**: Add optional PortableTrait later
   - Only for items that need weight/size/bulk
   - Maintains backward compatibility
   - Can be added incrementally

3. **For taking action specifically**:
   ```typescript
   validate(context) {
     // Check SceneryTrait
     if (noun.has(TraitType.SCENERY)) {
       return { valid: false, error: 'fixed_in_place' };
     }
     // Other validations...
   }
   
   execute(context) {
     const actor = context.player;
     const item = context.command.directObject.entity;
     
     // Check and remove if worn
     if (item.has(TraitType.WEARABLE) && item.wearable.worn) {
       WearableBehavior.remove(item, actor);
     }
     
     // Use IdentityBehavior for the actual move
     IdentityBehavior.moveToInventory(item, actor);
     // Witness system automatically tracks the change
   }
   
   report(context) {
     // Get state from witness system or world model
     // No need for _previousLocation on context
     const currentLocation = context.world.getLocation(item.id);
     // Generate events based on current state
   }
   ```

## Questions to Resolve

1. **Do we need weight/size system now?**
   - If yes, consider PortableTrait
   - If no, stick with existing traits

2. **Will items change portable/fixed state at runtime?**
   - If yes, need clear mutation pattern
   - If no, simpler static approach works

3. **How does witness system track inventory changes?**
   - Does it track parent changes?
   - Does it track inventory list changes?
   - Do we need special inventory events?