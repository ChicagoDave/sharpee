# Sharpee Data Model & Storage Specification

**Subsystem**: Data Model and Persistence
**Version**: 1 (derived from code as of 2026-04-16)
**Stability**: This spec follows the current TypeScript implementation. Where an ADR disagrees, the ADR intent is noted but the spec follows the code.

---

## Purpose

The data model defines how a running Sharpee world is structured in memory and on disk. It is the foundation every other subsystem builds on:

- The **parser** resolves noun phrases to entity IDs.
- The **world model** stores entities, their traits, and their spatial containment.
- The **engine** serialises the world to a save file and rehydrates it.
- The **stdlib** actions mutate entity state and emit events recorded in the event log.
- The **text service** reads events and renders them.

A conforming implementation of Sharpee in another language MUST provide a data model that satisfies the contract in this document. Everything else — parsing, action semantics, rendering — depends on these shapes.

---

## Invariants

The following conditions MUST always hold for any valid Sharpee world:

1. **Entity ID uniqueness.** No two entities in a world share the same ID.
2. **Single parent.** Every entity in the spatial index has at most one parent (container/location/supporter). A child is not simultaneously inside two containers.
3. **Trait-type uniqueness per entity.** An entity MAY have at most one trait of any given trait type. Adding a second trait of the same type is a no-op or an error, never a silent overwrite.
4. **Trait purity.** Traits are pure data. A trait record contains no behaviour, no methods, and no references to functions. All logic lives in separate *behaviours* or *capability behaviours* (see `02-world-model.md`).
5. **Event append-only.** Once added to the event log, an event is never edited or deleted. The log grows monotonically until the world is reset or restored.
6. **Event determinism.** Given the same initial world, the same random seed, and the same command sequence, the same event sequence MUST be produced. Randomness flows through a seeded RNG captured in the save.
7. **Serialisation round-trip.** Serialising a world and then deserialising it MUST yield a world that is observationally equivalent for all subsequent operations (no lost traits, no lost relationships, no lost event history).
8. **Save portability.** A save file MUST be valid JSON (or a format with equivalent semantics) that can be written to any client storage (file, localStorage, cloud) without further engine knowledge.

---

## Public Contract

All types below are given as language-agnostic pseudocode. A conforming implementation SHALL provide types with these shapes, but MAY use the spelling natural to its language (structs, records, data classes, etc.).

### Entity

The base entity is a four-tuple of `id`, `type`, `attributes`, and `relationships`, to which trait composition is added at runtime.

```
Entity {
    id:            String           // unique within world; see "Entity ID format"
    type:          String           // category tag; see "Entity type vocabulary"
    attributes:    Map<String, Any> // arbitrary key-value data (display name, etc.)
    relationships: Map<String, List<EntityId>>  // typed, directional references
}
```

An **IF entity** (the runtime enrichment used by the world model) extends this with a trait set and presentation metadata:

```
IFEntity : Entity {
    traits:            Map<TraitTypeId, Trait>    // trait composition
    scopePriorities:   Map<ActionId, Integer>     // disambiguation bias per action
    minimumScopes:     Map<RoomId | "*", Integer> // forced scope levels (see parser spec)
    annotations:       Map<Kind, List<Annotation>> // presentation metadata (ADR-124)
}
```

#### Entity ID format

Entity IDs MUST be strings. The reference implementation uses a type-prefixed short form (ADR-011):

```
EntityId ::= <type-prefix><base36-counter>
type-prefix ::= "r" | "d" | "i" | "a" | "c" | "s" | "y" | "e" | "o"
              // room   door  item  actor container supporter scenery exit object
counter   ::= two base-36 characters ("00".."zz"; 1296 values per prefix)
```

Examples: `r01` (first room), `a01` (first actor), `i0a` (eleventh item).

A conforming implementation MAY use a different ID scheme (UUIDs, human-readable strings) provided:

- IDs are globally unique within a world.
- IDs are stable across save/restore.
- The engine never parses the ID to extract semantic meaning.

The short-prefix scheme is strongly recommended for debuggability; the 3-character form keeps event logs and traces readable.

#### Entity type vocabulary

The `type` field is a category tag consumed at entity-creation time to select default traits and ID prefixes. The reference implementation recognises:

```
"room" | "door" | "item" | "actor" | "container"
| "supporter" | "scenery" | "exit" | "object"
```

`"object"` is the fallback for anything that does not match a specialised category. A conforming implementation MAY extend this vocabulary and MAY omit categories it does not need; the type string is opaque to the engine once the entity is created.

#### Entity name resolution

An IF entity has no dedicated `name` field. The display name is resolved from (in order):

1. `attributes.displayName` — highest priority
2. The `name` property of an attached Identity trait
3. `attributes.name`
4. The entity ID — fallback

A conforming implementation MUST provide name resolution with this precedence; the parser uses it to bind noun phrases to entities.

### Trait

A trait is a typed, inert data record tagged with a trait-type identifier:

```
Trait {
    type: TraitTypeId  // namespaced string, e.g. "if.trait.openable"
    ... arbitrary trait-specific fields ...
}
```

Trait-type identifiers are namespaced strings. The core namespace is `if.trait.*`; stories SHOULD use `<story-id>.trait.*` for their own traits; extensions SHOULD use `<extension-id>.trait.*`.

Full trait catalogue is defined in `02-world-model.md`.

### Spatial index

Containment is not stored on the entity. It is kept in a separate **spatial index**, which the implementation MAY implement as two parallel maps:

```
SpatialIndex {
    parentToChildren: Map<EntityId, Set<EntityId>>
    childToParent:    Map<EntityId, EntityId>   // at most one parent per child
}
```

The two maps MUST remain mutually consistent. Any mutation that changes containment MUST update both sides in a single logical operation. Moving a child from one parent to another MUST remove the old edge before adding the new one (see invariant 2).

A conforming implementation MAY represent containment differently (adjacency list, relational table, nested tree) provided:

- Lookup of `parent(child)` and `children(parent)` is O(1) amortised.
- The single-parent invariant is enforced at every mutation.
- Serialisation preserves the full topology.

### Typed relationships

Beyond containment, entities can be connected by named typed edges (e.g. `"knows"`, `"wears"`, `"sibling-of"`). These are distinct from the spatial index:

```
Relationships = Map<EntityId, Map<RelationshipType, Set<EntityId>>>
```

Relationships are directed; an inverse relationship, if desired, is a separate edge. The engine does not automatically infer inverses.

### Capability store

Some game state does not naturally live on any one entity — a trophy-case score, a save-slot registry, a command history. These are stored in a **capability store** keyed by capability name:

```
CapabilityStore = Map<CapabilityName, CapabilityEntry>

CapabilityEntry {
    data:    Map<String, Any>
    schema?: CapabilitySchema        // optional field-validation schema
}

CapabilitySchema = Map<FieldName, {
    type:      "string" | "number" | "boolean" | "array" | "object"
    default?:  Any
    required?: Boolean
}>
```

The reference implementation defines these standard capability names:

- `scoring`
- `saveRestore`
- `conversation`
- `gameMeta`
- `commandHistory`
- `debug`

A conforming implementation MUST provide a capability store that survives save/restore and MUST preserve any capability data the story writes, whether or not the engine recognises the name.

### Event envelope

All semantic events in the system share a single envelope:

```
SemanticEvent {
    id:         String                  // unique per event
    type:       String                  // dotted namespace, e.g. "if.event.taken"
    timestamp:  Integer                 // Unix ms (or equivalent)
    entities: {
        actor?:      EntityId           // initiator (usually the player)
        target?:     EntityId           // primary entity affected
        instrument?: EntityId           // secondary entity (tool, key)
        location?:   EntityId           // where the event happened
        others?:     List<EntityId>     // any others relevant to the event
    }
    data?:      Any                     // payload; shape depends on `type`
    tags?:      List<String>            // for filtering ("success", "failure", ...)
    priority?:  Integer                 // higher = more important
    narrate?:   Boolean                 // hint to text service
    metadata?:  Map<String, Any>        // engine-private annotations
}
```

The `data` payload shape for each event type is defined by the subsystem that emits it. Core payload shapes for game lifecycle, platform operations, and standard messages are cataloged below; stdlib action payloads are cataloged in `06-stdlib.md`.

Event **ID** format is engine-private; a conforming implementation MUST guarantee uniqueness within a single run but is not required to make IDs stable across runs.

### Save envelope

The complete save file is a single JSON document:

```
SaveData {
    version:     String              // engine version that wrote this save
    timestamp:   Integer             // Unix ms
    metadata:    SaveMetadata
    engineState: EngineState
    storyConfig: StoryConfig
}

SaveMetadata {
    storyId:       String            // from story config
    storyVersion:  String
    turnCount:     Integer
    playTime?:     Integer           // ms
    description?:  String
}

EngineState {
    eventSource:   List<SerializedEvent>          // complete event history
    spatialIndex:  SerializedSpatialIndex         // current world state (snapshot)
    turnHistory:   List<SerializedTurn>           // for undo
    parserState?:  SerializedParserState          // optional
    schedulerState?: SerializedSchedulerState     // legacy; see pluginStates
    pluginStates?: Map<PluginId, Any>             // ADR-120 plugin state
}

SerializedEvent {
    id:         String
    type:       String
    timestamp:  Integer
    data:       Map<String, Any>
    metadata?:  Map<String, Any>
}

SerializedTurn {
    turnNumber: Integer
    eventIds:   List<String>
    timestamp:  Integer
    command?:   String               // original input line
}

SerializedSchedulerState {       // ADR-071; optional — superseded by pluginStates
    turn:       Integer
    daemons:    List<{ id: String, isPaused: Boolean, runCount: Integer }>
    fuses:      List<{ id: String, turnsRemaining: Integer, isPaused: Boolean, entityId?: String }>
    randomSeed: Integer
}

StoryConfig {
    id:        String
    version:   String
    title:     String
    author:    String
    metadata?: Map<String, Any>      // e.g., IFID, genre, forgiveness
}
```

#### Serialized spatial index

The canonical shape declared in the save-data types is:

```
SerializedSpatialIndex {
    entities:      Map<EntityId, SerializedEntity>
    locations:     Map<EntityId, SerializedLocation>
    relationships: Map<String, List<SerializedRelationship>>
}

SerializedEntity {
    id:          String
    traits:      Map<TraitTypeId, Any>   // trait type → trait data
    entityType?: String                  // hint for deserialisation
}

SerializedLocation {
    id:           String
    properties:   Map<String, Any>
    contents:     List<EntityId>
    connections?: Map<DirectionName, EntityId>
}

SerializedRelationship {
    type:      String
    sourceId:  EntityId
    targetId:  EntityId
    data?:     Map<String, Any>
}
```

**Implementation note (code divergence).** The reference implementation's `WorldSerializer` emits a slightly different on-disk shape: `entities` is serialized as a *list* of `{id, entity}` pairs rather than a `Record<EntityId, SerializedEntity>`, and the spatial index is serialised as `{parentToChildren: [...], childToParent: [...]}` rather than the entity/location/relationships shape above. Either shape is acceptable for a conforming implementation; what matters is that (a) all entities round-trip with their traits, (b) the containment topology round-trips, and (c) the typed relationships round-trip. The type declarations in `ISerializedSpatialIndex` document the intended contract; the current serializer predates that type and has not been reconciled.

### Serialized entity round-trip

Each entity serialises to JSON with:

```
{
    id:         EntityId
    type:       String                    // entity type category
    attributes: Map<String, Any>
    relationships: Map<String, List<EntityId>>
    traits:     List<Trait>                // flattened trait records, each tagged by its type
    version:    Integer                    // format version (currently 3)
    scopePriorities?: Map<ActionId, Integer>
    minimumScopes?:   Map<RoomId | "*", Integer>
    annotations?:     Map<Kind, List<Annotation>>
}
```

When deserialising, the implementation MAY infer the entity type category from the ID prefix if the `type` field is missing (for older saves).

### Save/restore hooks

The engine does not choose the storage medium. It delegates to a hook interface provided by the client:

```
SaveRestoreHooks {
    onSaveRequested:     (SaveData) -> Promise<Void>       // required
    onRestoreRequested:  () -> Promise<SaveData | Null>    // required
    onQuitRequested?:    (QuitContext) -> Promise<Boolean>
    onRestartRequested?: (RestartContext) -> Promise<Boolean>
}

QuitContext {
    score?:             Number
    moves?:             Integer
    hasUnsavedChanges?: Boolean
    force?:             Boolean
    stats?:             Map<String, Any>
}

RestartContext {
    currentProgress?:   { score?: Number, moves?: Integer, location?: String }
    confirmationRequired?: Boolean
    hasUnsavedChanges?:    Boolean
    force?:                Boolean
}
```

A conforming implementation MUST:

- Expose the hook interface to clients.
- Produce a `SaveData` value on save that satisfies the envelope above.
- Consume a `SaveData` value on restore, clearing the current world first and rehydrating.
- Signal save/restore completion to the rest of the engine via the platform events below (see `05-engine.md` for the turn-cycle integration).

### Story metadata (Treaty of Babel)

A compiled story MUST carry bibliographic metadata sufficient for Treaty of Babel compliance:

```
StoryMetadata {
    ifid:           String              // RFC-4122 UUID, uppercase
    title:          String
    author:         String
    firstPublished?: String              // year
    headline?:      String
    genre?:         String
    description?:   String
    language?:      String               // BCP-47 locale tag
    series?:        String
    seriesNumber?:  Integer
    forgiveness?:   "Merciful" | "Polite" | "Tough" | "Nasty" | "Cruel"
}
```

The IFID MUST be a valid UUID v4, uppercased. The engine MUST provide helpers to generate and validate IFIDs. Story metadata is typically shipped in the compiled package (e.g., in `package.json` under a sharpee config section in the TypeScript implementation).

### Seeded randomness

Because event replay and save/restore both depend on determinism (invariant 6), all game-visible randomness MUST flow through a seeded RNG:

```
SeededRandom {
    next():          Number            // [0.0, 1.0)
    int(min, max):   Integer           // inclusive both ends
    chance(p):       Boolean
    pick(list):      T
    shuffle(list):   List<T>
    getSeed():       Integer
    setSeed(seed):   Void
}
```

The RNG seed MUST be captured in the save (currently in `schedulerState.randomSeed`; see `05-engine.md` for the migration toward plugin-scoped state).

---

## Event / Command Catalog (core)

Events that concern the data model itself — loading, saving, lifecycle — use the following type identifiers. Per-action event identifiers are cataloged in `06-stdlib.md`.

### Game lifecycle events

| Type                         | Meaning                                    |
|------------------------------|--------------------------------------------|
| `game.initializing`          | Engine starting up                         |
| `game.initialized`           | Engine ready (pre-story-load)              |
| `game.story_loading`         | Loading a story                            |
| `game.story_loaded`          | Story loaded; world built                  |
| `game.starting`              | About to begin play                        |
| `game.started`               | First turn imminent                        |
| `game.ending`                | Game about to end                          |
| `game.ended`                 | Game ended (any reason)                    |
| `game.won`                   | Victory condition                          |
| `game.lost`                  | Defeat condition                           |
| `game.quit`                  | Player quit                                |
| `game.aborted`               | Engine-level abort (fatal error)           |
| `game.session_saving`        | Save in progress                           |
| `game.session_saved`         | Save completed                             |
| `game.session_restoring`     | Restore in progress                        |
| `game.session_restored`      | Restore completed                          |
| `game.pc_switched`           | Player character changed                   |
| `game.initialization_failed` | Engine init failed                         |
| `game.story_load_failed`     | Story load failed                          |
| `game.fatal_error`           | Unrecoverable error                        |

### Platform events (client-action events)

Emitted by actions (save, restore, quit, etc.) and processed by the engine after a turn completes but before the text service runs:

| Request / Completion pairs                                                        |
|-----------------------------------------------------------------------------------|
| `platform.save_requested`      →  `platform.save_completed` / `platform.save_failed` |
| `platform.restore_requested`   →  `platform.restore_completed` / `platform.restore_failed` |
| `platform.quit_requested`      →  `platform.quit_confirmed` / `platform.quit_cancelled` |
| `platform.restart_requested`   →  `platform.restart_completed` / `platform.restart_cancelled` |
| `platform.undo_requested`      →  `platform.undo_completed` / `platform.undo_failed` |
| `platform.again_requested`     →  (no completion event; re-executes)              |
| `platform.again_failed`                                                           |

Every platform event carries `requiresClientAction: true` and a `payload` object whose shape depends on the event type.

### Turn events

| Type           | Meaning                                   |
|----------------|-------------------------------------------|
| `turn.started` | A new turn has begun (data: `{turn: N}`)  |
| `turn.ended`   | Turn complete (data: `{turn: N}`)         |

### Standard message events

| Type               | Payload                                      |
|--------------------|----------------------------------------------|
| `message.success`  | `{ messageId: String, params?: Map }`        |
| `message.failure`  | same                                         |
| `message.info`     | same                                         |
| `message.warning`  | same                                         |
| `message.debug`    | same                                         |

These are the wire format for deferring prose to the text service. Action code emits `message.success` / `message.failure` events; the text service resolves the `messageId` to a locale-specific string. See `07-text-service.md`.

### Query events (disambiguation and PC communication)

| Type              | Meaning                                        |
|-------------------|------------------------------------------------|
| `query.pending`   | Engine waiting on player response              |
| `query.invalid`   | Player response rejected by validator          |
| `query.response`  | Player responded                               |

---

## Extension Points

A conforming implementation MUST provide the following extension seams:

1. **Custom entity types.** The `type` field on `Entity` is an open string. New categories MAY be introduced without engine changes.
2. **Custom traits.** New traits MAY be added under any namespace. The engine does not enumerate known trait types; traits are discovered at runtime by their `type` property.
3. **Custom capabilities.** Stories and extensions MAY register new capability names. The capability store is an open map.
4. **Custom event types.** New event type strings MAY be emitted. The event registry is extensible (e.g., via TypeScript declaration merging in the reference implementation; any mechanism that preserves type identity is acceptable).
5. **Custom event data payloads.** Each event type defines its own `data` shape; the engine only reads `id`, `type`, `timestamp`, `entities`, and `tags`.
6. **Presentation annotations.** Entities carry an `annotations` map (ADR-124) keyed by a free-form `kind`. Illustration, portrait, voice, etc., are all valid.
7. **Plugin state.** Plugins (ADR-120) MAY store arbitrary serialisable state in `engineState.pluginStates` keyed by plugin ID.

---

## Mandatory vs Optional

| Feature                                 | Required for conformance | Notes |
|-----------------------------------------|--------------------------|-------|
| Entity shape (id/type/attributes/relationships) | **Required**     |       |
| Trait composition                       | **Required**             | Trait-type uniqueness per entity enforced |
| Name resolution precedence              | **Required**             | displayName > Identity.name > name > id |
| Short-prefix entity ID format           | Recommended              | Any unique-per-world scheme is acceptable |
| Spatial index with single-parent rule   | **Required**             |       |
| Typed relationships (beyond containment)| **Required**             |       |
| Capability store                        | **Required**             | Standard names MAY be unused |
| Semantic event envelope                 | **Required**             |       |
| Event-log append-only                   | **Required**             |       |
| Deterministic replay                    | **Required**             | RNG seed in save |
| Save envelope (`SaveData` shape)        | **Required**             |       |
| Client-provided save/restore hooks      | **Required**             |       |
| Platform events for save/restore/quit   | **Required**             |       |
| Story metadata (IFID, title, author)    | **Required**             | Treaty of Babel compliance |
| Presentation annotations (ADR-124)      | Optional                 | Stories that don't need them can omit |
| Pure event-sourced saves (ADR-034)      | Optional / future        | Not currently specified as conformance |
| Parser state in save                    | Optional                 | Only needed if parser is stateful |

---

## Implementation Notes

**ADR-011 (Implemented)** — Type-prefixed 3-character entity IDs are implemented as specified. The reference implementation enforces the 1296-entities-per-type limit with a clear error on overflow. Name-to-ID and ID-to-name bidirectional maps support case-insensitive name lookup.

**ADR-033 (Implemented)** — The save envelope structure is implemented. The concrete `WorldSerializer` output does not match the `ISerializedSpatialIndex` type declaration in `core/types/save-data.ts`: it emits `entities` as a list of `{id, entity}` pairs and serialises the spatial index as `{parentToChildren, childToParent}` rather than `{entities, locations, relationships}`. A re-implementor MAY pick either shape; what matters is round-trip fidelity.

**ADR-034 (Proposed, Future)** — Pure event-sourced save/restore is proposed but not implemented. The reference engine currently snapshots state and stores the event log alongside it. A conforming implementation MAY adopt event sourcing later; the platform-event catalog above is compatible with that approach.

**ADR-120** — Plugin states are carried in `engineState.pluginStates`. Legacy scheduler state (`engineState.schedulerState`) is still recognised for backward compatibility but new implementations SHOULD treat the scheduler as one plugin among many and store its state under `pluginStates.scheduler`.

**ADR-124** — Presentation annotations (illustrations, portraits, voice clips) are optional per-entity metadata keyed by `kind`. They do not affect game logic and are intended for rich clients.

**Entity `version` field** — Serialised entities carry a numeric `version` (currently 3). Older formats (missing `version`) are auto-upgraded on load by inferring the type from the ID prefix. A conforming implementation SHOULD version its on-disk entity format for the same reason.

**Trait format on disk** — Serialised entities emit traits as a *list* of trait records in the reference implementation, not as a map keyed by trait type. Both forms are equivalent (each trait record carries its own `type`); the map form is more natural for many languages.

---

## Glossary (local)

- **Entity** — Any addressable object in the world.
- **Trait** — A typed data record attached to an entity; pure data, no behaviour.
- **Spatial index** — The containment graph (parent-of / children-of).
- **Capability store** — Off-entity game state keyed by capability name.
- **Semantic event** — An envelope describing something that happened; the unit of the event log.
- **IFID** — Interactive Fiction Identifier, a UUID v4 used by Treaty of Babel to uniquely identify a story.
- **Seeded RNG** — A random source whose sequence is determined by its seed; captured in saves for replay determinism.

A full cross-cutting glossary will be produced in Phase 8.

---

*End of 01-data-model.md*
