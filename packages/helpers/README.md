# @sharpee/helpers

Fluent entity builder helpers for the Sharpee Interactive Fiction platform.

## Installation

```bash
npm install @sharpee/helpers
```

## Overview

Concise, chainable builders that take the boilerplate out of constructing entities and their traits:

- **`world.helpers()`** - Importing the package augments `WorldModel`, exposing `room`, `object`, `container`, `actor`, and `door` builders.
- **Fluent traits** - Set descriptions, aliases, locations, and common traits without hand-assembling `IdentityTrait`, `SceneryTrait`, etc.
- **`.plural()`** - Marks an object as grammatically plural so messages agree in number ("the goats **are** fixed in place").
- **Direct use** - `createHelpers()` and the `EntityHelpers` / builder classes are exported for use outside the augmentation.

## Usage

```typescript
import '@sharpee/helpers'; // side-effect import: activates world.helpers()
import { WorldModel } from '@sharpee/world-model';

function initializeWorld(world: WorldModel): void {
  const { room, object, container, actor } = world.helpers();

  const kitchen = room('Kitchen')
    .description('A warm kitchen.')
    .build();

  const knife = object('bread knife')
    .description('A sharp bread knife.')
    .aliases('knife', 'blade')
    .in(kitchen)
    .build();

  // grammatically plural scenery
  object('pygmy goats')
    .description('Three goats chew contentedly.')
    .plural()
    .scenery()
    .in(kitchen)
    .build();
}
```

### Object builder methods

| Method | Effect |
|--------|--------|
| `description(text)` | Sets the object description |
| `aliases(...names)` | Adds alternative parser names |
| `in(entity)` | Places the object in a location |
| `scenery()` | Marks as scenery (non-portable) |
| `plural()` | Marks as grammatically plural |
| `lightSource(opts?)` | Adds a `LightSourceTrait` |
| `addTrait(trait)` | Adds any custom `ITrait` |
| `skipValidation()` | Bypasses placement validation (uses `AuthorModel`) |
| `build()` | Creates and returns the `IFEntity` |

## Related Packages

- [@sharpee/world-model](https://www.npmjs.com/package/@sharpee/world-model) - Entity, trait, and behavior system
- [@sharpee/queries](https://www.npmjs.com/package/@sharpee/queries) - LINQ-style entity queries
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
