# Scenes: Named Windows of Story Time

A world that only reacts command-by-command stays flat. Stories have *phases*: a
storm that rolls in and passes, a market that's busy by day, a tense stretch while
an alarm blares. Sharpee models these as **scenes**: named windows of story time
that switch on and off based on conditions you write, with the engine watching the
clock for you.

## What a scene is

A scene is a phase of the story with a beginning and an end. You give it two
conditions, when it should *begin* and when it should *end*, and the engine
checks them every turn, flipping the scene between three states:

```
waiting ──[begin() is true]──> active ──[end() is true]──> ended
```

While a scene is **active**, you can key behavior to it; once it's **ended**, that
behavior stops. You don't poll or schedule anything yourself. You describe the
window, and the engine manages the lifecycle.

## Creating a scene

Scenes are created in `initializeWorld()` with `world.createScene()`. The scene
methods (`createScene`, `isSceneActive`, `hasSceneHappened`, `hasSceneEnded`) are
all on the `WorldModel` you already have in scope; the one symbol you import is
`SceneTrait` (used later to read a scene's `activeTurns`), from `@sharpee/world-model`.
The `begin` and `end` options are predicates over the world; each returns `true`
when its moment has come. Here's a scene that's active only while the visitor is in
the petting zoo:

```typescript
world.createScene('scene-petting-zoo', {
  name: 'Among the Animals',
  begin: (w) => w.getLocation(w.getPlayer()!.id) === pettingZoo.id,
  end:   (w) => w.getLocation(w.getPlayer()!.id) !== pettingZoo.id,
  recurring: true,
});
```

`recurring: true` lets the scene reactivate: leave the petting zoo and come back,
and it begins again. Without it (the default), a scene fires once and stays ended.

## Querying a scene

Anywhere in your story logic you can ask the world about a scene's state:

```typescript
if (world.isSceneActive('scene-petting-zoo')) {
  // the player is among the animals right now
}

if (world.hasSceneHappened('scene-finale')) {
  // the finale has run at least once
}
```

`isSceneActive` is the common one; `hasSceneHappened` and `hasSceneEnded` let you
check whether a phase has already played out.

## Reacting to transitions

The real power is reacting to the *edges*: the moment a scene begins or ends. You
write those reactions as `onBegin` and `onEnd` callbacks, right next to the `begin`
and `end` conditions in `createScene`. Each callback returns the text the player
should see at that edge, either prose directly (`{ text }`) or a message id resolved
through your language file (`{ messageId }`):

```typescript
world.createScene('scene-petting-zoo', {
  name: 'Among the Animals',
  begin: (w) => w.getLocation(w.getPlayer()!.id) === pettingZoo.id,
  end:   (w) => w.getLocation(w.getPlayer()!.id) !== pettingZoo.id,
  recurring: true,
  onBegin: () => ({ text: 'A waft of hay and warm fur greets you.' }),
  onEnd:   () => ({ text: 'The animal sounds fade behind you.' }),
});
```

The callback receives a typed context (`sceneId`, `sceneName`, `turn`, the `world`,
and, on `onEnd`, `totalTurns`, how long the scene ran), so you can vary the line:

```typescript
  onEnd: (ctx) => ({ text: `You spent ${ctx.totalTurns} turns among the animals.` }),
```

Return nothing for a state-only beat (a scene whose edges drive logic but print no
line). To return more than one line, return an array of reactions. This is where
atmosphere and staged events live: open a sequence when a scene begins, close it down
when the scene ends; and because the reaction is part of the scene definition, the
condition and its payoff sit together.

> The engine still emits `if.event.scene_began` / `if.event.scene_ended` as
> observable facts (for perception, tooling, and transcript tests), but author
> reactions go through `onBegin` / `onEnd`, not the event-handler bus.

## Common shapes

Most scenes are one of a few patterns, all expressed through `begin`/`end`:

- **Location-based**: active while the player is somewhere, as above; `begin` and
  `end` test the player's room. Usually `recurring`.
- **One-shot trigger**: `begin` watches a flag (`w.getStateValue('alarmTripped')`)
  and `end` fires after a turn or two, so the beat plays once and never returns.
- **Timed**: `end` checks how long the scene has run. A scene's `SceneTrait`
  tracks `activeTurns`, so a storm can last a fixed stretch:

```typescript
world.createScene('scene-storm', {
  name: 'Thunderstorm',
  begin: (w) => w.getStateValue('stormTriggered') === true,
  end:   (w) => (w.getEntity('scene-storm')?.get(SceneTrait)?.activeTurns ?? 0) >= 15,
});
```

## Scenes versus timed events

The next chapter covers **daemons** and **fuses**: per-turn machinery for things
that *do* something each turn or fire after a countdown. Scenes sit a level above
that: a scene answers "*is this phase of the story on right now?*" It's state, not
action. A common division of labor is a scene that defines the window and a daemon
that does the per-turn work *while* that window is open; the daemon simply checks
`world.isSceneActive(...)` in its condition. Reach for a scene when you're thinking
in story beats; reach for a daemon or fuse when you're thinking in turns.

## Key takeaway

A scene is a named phase of the story with `begin` and `end` conditions the engine
checks each turn, cycling `waiting → active → ended` (and back to `waiting` when
`recurring`). Create them with `world.createScene()` in `initializeWorld()`, query
state with `world.isSceneActive()` / `hasSceneHappened()`, and react to the edges
with the scene's own `onBegin` / `onEnd` callbacks. Reach for a scene when a phase of the story needs a defined window; let a daemon or
fuse handle whatever happens turn-by-turn inside it.
