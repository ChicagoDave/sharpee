# Findings — @sharpee/queries

## Author-relevance
Author-facing (ADR-150). A LINQ-style fluent query API over `IFEntity[]`. Importing `@sharpee/queries` activates WorldModel entry points (`world.rooms`, `world.actors`, `world.contents()`, `world.inScope()`, etc.). A strong book topic for the programmer layer: "querying the world." Pairs naturally with `@sharpee/helpers`.

## Naming
Clean. `EntityQuery` plus method names mirror familiar LINQ/array vocabulary: `where`, `select`, `selectMany`, `orderBy`, `groupBy`, `distinct`, `union`, `intersect`, `except`, `skip`, `take`, `first`/`firstOrThrow`/`single`/`last`/`at`, `any`/`all`/`none`/`count`, `toArray`/`toMap`/`toIdSet`. IF-specific filters are spelled out: `withTrait`, `withoutTrait`, `ofType`, `named`, `matching`, `portable`, `visibleTo`, `inRegion`, `withinRegion`. No abbreviations, no `I`-prefix. Augmentation entry points (`rooms`, `actors`, `objects`, `scenes`, `regions`, `having`, `visible`, `inScope`) are consistent.

## Should-be-internal
- `QueryEntryPoints` interface in augmentation.d.ts is `declare`d but not exported (it's merged into `WorldModel`) — correctly internal, not a leak.
None of the public surface (`EntityQuery`) looks like it should be hidden.

## API shape
Mostly clean and well-typed; immutable (each filter returns a new `EntityQuery`), implements `Iterable<IFEntity>`. Generics used well: `select<T>`, `selectMany<T>`, `traits<T>`, `traitsOf<T>`, `orderBy<K>`, `groupBy<K>`.
- **Structural-typing smell:** `visibleTo`, `inRegion`, `withinRegion` take inline structural `world` params (e.g. `world: { getVisible(id): IFEntity[] }`, `world: { isInRegion?(...): boolean; getLocation(...): string | null }`) instead of `IWorldModel`. This is a duck-typing workaround; the book should prefer the augmentation entry points (`world.visible(id)`, `world.inScope(id)`) which hide this.
- **Dead-until-ADR-149 methods:** `inRegion`/`withinRegion` (and `world.scenes`/`world.regions`) document "Returns empty query until ADR-149 provides RegionTrait." Shipping no-op API — the book should flag these as not-yet-functional.
- `withTrait(traitType: TraitType | string)` — the `| string` escape hatch recurs across `withTrait`/`withoutTrait`/`having`/`traits`/`traitsOf`; loosens type safety but is a deliberate ergonomic choice.
- `ofType(entityType: string)` takes a bare `string` rather than an `EntityType` union — looser than it could be.

## Documentation (TSDoc)
**~100%** — `EntityQuery` class documented, nearly every method has `@param`/`@returns` and behavioral notes (e.g. vacuous-truth for `all`, silent exclusion of entities lacking `IdentityTrait` in `named`/`matching`). Augmentation entry points each documented. Excellent coverage.

## Book highlights
- Entry points via augmentation: `world.all`, `world.rooms`, `world.actors`, `world.objects`, `world.contents(id, opts)`, `world.allContents(...)`, `world.having(trait)`, `world.visible(id)`, `world.inScope(id)`.
- `EntityQuery` chaining: filtering (`where`, `withTrait`, `named`, `matching`, `portable`), materialization (`toArray`, `first`, `single`, `count`), projection (`select`, `traits`), set ops, `groupBy`.
- Teach the `import '@sharpee/queries'` activation pattern and the immutability/iterable guarantees.
- Caveat to document: `inRegion`/`withinRegion`/`scenes`/`regions` are inert pending ADR-149.
