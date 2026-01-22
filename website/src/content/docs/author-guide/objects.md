---
title: "Objects and Traits"
description: "Creating interactive objects using the trait system"
section: "author-guide"
order: 3
---

# Objects and Traits

Objects are things players can interact with. Traits define what an object can do.

## The Trait System

Instead of inheritance, Sharpee uses composition. Objects gain capabilities by adding traits:

```typescript
// A lamp that can be picked up and turned on
const lamp = world.createEntity('lamp', EntityType.OBJECT);
lamp.add(new IdentityTrait({ name: 'brass lamp', description: '...' }));
lamp.add(new SwitchableTrait({ isOn: false }));
lamp.add(new LightSourceTrait({ brightness: 5, requiresOn: true }));
```

## Creating Objects

### Basic Portable Object

All objects are portable by default (can be picked up):

```typescript
import {
  WorldModel,
  EntityType,
  IdentityTrait
} from '@sharpee/world-model';

const key = world.createEntity('key', EntityType.OBJECT);
key.add(new IdentityTrait({
  name: 'brass key',
  description: 'A small brass key with an ornate handle.',
  shortDescription: 'a brass key'
}));
world.moveEntity(key.id, room.id);
```

### Scenery (Non-Portable)

Use `SceneryTrait` to make something fixed in place:

```typescript
import { SceneryTrait } from '@sharpee/world-model';

const fountain = world.createEntity('fountain', EntityType.SCENERY);
fountain.add(new IdentityTrait({
  name: 'marble fountain',
  description: 'Water splashes gently in the ornate fountain.'
}));
fountain.add(new SceneryTrait());
world.moveEntity(fountain.id, courtyard.id);
```

## Common Traits Reference

### Identity and Description

Every object needs `IdentityTrait`:

```typescript
item.add(new IdentityTrait({
  name: 'golden crown',           // Display name
  aliases: ['crown', 'diadem'],   // Alternative names
  description: 'A magnificent golden crown encrusted with jewels.',
  shortDescription: 'a golden crown',  // For inventory lists
  properName: false,              // Use articles (a/the)
  article: 'a'                    // Default article
}));
```

### Containers

Objects that hold other objects:

```typescript
import { ContainerTrait, OpenableTrait } from '@sharpee/world-model';

const chest = world.createEntity('chest', EntityType.CONTAINER);
chest.add(new IdentityTrait({
  name: 'wooden chest',
  description: 'A sturdy wooden chest with iron bands.'
}));
chest.add(new ContainerTrait({
  capacity: 100,
  isTransparent: false  // Can't see contents when closed
}));
chest.add(new OpenableTrait({
  isOpen: false,
  canClose: true
}));
```

### Supporters

Objects you can put things ON (not IN):

```typescript
import { SupporterTrait } from '@sharpee/world-model';

const table = world.createEntity('table', EntityType.SUPPORTER);
table.add(new IdentityTrait({
  name: 'oak table',
  description: 'A solid oak table.'
}));
table.add(new SupporterTrait({ capacity: 50 }));
table.add(new SceneryTrait());  // Can't pick up the table
```

### Light Sources

```typescript
import { SwitchableTrait, LightSourceTrait } from '@sharpee/world-model';

const lantern = world.createEntity('lantern', EntityType.OBJECT);
lantern.add(new IdentityTrait({
  name: 'brass lantern',
  description: 'A well-crafted brass lantern.'
}));
lantern.add(new SwitchableTrait({ isOn: false }));
lantern.add(new LightSourceTrait({
  brightness: 5,
  requiresOn: true  // Only lights when switched on
}));
```

### Lockable Items

```typescript
import { LockableTrait, OpenableTrait } from '@sharpee/world-model';

// Create key first
const key = world.createEntity('key', EntityType.OBJECT);
key.add(new IdentityTrait({ name: 'iron key' }));

// Create lockable door
const door = world.createEntity('door', EntityType.OBJECT);
door.add(new IdentityTrait({ name: 'iron door' }));
door.add(new OpenableTrait({ isOpen: false }));
door.add(new LockableTrait({
  isLocked: true,
  keyId: key.id
}));
```

### Readable Items

```typescript
import { ReadableTrait } from '@sharpee/world-model';

const book = world.createEntity('book', EntityType.OBJECT);
book.add(new IdentityTrait({
  name: 'leather journal',
  description: 'A worn leather journal.'
}));
book.add(new ReadableTrait({
  text: 'Day 1: The expedition begins...',
  isReadable: true
}));
```

### Edible Items

```typescript
import { EdibleTrait } from '@sharpee/world-model';

const apple = world.createEntity('apple', EntityType.OBJECT);
apple.add(new IdentityTrait({
  name: 'red apple',
  description: 'A crisp red apple.'
}));
apple.add(new EdibleTrait({
  nutrition: 10,
  consumedOnEat: true
}));
```

### Wearable Items

```typescript
import { WearableTrait, ClothingTrait } from '@sharpee/world-model';

const cloak = world.createEntity('cloak', EntityType.OBJECT);
cloak.add(new IdentityTrait({
  name: 'velvet cloak',
  description: 'A rich velvet cloak.'
}));
cloak.add(new WearableTrait({ isWorn: false }));
cloak.add(new ClothingTrait({ slot: 'back' }));
```

## All Available Traits

| Trait | Purpose | Key Properties |
|-------|---------|----------------|
| `IdentityTrait` | Name and description | `name`, `aliases`, `description` |
| `SceneryTrait` | Fixed in place | - |
| `ContainerTrait` | Holds items inside | `capacity`, `isTransparent` |
| `SupporterTrait` | Items placed on top | `capacity` |
| `OpenableTrait` | Can open/close | `isOpen`, `canClose` |
| `LockableTrait` | Can lock/unlock | `isLocked`, `keyId` |
| `SwitchableTrait` | On/off toggle | `isOn` |
| `LightSourceTrait` | Provides illumination | `brightness`, `requiresOn` |
| `ReadableTrait` | Has text to read | `text`, `isReadable` |
| `EdibleTrait` | Can be eaten | `nutrition`, `consumedOnEat` |
| `WearableTrait` | Can be worn | `isWorn` |
| `ClothingTrait` | Clothing slot | `slot` |
| `DoorTrait` | Connects rooms | - |
| `AttachedTrait` | Attached to something | `attachedTo` |
| `PushableTrait` | Can be pushed | `isPushable` |
| `PullableTrait` | Can be pulled | `isPullable` |
| `ClimbableTrait` | Can climb on | - |
| `BreakableTrait` | Can be broken | `isBroken`, `breakMessage` |
| `EnterableTrait` | Can enter (vehicle) | - |
| `VehicleTrait` | Transportation | `isMoving` |
| `WeaponTrait` | Combat weapon | `damage`, `weaponType` |
| `CombatantTrait` | Can fight | `health`, `hostile` |
| `NpcTrait` | Non-player character | `isAlive`, `isConscious` |

## Combining Traits

Build complex objects by combining traits:

```typescript
// A treasure chest: container + openable + lockable + portable
const treasureChest = world.createEntity('treasure-chest', EntityType.CONTAINER);
treasureChest.add(new IdentityTrait({
  name: 'treasure chest',
  description: 'An ornate chest bound in gold.'
}));
treasureChest.add(new ContainerTrait({ capacity: 50 }));
treasureChest.add(new OpenableTrait({ isOpen: false }));
treasureChest.add(new LockableTrait({ isLocked: true, keyId: goldKey.id }));
// Note: No SceneryTrait, so it can be picked up
```

## Placing Items in Containers

### Open Container

```typescript
world.moveEntity(coin.id, chest.id);  // Works if chest is open
```

### Closed Container (Use AuthorModel)

```typescript
import { AuthorModel } from '@sharpee/world-model';

// Bypass "container is closed" validation during setup
const author = new AuthorModel(world.getDataStore(), world);
author.moveEntity(gem.id, closedChest.id);
```

## Custom Traits

Create story-specific traits for special behavior:

```typescript
// src/traits/magical-trait.ts
import { ITrait } from '@sharpee/world-model';

export class MagicalTrait implements ITrait {
  static readonly type = 'mystory.trait.magical';
  readonly type = MagicalTrait.type;

  constructor(
    public spellName: string,
    public charges: number = 3
  ) {}

  static is(trait: ITrait): trait is MagicalTrait {
    return trait.type === MagicalTrait.type;
  }
}

// Usage
wand.add(new MagicalTrait('fireball', 5));
```

## Checking Traits

```typescript
// Check if entity has a trait
if (entity.has(ContainerTrait)) {
  const container = entity.get(ContainerTrait);
  console.log('Capacity:', container.capacity);
}

// Get trait or undefined
const openable = entity.get(OpenableTrait);
if (openable?.isOpen) {
  // Container is open
}
```

## Best Practices

1. **Use IdentityTrait for everything**: Every object needs a name and description
2. **Combine traits thoughtfully**: A locked door needs both `OpenableTrait` and `LockableTrait`
3. **Use SceneryTrait sparingly**: Most objects should be portable
4. **Use AuthorModel for setup**: Bypass validation when placing items in closed containers
5. **Create custom traits**: For story-specific mechanics
6. **Test interactions**: Write transcript tests for key objects
