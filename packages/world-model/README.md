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
- **State Management** - Immutable world state with entity relationships

## Usage

```typescript
import {
  WorldModel,
  IFEntity,
  OpenableTrait,
  ContainerTrait
} from '@sharpee/world-model';

// Create entities with traits
const chest = world.createEntity('object', {
  id: 'treasure-chest',
  name: 'treasure chest',
  traits: [OpenableTrait, ContainerTrait]
});

// Query relationships
const contents = world.getContents(chest);
const location = world.getLocation(player);
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
