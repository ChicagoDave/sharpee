# @sharpee/queries

LINQ-style fluent entity query API for the Sharpee Interactive Fiction platform.

## Installation

```bash
npm install @sharpee/queries
```

## Overview

A lightweight, immutable, chainable query layer over `IFEntity` collections (ADR-150):

- **`EntityQuery`** - LINQ-style filtering, ordering, aggregation, and materialization. Every filter returns a new query; the source is never mutated.
- **World-model entry points** - Importing the package augments `WorldModel` with `all`, `rooms`, `actors`, `objects`, `scenes`, `regions`, plus `contents()`, `allContents()`, `having()`, `visible()`, and `inScope()`.
- **Concrete class only** - The query entry points live on the concrete `WorldModel` class, not the `IWorldModel` interface. Access queries through a `WorldModel` instance.
- **Iterable** - `EntityQuery` implements `Iterable<IFEntity>`, so it works with `for...of` and spread.

## Usage

```typescript
import '@sharpee/queries'; // side-effect import: activates query entry points
import { EntityQuery } from '@sharpee/queries';
import { WorldModel, TraitType } from '@sharpee/world-model';

function findLitItems(world: WorldModel) {
  // Entry points return EntityQuery; chain LINQ-style filters
  const litObjects = world.objects
    .having(TraitType.LIGHT_SOURCE)
    .where(e => e.id !== 'player');

  // Materialize when you need an array
  return [...litObjects];
}

// Filter contents of a room and look one up by name
function torchInKitchen(world: WorldModel) {
  return world.contents('kitchen')
    .matching('torch')
    .named('brass torch');
}
```

### Common filters

| Method | Effect |
|--------|--------|
| `where(predicate)` | Keep entities matching a predicate |
| `withTrait(type)` / `withoutTrait(type)` | Filter by trait presence/absence |
| `ofType(type)` | Filter by entity type (`'room'`, `'object'`, …) |
| `named(name)` | Exact (case-sensitive) identity-name match |
| `matching(term)` | Case-insensitive name/alias substring match |

## Related Packages

- [@sharpee/world-model](https://www.npmjs.com/package/@sharpee/world-model) - Entity, trait, and behavior system
- [@sharpee/helpers](https://www.npmjs.com/package/@sharpee/helpers) - Fluent entity builders
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
