# ADR-140: Entity Helper Builders

## Status: ACCEPTED

## Date: 2026-04-03

## Context

### The Problem

Story setup code is verbose. Creating a single room requires three separate statements:

```typescript
const room = world.createEntity('Kitchen', 'room');
room.add(new RoomTrait({}));
room.add(new IdentityTrait({
  name: 'Kitchen',
  description: 'A warm kitchen with copper pots.',
}));
```

A story with 50 rooms, 100 objects, and 20 NPCs repeats this pattern hundreds of times. The boilerplate obscures the actual world design — what rooms exist, what they contain, and how they connect.

The platform previously had `createEntityWithTraits()` which attempted to solve this but was removed (issue #69) because it was incomplete (didn't add IdentityTrait, DOOR case was a no-op) and unused by any real story.

### Existing Patterns

The platform already has fluent builders in two packages:

- **Grammar** (`@sharpee/if-domain`): `grammar.forAction('if.action.pushing').verbs(['push', 'press']).pattern(':target').build()`
- **Audio** (`@sharpee/media`): `audio.atmosphere('room.cave').ambient('dripping.mp3', 'water', 0.3).music('theme.mp3', 0.4).build()`

Both follow the same pattern: a factory function returns a builder, chainable methods configure it, `.build()` finalizes. Story authors are already familiar with this style.

### AuthorModel Gap

`AuthorModel` does not implement `IWorldModel`. This means any helper that accepts `IWorldModel` cannot be used with `AuthorModel` for setup scenarios that require validation bypass (placing items in closed containers, etc.). Aligning AuthorModel to implement `IWorldModel` is a prerequisite for helpers that work transparently in both contexts.

## Decision

### 1. AuthorModel implements IWorldModel

`AuthorModel` is updated to implement the `IWorldModel` interface. Missing methods delegate to the underlying `WorldModel` instance. The key behavioral difference is preserved: `createEntity` and `moveEntity` bypass validation.

Changes required:
- `moveEntity` return type: `void` → `boolean` (always returns `true`)
- Missing query methods (`findByTrait`, `findByType`, `findWhere`, etc.): delegate to `worldModel`
- Missing score, event, scope, persistence, prompt, and vocabulary methods: delegate to `worldModel`

The `worldModel` constructor parameter becomes required (currently optional). AuthorModel without a backing WorldModel has no practical use case — all call sites already pass both.

### 2. New `@sharpee/helpers` package

A builder package that provides fluent entity creation via declaration merging on `IWorldModel`. Single dependency: `@sharpee/world-model`. This follows the same augmentation pattern as `@sharpee/media` extending `EventDataRegistry`.

#### Declaration Merging

`@sharpee/helpers` extends `IWorldModel` with a `helpers()` method using TypeScript module augmentation — no changes to the base `IWorldModel` interface in `@sharpee/world-model`:

```typescript
// Inside @sharpee/helpers — augments IWorldModel
declare module '@sharpee/world-model' {
  interface IWorldModel {
    helpers(): EntityHelpers;
  }
}

// Patched onto WorldModel.prototype at import time
WorldModel.prototype.helpers = function () {
  return createHelpers(this);
};
```

#### Story Author Experience

Stories import `@sharpee/helpers` to activate the augmentation. From that point, `world.helpers()` is available with full type safety:

```typescript
import '@sharpee/helpers';

initializeWorld(world: WorldModel): void {
  const { room, object, actor, container, door } = world.helpers();

  const kitchen = room('Kitchen')
    .description('A warm kitchen with copper pots.')
    .build();

  // Skip validation — e.g., place item in closed container during setup
  const emerald = object('emerald')
    .skipValidation()
    .in(closedBuoy)
    .build();
}
```

No factory function to call, no world parameter to pass around, no AuthorModel to construct. Calling `.skipValidation()` wraps the world in an `AuthorModel` internally.

Location methods like `.in()` and `.between()` accept `IFEntity` directly (not string IDs) for compile-time safety — the builder extracts `.id` internally.

#### Room Builder

```typescript
const kitchen = room('Kitchen')
  .description('A warm kitchen with copper pots hanging from the ceiling.')
  .aliases('the kitchen')
  .build();

// Dark room
const cellar = room('Cellar')
  .description('A damp, dark cellar.')
  .dark()
  .build();
```

Creates entity with type `room`, adds `RoomTrait` and `IdentityTrait`. Returns the `IFEntity`.

#### Object Builder

```typescript
const knife = object('bread knife')
  .description('A sharp bread knife.')
  .aliases('knife', 'blade')
  .in(kitchen)
  .build();

// Scenery (non-portable)
const stove = object('stove')
  .description('A cast-iron stove.')
  .scenery()
  .in(kitchen)
  .build();

// Light source
const lantern = object('brass lantern')
  .description('A brass lantern.')
  .aliases('lantern', 'lamp')
  .lightSource({ isLit: false, fuelTurns: 200 })
  .in(startRoom)
  .build();
```

Creates entity with type `object`, adds `IdentityTrait`. Optional chaining adds placement, `SceneryTrait`, `LightSourceTrait`, etc.

#### Container Builder

```typescript
const chest = container('wooden chest')
  .description('A sturdy wooden chest.')
  .openable({ isOpen: false })
  .lockable({ isLocked: true, keyId: key.id })
  .in(treasureRoom)
  .build();
```

Creates entity with type `object`, adds `ContainerTrait`, `IdentityTrait`. Optional chaining for `OpenableTrait`, `LockableTrait`.

#### Actor Builder

```typescript
const player = actor('yourself')
  .description('As good-looking as ever.')
  .aliases('self', 'me', 'myself')
  .properName()
  .inventory({ maxItems: 10 })
  .build();

// NPC
const troll = actor('troll')
  .description('A large troll with a bloody axe.')
  .aliases('nasty troll')
  .in(bridge)
  .build();
```

Creates entity with type `actor`, adds `ActorTrait`, `IdentityTrait`, `ContainerTrait` (for inventory).

#### Door Builder

```typescript
const ironDoor = door('iron door')
  .description('A heavy iron door.')
  .between(room1, room2, Direction.NORTH)
  .openable({ isOpen: false })
  .lockable({ isLocked: true, keyId: ironKey.id })
  .build();
```

Creates entity with type `door`, adds `DoorTrait`, `IdentityTrait`, `SceneryTrait`, `OpenableTrait`. Wires exits on both rooms via `RoomBehavior.setExit()`. Equivalent to `WorldModel.createDoor()` but in builder form.

### Design Principles

1. **Every builder returns `IFEntity`** from `.build()` — story code always has a reference for further customization or ID capture.

2. **Builders don't replace trait access** — after `.build()`, callers can still `entity.add(new CustomTrait())` for story-specific traits the builder doesn't know about.

3. **No hidden magic** — builders call the same `createEntity`, `entity.add()`, and `moveEntity` that story code calls manually. They're syntactic sugar, not a new abstraction layer.

4. **No builder state leaks** — each builder is a fresh instance. No singletons, no registry.

5. **Builders compose, not inherit** — `container()` is not a subclass of `object()`. Each builder knows exactly which traits it manages.

6. **`.skipValidation()` hides AuthorModel** — when called, the builder wraps the world in an `AuthorModel` internally. Story authors never need to import or construct AuthorModel directly. The flag applies to the entire build (entity creation and placement).

### Package Structure

```
packages/helpers/
  package.json           — @sharpee/helpers, depends on @sharpee/world-model
  tsconfig.json
  src/
    index.ts             — side-effect import: patches WorldModel.prototype.helpers
    augment.ts           — declare module augmentation + prototype patch
    create-helpers.ts    — factory that binds world and returns EntityHelpers
    builders/
      room.ts            — RoomBuilder class
      object.ts          — ObjectBuilder class
      container.ts       — ContainerBuilder class
      actor.ts           — ActorBuilder class
      door.ts            — DoorBuilder class
```

## Implementation Order

1. **AuthorModel alignment** — make AuthorModel implement `IWorldModel`, required `worldModel` parameter
2. **`@sharpee/helpers` package** — scaffold, declaration merging, prototype patch, implement builders, add to build.sh and tsf
3. **Documentation** — guide update, genai-api generation

## Consequences

### Positive

- Story setup code becomes 1 line per entity instead of 3-5
- Consistent fluent pattern across grammar, audio, and entity creation
- `world.helpers()` is discoverable — no factory function or wiring to learn
- AuthorModel/WorldModel interchangeable via `IWorldModel` — `.skipValidation()` handles the toggle
- Declaration merging is an established pattern in the codebase (`@sharpee/media` does the same for `EventDataRegistry`)
- `IWorldModel` in `@sharpee/world-model` is not modified — augmentation is opt-in via import

### Negative

- One more package to maintain
- Prototype patching is a runtime side effect — `import '@sharpee/helpers'` mutates `WorldModel.prototype`. This is the standard TypeScript augmentation tradeoff.
- Builders can't cover every trait combination — exotic setups still require manual trait addition after `.build()`

### Neutral

- `WorldModel.createDoor()` and `WorldModel.connectRooms()` remain as-is — they predate this pattern and work fine. Stories can use either the builder or the direct method.
- The `@sharpee/helpers` package is optional — stories that prefer explicit trait construction are unaffected.
- Stories that don't `import '@sharpee/helpers'` see no change — `world.helpers()` simply doesn't exist on their type.
