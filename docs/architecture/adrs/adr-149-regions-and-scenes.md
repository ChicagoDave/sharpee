# ADR-149: Regions and Scenes

## Status: DRAFT

## Date: 2026-04-14

## Context

Sharpee needs two organizational abstractions that most IF systems provide but Sharpee currently lacks:

1. **Regions** — spatial groupings of rooms that represent geographic areas of the game world (the Underground, the Forest, the Volcano). Authors already organize rooms into region files by convention (`stories/dungeo/src/regions/`), but regions have no runtime representation. The `RoomTrait` has an unused `region?: string` property, but it's just a label — there's no region entity, no containment hierarchy, no entry/exit events, and no region-wide queries.

2. **Scenes** — temporal phases of the story that represent dramatic episodes (Act I, the Flood, the Siege). Sharpee has no scene concept. Daemons and fuses (ADR-071) handle timed events, but there's no higher-level abstraction for "the game is in phase X, which affects what happens." Authors who need scene-like behavior currently manage it with ad-hoc state values and conditionals.

### What's Missing Today

**Regions:**
- The Forest daemon in Dungeo maintains a hardcoded list of room IDs to determine if the player is "in the forest." There's no `world.isInRegion(player, 'forest')`.
- Room descriptions can't vary by region context (e.g., "the damp underground air" applying to all rooms in a region without per-room setup).
- The VS Code extension's World Index panel wants to group rooms by region, but has no data to group on.
- No events fire when the player crosses a region boundary.

**Scenes:**
- Multi-phase puzzles (dam draining, royal puzzle) use ad-hoc state values checked in multiple places. A scene abstraction would centralize "when does this phase start, when does it end, what changes."
- NPC behavior can't be scoped to a scene without manual conditional checks in every behavior handler.
- There's no way to ask "has the flood scene ended?" or "is the siege happening?"

### Inform 7 Reference

**Regions in Inform 7:**
- Regions contain rooms. A room can belong to one region.
- Regions can be nested (the Underground contains the Coal Mine sub-region).
- Condition queries: `if the player is in the Underground`.
- Regions can have properties that apply to all contained rooms.

**Scenes in Inform 7:**
- Named dramatic episodes with begin/end conditions polled each turn.
- Multiple scenes can be active simultaneously.
- Scenes can be recurring (end and begin again).
- "During" scoping: rules behave differently based on active scenes.
- State queries: `if the Siege is happening`, `if Act I has ended`.

## Decision

### Regions

Regions are **entities** with a `RegionTrait`. Rooms declare their region membership. The engine emits events on region boundary crossings.

#### Entity Model

```typescript
// New entity type
EntityType.REGION = 'region';

// RegionTrait — applied to region entities
class RegionTrait implements ITrait {
  static readonly type = 'region';

  /** Human-readable region name. */
  name: string;

  /** Optional parent region for nesting. */
  parentRegionId?: string;

  /** Region-wide ambient properties (propagate to contained rooms). */
  ambientSound?: string;
  ambientSmell?: string;

  /** Whether rooms in this region default to dark. */
  defaultDark?: boolean;
}
```

#### Room Membership

`RoomTrait` already has `region?: string`. This becomes a **required association** pointing to a region entity ID:

```typescript
// In RoomTrait (existing property, now typed as entity reference)
regionId?: string;  // ID of the region entity this room belongs to
```

A room belongs to at most one region. Regions can be nested via `parentRegionId`, so a room in the "Coal Mine" region is implicitly also in the "Underground" region if Coal Mine's parent is Underground.

#### World Model Queries

Region queries are expressed through the EntityQuery API (ADR-150) rather than one-off WorldModel methods. The `@sharpee/queries` package adds region-aware filters:

```typescript
// EntityQuery entry point — all rooms in a region (traverses parent hierarchy)
w.rooms.inRegion('reg-underground')              // EntityQuery — all rooms in Underground
w.rooms.inRegion('reg-coal-mine')                // EntityQuery — just Coal Mine rooms

// Boolean check — is an entity (or its containing room) in a region?
w.rooms.inRegion('reg-forest').any(r => r.id === currentRoomId)

// Get the region entity for a room
w.entities.ofType(EntityType.REGION)
  .where(r => r.id === room.get(RoomTrait)?.regionId)
  .first()

// Group rooms by region (VS Code extension use case)
w.rooms.groupBy(r => r.get(RoomTrait)?.regionId ?? 'unassigned')
```

For the most common check — "is the player in this region?" — a convenience method remains on WorldModel because it needs parent-region traversal logic that doesn't belong in a generic query filter:

```typescript
world.isInRegion(entityId: string, regionId: string): boolean;
```

`isInRegion` checks the entity's location (or the entity itself if it's a room) against the region, including parent region traversal. The `inRegion()` filter on EntityQuery delegates to this same traversal logic internally.

#### Events

When the player moves between rooms in different regions, the engine emits:

```typescript
// New events
'if.event.region_entered'  — { actorId, regionId, fromRegionId? }
'if.event.region_exited'   — { actorId, regionId, toRegionId? }
```

These fire **after** the standard `if.event.actor_moved` event, in the same turn. If the player crosses multiple region boundaries (nested regions), events fire from outermost to innermost for entry, innermost to outermost for exit.

#### Story Usage

```typescript
// Story initialization
const underground = world.createEntity('reg-underground', EntityType.REGION);
underground.set(RegionTrait, { name: 'Underground' });

const coalMine = world.createEntity('reg-coal-mine', EntityType.REGION);
coalMine.set(RegionTrait, { name: 'Coal Mine', parentRegionId: 'reg-underground' });

// Room assignment
cellar.get(RoomTrait)!.regionId = 'reg-underground';
coalRoom.get(RoomTrait)!.regionId = 'reg-coal-mine';

// Event handler
world.on('if.event.region_entered', (event) => {
  if (event.data.regionId === 'reg-underground') {
    // Start underground ambience daemon
  }
});

// Daemon condition — convenience method for simple boolean check
registerDaemon('forest-ambience', {
  condition: () => world.isInRegion(playerId, 'reg-forest'),
  action: () => { /* ambient text */ }
});

// Query-based — all entities in the forest region
const forestContents = w.rooms.inRegion('reg-forest')
  .selectMany(room => w.contents(room.id).toArray());

// Group rooms by region for tooling/debug panels
const regionMap = w.rooms.groupBy(r => r.get(RoomTrait)?.regionId ?? 'none');
```

### Scenes

Scenes are **entities** with a `SceneTrait`. They have begin/end conditions evaluated each turn by the engine's turn cycle. Active scenes affect what rules and behaviors apply.

#### Entity Model

```typescript
// New entity type
EntityType.SCENE = 'scene';

// SceneTrait — applied to scene entities
class SceneTrait implements ITrait {
  static readonly type = 'scene';

  /** Human-readable scene name. */
  name: string;

  /** Current scene state. */
  state: 'waiting' | 'active' | 'ended';

  /** Whether the scene can activate more than once. */
  recurring: boolean;

  /** Number of turns the scene has been active (0 if not active). */
  activeTurns: number;

  /** Turn number when the scene last began. */
  beganAtTurn?: number;

  /** Turn number when the scene last ended. */
  endedAtTurn?: number;
}
```

#### Condition Functions

Scene transitions are defined via condition functions registered during story initialization:

```typescript
interface SceneConditions {
  /** Returns true when the scene should begin. Evaluated each turn when state is 'waiting'. */
  begin: (world: WorldModel) => boolean;

  /** Returns true when the scene should end. Evaluated each turn when state is 'active'. */
  end: (world: WorldModel) => boolean;
}

// Registration API
world.registerScene(sceneId: string, conditions: SceneConditions): void;
```

#### Turn Cycle Integration

Scene evaluation runs **once per turn**, after action resolution and before daemons/fuses:

```
1. Parse command
2. Validate & execute action
3. NPC turns
4. **Scene evaluation** ← new phase
5. Daemons & fuses
6. Report
```

For each registered scene:
- If `state === 'waiting'` and `begin()` returns true → transition to `active`, emit `if.event.scene_began`
- If `state === 'active'` and `end()` returns true → transition to `ended` (or `waiting` if `recurring`), emit `if.event.scene_ended`
- If `state === 'active'` → increment `activeTurns`

Multiple scenes can be active simultaneously.

#### Events

```typescript
'if.event.scene_began'  — { sceneId, sceneName, turn }
'if.event.scene_ended'  — { sceneId, sceneName, turn, totalTurns }
```

#### World Model Queries

Scene queries use the EntityQuery API (ADR-150) for collection-based access, with convenience methods on WorldModel for common boolean checks:

```typescript
// EntityQuery — all active scenes
w.entities.ofType(EntityType.SCENE)
  .where(s => s.get(SceneTrait)?.state === 'active')

// Shorthand via query entry point
w.scenes                                    // EntityQuery — all scene entities
w.scenes.where(s => s.get(SceneTrait)?.state === 'active')  // active scenes
w.scenes.named('The Flood').first()         // find a specific scene

// Boolean convenience methods (remain on WorldModel — common enough to justify)
world.isSceneActive(sceneId: string): boolean;
world.hasSceneEnded(sceneId: string): boolean;
world.hasSceneHappened(sceneId: string): boolean;  // began at least once
```

The `w.scenes` entry point is added by `@sharpee/queries` alongside `w.rooms`, `w.actors`, and `w.objects`.

#### Story Usage

```typescript
// Story initialization
const flood = world.createEntity('scene-flood', EntityType.SCENE);
flood.set(SceneTrait, { name: 'The Flood', state: 'waiting', recurring: false, activeTurns: 0 });

world.registerScene('scene-flood', {
  begin: (w) => w.getStateValue('dam-gates') === 'open',
  end: (w) => w.getStateValue('flood-drained') === true,
});

// React to scene transitions
world.on('if.event.scene_began', (event) => {
  if (event.data.sceneId === 'scene-flood') {
    // Flood room descriptions, block certain exits, start water-rising fuse
  }
});

// Scope behavior to active scene
world.on('if.event.actor_moved', (event) => {
  if (world.isSceneActive('scene-flood') && isFloodZone(event.data.toRoom)) {
    // Rising water danger text
  }
});

// Query active scenes for debug/tooling
const activeScenes = w.scenes
  .where(s => s.get(SceneTrait)?.state === 'active')
  .select(s => ({
    name: s.get(SceneTrait)!.name,
    turns: s.get(SceneTrait)!.activeTurns,
  }));
```

## Prerequisites

- **ADR-150: Entity Query API (LINQ-Style)** — Region and scene queries are expressed through EntityQuery entry points and filters (`w.rooms.inRegion()`, `w.scenes`, `groupBy()`). The query package should be implemented first so that ADR-149 builds on top of it rather than adding bespoke query methods that get superseded later.

## Consequences

### Positive

- **Regions eliminate hardcoded room lists.** Daemons, event handlers, and NPC behaviors can query region membership instead of maintaining parallel ID arrays.
- **Scenes centralize phase logic.** Multi-stage puzzles and narrative arcs get a single place to define transitions instead of scattered state checks.
- **Both are entities.** They participate in the existing entity/trait/behavior/event system. No new architectural mechanisms needed.
- **Tooling benefits.** The VS Code extension can group rooms by region via `w.rooms.groupBy(r => r.get(RoomTrait)?.regionId)`, show active scenes via `w.scenes.where(...)`, and provide autocomplete for region/scene IDs. The EntityQuery API makes these tooling queries trivial.
- **Language layer compatible.** Region/scene events use message IDs, so output text goes through the localization system.
- **Minimal bespoke API surface.** Only `world.isInRegion()` (parent traversal), `world.isSceneActive()`, `world.hasSceneEnded()`, and `world.hasSceneHappened()` are added as WorldModel convenience methods. All collection queries go through EntityQuery, keeping the WorldModel interface lean.

### Negative

- **Two new entity types.** Adds complexity to the world model. Stories that don't need regions or scenes still see the infrastructure.
- **Turn cycle change.** Adding a scene evaluation phase is a change to the engine's turn loop. Must be carefully ordered relative to daemons/fuses.
- **Migration.** Existing Dungeo code that uses ad-hoc region detection (forest daemon room ID lists) should be migrated to use formal regions. Not urgent but creates tech debt if left.
- **Depends on ADR-150.** Region/scene queries rely on the EntityQuery API being implemented first. If ADR-150 is delayed, this ADR must either wait or fall back to bespoke WorldModel methods (which would then need migration when ADR-150 lands).

### Neutral

- **`RoomTrait.region` string** becomes `RoomTrait.regionId` entity reference. The existing property is unused, so this is a non-breaking rename.
- **Scenes vs. state machines.** Scenes are intentionally simpler than a general state machine system. If Sharpee later gains a state machine runtime (per the discussion in ADR-119's scope), scenes could be implemented as sugar on top of it. This ADR does not preclude that evolution.
- **Region nesting is optional.** Stories can use flat regions (no `parentRegionId`) and still get all the benefits.

## Implementation Notes

### Package Location

- `RegionTrait` and `SceneTrait`: `packages/world-model/src/traits/`
- Region queries: `packages/world-model/src/world/WorldModel.ts` (new methods)
- Scene evaluation phase: `packages/engine/src/` (turn cycle modification)
- Events: `packages/stdlib/src/actions/standard/going/` (region events piggyback on movement)
- Message IDs: `packages/stdlib/src/` (new message ID files for region/scene text)
- Language text: `packages/lang-en-us/src/`

### Phasing

0. **ADR-150: EntityQuery API** — prerequisite; `@sharpee/queries` package with `EntityQuery` class and `IWorldModel` augmentation
1. **Region entities and trait** — world-model change, no engine change
2. **Region queries** — `inRegion()` filter on EntityQuery + `world.isInRegion()` convenience method; room assignment via `RoomTrait.regionId`
3. **Region events on movement** — engine/stdlib change (going action emits region crossing events)
4. **Scene entities and trait** — world-model change
5. **Scene queries** — `w.scenes` entry point on EntityQuery + `world.isSceneActive()` / `hasSceneEnded()` / `hasSceneHappened()` convenience methods
6. **Scene evaluation in turn cycle** — engine change
7. **Scene events** — engine change
8. **Dungeo migration** — story change (assign regions to rooms, convert daemons to use region queries)

Regions (phases 1-3) and scenes (phases 4-7) are independent and can be implemented in either order after phase 0. Dungeo migration (phase 8) can happen incrementally.
