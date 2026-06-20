# Findings — @sharpee/helpers

## Author-relevance
Author-facing (ADR-140). This is a core book topic: the fluent entity-builder DSL. Importing `@sharpee/helpers` activates `world.helpers()` via declaration merging, returning `room()`, `object()`, `container()`, `actor()`, `door()` builders. Exactly the kind of ergonomic API the book's programmer layer should teach first.

## Naming
Clean. `RoomBuilder`, `ObjectBuilder`, `ContainerBuilder`, `ActorBuilder`, `DoorBuilder`, `EntityHelpers`, `createHelpers` — all spelled out, consistent `*Builder` suffix, no abbreviations, no `I`-prefix. Chainable methods read fluently: `.description()`, `.aliases()`, `.dark()`, `.scenery()`, `.lightSource()`, `.in()`, `.build()`. One mild wart: `.in(location)` is a reserved-word-adjacent terse method name, but it reads well in chains and is intentional DSL sugar.

## Should-be-internal
None obvious. `createHelpers` is public to allow direct (non-augmentation) use, which the header documents as intentional. The builder classes are legitimately public since `helpers()` returns them.

## API shape
Clean and consistent. All builders return `this` for chaining and `build(): IFEntity`. Factory methods take `(name: string)`. `createHelpers(world: IWorldModel): EntityHelpers` is well-typed. `lightSource(opts?: { isLit?: boolean; fuelTurns?: number })` uses a typed options object. `addTrait(trait: ITrait)` correctly typed — no `any` anywhere in the surface. Declaration-merging augment (`WorldModel.helpers()`) is sound.
- Minor inconsistency: `ObjectBuilder` has `.skipValidation()` and `.in()`/`.scenery()`/`.lightSource()` that `RoomBuilder` lacks — expected given entity differences, but the book should note the builder method sets differ per type.

## Documentation (TSDoc)
**~100%** — package header with usage `@example`, every builder class documented with an `@example`, and every chainable method has `@param`/`@returns`. `EntityHelpers` and `createHelpers` fully documented. Among the cleanest-documented packages in the audit.

## Book highlights
- `world.helpers()` → `EntityHelpers` (the entry point — teach the `import '@sharpee/helpers'` activation pattern).
- `RoomBuilder` (`.description`, `.aliases`, `.dark`, `.addTrait`, `.build`).
- `ObjectBuilder` (`.description`, `.aliases`, `.in`, `.scenery`, `.lightSource`, `.addTrait`, `.skipValidation`, `.build`) — richest builder, good worked example.
- `ContainerBuilder`, `ActorBuilder`, `DoorBuilder`, `createHelpers` for direct use.
