# Findings — @sharpee/world-model

## Author-relevance
Author-facing AND extension-facing: the book's programmer layer builds worlds here — `WorldModel`/`AuthorModel`, `IFEntity`, the trait classes (`ContainerTrait`, `RoomTrait`, etc.), behaviors, and the Capability Dispatch system (ADR-090).

## Naming
Mixed and somewhat inconsistent — not clean.
- Mixed `I`-prefix convention: many interfaces are `I`-prefixed (`IWorldModel`, `ITrait`, `IOpenResult`, `IWallSpec`) but a comparable set is not (`RegionOptions`, `SceneOptions`, `RegionCrossings`, `Annotation`, `Belief`, `Goal`, `Fact`, `CapabilityConfig`, `PerceivedEvent`). No discernible rule separates the two groups.
- `Trait`/`Behavior` suffixes are consistent (`ContainerTrait`/`ContainerBehavior`), but `WallEntity` uses an `Entity` suffix unique among the surface, and `IFEntity` keeps the legacy `IF` prefix while everything else dropped it.
- Abbreviations against the no-abbreviation standard: `Npc`/`NpcTrait` (should be spelled out), `IPrepPhrase` / `IVerbPhrase` / `INounPhrase` (`Prep` is abbreviated), `caps`-style only internal. `Cmgt`/`CmgtPacket` (in if-domain) leaks adjacent. `EntityType` value spellings are clean.
- Casing: trait class files use lowerCamel filenames (`containerTrait.d.ts`) while exported classes are PascalCase — fine for consumers, but the `TraitType` const mixes bare strings (`"container"`) with namespaced ones (`"if.trait.concealment"`, `"if.trait.acoustic"`), an inconsistency authors will see.

## Should-be-internal
Several command-pipeline and registry symbols look like platform plumbing, not author API:
- `interfaces/*` re-exports: `IParser`, `ICommandValidator`, `ICommandExecutor`, `ICommandProcessor`, `IParsedCommand`/`IParsedCommandV1`, `IToken`, `ITokenCandidate`, `INounPhrase`, `IVerbPhrase`, `IPrepPhrase`, `IParseError` — parser/command-resolution contracts owned conceptually by parser/stdlib; leaking from world-model.
- Registry/global mutators: `TraitRegistry`, `ScopeRegistry`, `extensionRegistry`, `extensionLoader`, plus the `clear*Registry` / `clearCapabilityDefaults` / `unregister*` family — test/setup internals.
- `IDataStore`, `SpatialIndex`, `EntityStore` — backing-store internals (the `AuthorModel` example even constructs from `world.getDataStore()`, but most authors should not touch these).
- The `obstructor-protocol` cluster (`IObstructorQueryWorld`, `IObstructorTraitMatch`, `findTraitOnObstructor`, `getCurrentObstructor`, ...) reads as a narrow internal mechanism (ADR-173 walls).
- Cognitive/character internals: `STABLE_COGNITIVE_PROFILE`, `MOOD_AXES`, `dispositionToValue`/`valueToDisposition`/`valueToThreat`, `nearestMood`, `parsePersonalityExpr` — likely belong behind `@sharpee/character`.

## API shape
- `any` in author-visible signatures: `IFEntity.attributes: Record<string, unknown>` is fine, but `IFEntity.toJSON(): any`, `static fromJSON(json: any)`, `WorldModel.getStateValue(key): any` / `setStateValue(key, value: any)`, and `ITraitConstructor.new (data?: any)` are loose. `IWorldAwareBehavior.setWorldContext(context: any)` and `isWorldAwareBehavior(behavior: any)` are untyped.
- Duplicate/overlapping concepts: `IFEntity.get` vs `getTrait` (explicit "backwards compatibility" alias), `has` vs `hasTrait`, and the boolean getters (`isContainer`, `isOpen`, ...) duplicate what behaviors/traits expose — two ways to ask the same question.
- `WorldModel` vs `AuthorModel` both implement `IWorldModel` with near-identical 60+ method surfaces; the only differences (`populate`, `addTrait`, `removeTrait`, validation-bypass) are easy to miss — the overlap is a documentation burden.
- Result-type proliferation: `IOpenResult`, `ICloseResult`, `ILockResult`, `IUnlockResult`, `ITakeItemResult`, `IAddItemResult`, ... each a bespoke optional-heavy shape (mostly `success?` + scattered optional flags), no shared base — optionality is loose (every field `?`).
- `createDoor` takes an inline options object literal duplicated verbatim in both `WorldModel` and `AuthorModel` rather than a named `IDoorSpec` interface (contrast `IWallSpec`).

## Documentation (TSDoc)
Good coverage on the headline surface, thinner on the long tail. Roughly 55–65% of exported symbols carry a doc comment in the `.d.ts`.
- Well-documented: `IFEntity` (nearly every member, with `@example`), `WorldModel` (most methods), `AuthorModel`, `EntityBuilder`/`buildEntity`, `Behavior`, trait classes (`ContainerTrait`, `IdentityTrait` have per-field docs).
- Notably undocumented: the `IWorldModel` interface members themselves (the class re-documents them, the interface mostly doesn't); result interfaces (`IOpenResult`, `ICloseResult` fields bare); most `type` aliases (`TraitData`, `CommandResult`, `DirectionType`, the cognitive types `Mood`/`Coherence`/`Lucidity`); and the bulk-exported capability/interceptor helper functions (names only).

## Book highlights
Author-facing essentials the programmer layer should reference:
- `WorldModel` — `createEntity`, `getEntity`, `moveEntity`, `getContents`, `getLocation`, `connectRooms`, `createDoor`, `createRegion`/`assignRoom`, `createScene`, `awardScore`/`setMaxScore`, `findByTrait`/`findWhere`, `getVisible`/`getInScope`/`canSee`.
- `AuthorModel` — unrestricted setup variant: `createEntity`, `moveEntity` (into closed containers), `populate`, `addTrait`/`removeTrait`.
- `IFEntity` — `add`/`has`/`get`, `scope`/`setMinimumScope` (disambiguation & visibility), `annotate` (illustrations/portraits), and the boolean state getters.
- Trait classes — `IdentityTrait`, `ContainerTrait`, `RoomTrait`, `OpenableTrait`, `LockableTrait`, `SupporterTrait`, `SwitchableTrait`, `LightSourceTrait`, `WearableTrait`, `EdibleTrait`, `ReadableTrait`, `DoorTrait`, `ActorTrait`, `SceneryTrait`.
- Behaviors — `ContainerBehavior`, `OpenableBehavior`, `LockableBehavior`, `LightSourceBehavior`, `RoomBehavior` (static methods that own mutations).
- Capability Dispatch — `EntityBuilder`/`buildEntity`, `registerCapabilityBehavior`, `findTraitWithCapability`, `CapabilityBehavior`, `StandardCapabilities`, `createEffect` (the ADR-090 extension story).
- Constants — `Direction`/`DirectionType`, `TraitType`, `EntityType`, `getOppositeDirection`.
