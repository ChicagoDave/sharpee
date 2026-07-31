# ADR-140: Entity Helper Builders

## Status: ACCEPTED

## Date: 2026-04-03

## Amendment 1 (2026-07-31, session 8b1a26) — the prototype augmentation is retired

**`createHelpers(world)` is now the only entry form.** Decision §2's
declaration-merging mechanism — `import '@sharpee/helpers'` patching
`WorldModel.prototype.helpers` so authors can call `world.helpers()` —
is withdrawn. `packages/helpers/src/augment.ts` is deleted and
`src/index.ts` no longer carries the side-effect import. The five
builders, the `EntityHelpers` shape, `.skipValidation()`, the
AuthorModel alignment of Decision §1, and every Design Principle are
unchanged; only the activation mechanism goes.

**Reason: the mechanism is unsound across module-graph boundaries.**
The patch mutates whichever `WorldModel` class object the *importer*
resolved. When the engine and the story resolve separate copies of
`@sharpee/world-model` — every `node dist/cli/sharpee.js --story
<external>` load, since the CLI bundle inlines its own copy while the
story resolves its own from `node_modules` — the patched class and the
instantiated class are different objects, and the engine's world never
gains the method. That is issue #146: `TypeError: world.helpers is not
a function`. Nothing in the story or the platform is misconfigured;
the mechanism cannot survive the boundary. The browser build works
only because it is a single module graph, which is a coincidence of
that target rather than a property of the design.

**It was already abandoned in practice.** Every live consumer moved to
`createHelpers(world)` on 2026-06-28 (`stories/family-zoo-tutorial`,
`tutorials/familyzoo/v2.0.0`) for exactly this reason. At the time of
this amendment no source in the repository calls `world.helpers()`
except the frozen `tutorials/familyzoo/v1.5.0` edition — which pins
published `@sharpee/helpers@^1.5.0` and is therefore unaffected — the
`docs/archive/tutorial/v17|v18` snapshots, and the root `README.md`
(corrected in this session). `packages/helpers/tests/` never covered
`augment.ts`. This amendment removes a mechanism that no longer has a
caller, rather than reversing a live one.

**It is also what Design Principle 3 asks for.** "No hidden magic —
builders call the same `createEntity`, `entity.add()`, and
`moveEntity` that story code calls manually. They're syntactic sugar,
not a new abstraction layer." A prototype patch applied by import side
effect is the one part of the package that was not that.
`createHelpers(world)` costs authors one explicit call and one named
import, and works identically in every target.

**Cost accepted.** The Consequences below claim `world.helpers()` is
"discoverable — no factory function or wiring to learn." That
advantage is given up: authors now import `createHelpers` and pass the
world. Sections below that show `import '@sharpee/helpers'` or
`world.helpers()` record the design as accepted in 2026-04 and are
marked where they no longer describe the package.

**Paired amendment.** ADR-178 Amendment 1 (same session) promotes
`@sharpee/helpers` to baseline v2, so stories may legally import it.
The two are complementary: that one makes the package importable by
stories, this one removes the import form that broke across bundle
boundaries. Issue #146 needed both.

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

> **Superseded by Amendment 1.** The current form is
> `import { createHelpers } from '@sharpee/helpers'` followed by
> `const { room, object, ... } = createHelpers(world)`. Everything
> below the destructuring line is unchanged.

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
    index.ts             — named exports (Amendment 1: no side-effect import)
    augment.ts           — declare module augmentation + prototype patch
                           (Amendment 1: deleted)
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

> **Amendment 1 note.** Five bullets below turn on the prototype
> augmentation and no longer hold: the "discoverable `world.helpers()`"
> and "declaration merging is an established pattern" positives, the
> "augmentation is opt-in via import" positive, the "prototype patching
> is a runtime side effect" negative (resolved — the side effect is
> gone), and the neutral about stories that skip the side-effect
> import. Everything else stands.

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
