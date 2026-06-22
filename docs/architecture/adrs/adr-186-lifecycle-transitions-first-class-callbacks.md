# ADR-186: Turn-cycle lifecycle transitions are first-class typed callbacks

## Status: PROPOSED

## Date: 2026-06-22

## Context

Two defects from the book end-to-end QA run turned out to be the same architectural
gap, not two unrelated bugs.

**#150 — NPC room-entry/exit (ADR-070).** `NpcBehavior` declares typed lifecycle
callbacks `onPlayerEnters` / `onPlayerLeaves`, and `NpcService` implements and
unit-tests them. But nothing invoked them at runtime: `NpcPlugin.onAfterAction`
only called `service.tick()` (which drives `onTurn`). The hooks were dead code, so
the parrot's `onPlayerEnters` greeting in Chapter 20 never fired.

**#151 — scene begin/end (ADR-149).** `SceneEvaluationPlugin` detects scene
transitions each turn and emits `if.event.scene_began` / `if.event.scene_ended`.
Chapter 21 §21.4 tells authors to react with
`world.registerEventHandler('if.event.scene_began', …)`. That pattern is broken in
three independent ways:

1. **Never delivered.** Plugin-emitted events go through the engine's
   `processPluginEvents()`, which appends them to the turn render list and the event
   bus but never runs them through the handler/chain dispatch. That dispatch
   (ADR-086 registered handlers, ADR-094 chains, via `EventProcessor.processEvents`)
   is wired only for *action* events. `registerEventHandler('if.event.scene_began')`
   and `chainEvent('if.event.scene_began')` are equally dead.
2. **Wrong handler kind.** Chapter 13 §13.8 documents `registerEventHandler` as
   running *silently* for state bookkeeping ("the player never sees it"); visible
   output must use `chainEvent`. §21.4 routes player-visible atmosphere text through
   the silent handler.
3. **Forces `any`.** `ISemanticEvent.data` is `unknown`, so reading `data.sceneId`
   requires `event.data as Record<string, any>` — reintroducing the `any` this
   codebase has deliberately swept out.

The tempting fix — route plugin events through the same registered-handler dispatch
as action events — **squeezes lifecycle notifications into the action-reaction
pipeline**. That pipeline runs `applyEvent` (validation + world event-history append)
and reaction processing; scene transitions are notifications, not state mutations,
and have no business entering world history or validation. It also keeps the
stringly-typed event names, the untyped `data` (`any`), and the silent-handler
mismatch. It is the wrong seam.

Both defects share one root: **a lifecycle transition that the owning subsystem
already detects, but whose author-facing reaction was modeled as a generic,
stringly-typed, untyped event lobbed at the global event bus** — rather than a
first-class typed callback.

## Decision

Turn-cycle lifecycle transitions are surfaced as **typed callbacks owned by the
subsystem's own definition and invoked directly by the owning turn plugin**, which
returns the resulting events through the normal turn-event render path. They are
**not** delivered through the generic `registerEventHandler` / `chainEvent` event bus.

- **NPCs (already aligned).** `NpcBehavior.onPlayerEnters` / `onPlayerLeaves` are
  invoked by `NpcPlugin.onAfterAction` when the player's action moved them this turn
  (detected from the `if.event.actor_moved` in the turn's action events). Returned
  `NpcAction`s render through the existing NPC event path. Implemented for #150.

- **Scenes (new).** `createScene` gains optional typed reaction callbacks
  `onBegin(ctx)` / `onEnd(ctx)`, colocated with the existing `begin` / `end`
  conditions. `SceneEvaluationPlugin` invokes them at the transition it already
  detects and returns their events from `onAfterAction`, which the engine renders
  (the same path NPC actions already use). The callbacks receive a typed
  `SceneEventContext` (`world`, `sceneId`, `sceneName`, `turn`, `totalTurns?`) — no
  `any` anywhere on the author path.

- `if.event.scene_began` / `scene_ended` **remain emitted as observable facts** for
  perception, tooling, and transcript assertions, but they are not the author
  reaction path. It is **intentional and documented** that plugin-emitted events are
  not dispatched to `registerEventHandler` / `chainEvent`: they are notifications,
  not action events. The action-reaction pipeline stays exclusively for action events.

## Consequences

- Scenes become a first-class authored concept: conditions and reactions are
  colocated and fully typed, with no event-bus round-trip and no `any`.
- Chapter 21 §21.4 is rewritten to use the scene callbacks; the
  `registerEventHandler('if.event.scene_began', …)` example is removed from the book.
  Chapter 20 needs no book change (already callback-based; #150 wired its caller).
- `EventProcessor.processEvents` (validation, world history, reactions) stays
  exclusively for action events; `processPluginEvents` stays a render/emit path and
  does **not** gain handler dispatch. The two concerns stay separate.
- New typed API surface: scene reaction callbacks + `SceneEventContext`. Changes are
  confined to the scene subsystem (`createScene` options / `SceneTrait` conditions)
  and `SceneEvaluationPlugin`.
- No migration burden: the old `registerEventHandler` scene pattern never fired, so
  nothing depended on it (consistent with the project's no-backwards-compatibility
  stance).
- Establishes the pattern for future turn-cycle lifecycle hooks (scheduler fuse
  fired, state-machine transition, etc.): a typed callback owned by the subsystem,
  invoked by its plugin — not a generic event on the bus.

## Alternatives considered

- **Route plugin events through the registered-handler/chain dispatch in
  `processPluginEvents`.** Rejected: conflates notification with the action-reaction
  pipeline (validation + world event-history), keeps stringly-typed names and untyped
  `data` (`any`), and inherits the silent-handler / visible-output contradiction.
  This was the initial proposal in the #151 investigation.
- **A separate typed registration API (`world.onSceneBegan(id, cb)`).** Viable and
  typed, but splits a scene's conditions (in `createScene`) from its reactions
  (registered elsewhere). Colocating the reactions in the definition is more
  discoverable and mirrors how `NpcBehavior` colocates its lifecycle callbacks.

## Issues / Session

- Resolves GitHub #150 (NPC `onPlayerEnters`/emote) and #151 (scene transitions).
- Session: 2026-06-22, book QA end-to-end run (`docs/book/testing/EXECUTION-LOG.md`).
- Cross-references: ADR-070 (NPCs), ADR-149 (scenes), ADR-086/094 (event
  handlers/chains), ADR-120 (turn plugins), ADR-051 (four-phase actions),
  ADR-174 (prose pipeline).
