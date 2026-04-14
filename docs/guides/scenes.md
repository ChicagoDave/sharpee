# Scenes Guide

## Overview

Scenes are time-bounded story phases that activate and end based on world conditions. Use them for timed sequences, environmental changes, NPC schedules, or any game logic that should run during a specific window of the story.

The engine evaluates scene conditions automatically each turn — you define when a scene begins and ends, and the engine handles the lifecycle.

## Creating Scenes

Create scenes in `initializeWorld()` with `begin` and `end` condition functions:

```typescript
initializeWorld(world: WorldModel): void {
  // A scene that activates when the player enters the dungeon
  world.createScene('scene-dungeon-ambience', {
    name: 'Dungeon Ambience',
    begin: (w) => {
      const player = w.getPlayer();
      if (!player) return false;
      const loc = w.getLocation(player.id);
      return loc ? w.isInRegion(loc, 'reg-dungeon') : false;
    },
    end: (w) => {
      const player = w.getPlayer();
      if (!player) return false;
      const loc = w.getLocation(player.id);
      return loc ? !w.isInRegion(loc, 'reg-dungeon') : true;
    },
  });
}
```

### SceneOptions

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Human-readable scene name |
| `begin` | `(world) => boolean` | Yes | Returns true when the scene should activate |
| `end` | `(world) => boolean` | Yes | Returns true when the scene should end |
| `recurring` | `boolean` | No | If true, the scene can activate again after ending (default: false) |

## Scene Lifecycle

Every scene follows this state machine:

```
waiting ──[begin() returns true]──> active ──[end() returns true]──> ended
                                      ^                                │
                                      └────── (if recurring) ──────────┘
```

- **waiting** — the scene's `begin()` condition is checked each turn
- **active** — the scene is running; `end()` is checked each turn; `activeTurns` increments
- **ended** — the scene is finished (or returns to `waiting` if `recurring: true`)

## Scene Properties

Once created, the scene entity has a `SceneTrait` with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Scene name |
| `state` | `'waiting' \| 'active' \| 'ended'` | Current lifecycle state |
| `recurring` | `boolean` | Whether the scene can reactivate |
| `activeTurns` | `number` | Turns the scene has been active (resets on end) |
| `beganAtTurn` | `number` | Turn number when the scene last began |
| `endedAtTurn` | `number` | Turn number when the scene last ended |

## Querying Scene State

```typescript
// Is the flood scene currently active?
if (world.isSceneActive('scene-flood')) {
  // Water is rising...
}

// Has the ritual scene already happened?
if (world.hasSceneHappened('scene-ritual')) {
  // The altar is already activated
}

// Has the scene ended (not just happened — specifically in 'ended' state)?
if (world.hasSceneEnded('scene-dungeon-ambience')) {
  // Player has left the dungeon
}
```

## Scene Events

The engine emits events when scenes transition:

- `if.event.scene_began` — emitted when a scene moves from `waiting` to `active`
- `if.event.scene_ended` — emitted when a scene moves from `active` to `ended`

### Reacting to Scene Transitions

```typescript
world.registerEventHandler('if.event.scene_began', (event, world) => {
  if (event.data.sceneId === 'scene-flood') {
    // Start the flood sequence — block exits, change descriptions
  }
});

world.registerEventHandler('if.event.scene_ended', (event, world) => {
  if (event.data.sceneId === 'scene-flood') {
    // Flood is over — restore exits, update room descriptions
  }
});
```

## Recurring Scenes

A recurring scene returns to `waiting` after ending, so it can activate again:

```typescript
// A guard patrol that repeats
world.createScene('scene-guard-patrol', {
  name: 'Guard Patrol',
  begin: (w) => {
    // Activate every 10 turns
    const scene = w.getEntity('scene-guard-patrol');
    const trait = scene?.get(SceneTrait);
    const lastEnd = trait?.endedAtTurn ?? 0;
    return (w.getPlayer() as any)?.currentTurn - lastEnd >= 10;
  },
  end: (w) => {
    // Patrol lasts 3 turns
    const scene = w.getEntity('scene-guard-patrol');
    const trait = scene?.get(SceneTrait);
    return (trait?.activeTurns ?? 0) >= 3;
  },
  recurring: true,
});
```

## Common Patterns

### Timed Event

A scene that runs for a fixed number of turns:

```typescript
world.createScene('scene-storm', {
  name: 'Thunderstorm',
  begin: (w) => w.getStateValue('stormTriggered') === true,
  end: (w) => {
    const scene = w.getEntity('scene-storm');
    return (scene?.get(SceneTrait)?.activeTurns ?? 0) >= 15;
  },
});
```

### Location-Based Scene

A scene active only while the player is in a specific area:

```typescript
world.createScene('scene-market', {
  name: 'Market Day',
  begin: (w) => {
    const loc = w.getLocation(w.getPlayer()!.id);
    return loc === marketSquareId;
  },
  end: (w) => {
    const loc = w.getLocation(w.getPlayer()!.id);
    return loc !== marketSquareId;
  },
  recurring: true,
});
```

### One-Shot Triggered Scene

A scene that fires once when a condition is met and never repeats:

```typescript
world.createScene('scene-collapse', {
  name: 'Cave Collapse',
  begin: (w) => w.getStateValue('dynamiteLit') === true,
  end: (w) => {
    const scene = w.getEntity('scene-collapse');
    return (scene?.get(SceneTrait)?.activeTurns ?? 0) >= 1;
  },
  // recurring defaults to false — this scene fires once
});
```

## Evaluation Timing

Scene conditions are evaluated by the engine's `SceneEvaluationPlugin` each turn, after NPC turns and state machines but before daemons/fuses. This means:

- Scene `begin()` can depend on NPC actions that just happened
- Daemons can depend on whether a scene is active
- Scenes see the world state *after* the current turn's action has executed
