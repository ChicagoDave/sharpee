# Sharpee World Model Specification

**Subsystem**: World Model — entities, traits, spatial containment, scope, capability dispatch
**Prerequisite**: `01-data-model.md` (Entity / Trait / SpatialIndex / CapabilityStore shapes)
**Version**: 1 (derived from code as of 2026-04-16)

---

## Purpose

The world model is the in-memory representation of game state. It sits between the raw data shapes in `01-data-model.md` and everything that consumes them: the parser (for scope), stdlib actions (for validation and mutation), the engine (for save/restore), and the text service (for rendering entity state).

Responsibilities:

1. **Entity lifecycle.** Create, retrieve, mutate, and remove entities.
2. **Spatial containment.** Move entities between containers/rooms; answer "where is X?" and "what's in Y?".
3. **Trait composition.** Attach data traits to entities and look them up by type.
4. **Capability dispatch.** Route entity-centric verbs (LOWER, TURN, WAVE) to trait-declared behaviours (ADR-090).
5. **Scope computation.** Tell the parser and actions which entities an actor can reach, see, or reference.
6. **Visibility & darkness.** Determine whether an entity is perceivable given lighting and containment.
7. **Typed relationships.** Beyond containment, maintain named edges (`knows`, `wears`, etc.).
8. **Serialisation.** Produce a JSON representation that round-trips through the save envelope defined in `01-data-model.md`.

---

## Invariants

In addition to the invariants from `01-data-model.md`, the world model enforces:

1. **Trait data is inert.** Traits contain no methods, no function references, and no world references. Logic is in **behaviours** (free functions / static classes) that read traits and mutate them.
2. **Behaviour statelessness.** A behaviour has no per-instance state. The world is the sole source of truth; a behaviour is a pure function of `(entity, world, actorId, …) → effect`.
3. **Trait-action uniqueness.** Within a single entity, at most one trait declares a capability for any given action ID. If two traits claim the same action, the binding is an authoring error (the reference implementation returns the first one it finds).
4. **Containment loop prohibition.** `moveEntity(A, B)` MUST fail if `B` is a descendant of `A` (including `B == A`).
5. **Room has no parent.** A room entity is a spatial root; it MUST NOT have a parent in the spatial index. Regions (ADR-149) categorise rooms but are not spatial containers.
6. **Player lives somewhere.** If a player entity exists, it MUST be reachable via the spatial index from some room (directly or through chained containment).
7. **Darkness propagates along containment.** If an actor is in a dark room (RoomTrait.isDark = true) with no active light source accessible, visibility collapses: only the actor's own inventory is visible (and then only if it contains an active light source).
8. **Capacity constraints are advisory.** A container's `capacity` fields are evaluated at move-time through validated paths (`WorldModel.moveEntity`). Authoring paths (`AuthorModel.moveEntity`) bypass them.
9. **Scope is derived, not stored.** `getInScope(actor)` and `getVisible(actor)` are computed from current containment, traits, and scope rules; they are never persisted. Save/restore re-derives them.

---

## Public Contract

### WorldModel interface

A conforming implementation SHALL provide a world model with (at least) these operations. Return types use the pseudocode from `01-data-model.md`.

```
interface WorldModel {
    // ---------- Data store access ----------
    getDataStore() -> DataStore        // shared with AuthorModel

    // ---------- Capability store ----------
    registerCapability(name, registration?)
    updateCapability(name, data)
    getCapability(name) -> CapabilityData?
    hasCapability(name) -> Boolean

    // ---------- Entity lifecycle ----------
    createEntity(displayName, type?) -> IFEntity
    getEntity(id) -> IFEntity?
    hasEntity(id) -> Boolean
    removeEntity(id) -> Boolean
    getAllEntities() -> List<IFEntity>
    updateEntity(id, updater: IFEntity -> Void) -> Void

    // ---------- Spatial ----------
    getLocation(entityId) -> EntityId?
    getContents(containerId, options?) -> List<IFEntity>
    getAllContents(entityId, options?) -> List<IFEntity>    // recursive
    moveEntity(entityId, targetId | null) -> Boolean         // null = remove from world
    canMoveEntity(entityId, targetId | null) -> Boolean
    getContainingRoom(entityId) -> IFEntity?

    // ---------- World state (key/value) ----------
    getState() -> Map
    setState(state)
    getStateValue(key) -> Any
    setStateValue(key, value)

    // ---------- Queries ----------
    findByTrait(traitType) -> List<IFEntity>
    findByType(entityType) -> List<IFEntity>
    findWhere(predicate) -> List<IFEntity>
    getVisible(observerId) -> List<IFEntity>
    getInScope(observerId) -> List<IFEntity>
    canSee(observerId, targetId) -> Boolean

    // ---------- Typed relationships (beyond containment) ----------
    addRelationship(fromId, toId, type)
    removeRelationship(fromId, toId, type)
    getRelated(entityId, type) -> List<EntityId>
    areRelated(a, b, type) -> Boolean

    // ---------- Convenience ----------
    getTotalWeight(entityId) -> Number
    wouldCreateLoop(entityId, targetId) -> Boolean
    findPath(fromRoomId, toRoomId) -> List<RoomId> | null
    getPlayer() -> IFEntity?
    setPlayer(entityId)
    connectRooms(room1Id, room2Id, direction)
    createDoor(displayName, options) -> IFEntity

    // ---------- Regions & scenes (ADR-149) ----------
    createRegion(id, options) -> IFEntity
    assignRoom(roomId, regionId)
    isInRegion(entityId, regionId) -> Boolean
    getRegionCrossings(fromRoomId, toRoomId) -> { exited: List, entered: List }
    createScene(id, options) -> IFEntity
    getSceneConditions(sceneId) -> SceneConditions?
    isSceneActive(sceneId) -> Boolean
    hasSceneEnded(sceneId) -> Boolean
    hasSceneHappened(sceneId) -> Boolean

    // ---------- Score ledger (ADR-129) ----------
    awardScore(id, points, description) -> Boolean
    revokeScore(id) -> Boolean
    hasScore(id) -> Boolean
    getScore() -> Number
    getMaxScore() -> Number
    setMaxScore(max)

    // ---------- Persistence ----------
    toJSON() -> String
    loadJSON(json: String)
    clear()

    // ---------- Event sourcing (ADR-086, ADR-094) ----------
    registerEventHandler(type, handler)
    unregisterEventHandler(type)
    registerEventValidator(type, validator)
    registerEventPreviewer(type, previewer)
    chainEvent(triggerType, handler, options?)
    applyEvent(event) -> Void
    canApplyEvent(event) -> Boolean
    previewEvent(event) -> List<WorldChange>
    getAppliedEvents() -> List<SemanticEvent>
    getEventsSince(timestamp) -> List<SemanticEvent>

    // ---------- Scope ----------
    addScopeRule(rule)
    removeScopeRule(ruleId)
    evaluateScope(actorId, actionId?) -> List<EntityId>
    getScopeRegistry() -> ScopeRegistry

    // ---------- Grammar vocabulary (ADR-082) ----------
    getGrammarVocabularyProvider() -> GrammarVocabularyProvider
}
```

### AuthorModel (setup/authoring variant)

An author model is a parallel interface that **bypasses gameplay validation**. It shares the same data store as the world model but allows:

- Creating entities without triggering scope rules.
- Moving entities into closed or locked containers (setup-time world population).
- Placing items that normal gameplay would reject.

```
class AuthorModel implements WorldModel {
    constructor(dataStore: DataStore, worldModel: WorldModel)

    // Overridden (bypass validation):
    createEntity(name, type?) -> IFEntity
    moveEntity(entityId, targetId | null) -> Boolean   // never fails

    // Everything else delegates to the backing WorldModel.
}
```

The author model exists because game rules ("cannot put items in closed containers") would prevent world initialisation. A conforming implementation MUST provide an equivalent escape hatch for world setup; it MAY call it something else.

### IFEntity contract

Beyond the base `Entity` shape from `01-data-model.md`, an IF entity MUST support:

```
interface IFEntity : Entity {
    traits: Map<TraitTypeId, Trait>

    // Trait operations
    has(traitType) -> Boolean
    hasAll(...traitTypes) -> Boolean
    hasAny(...traitTypes) -> Boolean
    get<T>(traitType) -> T?
    add(trait) -> Self        // no-op if trait of that type already present
    remove(traitType) -> Boolean
    getTraits() -> List<Trait>
    getTraitTypes() -> List<TraitTypeId>
    clearTraits()

    // Name resolution (see 01-data-model.md)
    name: String               // computed: displayName > identity.name > attributes.name > id

    // Scope biasing (parser disambiguation)
    setScopePriority(actionId, priority)
    getScopePriority(actionId) -> Integer     // default 100
    setMinimumScope(level, rooms?)             // "in scope here regardless of location"

    // Presentation metadata (ADR-124)
    getAnnotations(kind) -> List<Annotation>
    addAnnotation(kind, annotation)

    // Serialisation
    toJSON() -> Object
    static fromJSON(json) -> IFEntity
}
```

### Trait contract

```
interface Trait {
    static readonly type: TraitTypeId          // e.g., "openable"
    static readonly capabilities?: List<ActionId>  // ADR-090
    static readonly interceptors?: List<ActionId>  // ADR-118
}
```

Trait instances carry only data. All fields are public and serialisable. A trait constructor MAY accept a partial-data object and fill in defaults.

### Behaviour contract

A **behaviour** is a stateless namespace that operates on entities and traits:

```
class Behavior {
    static requiredTraits: List<TraitTypeId>

    static require<T>(entity, traitType) -> T        // throws if missing
    static optional<T>(entity, traitType) -> T?
    static validateEntity(entity) -> Boolean         // has all required traits?
    static getMissingTraits(entity) -> List<TraitTypeId>
}
```

Concrete behaviours (e.g., `OpenableBehavior`, `ContainerBehavior`, `VisibilityBehavior`) export static methods that take `(entity, world, …)` and perform the actual work. They do not hold state.

### Capability dispatch (ADR-090)

Capability dispatch is the mechanism for routing entity-centric verbs (LOWER, TURN, WAVE) where the meaning depends entirely on the target entity. The parser resolves "lower basket" to the basket entity; the stdlib `lowering` action then asks the entity "which of your traits handles `if.action.lowering`?" and delegates to that trait's behaviour.

```
interface CapabilityBehavior {
    // Same 4-phase shape as stdlib actions; see 06-stdlib.md
    validate(entity, world, actorId, sharedData?) -> ValidationResult
    execute(entity, world, actorId, sharedData?) -> Void
    report(entity, world, actorId, sharedData?) -> List<Effect>
    blocked(entity, world, actorId, error, sharedData?) -> List<Effect>
}

// Registry
registerTraitBehavior(traitType, behavior, options?)
registerCapabilityBehavior(traitType, actionId, behavior)    // per-action variant
getBehaviorForTrait(trait) -> CapabilityBehavior
getBehaviorForCapability(trait, actionId) -> CapabilityBehavior?

// Dispatch primitives
findTraitWithCapability(entity, actionId) -> Trait?
hasCapability(trait, actionId) -> Boolean
```

**Authoring flow:**

1. Story author defines a trait class with `static capabilities = ['if.action.lowering', ...]`.
2. Story author writes a `CapabilityBehavior` (with the 4-phase methods).
3. Story author registers the binding at world-initialisation time.
4. At command time, the stdlib action for `if.action.lowering` calls `findTraitWithCapability(entity, 'if.action.lowering')`, looks up the behaviour, and delegates every phase.

**Two categories (ADR-090):**

- **Fixed-semantics verbs** — TAKE, DROP, OPEN, CLOSE, PUT IN, LOCK, UNLOCK, SWITCH ON/OFF, ENTER, EXIT. Stdlib handles these directly using the standard trait (e.g., OpenableTrait for OPEN). Capability dispatch is NOT used.
- **Entity-centric verbs** — LOWER, RAISE, TURN, WAVE, WIND, PUSH, PULL (when semantics vary). Stdlib delegates to a capability behaviour discovered through `findTraitWithCapability`.

This split MUST be preserved by a conforming implementation. Mixing a standard-semantic verb with capability dispatch undermines the architecture; treating every verb as capability-dispatched forces every trait to implement common mutations redundantly.

### Scope system

Scope determines which entities an actor can reference at a given moment. A conforming implementation provides **scope levels** and **scope rules**.

**Levels** (ascending strictness):

| Level | Name       | Meaning                                             |
|-------|------------|-----------------------------------------------------|
| 0     | UNAWARE    | Not in scope; parser cannot resolve                 |
| 1     | AWARE      | Referenceable in narration, not interactable       |
| 2     | VISIBLE    | Can be seen/examined                                |
| 3     | REACHABLE  | Can be touched/taken/manipulated                    |
| 4     | CARRIED    | In the actor's inventory                            |

The parser uses these levels to resolve `:target` slots with constraints like `scope.touchable()` (REACHABLE or CARRIED), `scope.visible()` (VISIBLE+), `scope.carried()` (CARRIED only). See `04-grammar.md`.

**Scope rules** grant visibility beyond the default containment model. A rule is a record:

```
ScopeRule {
    id:                  String
    fromLocations:       List<LocationId> | "*"
    includeEntities:     List<EntityId> | (context) -> List<EntityId>
    includeLocations?:   List<LocationId>         // include contents of these
    forActions?:         List<ActionId> | "*"
    condition?:          (context) -> Boolean
    message?:            String | (entityId, actionId) -> String
    priority?:           Integer                   // higher = evaluated first
    enabled?:            Boolean                   // default true
    source?:             "core" | "story" | "extension"
}
```

Examples:

- "Butterfly is reachable in the garden" — sets `fromLocations: ['garden'], includeEntities: ['butterfly-id'], level: REACHABLE`.
- "Sky is always visible" — via `entity.setMinimumScope(VISIBLE)` with `rooms: ['*']`.
- "Mirror reflection visible when looking" — `forActions: ['if.action.examining'], condition: ...`.

**Evaluation:**

```
world.evaluateScope(actorId, actionId?) -> List<EntityId>
```

The default rule set (provided by a conforming implementation) MUST cover:

- The actor's inventory (CARRIED).
- The actor's current room (VISIBLE/REACHABLE depending on lighting).
- Contents of open, transparent, or enterable containers the actor is touching.
- The actor itself.

### Visibility & darkness (ADR-068)

`canSee(observer, target) -> Boolean` is the single authority on visibility. It consults:

1. **Self-visibility**: `observer.id == target.id` → true.
2. **Scenery invisibility**: if target has a SceneryTrait with `isInvisible`, → false.
3. **Containment chain**: if target is inside a closed, opaque container the observer doesn't have direct access to → false.
4. **Darkness**: if the observer's containing room is dark and no active light source is accessible in the room (or the observer's inventory, or inside an accessible container) → false, unless target is the active light source itself.
5. **Minimum-scope override**: if target has set a minimum scope level ≥ VISIBLE for the observer's room → true.

Darkness uses `RoomTrait.isDark` and `LightSourceTrait.isLit`, falling back to the light source's `SwitchableTrait.isOn` if `isLit` is undefined, and defaulting to "lit" if neither is set (e.g., glowing moss is always on).

A conforming implementation MAY let entities claim a `VISIBILITY_CAPABILITY = "if.scope.visible"` capability to override visibility computation with their own behaviour (mirror-surface visibility, magical concealment, etc.).

### Regions and scenes (ADR-149)

**Regions** categorise rooms into named groups that MAY have ambient properties (default darkness, ambient sound/smell) and MAY nest. Regions are not spatial containers; a room does not "contain" another room via a region.

```
RegionOptions {
    name:             String
    parentRegionId?:  EntityId    // nest in parent region
    ambientSound?:    String
    ambientSmell?:    String
    defaultDark?:     Boolean
}
```

Region hierarchy is queryable:

```
world.isInRegion(entityId, regionId) -> Boolean
world.getRegionCrossings(fromRoomId, toRoomId) -> {
    exited:  List<RegionId>   // innermost first
    entered: List<RegionId>   // outermost first
}
```

**Scenes** mark temporal / narrative phases that begin and end based on author-provided conditions. Scene state is maintained by the world; condition closures are not serialised (they must be re-registered at startup).

```
SceneOptions {
    name:       String
    begin:      (world) -> Boolean      // evaluated each turn while state = waiting
    end:        (world) -> Boolean      // evaluated each turn while state = active
    recurring?: Boolean                  // default false
}
```

### Serialisation

The world model serialises to a JSON string whose shape is defined in `01-data-model.md`. Concretely:

```
world.toJSON() -> String    // JSON.stringify of a snapshot
world.loadJSON(json)        // parses and rehydrates
world.clear()               // reset to empty world
```

The snapshot MUST include:

- All entities (with traits, attributes, relationships, scope priorities, minimum scopes, annotations).
- Spatial index (parent↔children edges).
- Typed relationships.
- ID counters (for deterministic ID generation on resume).
- Capability store (with per-capability data and schemas).
- Score ledger.
- Player ID.
- World state (key/value map).

The snapshot MUST NOT include:

- Behaviour registrations (re-registered at startup).
- Event handlers / validators / previewers / chain handlers (re-registered at startup).
- Scene condition closures (re-registered).
- Grammar / vocabulary (re-initialised from code).

---

## Trait Catalog

A conforming implementation SHALL provide the traits below or document which it omits. Each trait is a pure data record. Behaviour names are given for orientation; a conforming implementation MAY name them differently.

Categories: **Standard** (core world concepts), **Interactive** (player-facing state), **Advanced** (specialised).

| # | Trait                    | Category     | Key data                                                                      |
|---|--------------------------|--------------|-------------------------------------------------------------------------------|
| 1 | `identity`               | Standard     | `name`, `aliases`, `article`, `description`                                   |
| 2 | `container`              | Standard     | `capacity`, `isTransparent`, `enterable`, `allowedTypes`, `excludedTypes`, liquid fields |
| 3 | `supporter`              | Standard     | `capacity`, `allowedTypes`                                                    |
| 4 | `room`                   | Standard     | `isDark`, `exits`, `visited`, ambient fields                                  |
| 5 | `wearable`               | Standard     | `isWorn`, `slot`, `bodyPart`                                                  |
| 6 | `clothing`               | Standard     | layer, `coversBodyParts`, styling                                             |
| 7 | `edible`                 | Standard     | `isEdible`, `isDrinkable`, `nutrition`                                        |
| 8 | `scenery`                | Standard     | non-portable flag, `isInvisible`                                              |
| 9 | `door`                   | Standard     | `room1`, `room2`, `direction1`, `direction2`                                  |
| 10 | `exit`                   | Standard     | source/target rooms, direction, label                                         |
| 11 | `actor`                  | Standard     | `isPlayerCharacter`, `inventoryId`                                            |
| 12 | `region`                 | Standard     | parent region, ambient overrides, default-dark                                |
| 13 | `scene`                  | Standard     | state (waiting/active/ended), recurring, conditions (closures, non-serialised) |
| 14 | `story-info` / `storyInfo` | Standard   | IFID, title, author, version, metadata                                        |
| 15 | `openable`               | Interactive  | `isOpen`, `startsOpen`, messages, `revealsContents`                           |
| 16 | `lockable`               | Interactive  | `isLocked`, `keyId`, `autoLock`                                               |
| 17 | `switchable`             | Interactive  | `isOn`, `startsOn`, toggle messages                                           |
| 18 | `readable`               | Interactive  | `text`, `canRead`, `requiredLight`                                            |
| 19 | `light-source` / `lightSource` | Interactive | `isLit`, `fuel`, `brightness`                                            |
| 20 | `pullable`               | Interactive  | capability-dispatched; story-specific                                         |
| 21 | `pushable`               | Interactive  | capability-dispatched; story-specific                                         |
| 22 | `button`                 | Interactive  | `isPressed`, `momentary`, `emitsEvent`                                        |
| 23 | `attached`               | Interactive  | `attachedTo`, `canDetach`                                                     |
| 24 | `moveable-scenery` / `moveableScenery` | Interactive | `canMove`, `currentPosition`, positions               |
| 25 | `climbable`              | Interactive  | direction, destination, requirements                                          |
| 26 | `enterable`              | Interactive  | `capacity`, `canEnter`                                                        |
| 27 | `vehicle`                | Interactive  | `driverId`, `canExit`, `speed`                                                |
| 28 | `weapon`                 | Interactive  | `damage`, `weaponType`, range                                                 |
| 29 | `breakable`              | Interactive  | `isBroken`, threshold, break effects                                          |
| 30 | `destructible`           | Interactive  | `hitsRemaining`, destruction effects                                          |
| 31 | `combatant`              | Interactive  | `hp`, `maxHp`, stats                                                          |
| 32 | `equipped`               | Interactive  | slot, equip state                                                             |
| 33 | `npc`                    | Standard     | dialogue, schedule, knowledge (ADR-070)                                       |
| 34 | `open-inventory` / `openInventory` | Standard | allows inspection of NPC inventory                                         |
| 35 | `character-model` / `characterModel` | Advanced | appearance, voice, portrait refs (ADR-141)                              |
| 36 | `concealment` (`if.trait.concealment`) | Interactive | hides items until discovered (ADR-148)                             |
| 37 | `concealed-state` (`if.trait.concealed_state`) | Interactive | per-entity concealed flag                                    |

The core stdlib actions assume the following **trait prerequisites**:

| Action                | Required trait on target                  |
|-----------------------|-------------------------------------------|
| OPEN / CLOSE          | OpenableTrait                             |
| LOCK / UNLOCK         | LockableTrait (+ OpenableTrait)           |
| SWITCH ON / SWITCH OFF | SwitchableTrait                           |
| TAKE / DROP           | (portable by default; SceneryTrait blocks)|
| PUT IN                | ContainerTrait on target                  |
| PUT ON                | SupporterTrait on target                  |
| ENTER                 | EnterableTrait or VehicleTrait or ContainerTrait.enterable |
| WEAR / REMOVE         | WearableTrait                             |
| EAT / DRINK           | EdibleTrait                               |
| READ                  | ReadableTrait                             |
| LOWER / RAISE / TURN / WAVE / WIND / (custom PUSH/PULL) | Capability-dispatched; target must have a trait whose `capabilities` list includes the action ID |

Full action catalog is in `06-stdlib.md`.

---

## Event / Command Catalog

World-model operations emit these event types in addition to the action events cataloged in `06-stdlib.md`:

| Type                   | Meaning                                                 |
|------------------------|---------------------------------------------------------|
| `if.event.moved`       | An entity's spatial location changed                    |
| `if.event.taken`       | An entity was taken (subset of moved to actor inventory) |
| `if.event.dropped`     | An entity was dropped into actor's room                 |
| `if.event.opened`      | Openable state changed to open                          |
| `if.event.closed`      | Openable state changed to closed                        |
| `if.event.locked`      | Lockable state changed to locked                        |
| `if.event.unlocked`    | Lockable state changed to unlocked                      |
| `if.event.switched_on`  | Switchable state changed to on                          |
| `if.event.switched_off` | Switchable state changed to off                         |
| `if.event.worn`        | Wearable state changed                                  |
| `if.event.removed`     | Wearable state changed (off)                            |
| `platform.world.*`     | Engine-private world events (debug/diagnostics)         |

The world model also participates in the broader event log (ADR-086, ADR-094): handlers can be registered for any event type to mutate the world, validate proposed events, or emit chain events.

---

## Extension Points

A conforming implementation MUST provide the following seams:

1. **New traits.** Any class/struct tagged with a unique `type` string is a valid trait. No engine changes required.
2. **New behaviours.** Stateless functions that operate on entities. No registration required unless capability-dispatched.
3. **New capability behaviours.** `registerTraitBehavior` or `registerCapabilityBehavior` wires a trait type to a 4-phase behaviour.
4. **New visibility capability handlers.** Traits that claim `if.scope.visible` can override `canSee` for their entity.
5. **New scope rules.** `addScopeRule(rule)` grants scope conditionally.
6. **New relationship types.** Any string key is a valid relationship type.
7. **New capability names.** Any string key is a valid capability in the capability store.
8. **New region/scene conditions.** Arbitrary closures supplied at startup.
9. **Event handlers, validators, previewers, chain handlers** (ADR-086 / ADR-094).
10. **Grammar vocabulary** — entities automatically contribute their names/aliases to the grammar vocabulary provider; stories MAY add more. See `04-grammar.md`.

---

## Mandatory vs Optional

| Feature                                           | Required | Notes |
|---------------------------------------------------|----------|-------|
| Entity lifecycle API                              | **Required** | create/get/remove/update |
| Spatial move + containment queries                | **Required** |           |
| Trait add/get/has/remove                          | **Required** |           |
| `IdentityTrait` or equivalent name resolution     | **Required** |           |
| `RoomTrait` or equivalent spatial-root concept    | **Required** |           |
| `ContainerTrait` / `SupporterTrait`               | **Required** |           |
| `OpenableTrait` / `LockableTrait`                 | Recommended | Omit only if the game has no openable or lockable objects |
| `WearableTrait` / `EdibleTrait` / `ReadableTrait` | Recommended |           |
| `LightSourceTrait` + darkness logic               | **Required** | Any IF worth playing needs this |
| `ActorTrait`                                      | **Required** |           |
| `SceneryTrait`                                    | Recommended | For non-portable decor |
| Advanced traits (combat, NPC, character-model)    | Optional | Only if the game uses them |
| Scope levels (UNAWARE..CARRIED)                   | **Required** |           |
| Scope rules (rule-based scope extension)          | **Required** |           |
| Capability dispatch (ADR-090)                     | **Required** | Needed for story-specific verbs |
| Regions (ADR-149)                                 | Optional |           |
| Scenes (ADR-149)                                  | Optional |           |
| Score ledger (ADR-129)                            | Optional | Games without scoring can omit |
| AuthorModel (or equivalent setup bypass)          | **Required** | Needed to populate closed containers at startup |
| Event handlers / validators / previewers          | Recommended | Required for event-reactive puzzles |
| Event chains (ADR-094)                            | Optional |           |
| `VISIBILITY_CAPABILITY` trait override            | Optional |           |
| Presentation annotations (ADR-124)                | Optional |           |

---

## Implementation Notes

**ADR-011 (Implemented)** — Entity creation uses type-prefixed IDs (`r01`, `a01`, etc.) generated from a per-type counter; see `01-data-model.md`.

**ADR-068 (Accepted)** — Unified darkness checking goes through `VisibilityBehavior.isDark(room, world)`. A conforming implementation MUST treat this as the single authority; scattered "am I in the dark?" checks in individual actions are an anti-pattern.

**ADR-069 (Accepted)** — Perception event filtering. Not all events are perceivable by all actors; a conforming implementation SHOULD filter events through scope/visibility before delivering them to handlers that simulate NPC perception. The current implementation filters at the text-service layer; full perception-filtering may be handled per-plugin.

**ADR-086 (Accepted)** — The world model exposes a `connectEventProcessor(wiring)` hook so its registered handlers become part of the engine's event-processing pipeline (see `05-engine.md`).

**ADR-090 (Accepted)** — Capability dispatch as specified above. Two categories of verbs (fixed-semantics vs. entity-centric) MUST be kept separate.

**ADR-094 (Accepted)** — Event chain handlers. A handler registered via `chainEvent(triggerType, handler, options)` produces additional events in response to a trigger. Chains can have modes (immediate, queued, priority-ordered) and optional keys (for idempotency).

**ADR-118 (Accepted)** — Trait interceptors. Traits MAY declare `static interceptors = [...]` to intercept actions before standard resolution. Less commonly used than capability dispatch; used for guard behaviours (troll blocks taking its axe).

**ADR-124 (Accepted)** — Entity annotations for presentation metadata. Kind-keyed, list-valued; conditions on annotations (when to show) are optional.

**ADR-129 (Accepted)** — Score ledger as a first-class concept. Every score award is named (`id`) and described, enabling trophy-case scoring and revocation.

**ADR-141 (Accepted)** — Character model trait groups NPC appearance data.

**ADR-148 (Accepted)** — Concealment action and paired traits (`if.trait.concealment` on the concealing entity, `if.trait.concealed_state` tracking which entities are concealed).

**ADR-149 (Accepted)** — Regions and scenes are first-class world-model concepts. Regions are categorical (not spatial); scenes are temporal. Scene conditions are closures and must be re-registered after restore.

**ADR-150 (Proposal)** — Not specified as conformance.

**Divergence note.** The world-model `interface` in the reference TypeScript is large (~140 methods including convenience methods like `findPath`, direct `createDoor`, region and scene management, score ledger). A minimal conforming implementation MAY omit many of these convenience methods — provided the fundamental operations (entity lifecycle, spatial, trait composition, capability dispatch, scope, save/restore, event sourcing) are present.

---

## Glossary (local, additive)

- **Behaviour** — A stateless namespace of functions operating on entities and traits. Contrast *trait* (data).
- **Capability dispatch** — The pattern whereby a verb is routed to a trait-declared behaviour (ADR-090).
- **CapabilityBehavior** — The 4-phase interface (validate/execute/report/blocked) a trait registers against an action ID.
- **Region** — A named categorisation of rooms; not a spatial container (ADR-149).
- **Scene** — A temporal/narrative phase gated by closures (ADR-149).
- **Scope** — The set of entities an actor can reference at a given moment.
- **Scope level** — Ordinal (UNAWARE..CARRIED) expressing how strongly in-scope an entity is.
- **Scope rule** — A declarative record granting scope conditionally.
- **Visibility capability** — `if.scope.visible`; a trait claiming this overrides default visibility.

A full glossary will be produced in Phase 8.

---

*End of 02-world-model.md*
