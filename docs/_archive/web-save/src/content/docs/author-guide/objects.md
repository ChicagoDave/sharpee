---
title: "Objects and Traits"
description: "Creating interactive objects using the trait system"
---

Objects are things players can interact with. Traits define what an object can do.

## The Trait System

Instead of inheritance, Sharpee uses composition. Objects gain capabilities by adding traits:

```typescript
import { EntityType, IdentityTrait, SwitchableTrait, LightSourceTrait } from '@sharpee/world-model';

// A lamp that can be picked up and turned on
const lamp = world.createEntity('lamp', EntityType.ITEM);
lamp.add(new IdentityTrait({ name: 'brass lamp', description: 'A well-worn brass lamp.' }));
lamp.add(new SwitchableTrait({ isOn: false }));
lamp.add(new LightSourceTrait({ brightness: 5, requiresOn: true }));
```

## Creating Objects

### Basic Portable Object

All items are portable by default (can be picked up):

```typescript
import { EntityType, IdentityTrait } from '@sharpee/world-model';

const key = world.createEntity('key', EntityType.ITEM);
key.add(new IdentityTrait({
  name: 'brass key',
  description: 'A small brass key with an ornate handle.',
  aliases: ['key', 'brass key'],
}));
world.moveEntity(key.id, room.id);
```

### Scenery (Non-Portable)

Use `SceneryTrait` to make something fixed in place:

```typescript
import { EntityType, IdentityTrait, SceneryTrait } from '@sharpee/world-model';

const fountain = world.createEntity('fountain', EntityType.SCENERY);
fountain.add(new IdentityTrait({
  name: 'marble fountain',
  description: 'Water splashes gently in the ornate fountain.',
}));
fountain.add(new SceneryTrait());
world.moveEntity(fountain.id, courtyard.id);
```

### Containers

Objects that hold other objects:

```typescript
import { ContainerTrait, OpenableTrait } from '@sharpee/world-model';

const chest = world.createEntity('chest', EntityType.CONTAINER);
chest.add(new IdentityTrait({
  name: 'wooden chest',
  description: 'A sturdy wooden chest with iron bands.',
}));
chest.add(new ContainerTrait({ capacity: { maxItems: 10 }, isTransparent: false }));
chest.add(new OpenableTrait({ isOpen: false }));
```

### Supporters

Objects you can put things ON (not IN):

```typescript
import { SupporterTrait } from '@sharpee/world-model';

const table = world.createEntity('table', EntityType.SCENERY);
table.add(new IdentityTrait({ name: 'oak table', description: 'A solid oak table.' }));
table.add(new SupporterTrait({ capacity: 50 }));
table.add(new SceneryTrait());  // Can't pick up the table
```

### Light Sources

```typescript
import { SwitchableTrait, LightSourceTrait } from '@sharpee/world-model';

const lantern = world.createEntity('lantern', EntityType.ITEM);
lantern.add(new IdentityTrait({ name: 'brass lantern', description: 'A well-crafted brass lantern.' }));
lantern.add(new SwitchableTrait({ isOn: false }));
lantern.add(new LightSourceTrait({ brightness: 5, requiresOn: true }));
```

### Lockable Items

```typescript
import { LockableTrait, OpenableTrait } from '@sharpee/world-model';

// Create key first
const key = world.createEntity('key', EntityType.ITEM);
key.add(new IdentityTrait({ name: 'iron key' }));

// Create lockable door
const door = world.createEntity('door', EntityType.DOOR);
door.add(new IdentityTrait({ name: 'iron door' }));
door.add(new OpenableTrait({ isOpen: false }));
door.add(new LockableTrait({ isLocked: true, keyId: key.id }));
```

### Readable Items

```typescript
import { ReadableTrait } from '@sharpee/world-model';

const book = world.createEntity('book', EntityType.ITEM);
book.add(new IdentityTrait({ name: 'leather journal', description: 'A worn leather journal.' }));
book.add(new ReadableTrait({ text: 'Day 1: The expedition begins...' }));
```

### Wearable Items

```typescript
import { WearableTrait } from '@sharpee/world-model';

const cloak = world.createEntity('cloak', EntityType.ITEM);
cloak.add(new IdentityTrait({ name: 'velvet cloak', description: 'A rich velvet cloak.' }));
cloak.add(new WearableTrait({ isWorn: false }));
```

### Edible Items

```typescript
import { EdibleTrait } from '@sharpee/world-model';

const apple = world.createEntity('apple', EntityType.ITEM);
apple.add(new IdentityTrait({ name: 'red apple', description: 'A crisp red apple.' }));
apple.add(new EdibleTrait({ nutrition: 10, consumedOnEat: true }));
```

## Placing Items in Containers

### Open Container

```typescript
world.moveEntity(coin.id, chest.id);  // Works if chest is open
```

### Closed Container (Use AuthorModel)

During world setup, use `AuthorModel` to bypass "container is closed" validation:

```typescript
import { AuthorModel } from '@sharpee/world-model';

const author = new AuthorModel(world.getDataStore(), world);
author.moveEntity(gem.id, closedChest.id);  // Works even though chest is closed
```

Use `AuthorModel` when:
- Placing items in closed containers during setup
- Implementing special mechanics (magic, teleportation)
- Writing tests that need to bypass game rules

## All Available Traits

| Trait | Purpose | Key Properties |
|-------|---------|----------------|
| `IdentityTrait` | Name and description | `name`, `aliases`, `description` |
| `SceneryTrait` | Fixed in place, non-portable | — |
| `ContainerTrait` | Holds items inside | `capacity`, `isTransparent` |
| `SupporterTrait` | Items placed on top | `capacity` |
| `OpenableTrait` | Can open/close | `isOpen` |
| `LockableTrait` | Can lock/unlock | `isLocked`, `keyId` |
| `SwitchableTrait` | On/off toggle | `isOn` |
| `LightSourceTrait` | Provides illumination | `brightness`, `requiresOn` |
| `ReadableTrait` | Has text to read | `text` |
| `EdibleTrait` | Can be eaten | `nutrition`, `consumedOnEat` |
| `WearableTrait` | Can be worn | `isWorn` |
| `DoorTrait` | Connects rooms | — |
| `ClimbableTrait` | Can climb on | — |
| `PushableTrait` | Can be pushed | — |
| `PullableTrait` | Can be pulled | — |
| `BreakableTrait` | Can be broken | `isBroken` |
| `EnterableTrait` | Can enter (vehicle, bed) | — |
| `WeaponTrait` | Combat weapon | `damage`, `weaponType` |
| `CombatantTrait` | Can fight | `health`, `skill`, `hostile` |
| `NpcTrait` | Non-player character | `isAlive`, `isConscious` |
| `AttachedTrait` | Attached to something | `attachedTo` |
| `ButtonTrait` | Pressable button | — |

## Combining Traits

Build complex objects by combining traits:

```typescript
// A treasure chest: container + openable + lockable + portable
const treasureChest = world.createEntity('treasure-chest', EntityType.CONTAINER);
treasureChest.add(new IdentityTrait({
  name: 'treasure chest',
  description: 'An ornate chest bound in gold.',
}));
treasureChest.add(new ContainerTrait({ capacity: { maxItems: 50 } }));
treasureChest.add(new OpenableTrait({ isOpen: false }));
treasureChest.add(new LockableTrait({ isLocked: true, keyId: goldKey.id }));
// No SceneryTrait — so it can be picked up
```

## Custom Traits

Create story-specific traits for special behavior:

```typescript
// src/traits/magical-trait.ts
import { ITrait } from '@sharpee/world-model';

export class MagicalTrait implements ITrait {
  static readonly type = 'mystory.trait.magical';
  readonly type = MagicalTrait.type;

  spellName: string;
  charges: number;

  constructor(data?: { spellName?: string; charges?: number }) {
    this.spellName = data?.spellName ?? 'unknown';
    this.charges = data?.charges ?? 3;
  }
}

// Usage
wand.add(new MagicalTrait({ spellName: 'fireball', charges: 5 }));
```

## Checking Traits

```typescript
// Check if entity has a trait
const container = entity.get(ContainerTrait);
if (container) {
  console.log('Capacity:', container.capacity);
}

// Check openable state
const openable = entity.get(OpenableTrait);
if (openable?.isOpen) {
  // Container is open
}
```

## Best Practices

1. **Every object needs `IdentityTrait`** — name and description are required
2. **Combine traits thoughtfully** — a locked door needs both `OpenableTrait` and `LockableTrait`
3. **Use `SceneryTrait` for fixed objects** — furniture, fixtures, landscape features
4. **Use `AuthorModel` for setup** — bypass validation when placing items in closed containers
5. **Create custom traits** for story-specific mechanics
6. **Keep objects in their region file** — don't separate rooms and objects into different directories
