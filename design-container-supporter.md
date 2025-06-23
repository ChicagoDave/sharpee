# Container and Supporter System Design

## Overview

Containers and supporters are fundamental to IF games for managing object locations and interactions. This design covers the core scenarios while keeping the system simple and extensible.

## Core Scenarios

### Container Scenarios

1. **Portable Container** (satchel)
   - Can be carried by player
   - Has weight/volume limits
   - Contents hidden when closed

2. **Fixed Container** (chest, medicine cabinet)
   - Too heavy/attached to be taken (scenery)
   - Can be locked and unlocked
   - May be transparent (glass cabinet)

3. **Nested Containers** (bag in chest)
   - Containers can contain other containers
   - Must prevent containment loops
   - Weight accumulates up the chain

### Supporter Scenarios

4. **Simple Supporter** (table, shelf)
   - Objects placed ON surface
   - Contents always visible
   - May have weight limit

5. **Multi-part Supporter** (bookshelf with shelves)
   - Multiple surfaces on one object
   - Each surface has own capacity

6. **Nested Supporters** (tray on table)
   - Supporters can be on supporters
   - Creates object hierarchies

### Hybrid Scenarios

7. **Container + Supporter** (canoe)
   - Put supplies IN it (container)
   - Sit ON/IN it (supporter)
   - Single object with both behaviors

8. **Enterable Spaces** (bed, bathtub, large crate)
   - Player can enter/exit
   - Functions as container for actor
   - May restrict actions while inside

## Design Decisions

### 1. Container vs Supporter Distinction

**Container**: Objects go INSIDE
- Contents can be hidden (when closed)
- Usually has volume constraints
- Protects contents from environment

**Supporter**: Objects go ON TOP
- Contents always visible and accessible
- Only weight constraints (surface area)
- Objects exposed to environment

### 2. Dual-Trait Support

Objects CAN have both Container and Supporter traits:
- Canoe: equipment goes inside, people sit on top
- Desk: drawers are containers, surface is supporter
- Each trait operates independently

### 3. Multi-part Objects

Use sub-entities for complex objects:
- Bookshelf has related shelf entities
- Desk has drawer entities
- Maintains simple trait model while enabling complexity

### 4. Enterable Spaces

Containers/supporters with `enterable` flag:
- Allows actors to enter/exit
- No special "Vehicle" or "Furniture" traits needed
- Simple flag covers beds, chairs, vehicles, etc.

## World-Model Implementation

### Container Trait

```typescript
// world-model/src/traits/container/containerTrait.ts
interface ContainerTrait extends ValidatedTrait {
  type: TraitType.CONTAINER;
  
  // Capacity constraints
  capacity?: {
    maxWeight?: number;    // Total weight limit (kg)
    maxVolume?: number;    // Total volume limit (liters)
    maxItems?: number;     // Simple item count limit
  };
  
  // Behavior flags
  isTransparent?: boolean;   // Can see contents when closed
  enterable?: boolean;       // Actors can enter this container
  
  // Restrictions
  allowedTypes?: string[];   // Only these entity types allowed
  excludedTypes?: string[];  // These entity types not allowed
}
```

### Supporter Trait

```typescript
// world-model/src/traits/supporter/supporterTrait.ts
interface SupporterTrait extends ValidatedTrait {
  type: TraitType.SUPPORTER;
  
  // Capacity constraints
  capacity?: {
    maxWeight?: number;    // Total weight limit (kg)
    maxItems?: number;     // How many items fit on surface
  };
  
  // Behavior flags
  enterable?: boolean;      // Actors can sit/stand/lie on this
  
  // Restrictions  
  allowedTypes?: string[];  // Only these entity types allowed
  excludedTypes?: string[]; // These entity types not allowed
}
```

### Container Behavior

```typescript
// world-model/src/traits/container/containerBehavior.ts
export class ContainerBehavior {
  /**
   * Check if container can accept an item
   */
  static canAccept(container: IFEntity, item: IFEntity, world: IWorldQuery): boolean | string {
    const trait = container.get<ContainerTrait>(TraitType.CONTAINER);
    if (!trait) return "Not a container";
    
    // Check if container is accessible
    if (container.has(TraitType.OPENABLE) && !container.isOpen) {
      return "Container is closed";
    }
    
    // Check type restrictions
    if (trait.allowedTypes && !trait.allowedTypes.includes(item.type)) {
      return "Container cannot hold that type of object";
    }
    
    if (trait.excludedTypes && trait.excludedTypes.includes(item.type)) {
      return "Container cannot hold that type of object";
    }
    
    // Check enterable restrictions
    if (item.has(TraitType.ACTOR) && !trait.enterable) {
      return "Cannot enter this container";
    }
    
    // Check capacity
    if (trait.capacity) {
      const result = this.checkCapacity(container, item, world);
      if (result !== true) return result;
    }
    
    return true;
  }
  
  /**
   * Check capacity constraints
   */
  static checkCapacity(container: IFEntity, item: IFEntity, world: IWorldQuery): boolean | string {
    const trait = container.get<ContainerTrait>(TraitType.CONTAINER)!;
    const capacity = trait.capacity!;
    
    if (capacity.maxItems) {
      const currentCount = world.getContents(container.id).length;
      if (currentCount >= capacity.maxItems) {
        return "Container is full";
      }
    }
    
    if (capacity.maxWeight) {
      const currentWeight = this.getTotalWeight(container, world);
      const itemWeight = item.get<IdentityTrait>(TraitType.IDENTITY)?.weight || 0;
      if (currentWeight + itemWeight > capacity.maxWeight) {
        return "Too heavy for container";
      }
    }
    
    if (capacity.maxVolume) {
      const currentVolume = this.getTotalVolume(container, world);
      const itemVolume = item.get<IdentityTrait>(TraitType.IDENTITY)?.volume || 0;
      if (currentVolume + itemVolume > capacity.maxVolume) {
        return "Too large for container";
      }
    }
    
    return true;
  }
  
  /**
   * Get total weight of contents (not recursive - container bears the weight)
   */
  static getTotalWeight(container: IFEntity, world: IWorldQuery): number {
    const contents = world.getContents(container.id);
    return contents.reduce((sum, item) => {
      const identity = item.get<IdentityTrait>(TraitType.IDENTITY);
      return sum + (identity?.weight || 0);
    }, 0);
  }
  
  /**
   * Get total volume of contents
   */
  static getTotalVolume(container: IFEntity, world: IWorldQuery): number {
    const contents = world.getContents(container.id);
    return contents.reduce((sum, item) => {
      const identity = item.get<IdentityTrait>(TraitType.IDENTITY);
      return sum + (identity?.volume || 0);
    }, 0);
  }
  
  /**
   * Get remaining capacity
   */
  static getRemainingCapacity(container: IFEntity, world: IWorldQuery): {
    items?: number;
    weight?: number;
    volume?: number;
  } {
    const trait = container.get<ContainerTrait>(TraitType.CONTAINER)!;
    const result: any = {};
    
    if (trait.capacity?.maxItems) {
      const current = world.getContents(container.id).length;
      result.items = trait.capacity.maxItems - current;
    }
    
    if (trait.capacity?.maxWeight) {
      result.weight = trait.capacity.maxWeight - this.getTotalWeight(container, world);
    }
    
    if (trait.capacity?.maxVolume) {
      result.volume = trait.capacity.maxVolume - this.getTotalVolume(container, world);
    }
    
    return result;
  }
}
```

### Supporter Behavior

```typescript
// world-model/src/traits/supporter/supporterBehavior.ts
export class SupporterBehavior {
  /**
   * Check if supporter can accept an item
   */
  static canAccept(supporter: IFEntity, item: IFEntity, world: IWorldQuery): boolean | string {
    const trait = supporter.get<SupporterTrait>(TraitType.SUPPORTER);
    if (!trait) return "Not a supporter";
    
    // Check type restrictions
    if (trait.allowedTypes && !trait.allowedTypes.includes(item.type)) {
      return "Cannot put that on this surface";
    }
    
    if (trait.excludedTypes && trait.excludedTypes.includes(item.type)) {
      return "Cannot put that on this surface";
    }
    
    // Check enterable restrictions
    if (item.has(TraitType.ACTOR) && !trait.enterable) {
      return "Cannot sit/stand on this";
    }
    
    // Check capacity
    if (trait.capacity) {
      const result = this.checkCapacity(supporter, item, world);
      if (result !== true) return result;
    }
    
    return true;
  }
  
  /**
   * Check capacity constraints
   */
  static checkCapacity(supporter: IFEntity, item: IFEntity, world: IWorldQuery): boolean | string {
    const trait = supporter.get<SupporterTrait>(TraitType.SUPPORTER)!;
    const capacity = trait.capacity!;
    
    if (capacity.maxItems) {
      const currentCount = world.getContents(supporter.id).length;
      if (currentCount >= capacity.maxItems) {
        return "No room on surface";
      }
    }
    
    if (capacity.maxWeight) {
      const currentWeight = this.getTotalWeight(supporter, world);
      const itemWeight = item.get<IdentityTrait>(TraitType.IDENTITY)?.weight || 0;
      if (currentWeight + itemWeight > capacity.maxWeight) {
        return "Too heavy for surface";
      }
    }
    
    return true;
  }
  
  /**
   * Get total weight on supporter
   */
  static getTotalWeight(supporter: IFEntity, world: IWorldQuery): number {
    const contents = world.getContents(supporter.id);
    return contents.reduce((sum, item) => {
      // For supporters, we count total weight including nested contents
      return sum + world.getTotalWeight(item);
    }, 0);
  }
}
```

### Enhanced Identity Trait

```typescript
// world-model/src/traits/identity/identityTrait.ts
interface IdentityTrait extends ValidatedTrait {
  type: TraitType.IDENTITY;
  name: string;
  description?: string;
  
  // Physical properties for container/supporter calculations
  weight?: number;        // in kg
  volume?: number;        // in liters
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'huge';
}
```

## Usage Examples

### Example 1: Satchel (Portable Container)

```typescript
const satchel = new IFEntity('satchel', 'container');
satchel.add({
  type: TraitType.IDENTITY,
  name: 'leather satchel',
  description: 'A well-worn leather satchel with brass buckles.',
  weight: 0.5,
  volume: 10
});
satchel.add({
  type: TraitType.CONTAINER,
  capacity: {
    maxWeight: 5,    // Can hold 5kg
    maxVolume: 8     // Has 8L internal volume
  }
});
satchel.add({
  type: TraitType.OPENABLE,
  isOpen: false
});
```

### Example 2: Kitchen Table (Supporter)

```typescript
const table = new IFEntity('kitchen-table', 'supporter');
table.add({
  type: TraitType.IDENTITY,
  name: 'kitchen table',
  description: 'A sturdy wooden table.',
  weight: 30
});
table.add({
  type: TraitType.SUPPORTER,
  capacity: {
    maxWeight: 50,   // Can support 50kg
    maxItems: 10     // Limited surface area
  }
});
table.add({
  type: TraitType.SCENERY  // Can't be taken
});
```

### Example 3: Canoe (Hybrid)

```typescript
const canoe = new IFEntity('canoe', 'vehicle');
canoe.add({
  type: TraitType.IDENTITY,
  name: 'wooden canoe',
  description: 'A sturdy wooden canoe.',
  weight: 40,
  size: 'large'
});
canoe.add({
  type: TraitType.CONTAINER,
  capacity: {
    maxWeight: 50,   // Can hold 50kg of supplies
    maxVolume: 100   // Plenty of space inside
  }
});
canoe.add({
  type: TraitType.SUPPORTER,
  capacity: {
    maxWeight: 200   // Can support 200kg (people + cargo)
  },
  enterable: true    // Can sit in it
});
```

### Example 4: Bookshelf with Shelves

```typescript
// Main bookshelf
const bookshelf = new IFEntity('bookshelf', 'furniture');
bookshelf.add({
  type: TraitType.IDENTITY,
  name: 'wooden bookshelf',
  description: 'A tall bookshelf with three shelves.'
});
bookshelf.add({ type: TraitType.SCENERY });

// Individual shelves
const shelves = ['top', 'middle', 'bottom'];
for (const shelfName of shelves) {
  const shelf = new IFEntity(`${shelfName}-shelf`, 'supporter');
  shelf.add({
    type: TraitType.IDENTITY,
    name: `${shelfName} shelf`,
    description: `The ${shelfName} shelf of the bookshelf.`
  });
  shelf.add({
    type: TraitType.SUPPORTER,
    capacity: { maxItems: 10 }
  });
  shelf.add({ type: TraitType.SCENERY });
  
  // Create relationship
  bookshelf.relationships.parts = bookshelf.relationships.parts || [];
  bookshelf.relationships.parts.push(shelf.id);
  shelf.relationships.partOf = [bookshelf.id];
  
  // Place shelf in same room as bookshelf
  world.moveEntity(shelf.id, world.getLocation(bookshelf.id));
}
```

### Example 5: Enterable Container (Bathtub)

```typescript
const bathtub = new IFEntity('bathtub', 'fixture');
bathtub.add({
  type: TraitType.IDENTITY,
  name: 'bathtub',
  description: 'A large porcelain bathtub.'
});
bathtub.add({
  type: TraitType.CONTAINER,
  enterable: true,         // Can get in
  capacity: {
    maxItems: 3,           // Limited space when someone's in it
    maxWeight: 150         // Weight limit for safety
  }
});
bathtub.add({ type: TraitType.SCENERY });
```

## StdLib Integration

### Inventory Service Updates

```typescript
// Check container/supporter before transfer
transfer(item: IFEntity, from: IFEntity | null, to: IFEntity): boolean | string {
  if (to.has(TraitType.CONTAINER)) {
    const result = ContainerBehavior.canAccept(to, item, this.world);
    if (result !== true) return result;
  } else if (to.has(TraitType.SUPPORTER)) {
    const result = SupporterBehavior.canAccept(to, item, this.world);
    if (result !== true) return result;
  } else if (!to.has(TraitType.ROOM) && !to.has(TraitType.ACTOR)) {
    return "Cannot put things there";
  }
  
  // Perform transfer...
}
```

### Parser Scope Updates

```typescript
// Include contents of open/transparent containers and all supporters
getVisibleObjects(actor: IFEntity, world: IWorldQuery): IFEntity[] {
  const room = world.getLocation(actor.id);
  const visible: IFEntity[] = [];
  
  // Add objects directly in room
  visible.push(...world.getContents(room.id));
  
  // Add contents of containers/supporters
  for (const obj of visible) {
    if (obj.has(TraitType.SUPPORTER)) {
      // Supporter contents always visible
      visible.push(...world.getContents(obj.id));
    } else if (obj.has(TraitType.CONTAINER)) {
      // Container contents visible if open or transparent
      const isOpen = !obj.has(TraitType.OPENABLE) || obj.isOpen;
      const isTransparent = obj.get<ContainerTrait>(TraitType.CONTAINER)?.isTransparent;
      
      if (isOpen || isTransparent) {
        visible.push(...world.getContents(obj.id));
      }
    }
  }
  
  return visible;
}
```

## Benefits

1. **Unified location system** - Everything uses the same containment model
2. **Flexible capacity** - Weight, volume, or count limits as needed
3. **Simple hybrid objects** - Just add both traits
4. **Enterable spaces** - No special furniture/vehicle traits needed
5. **Type restrictions** - Control what can go where

## What's NOT Included (Extensions)

- Liquid containers and pouring
- Implicit containers (put X under/behind Y)
- Body positions for worn items
- Hidden compartments
- Surface properties (slippery, magnetic, hot)
- Partial containers (slots, holes)

## Migration Notes

1. Add Container and Supporter traits to world-model
2. Update InventoryService to check container/supporter constraints
3. Update visibility/scope to handle transparent containers
4. Add capacity checking to PUT/INSERT/TAKE commands
5. Handle enterable containers in GO/ENTER/EXIT commands
