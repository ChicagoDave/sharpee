# ADR-186: Turn-cycle lifecycle transitions are first-class typed callbacks

## Status: ACCEPTED

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
  conditions. Each callback receives a typed `SceneEventContext` and **returns typed
  `SceneReaction`s** (a direct `{ text }` for story-owned prose, or
  `{ messageId, params? }` for lang-routed text) — never raw `ISemanticEvent`s and no
  `any` on the author path. `SceneEvaluationPlugin` invokes the callback at the
  transition it already detects, translates each returned reaction into a
  `game.message` event, and returns those from `onAfterAction`. Because
  `game.message` is the event the prose pipeline's `handleGameMessage` already renders
  as visible output, scene reactions are **player-visible by construction** — this is
  what closes #151's silent-handler defect. The exact interfaces, the storage/update
  contract, and the boundary are specified in **Contract** below.

- `if.event.scene_began` / `scene_ended` **remain emitted as observable facts** for
  perception, tooling, and transcript assertions, but they are not the author
  reaction path. It is **intentional and documented** that plugin-emitted events are
  not dispatched to `registerEventHandler` / `chainEvent`: they are notifications,
  not action events. The action-reaction pipeline stays exclusively for action events.

## Contract

### Interfaces (all in `@sharpee/world-model`, exported from the root barrel)

Colocated with `SceneOptions` / `SceneConditions` in `world/WorldModel.ts`:

```typescript
/** Context passed to a scene reaction callback. No `any`. */
export interface SceneEventContext {
  world: IWorldModel;
  sceneId: string;
  sceneName: string;
  turn: number;
  /** Turns the scene was active. Present only for onEnd. */
  totalTurns?: number;
}

/** A player-visible reaction returned by a scene callback. */
export type SceneReaction =
  | { text: string }                                   // story-owned prose (direct)
  | { messageId: string; params?: Record<string, unknown> };  // lang-routed text

/** A scene reaction callback. Returning nothing is valid (state-only beat). */
export type SceneCallback =
  (ctx: SceneEventContext) => SceneReaction[] | SceneReaction | void;
```

`SceneOptions` and `SceneConditions` each gain two optional fields:

```typescript
interface SceneOptions  { /* …existing… */ onBegin?: SceneCallback; onEnd?: SceneCallback; }
interface SceneConditions { /* begin, end */ onBegin?: SceneCallback; onEnd?: SceneCallback; }
```

### Update contract (perform together — these are one logical change)

The callbacks reach the plugin only through the `SceneConditions` map returned by
`getAllSceneConditions()`. All four steps are required; omitting the storage step
(step 3) is the silent-failure mode this ADR guards against:

1. `SceneOptions` — add `onBegin?` / `onEnd?` (`world/WorldModel.ts`).
2. `SceneConditions` — add `onBegin?` / `onEnd?` (`world/WorldModel.ts`).
3. `WorldModel.createScene` — copy `options.onBegin` / `options.onEnd` into the
   `sceneConditions` entry it already stores. (`AuthorModel.createScene` delegates, no
   change.)
4. `SceneEvaluationPlugin.onAfterAction` — at the transition it already detects, after
   pushing the `scene_began` / `scene_ended` fact, invoke the matching callback and
   append its translated `game.message` events.

Export `SceneEventContext`, `SceneReaction`, `SceneCallback` from
`world/index.ts` → `src/index.ts` (root barrel discipline).

### Boundary contract (engine → story callback)

`SceneEvaluationPlugin` owns construction of `SceneEventContext` and translation of
the return value:

- On begin: build `{ world, sceneId, sceneName: trait.name, turn }` (no `totalTurns`).
- On end: build the same plus `totalTurns: <activeTurns before reset>`.
- Normalize the return (`undefined` → `[]`, a single `SceneReaction` → `[it]`), map
  each reaction to a `game.message` event (`{ text }` → `data.text`;
  `{ messageId, params }` → `data.messageId` + `data.params`), and append in order.
- Event construction: give each `game.message` an `id` from a monotonic counter
  (`scene-<n>`) and do **not** set `timestamp` at construction. The engine's
  `turn-event-processor` `normalizeEvent` backfills `timestamp` (and any missing `id`)
  at the single normalization point. Do not stamp `Date.now()` into the id or
  timestamp here — the counter alone makes the id unique, and wall-clock in event
  construction is what breaks deterministic replay. (The same applies to the existing
  `scene_began` / `scene_ended` facts, whose current `Date.now()` use is incidental,
  not relied upon.)
- Wrap each callback invocation in the same `try/catch` already guarding `begin()` /
  `end()`: a throwing callback is swallowed (logged), the transition still completes,
  and no reaction events are emitted for that callback.

### Save/restore

`onBegin` / `onEnd` are non-serializable closures, exactly like the existing
`begin` / `end` conditions (documented on `SceneTrait`). They live in the in-memory
`sceneConditions` map, not in trait data, so they are not persisted; stories
re-register them by re-running `createScene` after restore. This introduces **no new**
persistence concern.

## Consequences

- Scenes become a first-class authored concept: conditions and reactions are
  colocated and fully typed, with no event-bus round-trip and no `any`.
- Chapter 21 §21.4 is rewritten to use the scene callbacks; the
  `registerEventHandler('if.event.scene_began', …)` example is removed from the book.
  Chapter 20 needs no book change (already callback-based; #150 wired its caller).
- `EventProcessor.processEvents` (validation, world history, reactions) stays
  exclusively for action events; `processPluginEvents` stays a render/emit path and
  does **not** gain handler dispatch. The two concerns stay separate.
- New typed API surface: scene reaction callbacks + `SceneEventContext` /
  `SceneReaction`. Changes are confined to the scene subsystem (`SceneOptions` /
  `SceneConditions` in `WorldModel`, and `WorldModel.createScene`) and
  `SceneEvaluationPlugin`. (The callbacks are stored in the `sceneConditions` map, not
  on `SceneTrait` — `SceneTrait` remains serializable trait data only.)
- No migration burden: the old `registerEventHandler` scene pattern never fired, so
  nothing depended on it (consistent with the project's no-backwards-compatibility
  stance).
- Establishes the pattern for future turn-cycle lifecycle hooks (scheduler fuse
  fired, state-machine transition, etc.): a typed callback owned by the subsystem,
  invoked by its plugin — not a generic event on the bus.

## Acceptance criteria

- [ ] #150: NPC `onPlayerEnters` / `onPlayerLeaves` fire when the player's action
      moved them this turn. (Done — wired in `NpcPlugin.onAfterAction`; regression
      assertion in the devkit `10-npc.transcript` fixture.)
- [ ] `SceneEventContext`, `SceneReaction`, `SceneCallback` are exported from
      `@sharpee/world-model`'s root barrel; no `any` on the scene author path.
- [ ] `SceneOptions` and `SceneConditions` carry `onBegin?` / `onEnd?`; `createScene`
      stores them in the `sceneConditions` map.
- [ ] A scene whose `onBegin` returns `{ text }` produces visible prose in the turn's
      render output the turn its begin condition first holds; same for `onEnd` on the
      turn it ends.
- [ ] `if.event.scene_began` / `scene_ended` are still emitted as facts and remain
      absent from the prose output (no handler renders them).
- [ ] A `recurring` scene re-fires `onBegin` on each re-activation; `onEnd` receives
      the correct `totalTurns`.
- [ ] A throwing callback does not abort the transition and emits no reaction events.
- [ ] Book Ch.21 §21.4 is rewritten to the callback form; the
      `registerEventHandler('if.event.scene_began', …)` example is removed.

## Tests

End-to-end (engine, against `SceneEvaluationPlugin` + real `WorldModel`):

1. **Visible begin reaction.** `createScene` with `begin` flipping true on turn N and
   `onBegin: () => ({ text: 'A waft of hay…' })`. Run the turn; assert the rendered
   block list contains "A waft of hay…" **and** that the turn events include
   `if.event.scene_began`.
2. **Visible end reaction + totalTurns.** Drive a scene active for K turns, flip `end`
   true; assert `onEnd`'s `ctx.totalTurns === K` (capture via a reaction that includes
   it) and its reaction text renders.
3. **messageId reaction.** `onBegin: () => ({ messageId: 'story.scene.zoo.enter' })`;
   assert the language-provider-resolved string renders (confirms the lang-routed arm).
4. **State-only beat.** `onBegin` returns `void`; assert `scene_began` still fires and
   no extra prose block is produced.

Boundary / edges:

5. **Recurring re-fire.** Recurring scene cycles `waiting → active → waiting`; assert
   `onBegin` fires on each activation.
6. **Facts stay silent.** A scene with **no** callbacks emits `scene_began` /
   `scene_ended`; assert they produce **no** text block (regression guard that facts
   are not author-visible output).

Negative:

7. **Throwing callback.** `onBegin: () => { throw new Error('x') }`; assert the scene
   still transitions to `active`, no reaction event is emitted, and the turn completes.

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
