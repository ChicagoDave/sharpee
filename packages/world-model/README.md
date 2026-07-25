# @sharpee/world-model

Entity system, traits, and behaviors for the Sharpee Interactive Fiction platform.

## Installation

```bash
npm install @sharpee/world-model
```

## Overview

The world model provides the foundation for game state:

- **Entities** - Rooms, objects, NPCs, and the player
- **Traits** - Composable properties (Openable, Lockable, Container, etc.)
- **Behaviors** - Reusable logic (LightSource, Wearable, Edible, etc.)
- **State Management** - A single mutable world instance tracks entity relationships; behaviors mutate trait data in place

## Usage

```typescript
import {
  WorldModel,
  IFEntity,
  OpenableTrait,
  ContainerTrait
} from '@sharpee/world-model';

// Create an entity (IDs are auto-generated), then attach trait instances
const world = new WorldModel();
const chest = world.createEntity('treasure chest', 'object');
chest.add(new OpenableTrait());
chest.add(new ContainerTrait());

// Query relationships (by entity ID)
const contents = world.getContents(chest.id);
const location = world.getLocation(player.id);
```

## Traits

| Trait | Description |
|-------|-------------|
| `OpenableTrait` | Can be opened/closed |
| `LockableTrait` | Can be locked/unlocked with a key |
| `ContainerTrait` | Can contain other objects |
| `SupporterTrait` | Objects can be placed on top |
| `WearableTrait` | Can be worn by player/NPCs |
| `EdibleTrait` | Can be eaten |
| `LightSourceTrait` | Provides illumination |

## Related Packages

- [@sharpee/stdlib](https://www.npmjs.com/package/@sharpee/stdlib) - Standard actions
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
