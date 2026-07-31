# @sharpee/helpers

Fluent entity builder helpers for the Sharpee Interactive Fiction platform.

## Installation

```bash
npm install @sharpee/helpers
```

## Overview

Concise, chainable builders that take the boilerplate out of constructing entities and their traits:

- **`createHelpers(world)`** - Returns `room`, `object`, `container`, `actor`, and `door` builders bound to that world.
- **Fluent traits** - Set descriptions, aliases, locations, and common traits without hand-assembling `IdentityTrait`, `SceneryTrait`, etc.
- **`.plural()`** - Marks an object as grammatically plural so messages agree in number ("the goats **are** fixed in place").
- **Builder classes** - `EntityHelpers` and the five builder classes are exported for direct use.

> **Changed in 2.x** — earlier versions also let you write `world.helpers()`
> after a side-effect `import '@sharpee/helpers'`. That form patched
> `WorldModel.prototype` on whichever copy of `@sharpee/world-model` the
> importer resolved, so it silently failed wherever the story and the engine
> resolved different copies. It is gone; `createHelpers(world)` is the only
> entry form (ADR-140 Amendment 1).

## Usage

```typescript
import { createHelpers } from '@sharpee/helpers';
import { WorldModel } from '@sharpee/world-model';

function initializeWorld(world: WorldModel): void {
  const { room, object, container, actor } = createHelpers(world);

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
